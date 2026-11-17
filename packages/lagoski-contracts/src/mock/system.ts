import { LagoskiApiError, type LagoskiClient } from '../client';
import type { Cart, CloudEvent, Notification, ObservedEvent, Order, Product, StockItem } from '../schemas';
import { MockBroker, type BrokerOptions } from './broker';
import { seedProducts } from './catalog';
import { TEST_CARDS, type Simulator } from './simulator';

/**
 * Os seis microsserviços do Lagoski simulados no navegador, com as mesmas
 * regras do backend e integrados SÓ pelo MockBroker (nenhum "serviço" lê o
 * estado de outro). É o que o portfólio usa sem o BFF no ar.
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid(): string {
  let time = Date.now();
  let t = '';
  for (let i = 0; i < 10; i++) {
    t = CROCKFORD[time % 32] + t;
    time = Math.floor(time / 32);
  }
  let r = '';
  for (let i = 0; i < 16; i++) r += CROCKFORD[Math.floor(Math.random() * 32)];
  return t + r;
}

const T = (ctx: string, name: string) => `lagoski.${ctx}.${name}.v1`;
const fail = (code: string, message: string, status = 422): never => {
  throw new LagoskiApiError(code, message, status);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type MockSystemOptions = Partial<BrokerOptions> & {
  /** Atraso das "chamadas HTTP" do mock. */
  apiDelayMs?: number;
  dispatchAfterMs?: number;
  deliverAfterMs?: number;
  initialStock?: number;
};

type Line = { sku: string; quantity: number };
type MockCart = { id: string; customerId: string; items: Line[]; orderId: string | null };
type Snapshot = { sku: string; productName: string; size: string; color: string; priceCents: number; available: boolean };
type Reservation = { id: string; orderId: string; lines: Line[]; status: 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED' };
type Payment = { id: string; orderId: string; customerId: string; amountCents: number; status: 'AWAITING_CUSTOMER' | 'AUTHORIZED' | 'DECLINED' | 'CANCELLED' | 'REFUNDED' };

export function createMockLagoskiClient(options: MockSystemOptions = {}): LagoskiClient {
  const apiDelay = options.apiDelayMs ?? 60;
  const broker = new MockBroker('lagoski-demo', {
    latency: options.latency ?? { min: 150, max: 650 },
    retryBaseMs: options.retryBaseMs ?? 400,
  });

  const emit = (topic: string, type: string, data: Record<string, unknown>, correlationId: string, cause?: CloudEvent) => {
    const event: CloudEvent = {
      specversion: '1.0',
      id: ulid(),
      source: `lagoski/${topic.split('.')[0]}`,
      type,
      time: new Date().toISOString(),
      correlationid: correlationId,
      ...(cause ? { causationid: cause.id } : {}),
      data,
    };
    broker.publish(topic, event);
  };

  /** Idempotent consumer: cada serviço tem seu "inbox". Lançar = não confirmar (retry → DLQ). */
  const inboxes = new Map<string, Set<string>>();
  const consume = (consumer: string, topic: string, types: string[], handle: (e: CloudEvent) => void) => {
    const seen = inboxes.get(consumer) ?? new Set<string>();
    inboxes.set(consumer, seen);
    broker.subscribe(consumer, topic, types, (event) => {
      if (seen.has(event.id)) return 'duplicate';
      handle(event);
      seen.add(event.id);
    });
  };
  const data = <T>(e: CloudEvent, required: string[]): T => {
    const d = e.data as Record<string, unknown> | null;
    // Tolerant reader com validação mínima: corpo inválido lança (mensagem envenenada).
    if (!d || typeof d !== 'object' || required.some((k) => !(k in d))) throw new Error(`evento ${e.type} inválido`);
    return d as T;
  };

  /* -------------------------------- Catalog -------------------------------- */
  const products = seedProducts();

  /* -------------------------------- Ordering ------------------------------- */
  const snapshots = new Map<string, Snapshot>();
  const carts = new Map<string, MockCart>();
  const orders = new Map<string, Order>();

  const move = (order: Order, status: Order['status'], note?: string, patch: Partial<Order> = {}) => {
    const next: Order = { ...order, ...patch, status, version: order.version + 1, history: [...order.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }] };
    orders.set(order.id, next);
    return next;
  };
  const open = (o: Order) => o.status === 'PENDING' || o.status === 'AWAITING_PAYMENT';
  const cancelOrder = (o: Order, reason: NonNullable<Order['cancelReason']>, cause: CloudEvent) => {
    if (!open(o)) return;
    move(o, 'CANCELLED', reason, { cancelReason: reason });
    emit('ordering.events', T('ordering', 'order.cancelled'), { orderId: o.id, customerId: o.customerId, reason }, o.id, cause);
  };

  consume('ordering', 'catalog.events', [T('catalog', 'product.published')], (e) => {
    const d = data<{ name: string; variants: Array<{ sku: string; size: string; color: string; priceCents: number }> }>(e, ['name', 'variants']);
    for (const v of d.variants) snapshots.set(v.sku, { sku: v.sku, productName: d.name, size: v.size, color: v.color, priceCents: v.priceCents, available: true });
  });
  consume('ordering', 'inventory.events', [T('inventory', 'stock.reserved'), T('inventory', 'stock.reservation-rejected'), T('inventory', 'reservation.expired')], (e) => {
    const { orderId } = data<{ orderId: string }>(e, ['orderId']);
    const o = orders.get(orderId);
    if (!o) return;
    if (e.type === T('inventory', 'stock.reserved') && o.status === 'PENDING') move(o, 'AWAITING_PAYMENT', 'estoque reservado');
    if (e.type === T('inventory', 'stock.reservation-rejected')) cancelOrder(o, 'OUT_OF_STOCK', e);
    if (e.type === T('inventory', 'reservation.expired')) cancelOrder(o, 'RESERVATION_EXPIRED', e);
  });
  consume('ordering', 'payment.events', [T('payment', 'payment.requested'), T('payment', 'payment.authorized'), T('payment', 'payment.declined')], (e) => {
    const d = data<{ orderId: string; paymentId: string; checkoutUrl?: string }>(e, ['orderId', 'paymentId']);
    const o = orders.get(d.orderId);
    if (!o) return;
    if (e.type === T('payment', 'payment.requested') && open(o)) {
      const payment = { paymentId: d.paymentId, checkoutUrl: d.checkoutUrl ?? '' };
      if (o.status === 'PENDING') move(o, 'AWAITING_PAYMENT', 'checkout aberto', { payment });
      else orders.set(o.id, { ...o, payment, version: o.version + 1 });
    }
    if (e.type === T('payment', 'payment.authorized') && open(o)) {
      const c = move(o, 'CONFIRMED', 'pagamento aprovado');
      emit('ordering.events', T('ordering', 'order.confirmed'), { orderId: c.id, customerId: c.customerId, totalCents: c.totalCents, lines: c.lines.map(({ sku, quantity }) => ({ sku, quantity })) }, c.id, e);
    }
    if (e.type === T('payment', 'payment.declined')) cancelOrder(o, 'PAYMENT_DECLINED', e);
  });
  consume('ordering', 'fulfillment.events', [T('fulfillment', 'shipment.dispatched'), T('fulfillment', 'shipment.delivered')], (e) => {
    const d = data<{ orderId: string; trackingCode?: string }>(e, ['orderId']);
    const o = orders.get(d.orderId);
    if (!o) return;
    if (e.type === T('fulfillment', 'shipment.dispatched') && o.status === 'CONFIRMED') move(o, 'SHIPPED', `rastreio ${d.trackingCode}`, { trackingCode: d.trackingCode ?? null });
    if (e.type === T('fulfillment', 'shipment.delivered') && (o.status === 'CONFIRMED' || o.status === 'SHIPPED')) move(o, 'DELIVERED', 'entregue');
  });

  /* ------------------------------- Inventory ------------------------------- */
  const stock = new Map<string, { onHand: number; reserved: number; discontinued: boolean }>();
  const reservations = new Map<string, Reservation>();
  const available = (sku: string) => {
    const s = stock.get(sku);
    return s && !s.discontinued ? s.onHand - s.reserved : 0;
  };
  const release = (r: Reservation, status: 'RELEASED' | 'EXPIRED') => {
    for (const l of r.lines) stock.get(l.sku)!.reserved -= l.quantity;
    reservations.set(r.orderId, { ...r, status });
  };

  consume('inventory', 'catalog.events', [T('catalog', 'product.published')], (e) => {
    for (const v of data<{ variants: Array<{ sku: string }> }>(e, ['variants']).variants) {
      if (!stock.has(v.sku)) stock.set(v.sku, { onHand: options.initialStock ?? 25, reserved: 0, discontinued: false });
    }
  });
  consume('inventory', 'ordering.events', [T('ordering', 'order.placed'), T('ordering', 'order.confirmed'), T('ordering', 'order.cancelled')], (e) => {
    const d = data<{ orderId: string; lines: Line[] }>(e, ['orderId']);
    const r = reservations.get(d.orderId);
    if (e.type === T('ordering', 'order.placed')) {
      if (r) return;
      if (!Array.isArray(d.lines)) throw new Error('order.placed sem linhas');
      const unavailable = d.lines.map((l) => ({ sku: l.sku, requested: l.quantity, available: available(l.sku) })).filter((u) => u.available < u.requested);
      if (unavailable.length > 0) {
        emit('inventory.events', T('inventory', 'stock.reservation-rejected'), { orderId: d.orderId, unavailable }, d.orderId, e);
        return;
      }
      const reservation: Reservation = { id: `rsv_${ulid()}`, orderId: d.orderId, lines: d.lines.map(({ sku, quantity }) => ({ sku, quantity })), status: 'ACTIVE' };
      for (const l of reservation.lines) stock.get(l.sku)!.reserved += l.quantity;
      reservations.set(d.orderId, reservation);
      const expiresAt = new Date(Date.now() + 35 * 60_000).toISOString();
      emit('inventory.events', T('inventory', 'stock.reserved'), { orderId: d.orderId, reservationId: reservation.id, expiresAt, lines: reservation.lines }, d.orderId, e);
    }
    if (e.type === T('ordering', 'order.confirmed') && r?.status === 'ACTIVE') {
      for (const l of r.lines) {
        const s = stock.get(l.sku)!;
        s.onHand -= l.quantity;
        s.reserved -= l.quantity;
      }
      reservations.set(r.orderId, { ...r, status: 'COMMITTED' });
      emit('inventory.events', T('inventory', 'stock.committed'), { orderId: r.orderId, reservationId: r.id, lines: r.lines }, r.orderId, e);
    }
    if (e.type === T('ordering', 'order.cancelled') && r?.status === 'ACTIVE') {
      release(r, 'RELEASED');
      emit('inventory.events', T('inventory', 'stock.released'), { orderId: r.orderId, reservationId: r.id, lines: r.lines }, r.orderId, e);
    }
  });

  /* -------------------------------- Payment -------------------------------- */
  const payable = new Map<string, { customerId: string; amountCents: number; cancelled: boolean }>();
  const payments = new Map<string, Payment>();
  const paymentOf = (orderId: string) => [...payments.values()].find((p) => p.orderId === orderId);

  consume('payment', 'ordering.events', [T('ordering', 'order.placed'), T('ordering', 'order.cancelled')], (e) => {
    const d = data<{ orderId: string; customerId: string; totalCents: number }>(e, ['orderId']);
    if (e.type === T('ordering', 'order.placed')) {
      if (typeof d.totalCents !== 'number') throw new Error('order.placed sem total');
      payable.set(d.orderId, { customerId: d.customerId, amountCents: d.totalCents, cancelled: false });
      return;
    }
    const p = payable.get(d.orderId);
    if (p) p.cancelled = true;
    const pay = paymentOf(d.orderId);
    if (pay?.status === 'AWAITING_CUSTOMER') payments.set(pay.id, { ...pay, status: 'CANCELLED' }); // expira o checkout
    if (pay?.status === 'AUTHORIZED') refund(pay, e);
  });
  consume('payment', 'inventory.events', [T('inventory', 'stock.reserved')], (e) => {
    const { orderId } = data<{ orderId: string }>(e, ['orderId']);
    if (paymentOf(orderId)) return;
    const order = payable.get(orderId);
    // Projeção ainda não chegou (filas diferentes): lança e o broker reentrega.
    if (!order) throw new Error(`pedido ${orderId} ainda não projetado`);
    if (order.cancelled) return;
    const payment: Payment = { id: `pay_${orderId.replace(/^ord_/, '')}`, orderId, customerId: order.customerId, amountCents: order.amountCents, status: 'AWAITING_CUSTOMER' };
    payments.set(payment.id, payment);
    emit(
      'payment.events',
      T('payment', 'payment.requested'),
      { paymentId: payment.id, orderId, amountCents: payment.amountCents, currency: 'brl', checkoutUrl: `mock-checkout:${payment.id}`, expiresAt: new Date(Date.now() + 33 * 60_000).toISOString() },
      orderId,
      e,
    );
  });
  const refund = (pay: Payment, cause?: CloudEvent) => {
    payments.set(pay.id, { ...pay, status: 'REFUNDED' });
    emit('payment.events', T('payment', 'payment.refunded'), { paymentId: pay.id, orderId: pay.orderId, amountCents: pay.amountCents }, pay.orderId, cause);
  };

  /* ------------------------------ Fulfillment ------------------------------ */
  const shipped = new Set<string>();
  consume('fulfillment', 'ordering.events', [T('ordering', 'order.confirmed')], (e) => {
    const d = data<{ orderId: string; customerId: string; lines: Line[] }>(e, ['orderId', 'customerId', 'lines']);
    if (shipped.has(d.orderId)) return;
    shipped.add(d.orderId);
    const shipmentId = `shp_${ulid()}`;
    const base = { shipmentId, orderId: d.orderId, customerId: d.customerId };
    emit('fulfillment.events', T('fulfillment', 'shipment.created'), { ...base, lines: d.lines }, d.orderId, e);
    const trackingCode = `LG${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}BR`;
    setTimeout(() => {
      emit('fulfillment.events', T('fulfillment', 'shipment.dispatched'), { ...base, trackingCode, carrier: 'Transportadora Simulada' }, d.orderId);
      setTimeout(() => emit('fulfillment.events', T('fulfillment', 'shipment.delivered'), base, d.orderId), options.deliverAfterMs ?? 4_000);
    }, options.dispatchAfterMs ?? 3_000);
  });

  /* ------------------------------ Notification ----------------------------- */
  const notifications: Array<Notification & { customerId: string }> = [];
  const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const short = (id: string) => id.slice(-6).toUpperCase();
  const REASONS: Record<string, string> = { OUT_OF_STOCK: 'um dos itens acabou no estoque', PAYMENT_DECLINED: 'o pagamento não foi concluído', RESERVATION_EXPIRED: 'o prazo para pagar terminou' };
  const notify = (customerId: string, orderId: string, template: string, subject: string, body: string) =>
    notifications.unshift({ customerId, orderId, template, subject, body, channel: 'email', sentAt: new Date().toISOString() });
  consume('notification', 'ordering.events', [T('ordering', 'order.confirmed'), T('ordering', 'order.cancelled')], (e) => {
    const d = data<{ orderId: string; customerId: string; totalCents: number; reason: string }>(e, ['orderId', 'customerId']);
    if (e.type.endsWith('confirmed.v1')) notify(d.customerId, d.orderId, 'order-confirmed', `Pedido ${short(d.orderId)} confirmado`, `Recebemos o pagamento de ${brl(d.totalCents)}. Já estamos separando suas camisetas.`);
    else notify(d.customerId, d.orderId, 'order-cancelled', `Pedido ${short(d.orderId)} cancelado`, `Cancelamos o pedido porque ${REASONS[d.reason] ?? d.reason}. Nada foi cobrado.`);
  });
  consume('notification', 'payment.events', [T('payment', 'payment.declined')], (e) => {
    const d = data<{ orderId: string; customerId: string }>(e, ['orderId', 'customerId']);
    notify(d.customerId, d.orderId, 'payment-declined', `Pagamento do pedido ${short(d.orderId)} não concluído`, 'O pagamento não foi concluído. Você pode fazer um novo pedido quando quiser.');
  });
  consume('notification', 'fulfillment.events', [T('fulfillment', 'shipment.dispatched')], (e) => {
    const d = data<{ orderId: string; customerId: string; trackingCode: string; carrier: string }>(e, ['orderId', 'customerId', 'trackingCode']);
    notify(d.customerId, d.orderId, 'shipment-dispatched', `Pedido ${short(d.orderId)} a caminho`, `${d.carrier} coletou seu pacote. Rastreio: ${d.trackingCode}.`);
  });

  /* ------------------------------ BFF observer ----------------------------- */
  const observed: ObservedEvent[] = [];
  const listeners = new Set<(e: ObservedEvent) => void>();
  broker.observe((topic, event) => {
    const o = { topic, receivedAt: new Date().toISOString(), event };
    observed.push(o);
    if (observed.length > 500) observed.shift();
    listeners.forEach((l) => l(o));
  });

  // O Catalog publica a coleção na subida: Ordering e Inventory montam suas projeções pelos eventos.
  for (const p of products) {
    emit('catalog.events', T('catalog', 'product.published'), { productId: p.id, slug: p.slug, name: p.name, currency: 'BRL', variants: p.variants.map(({ sku, size, color, priceCents }) => ({ sku, size, color, priceCents })) }, p.id);
  }
  const seeded = new Promise<void>((resolve) => {
    const check = () => (snapshots.size > 0 && stock.size > 0 && broker.stats().every((s) => s.pending === 0) ? resolve() : setTimeout(check, 50));
    check();
  });

  /* ---------------------------------- API ---------------------------------- */
  const api = async <T>(fn: () => T): Promise<T> => {
    await seeded;
    await sleep(apiDelay);
    return structuredClone(fn());
  };
  const cartView = (c: MockCart): Cart => {
    const items = c.items.map((i) => {
      const s = snapshots.get(i.sku);
      return { ...i, productName: s?.productName ?? i.sku, size: s?.size ?? '', color: s?.color ?? '', unitPriceCents: s?.priceCents ?? 0, available: s?.available ?? false };
    });
    return { id: c.id, customerId: c.customerId, orderId: c.orderId, items, subtotalCents: items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0) };
  };
  const cartOr404 = (id: string) => carts.get(id) ?? fail('NOT_FOUND', 'carrinho não encontrado', 404);
  const stockView = (sku: string): StockItem => {
    const s = stock.get(sku) ?? fail('NOT_FOUND', 'SKU não encontrado', 404);
    return { sku, ...s, available: available(sku) };
  };

  const simulator: Simulator = {
    completeCheckout(paymentId, card) {
      const pay = payments.get(paymentId);
      if (!pay || pay.status !== 'AWAITING_CUSTOMER') return { outcome: 'unknown' };
      const digits = card.replace(/\D/g, '');
      // Como no Stripe Checkout: cartão recusado fica na página, sem evento; o cliente tenta de novo.
      if (digits === TEST_CARDS.declined.replace(/\D/g, '')) return { outcome: 'declined-card' };
      if (digits !== TEST_CARDS.approved.replace(/\D/g, '')) return { outcome: 'declined-card' };
      // "Webhook" checkout.session.completed → ACL → payment.authorized (ou estorno se o pedido já caiu).
      if (payable.get(pay.orderId)?.cancelled) refund({ ...pay, status: 'AUTHORIZED' });
      else {
        payments.set(pay.id, { ...pay, status: 'AUTHORIZED' });
        emit('payment.events', T('payment', 'payment.authorized'), { paymentId: pay.id, orderId: pay.orderId, amountCents: pay.amountCents }, pay.orderId);
      }
      return { outcome: 'paid' };
    },
    expireCheckout(paymentId) {
      const pay = payments.get(paymentId);
      if (!pay || pay.status !== 'AWAITING_CUSTOMER') return;
      payments.set(pay.id, { ...pay, status: 'DECLINED' });
      emit('payment.events', T('payment', 'payment.declined'), { paymentId: pay.id, orderId: pay.orderId, customerId: pay.customerId, reason: 'CHECKOUT_EXPIRED' }, pay.orderId);
    },
    expireReservation(orderId) {
      const r = reservations.get(orderId);
      if (r?.status !== 'ACTIVE') return;
      release(r, 'EXPIRED');
      emit('inventory.events', T('inventory', 'reservation.expired'), { orderId, reservationId: r.id }, orderId);
    },
    setPaused: (consumer, paused) => broker.setPaused(consumer, paused),
    publishPoison() {
      broker.publish('ordering.events', {
        specversion: '1.0',
        id: ulid(),
        source: 'lagoski/ordering',
        type: T('ordering', 'order.placed'),
        time: new Date().toISOString(),
        correlationid: 'poison',
        data: { motivo: 'corpo fora do contrato' },
      });
    },
    redeliverLast: () => broker.redeliverLast()?.id ?? null,
    redrive: (name) => broker.redrive(name),
    topology: () => broker.stats(),
    onTopology: (listener) => broker.onStats(listener),
  };

  return {
    mode: 'mock',
    source: 'sistema Lagoski simulado no navegador (mesmas regras, barramento em memória)',
    simulator,
    ready: async () => true,
    listProducts: () => api((): Product[] => products.filter((p) => p.status === 'PUBLISHED')),
    createCart: (customerId) =>
      api(() => {
        if (!/^cus_[a-z0-9_]{3,40}$/i.test(customerId)) fail('INVALID_CUSTOMER', 'customerId deve ser cus_xxx');
        const cart: MockCart = { id: `cart_${ulid()}`, customerId, items: [], orderId: null };
        carts.set(cart.id, cart);
        return cartView(cart);
      }),
    getCart: (id) => api(() => cartView(cartOr404(id))),
    addItem: (cartId, sku, quantity) =>
      api(() => {
        const cart = cartOr404(cartId);
        if (cart.orderId) fail('CART_CLOSED', 'carrinho já virou pedido', 409);
        const snap = snapshots.get(sku);
        if (!snap?.available) fail('SKU_UNAVAILABLE', 'SKU não está à venda');
        if (!Number.isInteger(quantity) || quantity < 1) fail('INVALID_QUANTITY', 'quantidade deve ser inteira e positiva');
        const current = cart.items.find((i) => i.sku === sku)?.quantity ?? 0;
        if (current + quantity > 10) fail('QUANTITY_LIMIT', 'no máximo 10 por item');
        cart.items = current ? cart.items.map((i) => (i.sku === sku ? { ...i, quantity: i.quantity + quantity } : i)) : [...cart.items, { sku, quantity }];
        return cartView(cart);
      }),
    removeItem: (cartId, sku) =>
      api(() => {
        const cart = cartOr404(cartId);
        if (cart.orderId) fail('CART_CLOSED', 'carrinho já virou pedido', 409);
        cart.items = cart.items.filter((i) => i.sku !== sku);
        return cartView(cart);
      }),
    placeOrder: (cartId) =>
      api(() => {
        const cart = cartOr404(cartId);
        if (cart.orderId) return orders.get(cart.orderId)!; // idempotente por carrinho
        if (cart.items.length === 0) fail('EMPTY_CART', 'carrinho vazio');
        const lines = cart.items.map((i) => {
          const s = snapshots.get(i.sku);
          if (!s?.available) fail('SKU_UNAVAILABLE', `${i.sku} saiu de venda`);
          return { sku: i.sku, productName: s!.productName, size: s!.size, color: s!.color, quantity: i.quantity, unitPriceCents: s!.priceCents };
        });
        const order: Order = {
          id: `ord_${ulid()}`,
          customerId: cart.customerId,
          currency: 'BRL',
          lines,
          totalCents: lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0),
          status: 'PENDING',
          payment: null,
          trackingCode: null,
          cancelReason: null,
          history: [{ status: 'PENDING', at: new Date().toISOString() }],
          version: 0,
        };
        orders.set(order.id, order);
        cart.orderId = order.id;
        emit('ordering.events', T('ordering', 'order.placed'), { orderId: order.id, customerId: order.customerId, currency: 'BRL', totalCents: order.totalCents, lines: lines.map(({ sku, productName, quantity, unitPriceCents }) => ({ sku, productName, quantity, unitPriceCents })) }, order.id);
        return order;
      }),
    getOrder: (id) => api(() => orders.get(id) ?? fail('NOT_FOUND', 'pedido não encontrado', 404)),
    listOrders: (customerId) => api(() => [...orders.values()].filter((o) => o.customerId === customerId).reverse().slice(0, 20)),
    getStock: (skus) => api(() => skus.filter((s) => stock.has(s)).map(stockView)),
    setStock: (sku, onHand) =>
      api(() => {
        const s = stock.get(sku) ?? fail('NOT_FOUND', 'SKU não encontrado', 404);
        if (!Number.isInteger(onHand) || onHand < 0) fail('INVALID_QUANTITY', 'quantidade deve ser inteira e não negativa');
        if (onHand < s.reserved) fail('BELOW_RESERVED', `há ${s.reserved} unidade(s) reservada(s)`, 409);
        s.onHand = onHand;
        return stockView(sku);
      }),
    listNotifications: (customerId) => api(() => notifications.filter((n) => n.customerId === customerId).map(({ customerId: _c, ...n }) => n)),
    recentEvents: () => api(() => [...observed]),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

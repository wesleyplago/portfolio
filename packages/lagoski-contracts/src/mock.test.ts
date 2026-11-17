import { describe, expect, it } from 'vitest';
import { createMockLagoskiClient } from './mock/system';
import { CartSchema, OrderSchema, ProductSchema, StockItemSchema } from './schemas';
import { TEST_CARDS } from './mock/simulator';

const fast = () =>
  createMockLagoskiClient({ latency: { min: 1, max: 4 }, retryBaseMs: 2, apiDelayMs: 0, dispatchAfterMs: 15, deliverAfterMs: 15 });

async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 2_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const v = await fn();
    if (ok(v)) return v;
    if (Date.now() - started > timeoutMs) throw new Error(`timeout: ${JSON.stringify(v)}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function orderWithItem(client = fast(), quantity = 1) {
  const products = await client.listProducts();
  const sku = products[0]!.variants[0]!.sku;
  const cart = await client.createCart('cus_test_1');
  await client.addItem(cart.id, sku, quantity);
  const order = await client.placeOrder(cart.id);
  return { client, sku, cart, order };
}

describe('mock do sistema Lagoski', () => {
  it('respostas seguem o mesmo schema Zod da API real', async () => {
    const { client, sku, cart, order } = await orderWithItem();
    for (const p of await client.listProducts()) ProductSchema.parse(p);
    CartSchema.parse(await client.getCart(cart.id));
    OrderSchema.parse(order);
    for (const s of await client.getStock([sku])) StockItemSchema.parse(s);
  });

  it('caminho feliz: checkout pago leva o pedido até DELIVERED, com e-mails', async () => {
    const { client, sku, order } = await orderWithItem(fast(), 2);
    const awaiting = await until(() => client.getOrder(order.id), (o) => o.status === 'AWAITING_PAYMENT' && !!o.payment);
    expect(awaiting.payment!.checkoutUrl).toMatch(/^mock-checkout:pay_/);
    expect(client.simulator!.completeCheckout(awaiting.payment!.paymentId, TEST_CARDS.approved).outcome).toBe('paid');
    const delivered = await until(() => client.getOrder(order.id), (o) => o.status === 'DELIVERED');
    expect(delivered.history.map((h) => h.status)).toEqual(['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED']);
    expect((await client.getStock([sku]))[0]).toMatchObject({ onHand: 23, reserved: 0 });
    const mails = await until(() => client.listNotifications('cus_test_1'), (n) => n.length === 2);
    expect(mails.map((m) => m.template).sort()).toEqual(['order-confirmed', 'shipment-dispatched']);
    const types = (await client.recentEvents()).filter((e) => e.event.correlationid === order.id).map((e) => e.event.type);
    expect(types).toContain('lagoski.inventory.stock.committed.v1');
  });

  it('cartão recusado fica no checkout; expirar cancela o pedido e libera o estoque', async () => {
    const { client, sku, order } = await orderWithItem();
    const o = await until(() => client.getOrder(order.id), (x) => !!x.payment);
    expect(client.simulator!.completeCheckout(o.payment!.paymentId, TEST_CARDS.declined).outcome).toBe('declined-card');
    expect((await client.getOrder(order.id)).status).toBe('AWAITING_PAYMENT');
    client.simulator!.expireCheckout(o.payment!.paymentId);
    const cancelled = await until(() => client.getOrder(order.id), (x) => x.status === 'CANCELLED');
    expect(cancelled.cancelReason).toBe('PAYMENT_DECLINED');
    await until(() => client.getStock([sku]), (s) => s[0]!.reserved === 0);
  });

  it('sem estoque: rejeita a reserva e cancela sem abrir checkout', async () => {
    const client = fast();
    const sku = (await client.listProducts())[0]!.variants[0]!.sku;
    await client.setStock(sku, 0);
    const { order } = await (async () => {
      const cart = await client.createCart('cus_test_2');
      await client.addItem(cart.id, sku, 1);
      return { order: await client.placeOrder(cart.id) };
    })();
    const cancelled = await until(() => client.getOrder(order.id), (o) => o.status === 'CANCELLED');
    expect(cancelled).toMatchObject({ cancelReason: 'OUT_OF_STOCK', payment: null });
  });

  it('fechar o mesmo carrinho de novo devolve o mesmo pedido', async () => {
    const { client, cart, order } = await orderWithItem();
    expect((await client.placeOrder(cart.id)).id).toBe(order.id);
  });

  it('mensagem envenenada vai para a DLQ e o redrive devolve à fila', async () => {
    const client = fast();
    await client.listProducts();
    client.simulator!.publishPoison();
    const stats = await until(async () => client.simulator!.topology(), (s) => s.filter((x) => x.dlq > 0).length === 2);
    expect(stats.filter((s) => s.dlq > 0).map((s) => s.consumer).sort()).toEqual(['inventory', 'payment']);
    expect(client.simulator!.redrive(stats.find((s) => s.dlq > 0)!.name)).toBe(1);
  });

  it('entrega duplicada é ignorada pelo inbox do consumidor', async () => {
    const { client } = await orderWithItem();
    await until(async () => client.simulator!.topology(), (s) => s.every((x) => x.pending === 0));
    client.simulator!.redeliverLast();
    const stats = await until(async () => client.simulator!.topology(), (s) => s.some((x) => x.duplicates > 0));
    expect(stats.reduce((n, s) => n + s.duplicates, 0)).toBeGreaterThan(0);
  });

  it('consumidor pausado acumula mensagens e processa ao voltar', async () => {
    const { client, order } = await orderWithItem();
    client.simulator!.setPaused('fulfillment', true);
    const o = await until(() => client.getOrder(order.id), (x) => !!x.payment);
    client.simulator!.completeCheckout(o.payment!.paymentId, TEST_CARDS.approved);
    await until(async () => client.simulator!.topology(), (s) => s.find((x) => x.consumer === 'fulfillment')!.pending > 0);
    expect((await client.getOrder(order.id)).status).toBe('CONFIRMED');
    client.simulator!.setPaused('fulfillment', false);
    await until(() => client.getOrder(order.id), (x) => x.status === 'DELIVERED');
  });
});

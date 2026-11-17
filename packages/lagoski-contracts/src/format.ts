import type { OrderStatus } from './schemas';

export const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const shortId = (id: string) => id.slice(-6).toUpperCase();

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Reservando estoque',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'A caminho',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const CANCEL_LABEL: Record<string, string> = {
  OUT_OF_STOCK: 'sem estoque',
  PAYMENT_DECLINED: 'pagamento não concluído',
  RESERVATION_EXPIRED: 'prazo de pagamento vencido',
};

/** Contexto dono de um tópico ou tipo de evento (para cor e rótulo). */
export const contextOf = (typeOrTopic: string) => {
  const parts = typeOrTopic.split('.');
  return (parts[0] === 'lagoski' ? parts[1] : parts[0]) ?? 'unknown';
};

/** `lagoski.ordering.order.placed.v1` → `order.placed` */
export const shortType = (type: string) => type.replace(/^lagoski\.[a-z]+\./, '').replace(/\.v\d+$/, '');

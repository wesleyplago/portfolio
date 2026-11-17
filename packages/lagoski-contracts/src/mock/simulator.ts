import type { SubscriptionStats } from './broker';

/** Controles que só existem no modo demo (barramento e Stripe simulados). */
export interface Simulator {
  /** O cliente termina o Stripe Checkout simulado: cartão de teste aprovado, recusado ou checkout abandonado. */
  completeCheckout(paymentId: string, card: string): { outcome: 'paid' | 'declined-card' | 'unknown' };
  /** Deixa o checkout expirar (webhook checkout.session.expired). */
  expireCheckout(paymentId: string): void;
  /** Vence a reserva de estoque do pedido agora. */
  expireReservation(orderId: string): void;
  /** Para de consumir as filas de um serviço (mensagens acumulam). */
  setPaused(consumer: string, paused: boolean): void;
  /** Publica um evento com corpo inválido: retry até a DLQ. */
  publishPoison(): void;
  /** Reentrega o último evento (entrega duplicada do broker). */
  redeliverLast(): string | null;
  redrive(subscription: string): number;
  topology(): SubscriptionStats[];
  onTopology(listener: () => void): () => void;
}

export const TEST_CARDS = {
  approved: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
} as const;

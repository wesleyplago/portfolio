import type { CloudEvent } from '../schemas';

/**
 * Broker em memória com a mesma semântica do SNS+SQS / Pub/Sub do backend:
 * tópicos, uma assinatura por consumidor com filtro por tipo, fila própria,
 * entrega at-least-once com latência, retry com backoff e DLQ após 5 tentativas.
 */
export const MAX_ATTEMPTS = 5;

export type SubscriptionStats = {
  name: string;
  consumer: string;
  topic: string;
  eventTypes: string[];
  paused: boolean;
  pending: number;
  delivered: number;
  retries: number;
  duplicates: number;
  dlq: number;
};

type Message = { event: CloudEvent; attempts: number };

type Subscription = Omit<SubscriptionStats, 'pending' | 'dlq'> & {
  queue: Message[];
  deadLetters: Message[];
  inFlight: boolean;
  handler: (event: CloudEvent) => void | 'duplicate';
};

export type BrokerOptions = {
  /** Latência de entrega (ms). Aleatória entre min e max: eventos podem chegar fora de ordem. */
  latency: { min: number; max: number };
  retryBaseMs: number;
};

export class MockBroker {
  private readonly subscriptions: Subscription[] = [];
  private readonly observers = new Set<(topic: string, event: CloudEvent) => void>();
  private readonly statsListeners = new Set<() => void>();
  private lastPublished: { topic: string; event: CloudEvent } | null = null;

  constructor(
    private readonly prefix: string,
    private readonly options: BrokerOptions,
  ) {}

  subscribe(consumer: string, topic: string, eventTypes: string[], handler: Subscription['handler']): void {
    this.subscriptions.push({
      name: `${this.prefix}-${consumer}-on-${topic.split('.')[0]}`,
      consumer,
      topic,
      eventTypes,
      paused: false,
      delivered: 0,
      retries: 0,
      duplicates: 0,
      queue: [],
      deadLetters: [],
      inFlight: false,
      handler,
    });
  }

  /** O observer do BFF: vê tudo, sem filtro. */
  observe(listener: (topic: string, event: CloudEvent) => void): () => void {
    this.observers.add(listener);
    return () => this.observers.delete(listener);
  }

  onStats(listener: () => void): () => void {
    this.statsListeners.add(listener);
    return () => this.statsListeners.delete(listener);
  }

  publish(topic: string, event: CloudEvent): void {
    this.lastPublished = { topic, event };
    this.observers.forEach((o) => o(topic, event));
    for (const sub of this.subscriptions) {
      if (sub.topic !== topic) continue;
      if (sub.eventTypes.length > 0 && !sub.eventTypes.includes(event.type)) continue; // filtro do broker
      sub.queue.push({ event, attempts: 0 });
      this.schedule(sub);
    }
    this.changed();
  }

  /** Reentrega o último evento publicado a todas as assinaturas (duplicata at-least-once). */
  redeliverLast(): CloudEvent | null {
    if (!this.lastPublished) return null;
    const { topic, event } = this.lastPublished;
    for (const sub of this.subscriptions) {
      if (sub.topic !== topic || (sub.eventTypes.length > 0 && !sub.eventTypes.includes(event.type))) continue;
      sub.queue.push({ event, attempts: 0 });
      this.schedule(sub);
    }
    this.changed();
    return event;
  }

  setPaused(consumer: string, paused: boolean): void {
    for (const sub of this.subscriptions.filter((s) => s.consumer === consumer)) {
      sub.paused = paused;
      if (!paused) this.schedule(sub);
    }
    this.changed();
  }

  isPaused(consumer: string): boolean {
    return this.subscriptions.some((s) => s.consumer === consumer && s.paused);
  }

  /** Redrive: devolve as mensagens da DLQ para a fila de origem. */
  redrive(name: string): number {
    const sub = this.subscriptions.find((s) => s.name === name);
    if (!sub) return 0;
    const moved = sub.deadLetters.splice(0).map((m) => ({ ...m, attempts: 0 }));
    sub.queue.push(...moved);
    this.schedule(sub);
    this.changed();
    return moved.length;
  }

  stats(): SubscriptionStats[] {
    return this.subscriptions.map(({ name, consumer, topic, eventTypes, paused, delivered, retries, duplicates, queue, deadLetters }) => ({
      name,
      consumer,
      topic,
      eventTypes,
      paused,
      pending: queue.length,
      delivered,
      retries,
      duplicates,
      dlq: deadLetters.length,
    }));
  }

  private changed() {
    this.statsListeners.forEach((l) => l());
  }

  private schedule(sub: Subscription, delay?: number) {
    if (sub.inFlight || sub.paused || sub.queue.length === 0) return;
    sub.inFlight = true;
    const { min, max } = this.options.latency;
    setTimeout(() => this.deliver(sub), delay ?? min + Math.random() * (max - min));
  }

  private deliver(sub: Subscription) {
    sub.inFlight = false;
    if (sub.paused) return;
    const message = sub.queue.shift();
    if (!message) return;
    message.attempts += 1;
    try {
      const result = sub.handler(message.event);
      sub.delivered += 1;
      if (result === 'duplicate') sub.duplicates += 1;
      this.changed();
      this.schedule(sub);
    } catch {
      if (message.attempts >= MAX_ATTEMPTS) {
        sub.deadLetters.push(message);
        this.changed();
        this.schedule(sub);
        return;
      }
      sub.retries += 1;
      sub.queue.unshift(message); // volta para a frente da fila, com backoff
      this.changed();
      this.schedule(sub, this.options.retryBaseMs * 2 ** (message.attempts - 1));
    }
  }
}

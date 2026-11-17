import { z } from 'zod';

/** Contrato da API do lagoski-bff, validado em toda resposta. */

export const VariantSchema = z.object({
  sku: z.string(),
  size: z.enum(['P', 'M', 'G', 'GG']),
  color: z.string(),
  colorHex: z.string(),
  priceCents: z.number().int().positive(),
});

export const ProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  artwork: z.string(),
  status: z.enum(['PUBLISHED', 'DISCONTINUED']),
  variants: z.array(VariantSchema),
});

export const ProductListSchema = z.object({ products: z.array(ProductSchema) });

export const CartSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  orderId: z.string().nullable(),
  items: z.array(
    z.object({
      sku: z.string(),
      quantity: z.number().int().positive(),
      productName: z.string(),
      size: z.string(),
      color: z.string(),
      unitPriceCents: z.number().int(),
      available: z.boolean(),
    }),
  ),
  subtotalCents: z.number().int(),
});

export const OrderStatusSchema = z.enum(['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);

export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  currency: z.literal('BRL'),
  lines: z.array(
    z.object({
      sku: z.string(),
      productName: z.string(),
      size: z.string(),
      color: z.string(),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().positive(),
    }),
  ),
  totalCents: z.number().int(),
  status: OrderStatusSchema,
  payment: z.object({ paymentId: z.string(), checkoutUrl: z.string() }).nullable(),
  trackingCode: z.string().nullable(),
  cancelReason: z.enum(['OUT_OF_STOCK', 'PAYMENT_DECLINED', 'RESERVATION_EXPIRED']).nullable(),
  history: z.array(z.object({ status: OrderStatusSchema, at: z.string(), note: z.string().optional() })),
  version: z.number().int(),
});

export const OrderListSchema = z.object({ orders: z.array(OrderSchema) });

export const StockItemSchema = z.object({
  sku: z.string(),
  onHand: z.number().int(),
  reserved: z.number().int(),
  discontinued: z.boolean(),
  available: z.number().int(),
});

export const StockListSchema = z.object({ items: z.array(StockItemSchema) });

export const NotificationSchema = z.object({
  orderId: z.string(),
  template: z.string(),
  subject: z.string(),
  body: z.string(),
  channel: z.string(),
  sentAt: z.string(),
});

export const NotificationListSchema = z.object({ notifications: z.array(NotificationSchema) });

export const CloudEventSchema = z.object({
  specversion: z.literal('1.0'),
  id: z.string(),
  source: z.string(),
  type: z.string(),
  subject: z.string().optional(),
  time: z.string(),
  correlationid: z.string(),
  causationid: z.string().optional(),
  data: z.unknown(),
});

export const ObservedEventSchema = z.object({
  topic: z.string(),
  receivedAt: z.string(),
  event: CloudEventSchema,
});

export const RecentEventsSchema = z.object({ events: z.array(ObservedEventSchema) });

export const ApiErrorSchema = z.object({ error: z.string(), message: z.string().optional() });

export type Variant = z.infer<typeof VariantSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type StockItem = z.infer<typeof StockItemSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type CloudEvent = z.infer<typeof CloudEventSchema>;
export type ObservedEvent = z.infer<typeof ObservedEventSchema>;

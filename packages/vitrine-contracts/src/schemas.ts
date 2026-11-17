import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Contrato da vitrine-api (monolito modular).                          */
/* O backend é a autoridade: aqui é tipagem, validação de UX e o mock.  */
/* ------------------------------------------------------------------ */

export const StoreSchema = z.enum(['shopee', 'mercadolivre']);
export type Store = z.infer<typeof StoreSchema>;

export const STORE_LABEL: Record<Store, string> = { shopee: 'Shopee', mercadolivre: 'Mercado Livre' };

export const ChannelSchema = z.enum(['site', 'whatsapp', 'telegram', 'instagram']);
export type Channel = z.infer<typeof ChannelSchema>;

export const AffiliateLinkSchema = z.object({
  channel: ChannelSchema,
  url: z.url(),
});
export type AffiliateLink = z.infer<typeof AffiliateLinkSchema>;

export const ProductStatusSchema = z.enum(['published', 'draft']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  store: StoreSchema,
  title: z.string(),
  category: z.string(),
  imageUrl: z.url().nullable(),
  /** Preço "de", em reais. Nulo quando não há desconto real. */
  priceFrom: z.number().nonnegative().nullable(),
  /** Preço "por", em reais. */
  priceTo: z.number().nonnegative(),
  /** Comissão do programa de afiliados, de 0 a 1. */
  commissionRate: z.number().min(0).max(1),
  status: ProductStatusSchema,
  links: z.array(AffiliateLinkSchema).min(1),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  store: StoreSchema.optional(),
});
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export const ProductPageSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
});
export type ProductPage = z.infer<typeof ProductPageSchema>;

export const ClickEventSchema = z.object({
  productId: z.string(),
  store: StoreSchema,
  channel: ChannelSchema,
});
export type ClickEvent = z.infer<typeof ClickEventSchema>;

/* ------------------------------ backoffice ----------------------------- */

export const LoginRequestSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SessionSchema = z.object({
  token: z.string().min(1),
  username: z.string(),
  expiresAt: z.iso.datetime(),
});
export type Session = z.infer<typeof SessionSchema>;

export const AddShopeeInputSchema = z.object({
  url: z.url('Cole a URL do produto na Shopee'),
});
export type AddShopeeInput = z.infer<typeof AddShopeeInputSchema>;

export const AddMercadoLivreInputSchema = z.object({
  itemUrl: z.url('Cole a URL do anúncio no Mercado Livre'),
  affiliateUrl: z.url('Cole o link gerado no portal de afiliados'),
  title: z.string().trim().min(3, 'Título com pelo menos 3 caracteres').max(120),
  category: z.string().trim().min(1, 'Informe a categoria'),
  priceTo: z.number().positive('Preço maior que zero'),
});
export type AddMercadoLivreInput = z.infer<typeof AddMercadoLivreInputSchema>;

export const FunnelRowSchema = z.object({
  productId: z.string(),
  title: z.string(),
  store: StoreSchema,
  clicks: z.number().int().nonnegative(),
  orders: z.number().int().nonnegative(),
  commission: z.number().nonnegative(),
});
export type FunnelRow = z.infer<typeof FunnelRowSchema>;

export const FunnelReportSchema = z.object({ rows: z.array(FunnelRowSchema) });
export type FunnelReport = z.infer<typeof FunnelReportSchema>;

export const ReadySchema = z.object({ ready: z.boolean() });

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

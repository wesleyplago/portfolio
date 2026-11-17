import { existsSync } from 'node:fs';
import { DEMO_ADMIN } from '@portfolio/vitrine-contracts';
import { createMercadoLivreLookup } from './mercadolivre';
import { createApi } from './server';

if (existsSync('.env')) process.loadEnvFile('.env');
const env = (name: string) => process.env[name]?.trim() || undefined;

const port = Number(env('PORT') ?? 3100);
const password = env('VITRINE_ADMIN_PASSWORD');
const admin = password ? { username: env('VITRINE_ADMIN_USER') ?? 'admin', password } : DEMO_ADMIN;
const corsOrigins = (env('VITRINE_CORS_ORIGINS') ?? 'http://localhost:5180,http://localhost:5187').split(',').map((o) => o.trim());

const api = createApi({
  corsOrigins,
  admin,
  mercadoLivre: createMercadoLivreLookup({ clientId: env('ML_CLIENT_ID'), clientSecret: env('ML_CLIENT_SECRET') }),
});

api.listen(port, () => {
  console.log(`vitrine-api em http://localhost:${port} (CORS: ${corsOrigins.join(', ')})`);
  if (!password) console.warn('VITRINE_ADMIN_PASSWORD não definida: usando o admin do modo demo.');
  if (!env('ML_CLIENT_ID') || !env('ML_CLIENT_SECRET')) {
    console.warn('ML_CLIENT_ID/ML_CLIENT_SECRET não definidos: o cadastro pelo link do Mercado Livre vai falhar.');
  }
});

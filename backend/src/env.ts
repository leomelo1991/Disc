import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  // DATABASE_URL (dono do schema) só é usada por migrations/seed. A API usa APP_DATABASE_URL (papel disc_app, sujeito a RLS).
  DATABASE_URL: z.string().default('postgres://disc:disc@localhost:5432/disc'),
  APP_DATABASE_URL: z.string().default('postgres://disc_app:disc_app@localhost:5432/disc'),
  JWT_SECRET: z.string().min(16).default('dev-only-secret-change-me'),
  // Observabilidade (opcionais). Sentry só é ligado se SENTRY_DSN existir. /metrics exige METRICS_TOKEN em produção.
  SENTRY_DSN: z.string().url().optional(),
  METRICS_TOKEN: z.string().min(16).optional(),
  // Página pública /apresentacao (cria empresa de demonstração sem login). Padrão: ligada fora de produção.
  ENABLE_PRESENTATION: z.enum(['true', 'false']).optional(),
  PRESENTATION_DAILY_LIMIT: z.coerce.number().int().min(1).default(100),
  // Swagger UI em /api/docs. Padrão: ligado fora de produção.
  ENABLE_DOCS: z.enum(['true', 'false']).optional(),
  // Origem pública do site (links de convite, CORS). Se faltar, é derivada do domínio da Vercel (ver deriveWebOrigin).
  WEB_ORIGIN: z.string().optional(),
  // Quantos proxies confiáveis existem na frente da API (nginx no Docker = 1, borda da Vercel = 1).
  // Sem isso o limite por IP enxerga o IP do proxy e todos os usuários dividem o mesmo balde.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  // Conexões por instância. Em serverless cada instância tem o próprio pool: mantenha pequeno.
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  // Segredo do agendador (Vercel Cron envia `Authorization: Bearer <CRON_SECRET>`). Sem ele, /internal/cron/* responde 404.
  CRON_SECRET: z.string().min(16).optional(),
});

/** Origem do site: WEB_ORIGIN explícita, senão o domínio da Vercel (produção ou preview), senão o Vite local. */
export function deriveWebOrigin(vars: Record<string, string | undefined>): string {
  if (vars.WEB_ORIGIN) return vars.WEB_ORIGIN;
  if (vars.VERCEL_ENV === 'production' && vars.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${vars.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (vars.VERCEL_URL) {
    const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(vars.VERCEL_URL); // `vercel dev` local é HTTP
    return `${local ? 'http' : 'https'}://${vars.VERCEL_URL}`;
  }
  return 'http://localhost:5173';
}

export const env = envSchema
  .refine((e) => e.NODE_ENV !== 'production' || process.env.APP_DATABASE_URL !== undefined, {
    message: 'APP_DATABASE_URL deve ser definida em produção (papel sem bypass de RLS)',
    path: ['APP_DATABASE_URL'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || e.JWT_SECRET !== 'dev-only-secret-change-me', {
    message: 'JWT_SECRET deve ser definido em produção',
    path: ['JWT_SECRET'],
  })
  .transform((e) => ({ ...e, WEB_ORIGIN: deriveWebOrigin({ ...process.env, WEB_ORIGIN: e.WEB_ORIGIN }) }))
  .parse(process.env);

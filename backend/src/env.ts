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
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema
  .refine((e) => e.NODE_ENV !== 'production' || process.env.APP_DATABASE_URL !== undefined, {
    message: 'APP_DATABASE_URL deve ser definida em produção (papel sem bypass de RLS)',
    path: ['APP_DATABASE_URL'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || e.JWT_SECRET !== 'dev-only-secret-change-me', {
    message: 'JWT_SECRET deve ser definido em produção',
    path: ['JWT_SECRET'],
  })
  .parse(process.env);

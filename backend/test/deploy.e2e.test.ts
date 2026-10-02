import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { deriveWebOrigin, env } from '../src/env.js';
import { adminPrisma } from './admin-db.js';
import { createApp } from './helpers.js';

const api = '/api/v1';
const SECRET = 'segredo-do-agendador-bem-longo';

describe('Deploy em serverless: agendador, origem do site e proxy', () => {
  const prisma = adminPrisma();

  afterEach(() => {
    Object.assign(env, { CRON_SECRET: undefined, TRUST_PROXY_HOPS: 0 });
  });

  describe('GET /internal/cron/purge', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createApp();
    });
    afterAll(async () => app.close());
    const call = (token?: string) => {
      const r = request(app.getHttpServer()).get(`${api}/internal/cron/purge`);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    };

    it('sem CRON_SECRET configurado o endpoint não existe (404), mesmo com um token qualquer', async () => {
      await call().expect(404);
      await call(SECRET).expect(404);
    });

    it('com CRON_SECRET: sem token ou com token errado é 401', async () => {
      Object.assign(env, { CRON_SECRET: SECRET });
      await call().expect(401);
      await call('token-errado-token-errado').expect(401);
      await request(app.getHttpServer()).get(`${api}/internal/cron/purge`).set('Authorization', SECRET).expect(401); // sem "Bearer "
    });

    it('com o token certo executa a limpeza de verdade e devolve as contagens', async () => {
      Object.assign(env, { CRON_SECRET: SECRET });
      const old = await prisma.tenant.create({
        data: {
          name: 'Demonstração vencida (cron)',
          slug: `cron-${Date.now()}`,
          isPresentation: true,
          createdAt: new Date(Date.now() - 9 * 86_400_000),
        },
      });
      const fresh = await prisma.tenant.create({
        data: { name: 'Demonstração recente (cron)', slug: `cron-new-${Date.now()}`, isPresentation: true },
      });

      const res = await call(SECRET).expect(200);
      const body = c.cronPurgeSchema.parse(res.body);
      expect(body.presentationTenants).toBeGreaterThanOrEqual(1);
      expect(await prisma.tenant.findUnique({ where: { id: old.id } })).toBeNull();
      expect(await prisma.tenant.findUnique({ where: { id: fresh.id } })).not.toBeNull();
    });
  });

  describe('deriveWebOrigin', () => {
    it('WEB_ORIGIN explícita sempre vence', () => {
      expect(
        deriveWebOrigin({
          WEB_ORIGIN: 'https://meu.site',
          VERCEL_ENV: 'production',
          VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app',
        }),
      ).toBe('https://meu.site');
    });
    it('em produção usa o domínio de produção da Vercel', () => {
      expect(
        deriveWebOrigin({
          VERCEL_ENV: 'production',
          VERCEL_PROJECT_PRODUCTION_URL: 'disc.vercel.app',
          VERCEL_URL: 'disc-abc.vercel.app',
        }),
      ).toBe('https://disc.vercel.app');
    });
    it('em preview usa a URL do próprio deployment (nunca a de produção)', () => {
      expect(
        deriveWebOrigin({
          VERCEL_ENV: 'preview',
          VERCEL_PROJECT_PRODUCTION_URL: 'disc.vercel.app',
          VERCEL_URL: 'disc-git-x.vercel.app',
        }),
      ).toBe('https://disc-git-x.vercel.app');
    });
    it('no `vercel dev` local (host localhost) usa HTTP', () => {
      expect(deriveWebOrigin({ VERCEL_ENV: 'development', VERCEL_URL: 'localhost:3300' })).toBe(
        'http://localhost:3300',
      );
    });
    it('fora da Vercel cai no Vite local', () => {
      expect(deriveWebOrigin({})).toBe('http://localhost:5173');
    });
  });

  describe('trust proxy', () => {
    /** App de teste com uma rota que devolve o IP que o Express enxerga. */
    async function appWithIpProbe() {
      const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const app = mod.createNestApplication();
      configureApp(app);
      app
        .getHttpAdapter()
        .getInstance()
        .get('/__ip', (req: Request, res: Response) => res.json({ ip: req.ip }));
      await app.init();
      return app;
    }
    const headers = { 'X-Forwarded-For': '203.0.113.9' };

    it('com 1 salto confiável, o IP do cliente vem de X-Forwarded-For (limite por IP passa a ser por usuário)', async () => {
      Object.assign(env, { TRUST_PROXY_HOPS: 1 });
      const app = await appWithIpProbe();
      const res = await request(app.getHttpServer()).get('/__ip').set(headers).expect(200);
      expect(res.body.ip).toBe('203.0.113.9');
      await app.close();
    });

    it('com 0 saltos (padrão) o cabeçalho é IGNORADO, para ninguém forjar o próprio IP', async () => {
      Object.assign(env, { TRUST_PROXY_HOPS: 0 });
      const app = await appWithIpProbe();
      const res = await request(app.getHttpServer()).get('/__ip').set(headers).expect(200);
      expect(res.body.ip).not.toBe('203.0.113.9');
      await app.close();
    });
  });
});

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { env } from '../../src/env.js';
import { createApp } from '../helpers.js';

const api = '/api/v1';

/**
 * A injeção de dependência NÃO pode depender de metadata emitida pelo compilador: loaders baseados em esbuild
 * (CLI da Vercel, tsx) não a emitem. Aqui o app roda sem ela, e cada módulo é exercitado por um endpoint real.
 */
describe('DI sem metadata de decorators', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    Object.assign(env, { CRON_SECRET: undefined });
    await app.close();
  });
  const http = () => request(app.getHttpServer());

  it('o ambiente de teste realmente está sem metadata (a prova de que o teste testa algo)', () => {
    // Em modo com metadata, o tipo do parâmetro do construtor ficaria registrado; aqui não pode existir.
    class Probe {
      constructor(readonly dep: Date) {}
    }
    expect(typeof Reflect.getMetadata).toBe('function'); // o polyfill está carregado, então o undefined abaixo é real
    expect(Reflect.getMetadata('design:paramtypes', Probe)).toBeUndefined();
  });

  it('health/ready (PrismaService) e métricas (MetricsService)', async () => {
    await http().get(`${api}/health`).expect(200);
    await http().get(`${api}/ready`).expect(200);
    await http().get(`${api}/metrics`).expect(200);
  });

  it('identidade: cadastro, login, guard e rotas autenticadas de vários módulos', async () => {
    const run = Math.random().toString(36).slice(2, 8);
    const email = `nometa-${run}@example.com`;
    const reg = await http()
      .post(`${api}/auth/register-tenant`)
      .send({ companyName: `NoMeta ${run}`, adminName: 'Ana', email, password: 'senha-forte-123' })
      .expect(201);
    c.sessionSchema.parse(reg.body);
    await http().post(`${api}/auth/login`).send({ email, password: 'senha-forte-123' }).expect(200);
    const auth = { Authorization: `Bearer ${reg.body.accessToken}` };

    await http().get(`${api}/reports/results`).expect(401); // AuthGuard (AuthService + Reflector)
    c.tenantSchema.parse((await http().get(`${api}/tenant`).set(auth).expect(200)).body); // tenancy
    c.userListSchema.parse((await http().get(`${api}/users`).set(auth).expect(200)).body);
    c.assessmentTypeListSchema.parse((await http().get(`${api}/assessment-types`).set(auth).expect(200)).body); // catalog
    c.resultsPageSchema.parse((await http().get(`${api}/reports/results`).set(auth).expect(200)).body); // reporting
    c.invitationCreatedSchema.parse(
      (await http().post(`${api}/invitations`).set(auth).send({ assessmentType: 'DISC' }).expect(201)).body,
    ); // invitations (Prisma + Metrics)
  });

  it('candidato (casos de uso e repositório de delivery) e apresentação', async () => {
    const pres = c.presentationLinkSchema.parse(
      (await http().post(`${api}/public/presentation`).send({ companyName: 'Sem Metadata Ltda' }).expect(201)).body,
    );
    const token = pres.url.split('/t/')[1]!;
    const inv = c.publicInvitationSchema.parse(
      (await http().get(`${api}/public/invitations/${token}`).expect(200)).body,
    );
    expect(inv.company).toBe('Sem Metadata Ltda');
    await http().get(`${api}/public/invitations/token-inexistente`).expect(404);
  });

  it('agendador e retenção (RetentionService)', async () => {
    Object.assign(env, { CRON_SECRET: 'segredo-do-agendador-bem-longo' });
    const res = await http()
      .get(`${api}/internal/cron/purge`)
      .set('Authorization', 'Bearer segredo-do-agendador-bem-longo')
      .expect(200);
    c.cronPurgeSchema.parse(res.body);
  });
});

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { DEMO, PEOPLE, seedDemo } from '../prisma/seed-demo.js';
import { adminPrisma } from './admin-db.js';
import { createApp } from './helpers.js';

const api = '/api/v1';

describe('Seed de demonstração', () => {
  const prisma = adminPrisma();
  let app: INestApplication;

  beforeAll(async () => {
    await seedDemo(prisma, { reset: true });
    app = await createApp();
  });
  afterAll(async () => app.close());

  const scoresOf = async () =>
    (
      await prisma.profileResult.findMany({
        where: { submission: { tenant: { slug: DEMO.slug } } },
        orderBy: { calculatedAt: 'asc' },
      })
    ).map((r) => [r.scoreD, r.scoreI, r.scoreS, r.scoreC, r.primaryFactor]);

  it('cria a empresa fictícia com todos os resultados e convites em aberto', async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: DEMO.slug } });
    expect(await prisma.submission.count({ where: { tenantId: tenant.id } })).toBe(PEOPLE.length);
    expect(await prisma.answer.count({ where: { submission: { tenantId: tenant.id } } })).toBe(PEOPLE.length * 96);
    expect(await prisma.invitation.count({ where: { tenantId: tenant.id, status: 'PENDING' } })).toBe(3);
    // somente dados fictícios: e-mails reservados para exemplos (RFC 2606)
    const candidates = await prisma.candidate.findMany({ where: { tenantId: tenant.id } });
    expect(candidates.every((x) => x.email.endsWith('@example.com'))).toBe(true);
  });

  it('o login da demonstração funciona e o painel mostra variedade de perfis', async () => {
    const login = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email: DEMO.adminEmail, password: DEMO.password })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    const list = c.resultsPageSchema.parse(
      (await request(app.getHttpServer()).get(`${api}/reports/results?limit=50`).set(auth).expect(200)).body,
    );
    expect(list.items).toHaveLength(PEOPLE.length);

    const summary = c.summarySchema.parse(
      (await request(app.getHttpServer()).get(`${api}/reports/summary`).set(auth).expect(200)).body,
    );
    expect(summary.total).toBe(PEOPLE.length);
    for (const f of ['D', 'I', 'S', 'C'] as const) expect(summary.byFactor[f]).toBeGreaterThan(0);

    const detail = (
      await request(app.getHttpServer()).get(`${api}/reports/results/${list.items[0]!.id}`).set(auth).expect(200)
    ).body;
    c.resultDetailSchema.parse(detail);
    // soma total constante (24 grupos × 10) comprova que as respostas respeitam a regra 1–4
    expect(Object.values(detail.scores as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(240);
  });

  it('é idempotente sem --reset e determinístico com --reset', async () => {
    const before = await scoresOf();
    expect((await seedDemo(prisma)).created).toBe(false);
    expect(await scoresOf()).toEqual(before);
    expect((await seedDemo(prisma, { reset: true })).created).toBe(true);
    expect(await scoresOf()).toEqual(before);
  });

  it('recrutadora da demo não acessa a gestão de usuários', async () => {
    const login = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email: DEMO.recruiterEmail, password: DEMO.password })
      .expect(200);
    await request(app.getHttpServer())
      .get(`${api}/users`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});

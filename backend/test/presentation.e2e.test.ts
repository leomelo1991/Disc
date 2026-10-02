import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { env } from '../src/env.js';
import { RetentionService } from '../src/modules/privacy/retention.service.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, perfectAnswers } from './helpers.js';

const api = '/api/v1';

describe('Página de apresentação (/public/presentation)', () => {
  const prisma = adminPrisma();
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    Object.assign(env, { ENABLE_PRESENTATION: undefined, PRESENTATION_DAILY_LIMIT: 100, NODE_ENV: 'test' });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const create = (companyName: string) => http().post(`${api}/public/presentation`).send({ companyName });

  it('cria a empresa de demonstração e devolve um link que o candidato consegue abrir e responder', async () => {
    const name = `Cliente ${Math.random().toString(36).slice(2, 8)} Ltda`;
    const res = await create(name).expect(201);
    const link = c.presentationLinkSchema.parse(res.body);
    expect(link.companyName).toBe(name);
    expect(link.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);

    const token = link.url.split('/t/')[1]!;
    const pub = c.publicInvitationSchema.parse(
      (await http().get(`${api}/public/invitations/${token}`).expect(200)).body,
    );
    expect(pub.company).toBe(name); // o candidato vê o nome da empresa do cliente

    // o fluxo completo funciona: o teste é respondido e devolve o resumo
    const factors = new Map(
      (await prisma.questionOption.findMany({ select: { id: true, factor: true } })).map(
        (o) => [o.id, o.factor] as const,
      ),
    );
    const answers = perfectAnswers({
      groups: pub.questionnaire.groups.map((g) => ({
        options: g.options.map((o) => ({ id: o.id, factor: factors.get(o.id)! })),
      })),
    });
    const sub = await http()
      .post(`${api}/public/invitations/${token}/submit`)
      .set('Idempotency-Key', `pres-${token.slice(0, 12)}`)
      .send({ candidate: candidateBody, consent: { accepted: true, version: 'v1' }, answers })
      .expect(201);
    expect(c.submitResponseSchema.parse(sub.body).candidateSummary.code).toBe('DI');
  });

  it('a empresa criada é marcada como apresentação e NÃO tem nenhum usuário capaz de logar', async () => {
    const res = await create('Empresa Sem Login').expect(201);
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { name: 'Empresa Sem Login' },
      orderBy: { createdAt: 'desc' },
      include: { users: true },
    });
    expect(tenant.isPresentation).toBe(true);
    expect(tenant.retentionDays).toBe(30);
    expect(tenant.users).toHaveLength(1);
    expect(tenant.users[0]).toMatchObject({ active: false, passwordHash: '!sem-login' });

    // tentativa de login com qualquer senha falha
    await http().post(`${api}/auth/login`).send({ email: tenant.users[0]!.email, password: '!sem-login' }).expect(401);
    await http()
      .post(`${api}/auth/login`)
      .send({ email: tenant.users[0]!.email, password: 'senha-forte-123' })
      .expect(401);
    expect(res.body.url).toContain('/t/');
  });

  it('valida o nome da empresa', async () => {
    await http().post(`${api}/public/presentation`).send({ companyName: 'A' }).expect(422);
    await http().post(`${api}/public/presentation`).send({}).expect(422);
    await http()
      .post(`${api}/public/presentation`)
      .send({ companyName: 'x'.repeat(121) })
      .expect(422);
  });

  it('desligada, responde 404 (em produção é o padrão)', async () => {
    Object.assign(env, { ENABLE_PRESENTATION: 'false' });
    await create('Qualquer Empresa').expect(404);
    Object.assign(env, { ENABLE_PRESENTATION: undefined, NODE_ENV: 'production' });
    await create('Qualquer Empresa').expect(404); // padrão de produção: desligada sem ENABLE_PRESENTATION=true
    Object.assign(env, { ENABLE_PRESENTATION: 'true' });
    await create('Empresa Ligada Explicitamente').expect(201);
    Object.assign(env, { ENABLE_PRESENTATION: undefined, NODE_ENV: 'test' });
  });

  it('limite diário: depois de atingido responde 429 e não cria mais nada', async () => {
    const since = new Date(Date.now() - 86_400_000);
    const already = await prisma.tenant.count({ where: { isPresentation: true, createdAt: { gte: since } } });
    Object.assign(env, { PRESENTATION_DAILY_LIMIT: already + 1 });
    await create('Dentro do Limite').expect(201);
    const before = await prisma.tenant.count({ where: { isPresentation: true } });
    const blocked = await create('Acima do Limite').expect(429);
    c.problemSchema.parse(blocked.body);
    expect(await prisma.tenant.count({ where: { isPresentation: true } })).toBe(before);
    Object.assign(env, { PRESENTATION_DAILY_LIMIT: 100 });
  });

  it('empresas de apresentação com mais de 7 dias são apagadas, com convite e respostas; as demais ficam', async () => {
    const old = await create('Velha Demonstração').expect(201);
    const fresh = await create('Recente Demonstração').expect(201);
    const oldTenant = await prisma.tenant.findFirstOrThrow({
      where: { name: 'Velha Demonstração' },
      orderBy: { createdAt: 'desc' },
    });
    const freshTenant = await prisma.tenant.findFirstOrThrow({
      where: { name: 'Recente Demonstração' },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.tenant.update({
      where: { id: oldTenant.id },
      data: { createdAt: new Date(Date.now() - 8 * 86_400_000) },
    });
    // uma empresa REAL antiga nunca pode ser apagada por essa limpeza
    const real = await prisma.tenant.create({
      data: {
        name: 'Empresa Real Antiga',
        slug: `real-${Date.now()}`,
        createdAt: new Date(Date.now() - 400 * 86_400_000),
      },
    });

    const purged = await app.get(RetentionService).purgePresentationTenants();
    expect(purged).toBeGreaterThanOrEqual(1);
    expect(await prisma.tenant.findUnique({ where: { id: oldTenant.id } })).toBeNull();
    expect(await prisma.invitation.count({ where: { tenantId: oldTenant.id } })).toBe(0);
    expect(await prisma.user.count({ where: { tenantId: oldTenant.id } })).toBe(0);
    expect(await prisma.tenant.findUnique({ where: { id: freshTenant.id } })).not.toBeNull();
    expect(await prisma.tenant.findUnique({ where: { id: real.id } })).not.toBeNull();
    // o link da empresa apagada deixa de existir
    await http()
      .get(`${api}/public/invitations/${(old.body.url as string).split('/t/')[1]}`)
      .expect(404);
    expect(fresh.body.url).toContain('/t/');
  });
});

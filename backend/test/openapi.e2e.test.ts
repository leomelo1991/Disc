import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { ROUTES } from '../src/openapi/build-openapi.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, createTenantWithInvitation, perfectAnswers } from './helpers.js';

const api = '/api/v1';

interface ExpressLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** Rotas realmente registradas no Express, no formato "método /caminho/{param}" (sem o prefixo /api/v1). */
function actualRoutes(app: INestApplication): string[] {
  const router = (app.getHttpAdapter().getInstance() as { router: { stack: ExpressLayer[] } }).router;
  const out: string[] = [];
  for (const layer of router.stack) {
    // ignora as rotas-curinga que o Nest registra para middlewares (ex.: '/api/v1{/*splat}')
    if (!layer.route || !layer.route.path.startsWith(api) || layer.route.path.includes('*')) continue;
    const path = layer.route.path.slice(api.length).replace(/:([A-Za-z]+)/g, '{$1}');
    for (const m of Object.keys(layer.route.methods)) out.push(`${m} ${path}`);
  }
  return out.sort();
}

describe('OpenAPI', () => {
  let app: INestApplication;
  const prisma = adminPrisma();

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => app.close());

  it('as rotas documentadas são exatamente as rotas reais (sem deriva)', () => {
    const documented = ROUTES.map((r) => `${r.method} ${r.path}`).sort();
    expect(actualRoutes(app)).toEqual(documented);
  });

  it('serve o documento em /api/docs-json e a interface em /api/docs', async () => {
    const json = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(json.body.openapi).toBe('3.0.3');
    expect(Object.keys(json.body.paths)).toContain('/reports/results/{id}/data-export');
    const ui = await request(app.getHttpServer()).get('/api/docs').expect(200);
    expect(ui.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
    // fora de /api/docs a CSP continua estrita
    const health = await request(app.getHttpServer()).get(`${api}/health`).expect(200);
    // scripts inline só são permitidos em /api/docs
    expect(health.headers['content-security-policy']).toContain("script-src 'self';");
  });

  it('respostas reais respeitam os schemas dos contratos', async () => {
    const http = () => request(app.getHttpServer());
    const run = Math.random().toString(36).slice(2, 8);
    const reg = await http()
      .post(`${api}/auth/register-tenant`)
      .send({
        companyName: `Contrato ${run}`,
        adminName: 'Ana',
        email: `contrato-${run}@x.com`,
        password: 'senha-forte-123',
      })
      .expect(201);
    c.sessionSchema.parse(reg.body);
    const auth = { Authorization: `Bearer ${reg.body.accessToken}` };

    c.tenantSchema.parse((await http().get(`${api}/tenant`).set(auth).expect(200)).body);
    c.userListSchema.parse((await http().get(`${api}/users`).set(auth).expect(200)).body);
    c.assessmentTypeListSchema.parse((await http().get(`${api}/assessment-types`).set(auth).expect(200)).body);
    const q = (await http().get(`${api}/assessment-types/DISC/questionnaires/current`).set(auth).expect(200)).body;
    c.questionnaireDetailSchema.parse(q);
    expect(q.groups).toHaveLength(24);

    const created = (await http().post(`${api}/invitations`).set(auth).send({ assessmentType: 'DISC' }).expect(201))
      .body;
    c.invitationCreatedSchema.parse(created);
    c.invitationListSchema.parse((await http().get(`${api}/invitations`).set(auth).expect(200)).body);

    const token = created.url.split('/t/')[1] as string;
    const pub = (await http().get(`${api}/public/invitations/${token}`).expect(200)).body;
    c.publicInvitationSchema.parse(pub);

    const factors = new Map(
      q.groups.flatMap((g: { options: Array<{ id: string; factor: string }> }) =>
        g.options.map((o) => [o.id, o.factor]),
      ),
    );
    const answers = perfectAnswers({
      groups: pub.questionnaire.groups.map((g: { options: Array<{ id: string }> }) => ({
        options: g.options.map((o) => ({ id: o.id, factor: factors.get(o.id) as string })),
      })),
    });
    const sub = await http()
      .post(`${api}/public/invitations/${token}/submit`)
      .set('Idempotency-Key', `contract-${run}-12345`)
      .send({ candidate: candidateBody, consent: { accepted: true, version: 'v1' }, answers })
      .expect(201);
    c.submitResponseSchema.parse(sub.body);

    const list = (await http().get(`${api}/reports/results`).set(auth).expect(200)).body;
    c.resultsPageSchema.parse(list);
    const id = list.items[0].id as string;
    c.resultDetailSchema.parse((await http().get(`${api}/reports/results/${id}`).set(auth).expect(200)).body);
    c.summarySchema.parse((await http().get(`${api}/reports/summary`).set(auth).expect(200)).body);
    c.dataExportSchema.parse((await http().get(`${api}/reports/results/${id}/data-export`).set(auth).expect(200)).body);

    // erros seguem o formato RFC 7807 documentado
    const err = await http().get(`${api}/reports/results/${id}`).expect(401);
    c.problemSchema.parse(err.body);
    expect(err.headers['content-type']).toContain('application/problem+json');
    await prisma.$queryRaw`SELECT 1`;
  });

  it('exportação de dados do titular: só ADMIN, só da própria empresa, e fica auditada', async () => {
    const a = await createTenantWithInvitation(prisma);
    const b = await createTenantWithInvitation(prisma);
    const { hash } = await import('@node-rs/argon2').then(async (m) => ({ hash: await m.hash('senha-forte-123') }));
    for (const t of [a, b]) await prisma.user.update({ where: { id: t.user.id }, data: { passwordHash: hash } });
    const rec = await prisma.user.create({
      data: {
        tenantId: a.tenant.id,
        name: 'Rec',
        email: `rec-${a.tenant.slug}@x.com`,
        passwordHash: hash,
        role: 'RECRUITER',
      },
    });
    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post(`${api}/auth/login`)
          .send({ email, password: 'senha-forte-123' })
          .expect(200)
      ).body.accessToken as string;

    await request(app.getHttpServer())
      .post(`${api}/public/invitations/${a.token}/submit`)
      .set('Idempotency-Key', `export-${a.tenant.id}`)
      .send({
        candidate: candidateBody,
        consent: { accepted: true, version: 'v1' },
        answers: perfectAnswers(a.questionnaire),
      })
      .expect(201);
    const sub = await prisma.submission.findUniqueOrThrow({ where: { invitationId: a.invitation.id } });

    const adminA = await login(a.user.email);
    const recA = await login(rec.email);
    const adminB = await login(b.user.email);
    const url = `${api}/reports/results/${sub.id}/data-export`;

    await request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${recA}`).expect(403);
    await request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${adminB}`).expect(404);
    const ok = await request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${adminA}`).expect(200);
    expect(ok.headers['content-disposition']).toContain('attachment');
    const data = c.dataExportSchema.parse(ok.body);
    expect(data.candidate.email).toBe(candidateBody.email);
    expect(data.answers).toHaveLength(96);
    expect(data.profile.scores).toEqual({ D: 96, I: 72, S: 48, C: 24 });
    expect(await prisma.auditLog.count({ where: { tenantId: a.tenant.id, action: 'DATA_EXPORTED' } })).toBe(1);
  });
});

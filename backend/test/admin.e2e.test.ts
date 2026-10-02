import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/infra/prisma/generated/client.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, perfectAnswers } from './helpers.js';

const api = '/api/v1';

describe('Administração', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const run = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    app = await createApp();
    prisma = adminPrisma();
  });
  afterAll(async () => app.close());

  const http = () => request(app.getHttpServer());

  async function register(name: string) {
    const res = await http()
      .post(`${api}/auth/register-tenant`)
      .send({
        companyName: name,
        adminName: 'Admin',
        email: `admin-${name}-${run}@x.com`.replace(/\s/g, ''),
        password: 'senha-forte-123',
      })
      .expect(201);
    return {
      token: res.body.accessToken as string,
      cookie: res.headers['set-cookie'] as unknown as string[],
      user: res.body.user,
    };
  }

  async function answerInvitation(adminToken: string, role: string, dept: string, name: string) {
    const created = await http()
      .post(`${api}/invitations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assessmentType: 'DISC', targetRole: role, targetDepartment: dept, expiresInDays: 7 })
      .expect(201);
    const token = created.body.url.split('/t/')[1] as string;
    const q = await http().get(`${api}/public/invitations/${token}`).expect(200);
    const answers = perfectAnswers({
      groups: q.body.questionnaire.groups.map((g: { options: Array<{ id: string; label: string }> }) => ({
        options: g.options.map((o, i) => ({ id: o.id, factor: ['D', 'I', 'S', 'C'][i]! })),
      })),
    });
    await http()
      .post(`${api}/public/invitations/${token}/submit`)
      .set('Idempotency-Key', `key-${name}-${run}-1234`)
      .send({
        candidate: { ...candidateBody, name, jobTitle: role, department: dept },
        consent: { accepted: true, version: 'v1' },
        answers,
      })
      .expect(201);
    return created.body;
  }

  it('rotas protegidas exigem autenticação', async () => {
    await http().get(`${api}/reports/results`).expect(401);
    await http().post(`${api}/invitations`).send({}).expect(401);
  });

  it('login, refresh rotativo (uso único) e logout', async () => {
    await register(`Login${run}`);
    const email = `admin-Login${run}-${run}@x.com`;
    await http().post(`${api}/auth/login`).send({ email, password: 'errada-12345' }).expect(401);
    const login = await http().post(`${api}/auth/login`).send({ email, password: 'senha-forte-123' }).expect(200);
    const cookie = login.headers['set-cookie'] as unknown as string[];
    expect(cookie[0]).toMatch(/HttpOnly/i);

    const r1 = await http().post(`${api}/auth/refresh`).set('Cookie', cookie).expect(200);
    expect(r1.body.accessToken).toBeTruthy();
    // o refresh antigo já foi consumido
    await http().post(`${api}/auth/refresh`).set('Cookie', cookie).expect(401);

    const newCookie = r1.headers['set-cookie'] as unknown as string[];
    await http().post(`${api}/auth/logout`).set('Cookie', newCookie).expect(204);
    await http().post(`${api}/auth/refresh`).set('Cookie', newCookie).expect(401);
  });

  it('fluxo completo: convite → resposta → relatório com filtros, detalhe, resumo e CSV', async () => {
    const a = await register(`Flow${run}`);
    const created = await answerInvitation(a.token, 'Analista', 'RH', 'Maria Silva');
    expect(created.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\?text=/);
    await answerInvitation(a.token, 'Gerente', 'Vendas', 'João Souza');
    const auth = { Authorization: `Bearer ${a.token}` };

    const all = await http().get(`${api}/reports/results`).set(auth).expect(200);
    expect(all.body.items).toHaveLength(2);
    const byName = await http().get(`${api}/reports/results?q=maria`).set(auth).expect(200);
    expect(byName.body.items.map((i: { candidate: { name: string } }) => i.candidate.name)).toEqual(['Maria Silva']);
    const byDept = await http().get(`${api}/reports/results?department=vendas&primaryFactor=D`).set(auth).expect(200);
    expect(byDept.body.items).toHaveLength(1);
    const none = await http().get(`${api}/reports/results?primaryFactor=C`).set(auth).expect(200);
    expect(none.body.items).toHaveLength(0);

    const page1 = await http().get(`${api}/reports/results?limit=1`).set(auth).expect(200);
    expect(page1.body.nextCursor).toBeTruthy();
    const page2 = await http()
      .get(`${api}/reports/results?limit=1&cursor=${page1.body.nextCursor}`)
      .set(auth)
      .expect(200);
    expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
    expect(page2.body.nextCursor).toBeNull();

    const detail = await http().get(`${api}/reports/results/${all.body.items[0].id}`).set(auth).expect(200);
    expect(detail.body.summary.interviewQuestions.length).toBeGreaterThan(0);
    expect(detail.body.scores).toEqual({ D: 96, I: 72, S: 48, C: 24 });

    const summary = await http().get(`${api}/reports/summary`).set(auth).expect(200);
    expect(summary.body).toEqual({ total: 2, byFactor: { D: 2, I: 0, S: 0, C: 0 } });

    const csv = await http().get(`${api}/reports/results/export.csv`).set(auth).expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Maria Silva');

    const audits = await prisma.auditLog.findMany({ where: { tenantId: a.user.tenantId } });
    expect(audits.map((x) => x.action)).toEqual(
      expect.arrayContaining(['INVITATION_CREATED', 'RESULT_VIEWED', 'REPORT_EXPORTED']),
    );
  });

  it('CSV neutraliza injeção de fórmula', async () => {
    const a = await register(`Csv${run}`);
    await answerInvitation(a.token, '=HYPERLINK("http://evil")', 'RH', 'Fulano');
    const csv = await http()
      .get(`${api}/reports/results/export.csv`)
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(csv.text).toContain(`"'=HYPERLINK`);
  });

  it('isolamento entre empresas: B não vê nem acessa dados de A', async () => {
    const a = await register(`IsoA${run}`);
    const b = await register(`IsoB${run}`);
    await answerInvitation(a.token, 'Analista', 'RH', 'Pessoa da A');
    const bAuth = { Authorization: `Bearer ${b.token}` };
    const aAuth = { Authorization: `Bearer ${a.token}` };

    const aList = await http().get(`${api}/reports/results`).set(aAuth).expect(200);
    const id = aList.body.items[0].id as string;
    expect((await http().get(`${api}/reports/results`).set(bAuth).expect(200)).body.items).toHaveLength(0);
    await http().get(`${api}/reports/results/${id}`).set(bAuth).expect(404);
    expect((await http().get(`${api}/reports/summary`).set(bAuth)).body.total).toBe(0);

    const inv = await http().get(`${api}/invitations`).set(aAuth).expect(200);
    await http().post(`${api}/invitations/${inv.body.items[0].id}/revoke`).set(bAuth).expect(404);
    const csvB = await http().get(`${api}/reports/results/export.csv`).set(bAuth).expect(200);
    expect(csvB.text).not.toContain('Pessoa da A');
  });

  it('recrutador gera convites e vê relatórios, mas não gerencia usuários', async () => {
    const a = await register(`Rbac${run}`);
    const auth = { Authorization: `Bearer ${a.token}` };
    await http()
      .post(`${api}/users`)
      .set(auth)
      .send({ name: 'Recrutadora', email: `rec-${run}@x.com`, password: 'senha-forte-123', role: 'RECRUITER' })
      .expect(201);
    const login = await http()
      .post(`${api}/auth/login`)
      .send({ email: `rec-${run}@x.com`, password: 'senha-forte-123' })
      .expect(200);
    const rAuth = { Authorization: `Bearer ${login.body.accessToken}` };

    await http().get(`${api}/users`).set(rAuth).expect(403);
    await http().patch(`${api}/tenant`).set(rAuth).send({ name: 'Nova' }).expect(403);
    await http().post(`${api}/invitations`).set(rAuth).send({ assessmentType: 'DISC' }).expect(201);
    await http().get(`${api}/reports/results`).set(rAuth).expect(200);
  });

  it('admin não consegue remover o próprio acesso de administrador', async () => {
    const a = await register(`Self${run}`);
    await http()
      .patch(`${api}/users/${a.user.id}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ active: false })
      .expect(409);
  });

  it('registro com e-mail inválido ou senha curta retorna 422', async () => {
    await http()
      .post(`${api}/auth/register-tenant`)
      .send({ companyName: 'X Y', adminName: 'Ad', email: 'ruim', password: '123' })
      .expect(422);
  });
});

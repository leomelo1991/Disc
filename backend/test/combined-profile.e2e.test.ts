import type { INestApplication } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as c from '@disc/contracts';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, createTenantWithInvitation } from './helpers.js';

const api = '/api/v1';

type Tenant = Awaited<ReturnType<typeof createTenantWithInvitation>>;

/**
 * Respostas em que D e I disputam o topo: em `dWins` grupos D=4/I=3 e nos demais D=3/I=4 (S=2, C=1 sempre).
 * Com 24 grupos: D = 3·24 + dWins, I = 3·24 + (24 − dWins) → diferença bruta = 2·dWins − 24.
 */
function duelAnswers(q: Tenant['questionnaire'], dWins: number) {
  return q.groups.flatMap((g, idx) =>
    g.options.map((o) => {
      const dFirst = idx < dWins;
      const rank = o.factor === 'D' ? (dFirst ? 4 : 3) : o.factor === 'I' ? (dFirst ? 3 : 4) : o.factor === 'S' ? 2 : 1;
      return { optionId: o.id, rank };
    }),
  );
}

describe('Perfis combinados e empate técnico', () => {
  const prisma = adminPrisma();
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => app.close());

  const http = () => request(app.getHttpServer());

  async function submit(dWins: number) {
    const t = await createTenantWithInvitation(prisma);
    const passwordHash = await hash('senha-forte-123');
    await prisma.user.update({ where: { id: t.user.id }, data: { passwordHash } });
    const res = await http()
      .post(`${api}/public/invitations/${t.token}/submit`)
      .set('Idempotency-Key', `duel-${t.tenant.id}`)
      .send({
        candidate: candidateBody,
        consent: { accepted: true, version: 'v1' },
        answers: duelAnswers(t.questionnaire, dWins),
      })
      .expect(201);
    const login = await http()
      .post(`${api}/auth/login`)
      .send({ email: t.user.email, password: 'senha-forte-123' })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };
    const list = c.resultsPageSchema.parse((await http().get(`${api}/reports/results`).set(auth).expect(200)).body);
    const detail = c.resultDetailSchema.parse(
      (await http().get(`${api}/reports/results/${list.items[0]!.id}`).set(auth).expect(200)).body,
    );
    return { summary: c.submitResponseSchema.parse(res.body).candidateSummary, list: list.items[0]!, detail, auth };
  }

  it('empate exato (12 × 12): mostra principal, secundário e o resultado dos dois, e avisa do empate', async () => {
    const { summary, list, detail } = await submit(12);
    expect(summary.tied).toBe(true);
    expect(summary.code).toBe('DI'); // desempate por precedência D > I > S > C
    expect(summary.primaryProfile.factor).toBe('D');
    expect(summary.secondaryProfile.factor).toBe('I');
    expect(summary.combined.name).toBe('Dominância com Influência');
    expect(summary.combined.strengths.length).toBeGreaterThan(0);
    expect(summary.tieNote).toContain('Dominância (D)');
    expect(summary.tieNote).toContain('Influência (I)');
    expect(list).toMatchObject({ code: 'DI', tied: true, primaryFactor: 'D', secondaryFactor: 'I' });
    expect(detail).toMatchObject({ code: 'DI', gap: 0, tied: true });
    expect(detail.summary.tieNote).toBe(summary.tieNote);
  });

  it('2 pontos brutos (13 × 11) é empate; 4 pontos (14 × 10, 5,6 pp) e 6 pontos não são (a fronteira 3 × 4 está no teste do núcleo)', async () => {
    const near = await submit(13); // D=85, I=83 → 2 pontos brutos
    expect(near.detail).toMatchObject({ code: 'DI', gap: 2.8, tied: true });

    const six = await submit(15); // D=87, I=81 → 6 pontos brutos
    expect(six.detail.tied).toBe(false);
    expect(six.summary.tieNote).toBeUndefined();

    const four = await submit(14); // D=86, I=82 → 4 pontos brutos = 5,6 pp
    expect(four.detail).toMatchObject({ code: 'DI', gap: 5.6, tied: false });
    expect(four.list.tied).toBe(false);
    expect(four.summary.tieNote).toBeUndefined();
  });

  it('a ordem importa: I na frente gera ID, com leitura diferente de DI', async () => {
    const di = await submit(14);
    const id = await submit(10); // D=82, I=86
    expect(id.summary.code).toBe('ID');
    expect(id.summary.primaryProfile.factor).toBe('I');
    expect(id.summary.secondaryProfile.factor).toBe('D');
    expect(id.summary.combined.name).toBe('Influência com Dominância');
    expect(id.summary.combined.headline).not.toBe(di.summary.combined.headline);
    expect(id.summary.description).not.toBe(di.summary.description);
  });

  it('candidato não recebe conteúdo de recrutador; recrutador recebe a leitura combinada e a de cada fator', async () => {
    const { summary, detail } = await submit(12);
    const json = JSON.stringify(summary);
    for (const key of ['interviewQuestions', 'attention', 'communication', 'idealEnvironment', 'motivators', '"gap"']) {
      expect(json, key).not.toContain(key);
    }
    expect(detail.summary.interviewQuestions.length).toBeGreaterThan(0);
    expect(detail.summary.primaryDetails.attention.length).toBeGreaterThan(0);
    expect(detail.summary.secondaryDetails.interviewQuestions.length).toBeGreaterThan(0);
    expect(detail.summary.gap).toBe(0);
  });

  it('o CSV traz o perfil combinado e se houve empate', async () => {
    const { auth } = await submit(12);
    const csv = (await http().get(`${api}/reports/results/export.csv`).set(auth).expect(200)).text;
    const [header, row] = csv.replace('﻿', '').split('\r\n');
    expect(header).toContain('"Perfil combinado","Empate"');
    expect(row).toContain('"DI","Sim"');
  });
});

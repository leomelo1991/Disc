import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/infra/prisma/generated/client.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, createTenantWithInvitation, perfectAnswers } from './helpers.js';

describe('Fluxo do candidato', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createApp();
    prisma = adminPrisma();
  });
  afterAll(async () => app.close());

  const payload = (q: Parameters<typeof perfectAnswers>[0]) => ({
    candidate: candidateBody,
    consent: { accepted: true, version: '2026-10' },
    answers: perfectAnswers(q),
  });

  it('GET devolve questionário sem expor os fatores', async () => {
    const { token } = await createTenantWithInvitation(prisma);
    const res = await request(app.getHttpServer()).get(`/api/v1/public/invitations/${token}`).expect(200);
    expect(res.body.questionnaire.groups).toHaveLength(24);
    expect(JSON.stringify(res.body)).not.toContain('"factor"');
  });

  it('token inexistente, revogado e expirado retornam 404 uniforme', async () => {
    const revoked = await createTenantWithInvitation(prisma, { status: 'REVOKED' });
    const expired = await createTenantWithInvitation(prisma, { expiresInMs: -1000 });
    for (const t of ['token-que-nao-existe', revoked.token, expired.token]) {
      await request(app.getHttpServer()).get(`/api/v1/public/invitations/${t}`).expect(404);
    }
  });

  it('submit grava tudo e devolve o resumo do candidato (D primário)', async () => {
    const { token, questionnaire, invitation } = await createTenantWithInvitation(prisma);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .set('Idempotency-Key', 'key-1234567890')
      .send(payload(questionnaire))
      .expect(201);
    expect(res.body.candidateSummary.primary).toBe('D');
    expect(res.body.candidateSummary.interviewQuestions).toBeUndefined();

    const sub = await prisma.submission.findUniqueOrThrow({
      where: { invitationId: invitation.id },
      include: { candidate: true, profile: true, answers: true, invitation: true },
    });
    expect(sub.answers).toHaveLength(96);
    expect(sub.candidate?.name).toBe('Maria Silva');
    expect(sub.profile).toMatchObject({ scoreD: 96, scoreI: 72, scoreS: 48, scoreC: 24, primaryFactor: 'D' });
    expect(sub.invitation.status).toBe('COMPLETED');
  });

  it('reenvio com a mesma Idempotency-Key devolve o resumo sem duplicar', async () => {
    const { token, questionnaire, invitation } = await createTenantWithInvitation(prisma);
    const send = () =>
      request(app.getHttpServer())
        .post(`/api/v1/public/invitations/${token}/submit`)
        .set('Idempotency-Key', 'key-repeat-12345')
        .send(payload(questionnaire));
    const a = await send().expect(201);
    const b = await send().expect(201);
    expect(b.body).toEqual(a.body);
    expect(await prisma.submission.count({ where: { invitationId: invitation.id } })).toBe(1);
  });

  it('segunda submissão com outra chave retorna 409', async () => {
    const { token, questionnaire } = await createTenantWithInvitation(prisma);
    await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .set('Idempotency-Key', 'key-first-12345')
      .send(payload(questionnaire))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .set('Idempotency-Key', 'key-other-12345')
      .send(payload(questionnaire))
      .expect(409);
  });

  it('envios concorrentes com chaves diferentes: só um vence, nada duplica', async () => {
    const { token, questionnaire, invitation } = await createTenantWithInvitation(prisma);
    const results = await Promise.all(
      ['key-race-aaaaaa', 'key-race-bbbbbb', 'key-race-cccccc'].map((k) =>
        request(app.getHttpServer())
          .post(`/api/v1/public/invitations/${token}/submit`)
          .set('Idempotency-Key', k)
          .send(payload(questionnaire)),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await prisma.submission.count({ where: { invitationId: invitation.id } })).toBe(1);
  });

  it('rank repetido no grupo retorna 422 e não grava nada', async () => {
    const { token, questionnaire, invitation } = await createTenantWithInvitation(prisma);
    const body = payload(questionnaire);
    body.answers[1]!.rank = body.answers[0]!.rank;
    await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .set('Idempotency-Key', 'key-invalid-123')
      .send(body)
      .expect(422);
    expect(await prisma.submission.count({ where: { invitationId: invitation.id } })).toBe(0);
    const inv = await prisma.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(inv.status).toBe('PENDING');
  });

  it('exige Idempotency-Key e consentimento', async () => {
    const { token, questionnaire } = await createTenantWithInvitation(prisma);
    await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .send(payload(questionnaire))
      .expect(400);
    const body = { ...payload(questionnaire), consent: { accepted: false, version: 'x' } };
    await request(app.getHttpServer())
      .post(`/api/v1/public/invitations/${token}/submit`)
      .set('Idempotency-Key', 'key-consent-123')
      .send(body)
      .expect(422);
  });
});

describe('Saúde', () => {
  it('/health e /ready respondem', async () => {
    const app = await createApp();
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
    await app.close();
  });
});

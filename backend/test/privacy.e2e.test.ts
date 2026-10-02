import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../src/infra/prisma/generated/client.js';
import { adminPrisma } from './admin-db.js';
import { RetentionService } from '../src/modules/privacy/retention.service.js';
import { candidateBody, createApp, createTenantWithInvitation, perfectAnswers } from './helpers.js';

const api = '/api/v1';

describe('LGPD', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createApp();
    prisma = adminPrisma();
  });
  afterAll(async () => app.close());

  async function submitFor(ctx: Awaited<ReturnType<typeof createTenantWithInvitation>>) {
    await request(app.getHttpServer())
      .post(`${api}/public/invitations/${ctx.token}/submit`)
      .set('Idempotency-Key', `key-${ctx.invitation.id}`)
      .send({
        candidate: candidateBody,
        consent: { accepted: true, version: 'v1' },
        answers: perfectAnswers(ctx.questionnaire),
      })
      .expect(201);
    return prisma.submission.findUniqueOrThrow({ where: { invitationId: ctx.invitation.id } });
  }

  it('retenção remove só o que passou do prazo da própria empresa', async () => {
    const old = await createTenantWithInvitation(prisma);
    const recent = await createTenantWithInvitation(prisma);
    const oldSub = await submitFor(old);
    const recentSub = await submitFor(recent);
    await prisma.tenant.update({ where: { id: old.tenant.id }, data: { retentionDays: 30 } });
    await prisma.submission.update({
      where: { id: oldSub.id },
      data: { submittedAt: new Date(Date.now() - 60 * 86_400_000) },
    });

    const purged = await app.get(RetentionService).purgeExpired();
    expect(purged).toBeGreaterThanOrEqual(1);
    expect(await prisma.submission.findUnique({ where: { id: oldSub.id } })).toBeNull();
    expect(await prisma.candidate.count({ where: { submissionId: oldSub.id } })).toBe(0);
    expect(await prisma.answer.count({ where: { submissionId: oldSub.id } })).toBe(0);
    expect(await prisma.submission.findUnique({ where: { id: recentSub.id } })).not.toBeNull();
  });

  it('admin apaga um candidato; outro tenant e recrutador não conseguem', async () => {
    const a = await createTenantWithInvitation(prisma);
    const sub = await submitFor(a);
    const login = async (email: string) =>
      (
        await request(app.getHttpServer())
          .post(`${api}/auth/login`)
          .send({ email, password: 'senha-forte-123' })
          .expect(200)
      ).body.accessToken as string;

    const { hash } = await import('@node-rs/argon2').then(async (m) => ({ hash: await m.hash('senha-forte-123') }));
    await prisma.user.update({ where: { id: a.user.id }, data: { passwordHash: hash } });
    const recruiter = await prisma.user.create({
      data: {
        tenantId: a.tenant.id,
        name: 'Rec',
        email: `rec-${a.tenant.slug}@x.com`,
        passwordHash: hash,
        role: 'RECRUITER',
      },
    });
    const admin = await login(a.user.email);
    const rec = await login(recruiter.email);

    const other = await createTenantWithInvitation(prisma);
    await prisma.user.update({ where: { id: other.user.id }, data: { passwordHash: hash } });
    const otherAdmin = await login(other.user.email);

    await request(app.getHttpServer())
      .delete(`${api}/reports/results/${sub.id}`)
      .set('Authorization', `Bearer ${rec}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`${api}/reports/results/${sub.id}`)
      .set('Authorization', `Bearer ${otherAdmin}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`${api}/reports/results/${sub.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);
    expect(await prisma.submission.findUnique({ where: { id: sub.id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { tenantId: a.tenant.id, action: 'RESULT_ERASED' } })).toBe(1);
  });
});

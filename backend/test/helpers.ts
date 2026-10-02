import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import type { PrismaClient } from '../src/infra/prisma/generated/client.js';
import { generateToken, sha256 } from '../src/shared/tokens.js';
import { configureApp } from '../src/configure-app.js';

export async function createApp(): Promise<INestApplication> {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function createTenantWithInvitation(
  prisma: PrismaClient,
  opts: { status?: 'PENDING' | 'REVOKED' | 'COMPLETED'; expiresInMs?: number } = {},
) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const tenant = await prisma.tenant.create({ data: { name: `Empresa ${suffix}`, slug: `empresa-${suffix}` } });
  const user = await prisma.user.create({
    data: { tenantId: tenant.id, name: 'Admin', email: `admin-${suffix}@x.com`, passwordHash: 'x', role: 'ADMIN' },
  });
  const questionnaire = await prisma.questionnaire.findFirstOrThrow({
    where: { assessmentType: { code: 'DISC' }, version: 1 },
    include: { groups: { orderBy: { position: 'asc' }, include: { options: true } } },
  });
  const token = generateToken();
  const invitation = await prisma.invitation.create({
    data: {
      tenantId: tenant.id,
      questionnaireId: questionnaire.id,
      createdById: user.id,
      tokenHash: sha256(token),
      status: opts.status ?? 'PENDING',
      expiresAt: new Date(Date.now() + (opts.expiresInMs ?? 86_400_000)),
    },
  });
  return { tenant, user, token, invitation, questionnaire };
}

export const candidateBody = {
  name: 'Maria Silva',
  phone: '+5511999998888',
  email: 'maria@example.com',
  jobTitle: 'Analista',
  department: 'RH',
  birthDate: '1990-05-20',
};

/** Respostas D=4,I=3,S=2,C=1 em todos os grupos. */
export function perfectAnswers(q: { groups: Array<{ options: Array<{ id: string; factor: string }> }> }) {
  const rank: Record<string, number> = { D: 4, I: 3, S: 2, C: 1 };
  return q.groups.flatMap((g) => g.options.map((o) => ({ optionId: o.id, rank: rank[o.factor]! })));
}

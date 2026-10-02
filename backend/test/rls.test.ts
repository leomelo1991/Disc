import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infra/prisma/prisma.service.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createTenantWithInvitation, perfectAnswers } from './helpers.js';

/**
 * Prova que o ISOLAMENTO É DO BANCO: aqui o código "esquece" o filtro de tenant de propósito
 * e, mesmo assim, o papel disc_app não enxerga nem grava dados de outra empresa.
 */
describe('Row Level Security', () => {
  const admin = adminPrisma();
  const app = new PrismaService();
  let a: Awaited<ReturnType<typeof createTenantWithInvitation>>;
  let b: Awaited<ReturnType<typeof createTenantWithInvitation>>;

  beforeAll(async () => {
    await app.$connect();
    a = await createTenantWithInvitation(admin);
    b = await createTenantWithInvitation(admin);
    // uma submissão completa em cada empresa (criada como dono)
    for (const t of [a, b]) {
      const sub = await admin.submission.create({
        data: {
          tenantId: t.tenant.id,
          invitationId: t.invitation.id,
          idempotencyKey: `rls-${t.tenant.id}`,
          consentAt: new Date(),
          consentVersion: 'v1',
        },
      });
      await admin.candidate.create({
        data: { tenantId: t.tenant.id, submissionId: sub.id, ...candidateBody, birthDate: new Date('1990-01-01') },
      });
      const answers = perfectAnswers(t.questionnaire);
      await admin.answer.createMany({
        data: t.questionnaire.groups.flatMap((g) =>
          g.options.map((o) => ({
            submissionId: sub.id,
            groupId: g.id,
            optionId: o.id,
            rank: answers.find((x) => x.optionId === o.id)!.rank,
          })),
        ),
      });
      await admin.profileResult.create({
        data: {
          submissionId: sub.id,
          scoreD: 96,
          scoreI: 72,
          scoreS: 48,
          scoreC: 24,
          primaryFactor: 'D',
          secondaryFactor: 'I',
          questionnaireVersion: 1,
        },
      });
    }
  });
  afterAll(async () => app.$disconnect());

  it('sem contexto de empresa, nada é visível (falha fechada)', async () => {
    expect(await app.tenant.count()).toBe(0);
    expect(await app.user.count()).toBe(0);
    expect(await app.invitation.count()).toBe(0);
    expect(await app.submission.count()).toBe(0);
    expect(await app.candidate.count()).toBe(0);
    expect(await app.answer.count()).toBe(0);
    expect(await app.profileResult.count()).toBe(0);
    expect(await app.auditLog.count()).toBe(0);
  });

  it('no contexto de A, uma query SEM filtro só devolve linhas de A', async () => {
    await app.withTenant(a.tenant.id, async (tx) => {
      const tenants = await tx.tenant.findMany();
      expect(tenants.map((t) => t.id)).toEqual([a.tenant.id]);
      expect((await tx.candidate.findMany()).every((c) => c.tenantId === a.tenant.id)).toBe(true);
      expect((await tx.submission.findMany()).map((s) => s.tenantId)).toEqual([a.tenant.id]);
      expect((await tx.invitation.findMany()).map((i) => i.id)).toEqual([a.invitation.id]);
      // tabelas filhas sem tenant_id também ficam isoladas (via submissão pai)
      expect(await tx.answer.count()).toBe(96);
      expect(await tx.profileResult.count()).toBe(1);
    });
  });

  it('não consegue ler, alterar nem apagar dados de outra empresa', async () => {
    await app.withTenant(a.tenant.id, async (tx) => {
      expect(await tx.submission.findUnique({ where: { invitationId: b.invitation.id } })).toBeNull();
      expect(
        (await tx.candidate.updateMany({ where: { tenantId: b.tenant.id }, data: { name: 'invadido' } })).count,
      ).toBe(0);
      expect((await tx.submission.deleteMany({ where: { tenantId: b.tenant.id } })).count).toBe(0);
      expect((await tx.user.updateMany({ data: { name: 'invadido' }, where: { id: b.user.id } })).count).toBe(0);
    });
    expect(await admin.candidate.count({ where: { tenantId: b.tenant.id, name: 'invadido' } })).toBe(0);
    expect(await admin.submission.count({ where: { tenantId: b.tenant.id } })).toBe(1);
  });

  it('não consegue gravar linha em nome de outra empresa (WITH CHECK)', async () => {
    await expect(
      app.withTenant(a.tenant.id, (tx) => tx.auditLog.create({ data: { tenantId: b.tenant.id, action: 'FORJADO' } })),
    ).rejects.toThrow();
    await expect(
      app.withTenant(a.tenant.id, (tx) =>
        tx.user.create({
          data: {
            tenantId: b.tenant.id,
            name: 'x',
            email: `forjado-${Date.now()}@x.com`,
            passwordHash: 'x',
            role: 'ADMIN',
          },
        }),
      ),
    ).rejects.toThrow();
    expect(await admin.auditLog.count({ where: { action: 'FORJADO' } })).toBe(0);
  });

  it('o contexto não vaza entre requisições na mesma conexão do pool', async () => {
    await app.withTenant(a.tenant.id, (tx) => tx.submission.count());
    for (let i = 0; i < 5; i++) expect(await app.submission.count()).toBe(0);
  });

  it('o papel da aplicação não altera o catálogo de questionários', async () => {
    await expect(app.questionnaire.updateMany({ data: { version: 999 } })).rejects.toThrow();
    await expect(app.questionOption.deleteMany()).rejects.toThrow();
    expect(await app.questionnaire.count()).toBeGreaterThan(0); // leitura permitida
  });

  it('funções SECURITY DEFINER expõem só o necessário', async () => {
    const hash = (await import('../src/shared/tokens.js')).sha256(a.token);
    const [row] = await app.$queryRaw<Array<{ tenantId: string }>>`SELECT * FROM public_invitation_by_hash(${hash})`;
    expect(row?.tenantId).toBe(a.tenant.id);
    expect(await app.$queryRaw`SELECT * FROM public_invitation_by_hash('hash-inexistente')`).toEqual([]);
    const users = await app.$queryRaw<unknown[]>`SELECT * FROM auth_users_by_email(${a.user.email})`;
    expect(users).toHaveLength(1);
  });
});

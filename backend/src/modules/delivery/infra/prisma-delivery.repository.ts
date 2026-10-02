import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../infra/prisma/generated/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import {
  DeliveryRepository,
  type InvitationView,
  type QuestionnaireView,
  type SaveSubmissionInput,
  type StoredSubmission,
} from '../application/ports.js';
import { InvitationUnavailableError } from '../domain/invitation.js';

@Injectable()
export class PrismaDeliveryRepository extends DeliveryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  /** Busca entre empresas: usa a função SECURITY DEFINER, única porta para ler convite sem contexto de empresa. */
  async findInvitationByTokenHash(hash: string): Promise<InvitationView | null> {
    const rows = await this.prisma.$queryRaw<InvitationView[]>`SELECT * FROM public_invitation_by_hash(${hash})`;
    return rows[0] ?? null;
  }

  async loadQuestionnaire(id: string): Promise<QuestionnaireView> {
    const q = await this.prisma.questionnaire.findUniqueOrThrow({
      where: { id },
      include: {
        groups: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
      },
    });
    return {
      id: q.id,
      version: q.version,
      groups: q.groups.map((g) => ({
        id: g.id,
        options: g.options.map((o) => ({ id: o.id, factor: o.factor, label: o.label })),
      })),
    };
  }

  async findSubmission(tenantId: string, invitationId: string): Promise<StoredSubmission | null> {
    const s = await this.prisma.withTenant(tenantId, (tx) =>
      tx.submission.findUnique({
        where: { invitationId },
        include: {
          profile: true,
          invitation: { include: { questionnaire: { include: { _count: { select: { groups: true } } } } } },
        },
      }),
    );
    if (!s?.profile) return null;
    return {
      idempotencyKey: s.idempotencyKey,
      scores: { D: s.profile.scoreD, I: s.profile.scoreI, S: s.profile.scoreS, C: s.profile.scoreC },
      groupCount: s.invitation.questionnaire._count.groups,
    };
  }

  async saveSubmission(i: SaveSubmissionInput): Promise<void> {
    try {
      await this.prisma.withTenant(i.invitation.tenantId, async (tx) => {
        // Transição atômica: só um envio consegue mover o convite para COMPLETED.
        const claimed = await tx.invitation.updateMany({
          where: { id: i.invitation.id, status: { in: ['PENDING', 'STARTED'] } },
          data: { status: 'COMPLETED' },
        });
        if (claimed.count === 0) throw new InvitationUnavailableError('COMPLETED');

        const submission = await tx.submission.create({
          data: {
            tenantId: i.invitation.tenantId,
            invitationId: i.invitation.id,
            idempotencyKey: i.idempotencyKey,
            consentAt: i.now,
            consentVersion: i.dto.consent.version,
            submittedAt: i.now,
          },
        });
        await tx.candidate.create({
          data: {
            tenantId: i.invitation.tenantId,
            submissionId: submission.id,
            name: i.dto.candidate.name,
            phone: i.dto.candidate.phone,
            email: i.dto.candidate.email,
            jobTitle: i.dto.candidate.jobTitle,
            department: i.dto.candidate.department,
            birthDate: new Date(`${i.dto.candidate.birthDate}T00:00:00Z`),
          },
        });
        await tx.answer.createMany({
          data: i.answers.map((a) => ({
            submissionId: submission.id,
            groupId: a.groupId,
            optionId: a.optionId,
            rank: a.rank,
          })),
        });
        await tx.profileResult.create({
          data: {
            submissionId: submission.id,
            scoreD: i.scores.D,
            scoreI: i.scores.I,
            scoreS: i.scores.S,
            scoreC: i.scores.C,
            primaryFactor: i.primary,
            secondaryFactor: i.secondary,
            questionnaireVersion: i.questionnaire.version,
            calculatedAt: i.now,
          },
        });
      });
    } catch (e) {
      // Corrida: outro envio com a mesma chave/convite criou a submissão primeiro.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new InvitationUnavailableError('COMPLETED');
      }
      throw e;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { SubmitAssessmentDto } from '@disc/contracts';
import { buildProfile, calculateProfile, candidateSummary, InvalidAnswersError } from '@disc/core';
import { ApplicationError } from '../../../shared/application-error.js';
import { sha256 } from '../../../shared/tokens.js';
import { assertInvitationAvailable, InvitationUnavailableError } from '../domain/invitation.js';
import { Clock, DeliveryRepository } from './ports.js';

@Injectable()
export class SubmitAssessment {
  constructor(
    @Inject(DeliveryRepository) private readonly repo: DeliveryRepository,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async execute(token: string, idempotencyKey: string, dto: SubmitAssessmentDto) {
    const inv = await this.repo.findInvitationByTokenHash(sha256(token));
    if (!inv) throw new ApplicationError('NOT_FOUND', 'Convite não encontrado');

    // Reenvio idempotente: mesma chave devolve o mesmo resumo sem gravar de novo.
    const existing = await this.repo.findSubmission(inv.tenantId, inv.id);
    if (existing) {
      if (existing.idempotencyKey === idempotencyKey) {
        return {
          candidateSummary: candidateSummary(buildProfile(existing.scores, existing.groupCount)),
          replayed: true,
        };
      }
      throw new ApplicationError('CONFLICT', 'Convite já utilizado', 'INVITATION_USED');
    }

    try {
      assertInvitationAvailable(inv, this.clock.now());
    } catch (e) {
      if (e instanceof InvitationUnavailableError) throw this.toHttp(e);
      throw e;
    }

    const questionnaire = await this.repo.loadQuestionnaire(inv.questionnaireId);
    const optionToGroup = new Map<string, string>();
    for (const g of questionnaire.groups) for (const o of g.options) optionToGroup.set(o.id, g.id);

    let profile;
    try {
      profile = calculateProfile(questionnaire.groups, dto.answers);
    } catch (e) {
      if (e instanceof InvalidAnswersError) {
        throw new ApplicationError(
          'INVALID',
          'Respostas inválidas',
          undefined,
          e.issues.map((i) => ({ path: 'groupId' in i ? i.groupId : i.optionId, message: i.code })),
        );
      }
      throw e;
    }

    try {
      await this.repo.saveSubmission({
        invitation: inv,
        questionnaire,
        idempotencyKey,
        dto,
        answers: dto.answers.map((a) => ({ ...a, groupId: optionToGroup.get(a.optionId)! })),
        scores: profile.scores,
        primary: profile.primary,
        secondary: profile.secondary,
        now: this.clock.now(),
      });
    } catch (e) {
      if (e instanceof InvitationUnavailableError) throw this.toHttp(e);
      throw e;
    }
    return { candidateSummary: candidateSummary(profile), replayed: false };
  }

  private toHttp(e: InvitationUnavailableError) {
    if (e.reason === 'COMPLETED') return new ApplicationError('CONFLICT', 'Convite já utilizado', 'INVITATION_USED');
    return new ApplicationError('GONE', 'Convite expirado ou revogado', e.reason);
  }
}

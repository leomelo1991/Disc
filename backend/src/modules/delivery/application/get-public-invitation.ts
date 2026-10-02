import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../shared/application-error.js';
import { sha256 } from '../../../shared/tokens.js';
import { assertInvitationAvailable } from '../domain/invitation.js';
import { Clock, DeliveryRepository } from './ports.js';

@Injectable()
export class GetPublicInvitation {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(token: string) {
    const inv = await this.repo.findInvitationByTokenHash(sha256(token));
    // 404 uniforme: não revelar se o token existe, expirou ou foi usado.
    if (!inv) throw new ApplicationError('NOT_FOUND', 'Convite não encontrado');
    try {
      assertInvitationAvailable(inv, this.clock.now());
    } catch {
      throw new ApplicationError('NOT_FOUND', 'Convite não encontrado');
    }
    const q = await this.repo.loadQuestionnaire(inv.questionnaireId);
    return {
      company: inv.tenantName,
      targetRole: inv.targetRole,
      targetDepartment: inv.targetDepartment,
      questionnaire: {
        version: q.version,
        // Os fatores (D/I/S/C) nunca são enviados ao candidato.
        groups: q.groups.map((g) => ({
          id: g.id,
          options: g.options.map((o) => ({ id: o.id, label: o.label })),
        })),
      },
    };
  }
}

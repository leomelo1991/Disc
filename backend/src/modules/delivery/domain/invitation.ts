export type InvitationStatus = 'PENDING' | 'STARTED' | 'COMPLETED' | 'EXPIRED' | 'REVOKED';

export type UnavailableReason = 'EXPIRED' | 'REVOKED' | 'COMPLETED';

export class InvitationUnavailableError extends Error {
  constructor(public readonly reason: UnavailableReason) {
    super(`Convite indisponível: ${reason}`);
  }
}

/** Regra de domínio: um convite só aceita resposta enquanto pendente/iniciado e não expirado. */
export function assertInvitationAvailable(inv: { status: InvitationStatus; expiresAt: Date }, now: Date): void {
  if (inv.status === 'COMPLETED') throw new InvitationUnavailableError('COMPLETED');
  if (inv.status === 'REVOKED') throw new InvitationUnavailableError('REVOKED');
  if (inv.status === 'EXPIRED' || inv.expiresAt.getTime() <= now.getTime()) {
    throw new InvitationUnavailableError('EXPIRED');
  }
}

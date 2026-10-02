import type { Answer, Factor, Scores } from '@disc/core';
import type { InvitationStatus } from '../domain/invitation.js';
import type { SubmitAssessmentDto } from '@disc/contracts';

export interface InvitationView {
  id: string;
  tenantId: string;
  tenantName: string;
  questionnaireId: string;
  status: InvitationStatus;
  expiresAt: Date;
  targetRole: string | null;
  targetDepartment: string | null;
}

export interface QuestionnaireView {
  id: string;
  version: number;
  groups: Array<{ id: string; options: Array<{ id: string; factor: Factor; label: string }> }>;
}

export interface StoredSubmission {
  idempotencyKey: string;
  scores: Scores;
  groupCount: number;
}

export interface SaveSubmissionInput {
  invitation: InvitationView;
  questionnaire: QuestionnaireView;
  idempotencyKey: string;
  dto: SubmitAssessmentDto;
  answers: Array<Answer & { groupId: string }>;
  scores: Scores;
  primary: Factor;
  secondary: Factor;
  now: Date;
}

/** Porta de persistência do fluxo do candidato. */
export abstract class DeliveryRepository {
  abstract findInvitationByTokenHash(hash: string): Promise<InvitationView | null>;
  abstract loadQuestionnaire(id: string): Promise<QuestionnaireView>;
  abstract findSubmission(tenantId: string, invitationId: string): Promise<StoredSubmission | null>;
  /** Lança InvitationUnavailableError('COMPLETED') se outro envio ganhou a corrida. */
  abstract saveSubmission(input: SaveSubmissionInput): Promise<void>;
}

export abstract class Clock {
  abstract now(): Date;
}

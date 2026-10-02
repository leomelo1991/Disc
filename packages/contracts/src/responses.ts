import { z } from 'zod';
import { factorSchema } from './common.js';

/** Respostas da API. Datas trafegam como string ISO 8601. */

const scoresSchema = z.object({ D: z.number(), I: z.number(), S: z.number(), C: z.number() });

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'RECRUITER']),
  tenantId: z.string().uuid(),
});
export const sessionSchema = z.object({ user: sessionUserSchema, accessToken: z.string() });

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  retentionDays: z.number().int(),
});
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'RECRUITER']),
  active: z.boolean(),
  createdAt: z.string(),
});
export const userListSchema = z.object({ items: z.array(userSchema) });

export const invitationStatusSchema = z.enum(['PENDING', 'STARTED', 'COMPLETED', 'EXPIRED', 'REVOKED']);
export const invitationCreatedSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  whatsappUrl: z.string().url(),
  expiresAt: z.string(),
});
export const invitationRowSchema = z.object({
  id: z.string().uuid(),
  status: invitationStatusSchema,
  expiresAt: z.string(),
  targetRole: z.string().nullable(),
  targetDepartment: z.string().nullable(),
  createdAt: z.string(),
});
export const invitationListSchema = z.object({ items: z.array(invitationRowSchema) });

/** Questionário visto pelo candidato: sem os fatores D/I/S/C. */
export const publicInvitationSchema = z.object({
  company: z.string(),
  targetRole: z.string().nullable(),
  targetDepartment: z.string().nullable(),
  questionnaire: z.object({
    version: z.number().int(),
    groups: z.array(
      z.object({ id: z.string().uuid(), options: z.array(z.object({ id: z.string().uuid(), label: z.string() })) }),
    ),
  }),
});

/** As 12 combinações ordenadas (principal + secundário). */
export const profileCodeSchema = z.enum(['DI', 'DS', 'DC', 'ID', 'IS', 'IC', 'SD', 'SI', 'SC', 'CD', 'CI', 'CS']);

/** Leitura de um fator isolado, na voz do candidato. */
export const factorBlockSchema = z.object({
  factor: factorSchema,
  name: z.string(),
  headline: z.string(),
  description: z.string(),
  strengths: z.array(z.string()),
  tips: z.array(z.string()),
});

/** Detalhes que só o recrutador recebe. */
export const recruiterDetailsSchema = z.object({
  communication: z.string(),
  attention: z.array(z.string()),
  idealEnvironment: z.string(),
  motivators: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
});

export const candidateSummarySchema = z.object({
  primary: factorSchema,
  secondary: factorSchema,
  code: profileCodeSchema,
  tied: z.boolean(),
  title: z.string(),
  description: z.string(),
  /** O resultado dos dois fatores juntos. */
  combined: z.object({
    name: z.string(),
    headline: z.string(),
    description: z.string(),
    strengths: z.array(z.string()),
    tips: z.array(z.string()),
  }),
  primaryProfile: factorBlockSchema,
  secondaryProfile: factorBlockSchema,
  /** Só existe quando há empate técnico entre o 1º e o 2º fator. */
  tieNote: z.string().optional(),
  disclaimer: z.string(),
});
export const submitResponseSchema = z.object({ candidateSummary: candidateSummarySchema });

export const resultRowSchema = z.object({
  id: z.string().uuid(),
  submittedAt: z.string(),
  candidate: z.object({ name: z.string(), jobTitle: z.string(), department: z.string() }),
  primaryFactor: factorSchema,
  secondaryFactor: factorSchema,
  code: profileCodeSchema,
  tied: z.boolean(),
});
export const resultsPageSchema = z.object({
  items: z.array(resultRowSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const resultDetailSchema = z.object({
  id: z.string().uuid(),
  submittedAt: z.string(),
  candidate: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    jobTitle: z.string(),
    department: z.string(),
    birthDate: z.string(),
  }),
  scores: scoresSchema,
  percentages: scoresSchema,
  intensities: z.object({
    D: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    I: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    S: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    C: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  }),
  code: profileCodeSchema,
  /** Diferença em pontos percentuais entre o 1º e o 2º fator. */
  gap: z.number(),
  tied: z.boolean(),
  summary: candidateSummarySchema.merge(recruiterDetailsSchema).extend({
    gap: z.number(),
    /** Leituras de recrutador de cada fator isolado (as do topo são as da combinação). */
    primaryDetails: recruiterDetailsSchema,
    secondaryDetails: recruiterDetailsSchema,
  }),
});

export const summarySchema = z.object({ total: z.number().int(), byFactor: scoresSchema });

export const assessmentTypeSchema = z.object({
  code: z.string(),
  name: z.string(),
  currentVersion: z.number().int().nullable(),
  groupCount: z.number().int(),
});
export const assessmentTypeListSchema = z.object({ items: z.array(assessmentTypeSchema) });
/** Questionário completo com fatores, para revisão de conteúdo por administradores. */
export const questionnaireDetailSchema = z.object({
  code: z.string(),
  version: z.number().int(),
  publishedAt: z.string().nullable(),
  groups: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int(),
      options: z.array(z.object({ id: z.string().uuid(), label: z.string(), factor: factorSchema })),
    }),
  ),
});

/** Exportação dos dados de um titular (LGPD, direito de acesso). */
export const dataExportSchema = z.object({
  exportedAt: z.string(),
  candidate: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    jobTitle: z.string(),
    department: z.string(),
    birthDate: z.string(),
  }),
  submission: z.object({
    id: z.string().uuid(),
    submittedAt: z.string(),
    consentAt: z.string(),
    consentVersion: z.string(),
    questionnaireVersion: z.number().int(),
  }),
  profile: z.object({
    scores: scoresSchema,
    primaryFactor: factorSchema,
    secondaryFactor: factorSchema,
    code: profileCodeSchema,
    gap: z.number(),
    tied: z.boolean(),
  }),
  answers: z.array(z.object({ group: z.number().int(), option: z.string(), rank: z.number().int() })),
});

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string().optional(),
  errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export const healthSchema = z.object({ status: z.string() });

export type Session = z.infer<typeof sessionSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type InvitationCreated = z.infer<typeof invitationCreatedSchema>;
export type InvitationRow = z.infer<typeof invitationRowSchema>;
export type PublicInvitation = z.infer<typeof publicInvitationSchema>;
export type CandidateSummary = z.infer<typeof candidateSummarySchema>;
export type SubmitResponse = z.infer<typeof submitResponseSchema>;
export type ResultRow = z.infer<typeof resultRowSchema>;
export type ResultsPage = z.infer<typeof resultsPageSchema>;
export type ResultDetail = z.infer<typeof resultDetailSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type UserRow = z.infer<typeof userSchema>;
export type FactorKey = z.infer<typeof factorSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type ProfileCode = z.infer<typeof profileCodeSchema>;
export type FactorBlock = z.infer<typeof factorBlockSchema>;

export const presentationLinkSchema = z.object({
  companyName: z.string(),
  url: z.string().url(),
  whatsappUrl: z.string().url(),
  expiresAt: z.string(),
});
export type PresentationLink = z.infer<typeof presentationLinkSchema>;

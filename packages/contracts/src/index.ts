import { z } from 'zod';

import { factorSchema } from './common.js';

export { factorSchema, z };

export const candidateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/, 'Telefone inválido'),
  email: z.string().trim().email().max(160),
  jobTitle: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD'),
});

export const submitAssessmentSchema = z.object({
  candidate: candidateSchema,
  consent: z.object({ accepted: z.literal(true), version: z.string().min(1) }),
  answers: z.array(z.object({ optionId: z.string().uuid(), rank: z.number().int().min(1).max(4) })).min(4),
});
export type SubmitAssessmentDto = z.infer<typeof submitAssessmentSchema>;

export const createInvitationSchema = z.object({
  assessmentType: z.literal('DISC'),
  targetRole: z.string().max(120).optional(),
  targetDepartment: z.string().max(120).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(7),
});
export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const registerTenantSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  adminName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const reportQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  primaryFactor: factorSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  invitationId: z.string().uuid().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const invitationListQuerySchema = z.object({
  status: z.enum(['PENDING', 'STARTED', 'COMPLETED', 'EXPIRED', 'REVOKED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['ADMIN', 'RECRUITER']),
});
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['ADMIN', 'RECRUITER']).optional(),
  active: z.boolean().optional(),
});
export const updateTenantSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  retentionDays: z.number().int().min(30).max(3650).optional(),
});
export * from './responses.js';

/** Página pública de apresentação: cria uma empresa de demonstração e já devolve o link do teste. */
export const createPresentationSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  assessmentType: z.literal('DISC').default('DISC'),
});
export type CreatePresentationDto = z.infer<typeof createPresentationSchema>;

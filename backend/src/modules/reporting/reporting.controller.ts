import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { buildProfile, recruiterSummary, type Factor } from '@disc/core';
import { reportQuerySchema, type ReportQuery } from '@disc/contracts';
import { Prisma } from '../../infra/prisma/generated/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { ZodValidationPipe } from '../../shared/zod-validation.pipe.js';
import { Auth, AuthGuard, Roles } from '../identity/presentation/auth.guard.js';
import type { AccessClaims } from '../identity/application/auth.service.js';

const rowInclude = {
  candidate: true,
  profile: true,
  invitation: { select: { questionnaire: { select: { _count: { select: { groups: true } } } } } },
} satisfies Prisma.SubmissionInclude;

function whereFor(tenantId: string, q: ReportQuery): Prisma.SubmissionWhereInput {
  const candidate: Prisma.CandidateWhereInput = {
    ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
    ...(q.jobTitle ? { jobTitle: { contains: q.jobTitle, mode: 'insensitive' } } : {}),
    ...(q.department ? { department: { contains: q.department, mode: 'insensitive' } } : {}),
  };
  return {
    tenantId,
    ...(Object.keys(candidate).length ? { candidate } : {}),
    ...(q.primaryFactor ? { profile: { primaryFactor: q.primaryFactor } } : {}),
    ...(q.invitationId ? { invitationId: q.invitationId } : {}),
    ...(q.from || q.to
      ? {
          submittedAt: {
            ...(q.from ? { gte: new Date(`${q.from}T00:00:00Z`) } : {}),
            ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
}

/** Evita injeção de fórmula em planilhas (CSV injection). */
function csvCell(v: unknown): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Perfil (código combinado, diferença e empate) sempre derivado das pontuações gravadas, nunca de um flag gravado:
 * assim, ajustar o limite de empate vale também para resultados antigos.
 */
function profileOf(p: { scoreD: number; scoreI: number; scoreS: number; scoreC: number }, groupCount: number) {
  return buildProfile({ D: p.scoreD, I: p.scoreI, S: p.scoreS, C: p.scoreC }, groupCount);
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportingController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('results')
  async list(@Auth() auth: AccessClaims, @Query(new ZodValidationPipe(reportQuerySchema)) q: ReportQuery) {
    const rows = await this.prisma.withTenant(auth.tid, (tx) =>
      tx.submission.findMany({
        where: whereFor(auth.tid, q),
        include: rowInclude,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      }),
    );
    const page = rows.slice(0, q.limit);
    return {
      items: page.map((s) => {
        const profile = s.profile ? profileOf(s.profile, s.invitation.questionnaire._count.groups) : undefined;
        return {
          id: s.id,
          submittedAt: s.submittedAt,
          candidate: { name: s.candidate?.name, jobTitle: s.candidate?.jobTitle, department: s.candidate?.department },
          primaryFactor: profile?.primary,
          secondaryFactor: profile?.secondary,
          code: profile?.code,
          tied: profile?.tied,
        };
      }),
      nextCursor: rows.length > q.limit ? page[page.length - 1]!.id : null,
    };
  }

  // Declarada antes de results/:id para não ser capturada como id.
  @Get('results/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="resultados.csv"')
  async exportCsv(@Auth() auth: AccessClaims, @Query(new ZodValidationPipe(reportQuerySchema)) q: ReportQuery) {
    const rows = await this.prisma.withTenant(auth.tid, async (tx) => {
      const found = await tx.submission.findMany({
        where: whereFor(auth.tid, q),
        include: rowInclude,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        take: 5000,
      });
      await tx.auditLog.create({
        data: { tenantId: auth.tid, userId: auth.sub, action: 'REPORT_EXPORTED', entityType: 'report' },
      });
      return found;
    });
    const header = [
      'Nome',
      'E-mail',
      'Telefone',
      'Cargo',
      'Setor',
      'Data',
      'Perfil primário',
      'Perfil secundário',
      'Perfil combinado',
      'Empate',
      'D',
      'I',
      'S',
      'C',
    ];
    const lines = rows.map((s) => {
      const profile = s.profile ? profileOf(s.profile, s.invitation.questionnaire._count.groups) : undefined;
      return [
        s.candidate?.name,
        s.candidate?.email,
        s.candidate?.phone,
        s.candidate?.jobTitle,
        s.candidate?.department,
        s.submittedAt.toISOString(),
        profile?.primary,
        profile?.secondary,
        profile?.code,
        profile ? (profile.tied ? 'Sim' : 'Não') : '',
        s.profile?.scoreD,
        s.profile?.scoreI,
        s.profile?.scoreS,
        s.profile?.scoreC,
      ]
        .map(csvCell)
        .join(',');
    });
    return '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');
  }

  @Get('results/:id')
  async detail(@Auth() auth: AccessClaims, @Param('id', ParseUUIDPipe) id: string) {
    const s = await this.prisma.withTenant(auth.tid, async (tx) => {
      const found = await tx.submission.findFirst({ where: { id, tenantId: auth.tid }, include: rowInclude });
      if (found) {
        await tx.auditLog.create({
          data: {
            tenantId: auth.tid,
            userId: auth.sub,
            action: 'RESULT_VIEWED',
            entityType: 'submission',
            entityId: id,
          },
        });
      }
      return found;
    });
    if (!s?.candidate || !s.profile) throw new NotFoundException();
    const profile = buildProfile(
      { D: s.profile.scoreD, I: s.profile.scoreI, S: s.profile.scoreS, C: s.profile.scoreC },
      s.invitation.questionnaire._count.groups,
    );
    return {
      id: s.id,
      submittedAt: s.submittedAt,
      candidate: { ...s.candidate, birthDate: s.candidate.birthDate.toISOString().slice(0, 10) },
      scores: profile.scores,
      percentages: profile.percentages,
      intensities: profile.intensities,
      code: profile.code,
      gap: profile.gap,
      tied: profile.tied,
      summary: recruiterSummary(profile),
    };
  }

  /** Direito de acesso (LGPD): todos os dados pessoais e respostas de um titular. Só administradores. */
  @Get('results/:id/data-export')
  @Roles('ADMIN')
  @Header('Content-Disposition', 'attachment; filename="dados-do-titular.json"')
  async dataExport(@Auth() auth: AccessClaims, @Param('id', ParseUUIDPipe) id: string) {
    const s = await this.prisma.withTenant(auth.tid, async (tx) => {
      const found = await tx.submission.findFirst({
        where: { id, tenantId: auth.tid },
        include: { candidate: true, profile: true, answers: { include: { group: true, option: true } } },
      });
      if (found) {
        await tx.auditLog.create({
          data: {
            tenantId: auth.tid,
            userId: auth.sub,
            action: 'DATA_EXPORTED',
            entityType: 'submission',
            entityId: id,
          },
        });
      }
      return found;
    });
    if (!s?.candidate || !s.profile) throw new NotFoundException();
    // Todos os grupos são obrigatórios na submissão, então os grupos distintos das respostas são o total do questionário.
    const profile = profileOf(s.profile, new Set(s.answers.map((a) => a.groupId)).size);
    return {
      exportedAt: new Date().toISOString(),
      candidate: { ...s.candidate, birthDate: s.candidate.birthDate.toISOString().slice(0, 10) },
      submission: {
        id: s.id,
        submittedAt: s.submittedAt,
        consentAt: s.consentAt,
        consentVersion: s.consentVersion,
        questionnaireVersion: s.profile.questionnaireVersion,
      },
      profile: {
        scores: profile.scores,
        primaryFactor: profile.primary,
        secondaryFactor: profile.secondary,
        code: profile.code,
        gap: profile.gap,
        tied: profile.tied,
      },
      answers: s.answers
        .map((a) => ({ group: a.group.position, option: a.option.label, rank: a.rank }))
        .sort((x, y) => x.group - y.group || y.rank - x.rank),
    };
  }

  /** Direito de exclusão (LGPD): remove candidato, respostas e perfil. Só administradores. */
  @Delete('results/:id')
  @Roles('ADMIN')
  @HttpCode(204)
  async erase(@Auth() auth: AccessClaims, @Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.withTenant(auth.tid, async (tx) => {
      const res = await tx.submission.deleteMany({ where: { id, tenantId: auth.tid } });
      if (res.count === 0) throw new NotFoundException();
      await tx.auditLog.create({
        data: { tenantId: auth.tid, userId: auth.sub, action: 'RESULT_ERASED', entityType: 'submission', entityId: id },
      });
    });
  }

  @Get('summary')
  async summary(@Auth() auth: AccessClaims) {
    const groups = await this.prisma.withTenant(auth.tid, (tx) =>
      tx.profileResult.groupBy({
        by: ['primaryFactor'],
        where: { submission: { tenantId: auth.tid } },
        _count: { _all: true },
      }),
    );
    const byFactor: Record<Factor, number> = { D: 0, I: 0, S: 0, C: 0 };
    for (const g of groups) byFactor[g.primaryFactor] = g._count._all;
    return { total: Object.values(byFactor).reduce((a, b) => a + b, 0), byFactor };
  }
}

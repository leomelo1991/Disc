import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { createInvitationSchema, invitationListQuerySchema, type CreateInvitationDto } from '@disc/contracts';
import { env } from '../../env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { generateToken, sha256 } from '../../shared/tokens.js';
import { MetricsService } from '../../shared/metrics.service.js';
import { ZodValidationPipe } from '../../shared/zod-validation.pipe.js';
import { Auth, AuthGuard } from '../identity/presentation/auth.guard.js';
import type { AccessClaims } from '../identity/application/auth.service.js';

@Controller('invitations')
@UseGuards(AuthGuard)
export class InvitationsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Post()
  async create(
    @Auth() auth: AccessClaims,
    @Body(new ZodValidationPipe(createInvitationSchema)) dto: CreateInvitationDto,
  ) {
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { assessmentType: { code: dto.assessmentType }, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!questionnaire) throw new NotFoundException('Questionário não encontrado');

    const token = generateToken();
    const inv = await this.prisma.withTenant(auth.tid, async (tx) => {
      const created = await tx.invitation.create({
        data: {
          tenantId: auth.tid,
          questionnaireId: questionnaire.id,
          createdById: auth.sub,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + dto.expiresInDays * 86_400_000),
          targetRole: dto.targetRole,
          targetDepartment: dto.targetDepartment,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tid,
          userId: auth.sub,
          action: 'INVITATION_CREATED',
          entityType: 'invitation',
          entityId: created.id,
        },
      });
      return created;
    });

    this.metrics.invitationsCreated.inc();
    // O token em texto puro só existe nesta resposta; no banco fica apenas o hash.
    const url = `${env.WEB_ORIGIN}/t/${token}`;
    const text = `Olá! Segue o link para responder ao teste comportamental: ${url}`;
    return {
      id: inv.id,
      url,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
      expiresAt: inv.expiresAt,
    };
  }

  @Get()
  async list(
    @Auth() auth: AccessClaims,
    @Query(new ZodValidationPipe(invitationListQuerySchema)) q: ReturnType<typeof invitationListQuerySchema.parse>,
  ) {
    const now = new Date();
    const rows = await this.prisma.withTenant(auth.tid, (tx) =>
      tx.invitation.findMany({
        where: { tenantId: auth.tid, ...(q.status ? { status: q.status } : {}) },
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        select: { id: true, status: true, expiresAt: true, targetRole: true, targetDepartment: true, createdAt: true },
      }),
    );
    return {
      items: rows.map((r) => ({
        ...r,
        status: (r.status === 'PENDING' || r.status === 'STARTED') && r.expiresAt <= now ? 'EXPIRED' : r.status,
      })),
    };
  }

  @Post(':id/revoke')
  @HttpCode(204)
  async revoke(@Auth() auth: AccessClaims, @Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.withTenant(auth.tid, async (tx) => {
      const res = await tx.invitation.updateMany({
        where: { id, tenantId: auth.tid, status: { in: ['PENDING', 'STARTED'] } },
        data: { status: 'REVOKED' },
      });
      if (res.count === 0) throw new NotFoundException();
      await tx.auditLog.create({
        data: {
          tenantId: auth.tid,
          userId: auth.sub,
          action: 'INVITATION_REVOKED',
          entityType: 'invitation',
          entityId: id,
        },
      });
    });
  }
}

import { randomUUID } from 'node:crypto';
import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createPresentationSchema, type CreatePresentationDto } from '@disc/contracts';
import { env } from '../../env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { ApplicationError } from '../../shared/application-error.js';
import { MetricsService } from '../../shared/metrics.service.js';
import { slugify } from '../../shared/slug.js';
import { generateToken, sha256 } from '../../shared/tokens.js';
import { ZodValidationPipe } from '../../shared/zod-validation.pipe.js';

const DAY_MS = 86_400_000;
const INVITATION_DAYS = 7;

export const presentationEnabled = () =>
  env.ENABLE_PRESENTATION ? env.ENABLE_PRESENTATION === 'true' : env.NODE_ENV !== 'production';

/**
 * Página pública de apresentação: o cliente digita o nome da empresa e já recebe o link do teste.
 * Cria uma empresa de DEMONSTRAÇÃO descartável. Proteções: desligada por padrão em produção, limite por IP,
 * limite diário global, empresa sem nenhum usuário capaz de logar, e limpeza automática (RetentionService).
 */
@Controller('public/presentation')
export class PresentationController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body(new ZodValidationPipe(createPresentationSchema)) dto: CreatePresentationDto) {
    // 404 (e não 403) quando desligada: não revela que o recurso existe.
    if (!presentationEnabled()) throw new ApplicationError('NOT_FOUND', 'Não encontrado');

    const rows = await this.prisma.$queryRaw<Array<{ count_presentation_tenants: number }>>`
      SELECT count_presentation_tenants(${new Date(Date.now() - DAY_MS)}::timestamptz)`;
    const today = rows[0]?.count_presentation_tenants ?? 0;
    if (today >= env.PRESENTATION_DAILY_LIMIT) {
      throw new ApplicationError('RATE_LIMITED', 'Limite diário de demonstrações atingido. Tente novamente amanhã.');
    }

    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { assessmentType: { code: dto.assessmentType }, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
    });
    if (!questionnaire) throw new ApplicationError('NOT_FOUND', 'Questionário não encontrado');

    const tenantId = randomUUID();
    const slug = slugify(dto.companyName, 'apresentacao');
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITATION_DAYS * DAY_MS);

    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: dto.companyName, slug, retentionDays: 30, isPresentation: true },
      });
      // Usuário só para satisfazer a chave estrangeira do convite: inativo e com hash inválido, não consegue logar.
      const owner = await tx.user.create({
        data: {
          tenantId,
          name: 'Apresentação',
          email: `${slug}@apresentacao.invalid`,
          passwordHash: '!sem-login',
          role: 'ADMIN',
          active: false,
        },
      });
      await tx.invitation.create({
        data: {
          tenantId,
          questionnaireId: questionnaire.id,
          createdById: owner.id,
          tokenHash: sha256(token),
          expiresAt,
        },
      });
    });
    this.metrics.invitationsCreated.inc();

    const url = `${env.WEB_ORIGIN}/t/${token}`;
    const text = `Olá! Segue o link para responder ao teste comportamental: ${url}`;
    return {
      companyName: dto.companyName,
      url,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
      expiresAt,
    };
  }
}

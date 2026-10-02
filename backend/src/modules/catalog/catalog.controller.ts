import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuthGuard, Roles } from '../identity/presentation/auth.guard.js';

/** Catálogo de testes e questionários (dados globais, somente leitura). */
@Controller('assessment-types')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const types = await this.prisma.assessmentType.findMany({
      orderBy: { code: 'asc' },
      include: {
        questionnaires: {
          where: { status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
          take: 1,
          include: { _count: { select: { groups: true } } },
        },
      },
    });
    return {
      items: types.map((t) => ({
        code: t.code,
        name: t.name,
        currentVersion: t.questionnaires[0]?.version ?? null,
        groupCount: t.questionnaires[0]?._count.groups ?? 0,
      })),
    };
  }

  /** Inclui os fatores de cada opção: restrito a administradores, para revisão do conteúdo do teste. */
  @Get(':code/questionnaires/current')
  @Roles('ADMIN')
  async current(@Param('code') code: string) {
    const q = await this.prisma.questionnaire.findFirst({
      where: { assessmentType: { code: code.toUpperCase() }, status: 'PUBLISHED' },
      orderBy: { version: 'desc' },
      include: {
        assessmentType: true,
        groups: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
      },
    });
    if (!q) throw new NotFoundException('Questionário não encontrado');
    return {
      code: q.assessmentType.code,
      version: q.version,
      publishedAt: q.publishedAt,
      groups: q.groups.map((g) => ({
        id: g.id,
        position: g.position,
        options: g.options.map((o) => ({ id: o.id, label: o.label, factor: o.factor })),
      })),
    };
  }
}

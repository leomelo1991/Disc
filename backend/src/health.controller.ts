import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './infra/prisma/prisma.service.js';

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Liveness: o processo está de pé. */
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /** Readiness: consegue falar com o banco. */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Banco indisponível');
    }
  }
}

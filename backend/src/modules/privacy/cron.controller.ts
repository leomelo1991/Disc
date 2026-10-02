import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { env } from '../../env.js';
import { ApplicationError } from '../../shared/application-error.js';
import { bearerMatches } from '../../shared/bearer.js';
import { RetentionService } from './retention.service.js';

/**
 * Ponto de entrada do agendador (Vercel Cron). Em serverless não há processo vivo para um `setInterval`,
 * então a limpeza de LGPD e das empresas de apresentação é disparada daqui, uma vez por dia.
 */
@Controller('internal/cron')
@SkipThrottle()
export class CronController {
  constructor(@Inject(RetentionService) private readonly retention: RetentionService) {}

  @Get('purge')
  async purge(@Headers('authorization') authorization?: string) {
    // Sem CRON_SECRET o endpoint não existe (404): nunca fica aberto por esquecimento de configuração.
    if (!env.CRON_SECRET) throw new ApplicationError('NOT_FOUND', 'Não encontrado');
    if (!bearerMatches(authorization, env.CRON_SECRET)) throw new ApplicationError('UNAUTHORIZED', 'Não autorizado');
    return this.retention.runDaily();
  }
}

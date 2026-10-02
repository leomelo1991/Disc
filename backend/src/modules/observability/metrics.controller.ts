import { Controller, Get, Header, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../../env.js';
import { ApplicationError } from '../../shared/application-error.js';
import { MetricsService } from '../../shared/metrics.service.js';

function sameToken(given: string | undefined, expected: string): boolean {
  const a = Buffer.from(given ?? '');
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Formato Prometheus. Com METRICS_TOKEN exige `Authorization: Bearer <token>`.
   * Em produção sem token o endpoint fica desligado (404), para nunca expor métricas por acidente.
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(@Headers('authorization') authorization?: string) {
    if (env.METRICS_TOKEN) {
      if (!sameToken(authorization, env.METRICS_TOKEN)) throw new ApplicationError('UNAUTHORIZED', 'Não autorizado');
    } else if (env.NODE_ENV === 'production') {
      throw new ApplicationError('NOT_FOUND', 'Não encontrado');
    }
    return this.metrics.render();
  }
}

import { Global, Injectable, Module } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

/** Métricas Prometheus. Rótulos têm cardinalidade fixa (nada de ids, tokens ou e-mails). */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });
  readonly submissions = new Counter({
    name: 'disc_submissions_total',
    help: 'Testes DISC enviados com sucesso',
    registers: [this.registry],
  });
  readonly invitationsCreated = new Counter({
    name: 'disc_invitations_created_total',
    help: 'Convites gerados',
    registers: [this.registry],
  });
  readonly logins = new Counter({
    name: 'disc_logins_total',
    help: 'Tentativas de login',
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  /** Rota do Express como template (ex.: /api/v1/public/invitations/:token), nunca a URL real. */
  observeHttp(method: string, routeTemplate: string | undefined, status: number, seconds: number) {
    this.httpDuration.observe({ method, route: routeTemplate ?? 'unmatched', status: String(status) }, seconds);
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}

@Global()
@Module({ providers: [MetricsService], exports: [MetricsService] })
export class MetricsModule {}

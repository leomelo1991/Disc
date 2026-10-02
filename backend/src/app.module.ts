import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { env } from './env.js';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { InvitationsModule } from './modules/invitations/invitations.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { TenancyModule } from './modules/tenancy/tenancy.module.js';
import { PrivacyModule } from './modules/privacy/privacy.module.js';
import { MetricsModule } from './shared/metrics.service.js';
import { ObservabilityModule } from './modules/observability/observability.module.js';
import { PresentationModule } from './modules/presentation/presentation.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { DeliveryModule } from './modules/delivery/delivery.module.js';
import { ProblemFilter } from './shared/problem.filter.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === 'test' ? 'silent' : 'info',
        // Correlação por requisição; o token do convite e credenciais nunca vão para o log.
        genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url.replace(/(\/public\/invitations\/)[^/?]+/, '$1:token'),
          }),
        },
        autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => env.NODE_ENV === 'test',
    }),
    PrismaModule,
    IdentityModule,
    DeliveryModule,
    InvitationsModule,
    ReportingModule,
    TenancyModule,
    PrivacyModule,
    CatalogModule,
    PresentationModule,
    MetricsModule,
    ObservabilityModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ProblemFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

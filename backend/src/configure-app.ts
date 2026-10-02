import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './env.js';
import { MetricsService } from './shared/metrics.service.js';
import { buildOpenApiDocument } from './openapi/build-openapi.js';

export const docsEnabled = () => (env.ENABLE_DOCS ? env.ENABLE_DOCS === 'true' : env.NODE_ENV !== 'production');

/** Configuração HTTP compartilhada entre main.ts e os testes e2e. */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  // Atrás de proxy (nginx, borda da Vercel) o IP real do cliente vem em X-Forwarded-For.
  if (env.TRUST_PROXY_HOPS > 0) app.getHttpAdapter().getInstance().set('trust proxy', env.TRUST_PROXY_HOPS);

  // CSP estrita em toda a API; o Swagger UI precisa de scripts/estilos inline, então só /api/docs é relaxado.
  const strict = helmet();
  const docs = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) =>
    (req.path.startsWith('/api/docs') ? docs : strict)(req, res, next),
  );
  const metrics = app.get(MetricsService);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      // req.route.path é o TEMPLATE da rota (/public/invitations/:token), nunca a URL com o token real.
      const route = req.route?.path as string | undefined;
      if (route?.endsWith('/metrics')) return;
      metrics.observeHttp(req.method, route, res.statusCode, Number(process.hrtime.bigint() - start) / 1e9);
    });
    next();
  });
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  if (docsEnabled()) {
    SwaggerModule.setup('api/docs', app, buildOpenApiDocument() as unknown as OpenAPIObject, {
      jsonDocumentUrl: 'api/docs-json',
      customSiteTitle: 'DISC Platform API',
    });
  }
}

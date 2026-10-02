import type { INestApplication } from '@nestjs/common';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/env.js';
import { adminPrisma } from './admin-db.js';
import { candidateBody, createApp, createTenantWithInvitation, perfectAnswers } from './helpers.js';

const api = '/api/v1';

describe('Métricas Prometheus', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    Object.assign(env, { METRICS_TOKEN: undefined, NODE_ENV: 'test' });
    await app.close();
  });

  it('expõe duração HTTP por TEMPLATE de rota e contadores de negócio, sem vazar token', async () => {
    const prisma = adminPrisma();
    const t = await createTenantWithInvitation(prisma);
    await request(app.getHttpServer()).get(`${api}/public/invitations/${t.token}`).expect(200);
    await request(app.getHttpServer())
      .post(`${api}/public/invitations/${t.token}/submit`)
      .set('Idempotency-Key', `metrics-${t.tenant.id}`)
      .send({
        candidate: candidateBody,
        consent: { accepted: true, version: 'v1' },
        answers: perfectAnswers(t.questionnaire),
      })
      .expect(201);
    // reenvio idempotente (replay) NÃO conta como novo envio
    const before = (await request(app.getHttpServer()).get(`${api}/metrics`).expect(200)).text;
    await request(app.getHttpServer())
      .post(`${api}/public/invitations/${t.token}/submit`)
      .set('Idempotency-Key', `metrics-${t.tenant.id}`)
      .send({
        candidate: candidateBody,
        consent: { accepted: true, version: 'v1' },
        answers: perfectAnswers(t.questionnaire),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email: 'nao@existe.com', password: 'senha-errada-1' })
      .expect(401);

    const res = await request(app.getHttpServer()).get(`${api}/metrics`).expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toContain('route="/api/v1/public/invitations/:token/submit"');
    expect(res.text).not.toContain(t.token);
    expect(res.text).toMatch(/disc_logins_total\{result="failure"\} [1-9]/);
    expect(res.text).toContain('process_cpu_user_seconds_total'); // métricas padrão do Node

    const count = (txt: string) => Number(/^disc_submissions_total (\d+)/m.exec(txt)?.[1] ?? 0);
    expect(count(res.text)).toBe(count(before));
    expect(count(res.text)).toBeGreaterThanOrEqual(1);
  });

  it('com METRICS_TOKEN exige o Bearer; em produção sem token fica desligado', async () => {
    Object.assign(env, { METRICS_TOKEN: 'um-token-de-metricas-bem-longo' });
    await request(app.getHttpServer()).get(`${api}/metrics`).expect(401);
    await request(app.getHttpServer()).get(`${api}/metrics`).set('Authorization', 'Bearer errado').expect(401);
    await request(app.getHttpServer())
      .get(`${api}/metrics`)
      .set('Authorization', 'Bearer um-token-de-metricas-bem-longo')
      .expect(200);

    Object.assign(env, { METRICS_TOKEN: undefined, NODE_ENV: 'production' });
    await request(app.getHttpServer()).get(`${api}/metrics`).expect(404);
  });
});

describe('Sentry (SDK real contra servidor local)', () => {
  it('envia o erro 5xx já limpo: sem token, sem corpo, sem cookies', async () => {
    const received: string[] = [];
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (d: Buffer) => chunks.push(d));
      req.on('end', () => {
        received.push(Buffer.concat(chunks).toString());
        res.writeHead(200).end('{}');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as AddressInfo).port;
    process.env.SENTRY_DSN = `http://publickey@127.0.0.1:${port}/1`;
    Object.assign(env, { SENTRY_DSN: process.env.SENTRY_DSN });

    const Sentry = await import('@sentry/node');
    const { initSentry } = await import('../src/shared/sentry.js');
    const { ProblemFilter } = await import('../src/shared/problem.filter.js');
    expect(initSentry()).toBe(true);

    // Segredos montados em runtime: o SDK anexa linhas do código-fonte ao stack trace, e literais no teste
    // apareceriam ali (falso positivo). Assim, só dados de runtime podem aparecer no envelope.
    const join = (...p: string[]) => p.join('-');
    const secrets = {
      token: join('TOKEN', 'SECRETO', '123'),
      email: ['maria', 'x.com'].join('@'),
      name: join('Maria', 'Silva').replace('-', ' '),
      cookie: join('cookie', 'secreto'),
      jwt: join('jwt', 'secreto'),
      ip: [9, 9, 9, 9].join('.'),
    };

    const json = () => undefined;
    const res = { status: () => ({ type: () => ({ json }) }) };
    const host = { switchToHttp: () => ({ getResponse: () => res }) };
    const err = new Error(`falha ao salvar em /public/invitations/${secrets.token} para ${secrets.email}`);
    Sentry.addBreadcrumb({
      message: `GET /t/${secrets.token}`,
      data: { arguments: [`/public/invitations/${secrets.token}`] },
    });
    Sentry.withScope((scope) => {
      scope.setUser({ id: 'u1', email: secrets.email, ip_address: secrets.ip });
      scope.setSDKProcessingMetadata({
        normalizedRequest: {
          url: `http://x/api/v1/public/invitations/${secrets.token}/submit`,
          data: JSON.stringify({ candidate: { name: secrets.name } }),
          cookies: { refresh_token: secrets.cookie },
          headers: { authorization: `Bearer ${secrets.jwt}` },
        },
      });
      new ProblemFilter().catch(err, host as never);
    });
    await Sentry.flush(3000);
    await Sentry.close(1000);
    server.close();

    const body = received.join('\n');
    expect(body.length).toBeGreaterThan(0); // o evento realmente saiu
    expect(body).toContain('falha ao salvar');
    for (const secret of Object.values(secrets)) expect(body).not.toContain(secret);
  });
});

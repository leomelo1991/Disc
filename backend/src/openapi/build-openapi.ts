import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type ResponseConfig,
} from '@asteasolutions/zod-to-openapi';
import type { AnyZodObject, ZodTypeAny } from 'zod';
import * as c from '@disc/contracts';

const { z } = c;

// O backend (CJS) e @disc/contracts (ESM) carregam instâncias DIFERENTES do zod. Por isso estendemos e usamos
// o `z` exportado pelos contratos: assim todos os schemas, inclusive os criados aqui, compartilham a instância.
extendZodWithOpenApi(z);

type Method = 'get' | 'post' | 'patch' | 'delete';
type Access = 'public' | 'cookie' | 'staff' | 'admin';

interface Route {
  method: Method;
  /** Caminho no estilo OpenAPI, relativo a /api/v1. */
  path: string;
  summary: string;
  tag: string;
  access: Access;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  headers?: ZodTypeAny;
  body?: ZodTypeAny;
  /** status → schema (ou descrição para respostas sem JSON) */
  ok: Record<number, ZodTypeAny | string>;
  errors?: number[];
  contentType?: string;
}

const id = z.object({ id: z.string().uuid() });

/**
 * Fonte única da documentação da API. O teste `openapi.test.ts` compara esta lista com as rotas reais do Nest,
 * então uma rota nova sem documentação (ou documentada sem existir) quebra o build.
 */
export const ROUTES: Route[] = [
  { method: 'get', path: '/health', tag: 'Saúde', summary: 'Liveness', access: 'public', ok: { 200: c.healthSchema } },
  {
    method: 'get',
    path: '/ready',
    tag: 'Saúde',
    summary: 'Readiness (consulta o banco)',
    access: 'public',
    ok: { 200: c.healthSchema },
    errors: [503],
  },

  {
    method: 'get',
    path: '/metrics',
    tag: 'Saúde',
    summary: 'Métricas Prometheus (Bearer METRICS_TOKEN; desligado em produção sem token)',
    access: 'public',
    ok: { 200: 'Texto no formato Prometheus' },
    errors: [401, 404],
    contentType: 'text/plain',
  },
  {
    method: 'post',
    path: '/public/presentation',
    tag: 'Candidato',
    summary:
      'Página de apresentação: cria uma empresa de DEMONSTRAÇÃO descartável e devolve o link do teste (404 se desligada; limite diário)',
    access: 'public',
    body: c.createPresentationSchema,
    ok: { 201: c.presentationLinkSchema },
    errors: [404, 422, 429],
  },
  {
    method: 'post',
    path: '/auth/register-tenant',
    tag: 'Autenticação',
    summary: 'Cria a empresa e o primeiro administrador',
    access: 'public',
    body: c.registerTenantSchema,
    ok: { 201: c.sessionSchema },
    errors: [409, 422, 429],
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Autenticação',
    summary: 'Login (refresh token em cookie httpOnly)',
    access: 'public',
    body: c.loginSchema,
    ok: { 200: c.sessionSchema },
    errors: [401, 422, 429],
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Autenticação',
    summary: 'Rotaciona o refresh token (uso único) e devolve novo access token',
    access: 'cookie',
    ok: { 200: c.sessionSchema },
    errors: [401],
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Autenticação',
    summary: 'Revoga o refresh token',
    access: 'cookie',
    ok: { 204: 'Sem conteúdo' },
  },

  {
    method: 'get',
    path: '/tenant',
    tag: 'Empresa',
    summary: 'Dados da empresa',
    access: 'staff',
    ok: { 200: c.tenantSchema },
  },
  {
    method: 'patch',
    path: '/tenant',
    tag: 'Empresa',
    summary: 'Atualiza nome e prazo de retenção',
    access: 'admin',
    body: c.updateTenantSchema,
    ok: { 200: c.tenantSchema },
    errors: [422],
  },
  {
    method: 'get',
    path: '/users',
    tag: 'Empresa',
    summary: 'Lista usuários da empresa',
    access: 'admin',
    ok: { 200: c.userListSchema },
  },
  {
    method: 'post',
    path: '/users',
    tag: 'Empresa',
    summary: 'Cria usuário',
    access: 'admin',
    body: c.createUserSchema,
    ok: { 201: c.userSchema },
    errors: [409, 422],
  },
  {
    method: 'patch',
    path: '/users/{id}',
    tag: 'Empresa',
    summary: 'Atualiza nome, papel ou situação',
    access: 'admin',
    params: id,
    body: c.updateUserSchema,
    ok: { 200: c.userSchema },
    errors: [404, 409, 422],
  },

  {
    method: 'get',
    path: '/assessment-types',
    tag: 'Catálogo',
    summary: 'Tipos de teste disponíveis',
    access: 'staff',
    ok: { 200: c.assessmentTypeListSchema },
  },
  {
    method: 'get',
    path: '/assessment-types/{code}/questionnaires/current',
    tag: 'Catálogo',
    summary: 'Questionário publicado, com fatores (revisão de conteúdo)',
    access: 'admin',
    params: z.object({ code: z.string() }),
    ok: { 200: c.questionnaireDetailSchema },
    errors: [404],
  },

  {
    method: 'post',
    path: '/invitations',
    tag: 'Convites',
    summary: 'Gera convite. O link só aparece nesta resposta',
    access: 'staff',
    body: c.createInvitationSchema,
    ok: { 201: c.invitationCreatedSchema },
    errors: [404, 422],
  },
  {
    method: 'get',
    path: '/invitations',
    tag: 'Convites',
    summary: 'Lista convites',
    access: 'staff',
    query: c.invitationListQuerySchema,
    ok: { 200: c.invitationListSchema },
  },
  {
    method: 'post',
    path: '/invitations/{id}/revoke',
    tag: 'Convites',
    summary: 'Revoga convite pendente',
    access: 'staff',
    params: id,
    ok: { 204: 'Sem conteúdo' },
    errors: [404],
  },

  {
    method: 'get',
    path: '/reports/results',
    tag: 'Relatórios',
    summary: 'Resultados com filtros e paginação por cursor',
    access: 'staff',
    query: c.reportQuerySchema,
    ok: { 200: c.resultsPageSchema },
    errors: [422],
  },
  {
    method: 'get',
    path: '/reports/results/export.csv',
    tag: 'Relatórios',
    summary: 'Exporta os resultados filtrados em CSV',
    access: 'staff',
    query: c.reportQuerySchema,
    ok: { 200: 'CSV (UTF-8)' },
    contentType: 'text/csv',
  },
  {
    method: 'get',
    path: '/reports/results/{id}',
    tag: 'Relatórios',
    summary: 'Resultado completo com leitura para o recrutador',
    access: 'staff',
    params: id,
    ok: { 200: c.resultDetailSchema },
    errors: [404],
  },
  {
    method: 'delete',
    path: '/reports/results/{id}',
    tag: 'Relatórios',
    summary: 'Exclui os dados do candidato (LGPD)',
    access: 'admin',
    params: id,
    ok: { 204: 'Sem conteúdo' },
    errors: [404],
  },
  {
    method: 'get',
    path: '/reports/results/{id}/data-export',
    tag: 'Relatórios',
    summary: 'Exporta todos os dados de um titular (LGPD, direito de acesso)',
    access: 'admin',
    params: id,
    ok: { 200: c.dataExportSchema },
    errors: [404],
  },
  {
    method: 'get',
    path: '/reports/summary',
    tag: 'Relatórios',
    summary: 'Contagem de resultados por perfil primário',
    access: 'staff',
    ok: { 200: c.summarySchema },
  },

  {
    method: 'get',
    path: '/public/invitations/{token}',
    tag: 'Candidato',
    summary: 'Valida o link e devolve o questionário (sem fatores)',
    access: 'public',
    params: z.object({ token: z.string() }),
    ok: { 200: c.publicInvitationSchema },
    errors: [404, 429],
  },
  {
    method: 'post',
    path: '/public/invitations/{token}/submit',
    tag: 'Candidato',
    summary: 'Envia identificação e respostas. Reenvio com a mesma Idempotency-Key devolve o mesmo resumo',
    access: 'public',
    params: z.object({ token: z.string() }),
    headers: z.object({ 'Idempotency-Key': z.string().min(8).max(100) }),
    body: c.submitAssessmentSchema,
    ok: { 201: c.submitResponseSchema },
    errors: [400, 404, 409, 410, 422, 429],
  },
];

const ERROR_TEXT: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Sem permissão para esta ação',
  404: 'Não encontrado',
  409: 'Conflito',
  410: 'Expirado ou revogado',
  422: 'Dados inválidos',
  429: 'Muitas requisições',
  503: 'Indisponível',
};

const ACCESS_TEXT: Record<Access, string> = {
  public: 'Pública.',
  cookie: 'Requer o cookie `refresh_token`.',
  staff: 'Requer login (ADMIN ou RECRUITER).',
  admin: 'Requer login com papel ADMIN.',
};

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  const problem = c.problemSchema;

  for (const r of ROUTES) {
    const responses: Record<string, ResponseConfig> = {};
    for (const [status, schema] of Object.entries(r.ok)) {
      responses[status] =
        typeof schema === 'string'
          ? { description: schema, ...(r.contentType ? { content: { [r.contentType]: { schema: z.string() } } } : {}) }
          : { description: 'Sucesso', content: { 'application/json': { schema } } };
    }
    for (const status of r.errors ?? []) {
      responses[String(status)] = {
        description: ERROR_TEXT[status] ?? 'Erro',
        content: { 'application/problem+json': { schema: problem } },
      };
    }
    if (r.access === 'staff' || r.access === 'admin') {
      responses['401'] ??= {
        description: ERROR_TEXT[401] ?? 'Não autenticado',
        content: { 'application/problem+json': { schema: problem } },
      };
    }
    if (r.access === 'admin') {
      responses['403'] ??= {
        description: ERROR_TEXT[403] ?? 'Sem permissão',
        content: { 'application/problem+json': { schema: problem } },
      };
    }

    registry.registerPath({
      method: r.method,
      path: r.path,
      tags: [r.tag],
      summary: r.summary,
      description: ACCESS_TEXT[r.access],
      ...(r.access === 'staff' || r.access === 'admin' ? { security: [{ bearerAuth: [] }] } : {}),
      request: {
        ...(r.params ? { params: r.params as AnyZodObject } : {}),
        ...(r.query ? { query: r.query as AnyZodObject } : {}),
        ...(r.headers ? { headers: r.headers as AnyZodObject } : {}),
        ...(r.body ? { body: { required: true, content: { 'application/json': { schema: r.body } } } } : {}),
      },
      responses,
    });
  }

  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'DISC Platform API',
      version: '1.0.0',
      description:
        'API para aplicação de testes comportamentais DISC. Erros seguem RFC 7807 (`application/problem+json`). ' +
        'Os contratos são definidos com Zod em `packages/contracts`.',
    },
    servers: [{ url: '/api/v1' }],
  });
}

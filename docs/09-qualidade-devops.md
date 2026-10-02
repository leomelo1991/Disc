# 09 · Qualidade e DevOps

## Pirâmide de testes

| Nível          | Ferramenta                                                          | Foco                                                      |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| Unit (domínio) | Vitest                                                              | Cálculo DISC, invariantes de Submission/Invitation, VOs   |
| Unit (UI)      | Vitest + Testing Library                                            | Regra 1–4 sem repetição, formulários                      |
| Integração API | Vitest + Supertest + Postgres real (docker-compose / service do CI) | Casos de uso, repositórios, RLS, constraints              |
| Contrato       | Zod em `packages/contracts` + OpenAPI                               | Front e back sempre alinhados                             |
| E2E            | Playwright (viewport mobile e desktop)                              | Fluxo completo: criar convite → responder → ver relatório |
| Acessibilidade | axe-core no Playwright                                              | WCAG AA                                                   |

Metas: domínio ≥ 90% de cobertura; teste de isolamento entre tenants obrigatório.

## CI (GitHub Actions)

`install (cache pnpm)` → `db:test:setup` → `lint` → `format:check` → `deps:check` → `typecheck` → `test` → `build` → `audit` → `e2e`. Turborepo faz cache e executa só o que mudou.

## Ambiente

- `docker-compose.yml`: postgres, api, web, mailhog (opcional).
- `.env.example` por app; validação de env na inicialização (Zod).
- Migrations rodam no deploy; seed do DISC v1.

## Observabilidade

Logs JSON (pino) com `requestId` e redação de credenciais; `/health` e `/ready`; métricas Prometheus em `/metrics` (protegido por `METRICS_TOKEN`); Sentry opcional no back e no front, com redação de dados pessoais (ver `08-seguranca-lgpd.md`).

**Custo no frontend:** sem `VITE_SENTRY_DSN` o SDK nem entra no bundle. Com DSN ele vira um chunk assíncrono (~155 kB gzip) carregado depois da renderização inicial, sem bloquear a página do candidato.

Não há OpenTelemetry (traces); o Sentry roda com `tracesSampleRate: 0`.

## Convenções

Conventional Commits, branches curtas, PR com checklist, Husky + lint-staged (pre-commit: ESLint + Prettier nos arquivos staged), TypeScript `strict`, fronteiras verificadas pelo dependency-cruiser.

## Deploy sugerido

Front estático (CDN), API em container (Fly.io/Railway/Render ou cloud própria), Postgres gerenciado.

## Fronteiras de arquitetura

`pnpm deps:check` aplica as regras de `.dependency-cruiser.cjs` (e roda no CI e no teste de mutação manual descrito no ADR-004):

- `domain` só importa de `domain`; `application` não importa `infra`, `presentation`, ORM, Express nem JWT (só `@nestjs/common` para `@Injectable`); `presentation` das camadas não importa `infra`.
- Módulos de backend são isolados entre si (exceto `identity`, que expõe o guard e os tipos de autenticação).
- No frontend, `shared` não importa de `features`/`app`, e `features/candidate` e `features/admin` não se importam.
- `packages/disc-core` é puro; frontend e backend só se falam por HTTP e `packages/contracts`.

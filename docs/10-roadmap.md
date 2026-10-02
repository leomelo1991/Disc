# 10 · Roadmap

## Fase 0 · Fundação

- [x] Scaffold do monorepo (pnpm, Turborepo, TS estrito, CI, Docker Compose). ESLint 10, Prettier, Husky + lint-staged e dependency-cruiser (`pnpm deps:check`)
- [x] `packages/contracts` e `packages/disc-core` e `packages/config` (presets de TypeScript compartilhados)
- [x] Postgres + migrations + RLS (ADR-003)

## Fase 1 · Núcleo DISC

- [x] Domínio de Scoring/Profiling com testes (`05-algoritmo-disc.md`)
- [x] Questionário DISC v1 (seed) e catálogo
- [x] Domínio Invitation/Submission com invariantes

## Fase 2 · Fluxo do candidato

- [x] Endpoints públicos (validar link, submit idempotente)
- [x] UI mobile-first: boas-vindas, identificação, perguntas 1–4, revisão, resumo
- [x] Rascunho local, a11y, E2E mobile

## Fase 3 · Administração

- [x] Auth (registro de tenant, login, refresh, RBAC)
- [x] Convites + link WhatsApp
- [x] Relatórios com filtros, detalhe, CSV

## Fase 4 · Robustez e vitrine

- [x] Perfis combinados: 12 variantes ordenadas (DI, DS…), empate técnico de 5 pp com principal + secundário + leitura combinada
- [x] Página pública `/apresentacao` (nome da empresa + link com QR code) com empresas de demonstração descartáveis
- [x] Deploy na Vercel (serviços `backend` + `frontend`), agendador de limpeza e `trust proxy`; guia em `docs/11-deploy-vercel.md` (a validar no primeiro deploy real)
- [x] LGPD (retenção por empresa, exclusão, consentimento)
- [x] Logs estruturados com redação, rate limit, auditoria (métricas Prometheus e Sentry opcionais; traces pendentes)
- [x] Demo com dados fictícios (`db:seed:demo`) e landing page. **Pendente:** README comercial

## Backlog futuro

PDF do relatório · white-label · outros testes · WhatsApp Business API · webhooks/ATS · comparação perfil × cargo · i18n · fila (BullMQ) para cálculo.

## Questões em aberto

- Revisão do banco de perguntas e textos por profissional de RH/psicologia.
- Base legal LGPD definitiva com jurídico.
- Provedor de hospedagem.

## Pendências conhecidas

- **Revisão dos 12 textos das combinações (DI, DS…) por profissional de RH/psicologia**, junto da revisão do questionário e dos textos dos 4 fatores.
- Traces distribuídos (OpenTelemetry), alertas e dashboards sobre as métricas Prometheus.
- Conteúdo: revisão do questionário e dos textos por profissional de RH/psicologia.
- Tela de configuração da empresa existe (nome e retenção); falta o upload de logotipo (white-label).

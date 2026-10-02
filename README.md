# DISC Platform

Plataforma multi-tenant para aplicação de testes comportamentais DISC, voltada a empresas de recrutamento.

**Stack:** NestJS 11 · React 19 (Vite, Tailwind 4) · PostgreSQL 17 · Prisma 7 · monorepo pnpm + Turborepo.

```
backend/      API NestJS (hexagonal: domain / application / infra / presentation)
frontend/     React: fluxo do candidato (/t/:token) e painel admin (/admin)
packages/
  disc-core/  cálculo e validação do DISC, textos de perfil (puro, sem framework)
  contracts/  schemas Zod compartilhados entre front e back
  config/     presets de TypeScript compartilhados
e2e/          Playwright (mobile + desktop) com axe de acessibilidade
docs/         base de conhecimento, ADRs e roadmap
```

## Rodando localmente

### Com Docker (um comando)

```bash
docker compose up --build
```

Sobe Postgres, aplica as migrations, cria o questionário DISC e os dados fictícios da demonstração, e inicia a API e o site:

| O quê                      | Onde                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| Site (landing e painel)    | http://localhost:8080                                                          |
| API e documentação Swagger | http://localhost:3000/api/docs                                                 |
| Login da demonstração      | `demo@aurora.example` / `demo-disc-2026` (ou o botão "Entrar na demonstração") |

Na primeira vez o build leva alguns minutos. Para trocar portas ou o segredo: `WEB_PORT=9000 API_PORT=4000 POSTGRES_PORT=5433 JWT_SECRET=... docker compose up --build`. Para apagar tudo, inclusive o banco: `docker compose down -v`.

> O compose roda em modo de desenvolvimento (HTTP, sem HTTPS). Não é uma configuração de produção.

### Sem Docker para a aplicação (desenvolvimento)

Só o Postgres no Docker; API e site com recarga automática:

```bash
corepack enable
pnpm install
docker compose up -d postgres
pnpm --filter @disc/backend db:migrate     # aplica migrations
pnpm --filter @disc/backend db:seed        # cria o questionário DISC v1

pnpm --filter @disc/backend dev            # API em :3000
pnpm --filter @disc/frontend dev           # web em :5173 (proxy /api → :3000)
```

Documentação interativa da API em `http://localhost:3000/api/docs`.

O backend lê variáveis de ambiente (veja `backend/.env.example`); os padrões servem para desenvolvimento. A API conecta como `disc_app` (sujeito a RLS); migrations e seed usam o dono do schema. Em produção, `JWT_SECRET` e `APP_DATABASE_URL` são obrigatórios.

Em um banco já existente, dê login ao papel: `ALTER ROLE disc_app LOGIN PASSWORD 'disc_app'` (volumes novos do Docker já fazem isso).

**Demonstração com dados fictícios** (14 resultados, convites em aberto, perfis variados):

```bash
pnpm --filter @disc/backend db:seed:demo            # use --reset para recriar
# login: demo@aurora.example / demo-disc-2026  (o script recusa rodar em produção)
# para o botão "Entrar na demonstração", defina VITE_DEMO_EMAIL/VITE_DEMO_PASSWORD no build do frontend
```

**Página de apresentação** (`/apresentacao`): rota pública separada, só com os dados da empresa e a geração do link (com QR code e WhatsApp), para mostrar o produto antes do resto. Cada uso cria uma empresa de demonstração descartável (apagada em 7 dias). Fica desligada em produção, a menos que `ENABLE_PRESENTATION=true`.

Cadastre sua empresa em `http://localhost:5173/login`, gere um link em **Convites** e abra-o no celular.

## Testes

```bash
pnpm db:test:setup      # cria/migra/popula o banco disc_test
pnpm test               # unitários + integração (backend usa Postgres real)
pnpm lint && pnpm format:check && pnpm deps:check   # qualidade e fronteiras
pnpm typecheck && pnpm build
pnpm e2e                # Playwright; requer `playwright install chromium`
```

## Documentação

Veja [`docs/`](docs): visão, requisitos, domínio (DDD), arquitetura, modelo de dados, algoritmo DISC, API, UX, segurança/LGPD, qualidade e [roadmap](docs/10-roadmap.md) (inclui as pendências conhecidas).

> O DISC descreve preferências de comportamento; não é diagnóstico nem critério único de seleção. O banco de perguntas é original e deve ser revisado por profissional de RH/psicologia antes de uso comercial.

# 11 · Deploy na Vercel

A plataforma publica como **um projeto Vercel com dois serviços** no mesmo domínio (`vercel.json` na raiz):

| Serviço    | Pasta       | Público em | Observação                                                                    |
| ---------- | ----------- | ---------- | ----------------------------------------------------------------------------- |
| `backend`  | `backend/`  | `/api/*`   | NestJS detectado por `src/main.ts`; roda como uma função (Fluid).             |
| `frontend` | `frontend/` | `/*`       | Vite (SPA); os `rewrites` do serviço devolvem `index.html` para rotas do app. |

Não há serviços internos nem _bindings_: o navegador chama `/api/v1` no próprio domínio, então o cookie de sessão fica no mesmo site e não há CORS. O serviço recebe o caminho **original** (`/api/v1/...`), por isso o prefixo global da API não muda.

> Serviços da Vercel estão em **beta**. Este arquivo documenta o que foi decidido e o que ainda precisa ser validado no primeiro deploy (lista no fim).

## 1. Banco de dados (Neon)

A API precisa de um Postgres externo com papéis, RLS e a extensão `pg_trgm`. Use o Neon pelo Marketplace da Vercel.

Nada disso roda no build, de propósito: **um preview nunca deve migrar o banco de produção**. Faça da sua máquina, uma vez e a cada migration nova:

```bash
# URL DIRETA do dono do schema (não a do pooler)
export DATABASE_URL='postgres://<dono>:<senha>@<host>/<banco>?sslmode=require'
pnpm --filter @disc/backend db:migrate   # aplica as migrations (cria o papel disc_app, sem login)
pnpm --filter @disc/backend db:seed      # questionário DISC v1
pnpm --filter @disc/backend db:seed:demo # opcional: dados fictícios (o script se recusa com NODE_ENV=production)
```

Depois, no **SQL Editor** do Neon, dê senha ao papel da aplicação (a migration o cria sem login):

```sql
ALTER ROLE disc_app LOGIN PASSWORD '<senha forte>';
```

A API conecta como `disc_app` (sujeito a RLS). A URL do **dono** não vai para a Vercel.

Previews: use uma _branch_ de banco do Neon para previews, nunca o banco de produção.

## 2. Variáveis de ambiente (serviço `backend`)

| Variável              | Valor                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `APP_DATABASE_URL`    | URL do Neon com o usuário `disc_app`, **com pooler** (`...-pooler...`), `sslmode=require` |
| `JWT_SECRET`          | aleatório e longo (obrigatório em produção; a API não sobe sem ele)                       |
| `ENABLE_PRESENTATION` | `true` para ligar a página pública `/apresentacao`                                        |
| `TRUST_PROXY_HOPS`    | `1` (a borda da Vercel está na frente; sem isso o limite por IP vê o IP do proxy)         |
| `CRON_SECRET`         | aleatório, mínimo 16 caracteres (a Vercel o envia no cron como `Bearer`)                  |
| `DB_POOL_MAX`         | opcional, padrão 5 (cada instância tem o próprio pool)                                    |
| `SENTRY_DSN`          | opcional                                                                                  |
| `METRICS_TOKEN`       | opcional (sem ele `/api/v1/metrics` fica desligado em produção)                           |

`WEB_ORIGIN` não precisa ser definido: sem ela, a API usa o domínio de produção (`VERCEL_PROJECT_PRODUCTION_URL`) ou, em preview, a URL do próprio deployment. Defina-a só se usar um domínio próprio e quiser fixá-lo.

Serviço `frontend` (todas opcionais): `VITE_SENTRY_DSN`; `VITE_DEMO_EMAIL` e `VITE_DEMO_PASSWORD` para o botão "Entrar na demonstração".

Se o `pnpm` não for encontrado no build (o `packageManager` fixa `pnpm@12`), adicione `ENABLE_EXPERIMENTAL_COREPACK=1` nas variáveis do projeto.

## 3. Agendador (limpeza de dados)

Em serverless não existe processo vivo para um `setInterval`. A limpeza diária (retenção LGPD por empresa e empresas de apresentação com mais de 7 dias) roda em:

```
GET /api/v1/internal/cron/purge     Authorization: Bearer <CRON_SECRET>
```

- Sem `CRON_SECRET` configurado, o endpoint responde **404** (nunca fica aberto por esquecimento).
- O `vercel.json` agenda uma chamada diária às 03:00 UTC (`crons`). Se o modo serviços não aceitar `crons`, chame o endpoint por um agendador externo (por exemplo, `schedule` do GitHub Actions).

## 4. Publicando

1. Suba o repositório no GitHub.
2. Na Vercel: **Add New → Project**, importe o repositório (a raiz tem o `vercel.json`).
3. Adicione o Neon (Marketplace) e preencha as variáveis acima.
4. Rode o passo 1 (migrations, seed, senha do `disc_app`) e faça o _Redeploy_.
5. Teste: `/`, `/apresentacao`, `/api/v1/ready`, login e o fluxo completo do candidato.

Teste local antes de subir (sem conta), com o Postgres do Docker no ar:

```bash
npx vercel@latest dev -L --listen 3300   # CLI 48.4 ou mais nova
curl http://localhost:3300/api/v1/ready   # backend, pelo roteador da Vercel
```

Isso foi verificado: a CLI detecta `backend [NestJS]` e `frontend [Vite]`, roteia `/api/*` para o Nest com o caminho intacto e `/*` para o frontend.

## Injeção de dependência independente do compilador

A Vercel (e `tsx`) carregam TypeScript com esbuild, que **não emite `emitDecoratorMetadata`**. Sem metadata, a injeção do Nest por tipo de parâmetro quebra (`this.prisma` fica `undefined`). Por isso todo construtor injetável declara o token explicitamente:

```ts
constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
```

**Regra:** novo construtor injetável precisa de `@Inject(Token)` em cada parâmetro. A suíte `pnpm --filter @disc/backend test:nometadata` roda o app **sem metadata** e exercita um endpoint de cada módulo; se um `@Inject` faltar, ela falha com `Nest can't resolve dependencies of ...` (a suíte normal, que tem metadata, não perceberia).

## Limitações conhecidas

- **Limite de requisições em memória** (`@nestjs/throttler`): vale por instância, então um atacante distribuído em várias instâncias passa por limites mais frouxos. O limite **diário** da apresentação é contado no banco e se mantém. Evolução: Redis/KV.
- **Métricas Prometheus** são por instância; em serverless servem pouco. Prefira o Sentry e os logs da Vercel.
- **Cold start**: Nest + Prisma levam alguns segundos na primeira chamada de uma instância fria.
- **Binário nativo do hash de senha** (`@node-rs/argon2`): se o login falhar em produção por causa do _bundle_, a troca é por uma implementação sem binário.

## A validar no primeiro deploy

Pontos que a documentação da Vercel não cobre e que dependem de teste real:

1. Instalação dos pacotes `workspace:*` quando o `root` do serviço é uma subpasta (os `--filter` do `installCommand` assumem a raiz do monorepo).
2. Que a Vercel use `src/main.ts` (caminho documentado e já validado no `vercel dev -L`). Se o build não achar o entrypoint, acrescente `"entrypoint": "dist/main.js"` ao serviço `backend` (o `buildCommand` já gera o `dist/`).
3. Suporte a `crons` no nível superior do `vercel.json` em modo serviços.
4. Slugs de `framework` (`nestjs`, `vite`) e os `rewrites` por serviço (fallback do SPA).

**Plano B para o backend:** `"runtime": "container"` no serviço, reaproveitando `docker/backend.Dockerfile`.

**Já validado localmente (`vercel dev -L`):** detecção dos serviços e frameworks (`nestjs`, `vite`), roteamento `/api/*` e `/*`, caminho original preservado até o Nest, rotas do SPA, e o backend com injeção sem metadata.

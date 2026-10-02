# ADR-005 · ORM / acesso a dados

**Status:** Aceita (Prisma 7.10)

**Contexto:** Precisamos de migrations, tipos fortes, RLS e SQL cru para read models de relatório.

**Decisão:** Prisma, com o driver adapter `@prisma/adapter-pg`. O cliente é gerado em `backend/src/infra/prisma/generated` (não versionado, gerado em `build`/`typecheck`). Versão fixada em 7.10.0 (estável); a 8.x ainda é release candidate.

**Regras:**

- Repositórios mapeiam o modelo Prisma para entidades de domínio; o tipo do Prisma não sai da camada `infra`.
- Invariantes que o Prisma não expressa (CHECK de `rank`, índice trigram, futuramente RLS) vão em SQL dentro da migration.
- Relatórios complexos usam `$queryRaw`.

**Alternativas consideradas:** Drizzle (SQL-like, mais leve) e TypeORM (tipagem mais fraca).

**Consequências:** (+) DX e migrations simples. (−) RLS e consultas avançadas exigem SQL manual; modelo gerado difere do modelo de domínio, daí o mapeamento.

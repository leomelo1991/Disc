# ADR-001 · Monorepo com pnpm + Turborepo

**Status:** Aceita

**Contexto:** API e web compartilham contratos (DTOs/schemas) e queremos mudanças atômicas e tipos de ponta a ponta.

**Decisão:** Um repositório com `backend`, `frontend` e `packages/*`, gerenciado por pnpm workspaces e Turborepo (cache e pipelines).

**Consequências:** (+) contratos únicos, refatoração segura, CI com cache. (−) exige disciplina de fronteiras entre pacotes; pipeline de deploy por app.

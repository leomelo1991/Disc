# ADR-002 · PostgreSQL como banco principal

**Status:** Aceita

**Contexto:** Dados relacionais com constraints fortes (rank 1–4 sem repetição), multi-tenancy e relatórios com filtros.

**Decisão:** PostgreSQL, usando CHECK/UNIQUE para invariantes, Row Level Security para isolamento e `pg_trgm` para busca por nome.

**Consequências:** (+) integridade e isolamento no próprio banco, bom suporte a índices. (−) RLS exige configurar o contexto do tenant por conexão/transação.

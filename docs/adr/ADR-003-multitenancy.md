# ADR-003 · Multi-tenancy por coluna + RLS

**Status:** Aceita e implementada (RLS ativo)

**Contexto:** Várias empresas no mesmo sistema, sem vazamento de dados.

**Decisão:** Banco e schema únicos, coluna `tenant_id` em todas as tabelas de negócio, políticas RLS e `TenantContext` por request. Candidato resolve o tenant pelo token do convite.

**Alternativas descartadas:** schema por tenant (migrações complexas), banco por tenant (custo operacional).

**Consequências:** (+) simples de operar e escalar no início. (−) risco de "tenant noisy"; mitigado por índices e rate limits. Testes de isolamento obrigatórios.

## Implementação do RLS

Migration `20261002120000_rls`.

- **Dois papéis no Postgres.** O dono do schema (`DATABASE_URL`) roda migrations e seed. A API conecta como **`disc_app`** (`APP_DATABASE_URL`), que não é dono das tabelas e por isso está sujeito às políticas. Em produção, `APP_DATABASE_URL` é obrigatória: não há fallback para o dono, que ignoraria o RLS.
- **Políticas.** `tenant`, `user`, `invitation`, `submission`, `candidate` e `audit_log` filtram por `app.tenant_id`. `answer` e `profile_result` (sem `tenant_id`) só são visíveis se a submissão pai for visível. O catálogo de questionários é somente leitura para a aplicação.
- **Contexto por transação.** `PrismaService.withTenant(tenantId, fn)` abre uma transação e executa `set_config('app.tenant_id', id, true)` (local à transação, seguro com pool). **Falha fechada:** sem contexto, nenhuma linha é visível nem gravável.
- **Consultas entre empresas** (únicas que precisam existir) são funções `SECURITY DEFINER` com `search_path` fixo: `auth_users_by_email`, `auth_user_by_id`, `public_invitation_by_hash` e `purge_expired_submissions`. `refresh_token` não tem RLS e é acessado só pelo hash do token.
- **Cadastro de empresa:** o `id` é gerado na aplicação para abrir o contexto antes do INSERT.

**Testes** (`backend/test/rls.test.ts`): usam o papel restrito e "esquecem" o filtro de propósito. Verificam falha fechada, isolamento em tabelas filhas, bloqueio de leitura/alteração/exclusão/gravação cruzada, ausência de vazamento de contexto entre requisições e catálogo imutável. Com o RLS desligado em uma tabela, 4 dos 7 testes falham, o que confirma que não são vacuosos.

**Consequências:** (+) um `where` esquecido não vaza dados. (−) toda consulta de painel roda numa transação; novas consultas entre empresas exigem uma função `SECURITY DEFINER` revisada; novas tabelas por empresa precisam de política na própria migration.

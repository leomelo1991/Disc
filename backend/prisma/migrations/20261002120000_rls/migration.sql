-- Row Level Security: isolamento entre empresas garantido pelo banco.
--
-- O papel da aplicação (disc_app) NÃO é dono das tabelas, então está sujeito às políticas.
-- Login e senha dele são definidos fora da migration (docker/initdb, scripts/setup-test-db.sh ou o time de infra).
-- O contexto da empresa vem de set_config('app.tenant_id', <uuid>, true), por transação.
-- Sem contexto, nenhuma linha é visível nem gravável (falha fechada).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'disc_app') THEN
    CREATE ROLE disc_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO disc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO disc_app;
-- A tabela de controle do Prisma não deve ser acessível à aplicação. Ela pode não existir ainda no banco
-- "sombra" do `prisma migrate dev`, então o REVOKE é condicional.
DO $$
BEGIN
  IF to_regclass('"_prisma_migrations"') IS NOT NULL THEN
    REVOKE ALL ON TABLE "_prisma_migrations" FROM disc_app;
  END IF;
END
$$;
-- Catálogo (questionários) é somente leitura para a aplicação.
REVOKE INSERT, UPDATE, DELETE ON "assessment_type", "questionnaire", "question_group", "question_option" FROM disc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO disc_app;

-- Tabelas com tenant_id
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant"
  USING ("id" = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "user"
  USING ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invitation"
  USING ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "submission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "submission"
  USING ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "candidate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "candidate"
  USING ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_log"
  USING ("tenantId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- Tabelas filhas sem tenant_id: visíveis apenas se a submissão pai for visível (que já é filtrada por RLS).
ALTER TABLE "answer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY via_submission ON "answer"
  USING (EXISTS (SELECT 1 FROM "submission" s WHERE s."id" = "answer"."submissionId"));

ALTER TABLE "profile_result" ENABLE ROW LEVEL SECURITY;
CREATE POLICY via_submission ON "profile_result"
  USING (EXISTS (SELECT 1 FROM "submission" s WHERE s."id" = "profile_result"."submissionId"));

-- Únicas consultas que precisam atravessar empresas (rodam como dono, com search_path fixo).
-- refresh_token é acessado só pelo hash do token (256 bits), por isso não tem RLS.

CREATE FUNCTION auth_users_by_email(p_email text) RETURNS SETOF "user"
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT * FROM "user" WHERE "email" = p_email $$;

CREATE FUNCTION auth_user_by_id(p_id uuid) RETURNS SETOF "user"
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT * FROM "user" WHERE "id" = p_id $$;

CREATE FUNCTION public_invitation_by_hash(p_hash text)
RETURNS TABLE (
  "id" uuid, "tenantId" uuid, "tenantName" text, "questionnaireId" uuid,
  "status" "InvitationStatus", "expiresAt" timestamptz, "targetRole" text, "targetDepartment" text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT i."id", i."tenantId", t."name", i."questionnaireId", i."status", i."expiresAt", i."targetRole", i."targetDepartment"
  FROM "invitation" i JOIN "tenant" t ON t."id" = i."tenantId"
  WHERE i."tokenHash" = p_hash
$$;

CREATE FUNCTION purge_expired_submissions(p_now timestamptz) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE
  t record;
  n integer;
  total integer := 0;
BEGIN
  FOR t IN SELECT "id", "retentionDays" FROM "tenant" LOOP
    DELETE FROM "submission"
      WHERE "tenantId" = t."id" AND "submittedAt" < p_now - make_interval(days => t."retentionDays");
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO "audit_log" ("id", "tenantId", "action", "entityType", "entityId")
      VALUES (gen_random_uuid(), t."id", 'RETENTION_PURGE', 'submission', 'count:' || n);
      total := total + n;
    END IF;
  END LOOP;
  RETURN total;
END
$$;

REVOKE EXECUTE ON FUNCTION auth_users_by_email(text), auth_user_by_id(uuid), public_invitation_by_hash(text), purge_expired_submissions(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_users_by_email(text), auth_user_by_id(uuid), public_invitation_by_hash(text), purge_expired_submissions(timestamptz) TO disc_app;

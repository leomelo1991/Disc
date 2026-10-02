-- Empresas criadas pela página pública de apresentação (/apresentacao).
ALTER TABLE "tenant" ADD COLUMN "isPresentation" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "tenant_isPresentation_createdAt_idx" ON "tenant"("isPresentation", "createdAt");

-- Limite diário de criação: conta empresas de apresentação (atravessa empresas, por isso SECURITY DEFINER).
CREATE FUNCTION count_presentation_tenants(p_since timestamptz) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT count(*)::integer FROM "tenant" WHERE "isPresentation" AND "createdAt" >= p_since $$;

-- Limpeza: apaga empresas de apresentação mais antigas que p_before, com tudo que depende delas.
CREATE FUNCTION purge_presentation_tenants(p_before timestamptz) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$
DECLARE
  ids uuid[];
BEGIN
  SELECT coalesce(array_agg("id"), '{}') INTO ids
    FROM "tenant" WHERE "isPresentation" AND "createdAt" < p_before;
  IF array_length(ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  DELETE FROM "submission" WHERE "tenantId" = ANY (ids);   -- candidato, respostas e perfil caem em cascata
  DELETE FROM "invitation" WHERE "tenantId" = ANY (ids);
  DELETE FROM "audit_log" WHERE "tenantId" = ANY (ids);
  DELETE FROM "user" WHERE "tenantId" = ANY (ids);
  DELETE FROM "tenant" WHERE "id" = ANY (ids);
  RETURN array_length(ids, 1);
END
$$;

REVOKE EXECUTE ON FUNCTION count_presentation_tenants(timestamptz), purge_presentation_tenants(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION count_presentation_tenants(timestamptz), purge_presentation_tenants(timestamptz) TO disc_app;

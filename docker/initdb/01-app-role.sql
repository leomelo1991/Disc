-- Papel da aplicação (sujeito a RLS). Só para desenvolvimento/CI: em produção defina a senha pelo seu gerenciador de segredos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'disc_app') THEN
    CREATE ROLE disc_app LOGIN PASSWORD 'disc_app';
  END IF;
END
$$;

-- Application role — NOSUPERUSER + NOBYPASSRLS so RLS policies apply.
-- Migrations/admin continue as nelvyon_local (superuser via docker exec).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_local_app') THEN
    CREATE ROLE nelvyon_local_app
      LOGIN PASSWORD 'nelvyon_local_app_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE nelvyon_local_ai TO nelvyon_local_app;
GRANT USAGE ON SCHEMA public TO nelvyon_local_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelvyon_local_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelvyon_local_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nelvyon_local_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO nelvyon_local_app;

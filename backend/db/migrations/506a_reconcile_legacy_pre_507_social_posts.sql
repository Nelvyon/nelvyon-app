-- Migration 506a: Reconcile legacy integer social_posts before FastAPI 507 (staging KI-025)
-- Idempotent: renames empty integer social_posts (no tenant_id) so 507 can CREATE UUID+tenant_id schema.
-- Order: 506_* < 506a_* < 507_* (lexicographic sort in migrate.ts).
-- Safety: no DROP / TRUNCATE / DELETE / UPDATE. Abort on unexpected state.
-- Do NOT rename bookings / api_keys / calendar_events / invoices / audit_logs / qr_codes.

DO $$
DECLARE
  id_udt text;
  has_tenant boolean;
  row_count bigint;
  dest_table_exists boolean;
  dest_seq_exists boolean;
  seq_reg text;
BEGIN
  -- Source missing → no-op
  IF to_regclass('public.social_posts') IS NULL THEN
    RAISE NOTICE 'KI-025: public.social_posts does not exist; nothing to reconcile';
    RETURN;
  END IF;

  -- id type
  SELECT a.atttypid::regtype::text
  INTO id_udt
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'social_posts'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF id_udt IS NULL THEN
    RAISE EXCEPTION 'KI-025 abort: public.social_posts.id column not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'social_posts'
      AND column_name = 'tenant_id'
  ) INTO has_tenant;

  -- Already 507-compatible (UUID + tenant_id): no-op BEFORE destination-exists abort
  IF id_udt = 'uuid' AND has_tenant THEN
    RAISE NOTICE 'KI-025: public.social_posts already uuid + tenant_id; skip reconcile';
    RETURN;
  END IF;

  -- Destination must not already exist
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'social_posts_legacy_integer'
      AND c.relkind = 'r'
  ) INTO dest_table_exists;

  IF dest_table_exists THEN
    RAISE EXCEPTION 'KI-025 abort: public.social_posts_legacy_integer already exists';
  END IF;

  IF id_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE EXCEPTION 'KI-025 abort: unexpected public.social_posts.id type %', id_udt;
  END IF;

  IF has_tenant THEN
    RAISE EXCEPTION 'KI-025 abort: social_posts has tenant_id but id type is % (unexpected hybrid)', id_udt;
  END IF;

  EXECUTE 'SELECT count(*) FROM public.social_posts' INTO row_count;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'KI-025 abort: public.social_posts has % rows; refusing rename', row_count;
  END IF;

  -- Sequence: only rename if owned by social_posts.id; abort if destination name taken
  SELECT pg_get_serial_sequence('public.social_posts', 'id') INTO seq_reg;
  IF seq_reg IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'social_posts_legacy_integer_id_seq'
        AND c.relkind = 'S'
    ) INTO dest_seq_exists;

    IF dest_seq_exists THEN
      RAISE EXCEPTION 'KI-025 abort: sequence public.social_posts_legacy_integer_id_seq already exists';
    END IF;

    EXECUTE format('ALTER SEQUENCE %s RENAME TO social_posts_legacy_integer_id_seq', seq_reg::regclass);
  END IF;

  ALTER TABLE public.social_posts RENAME TO social_posts_legacy_integer;

  RAISE NOTICE 'KI-025: renamed public.social_posts -> social_posts_legacy_integer (id type was %)', id_udt;
END $$;

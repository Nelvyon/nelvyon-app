-- Migration 401a: Reconcile legacy integer deals table (staging repair KI-023)
-- Idempotent: renames empty integer deals (no tenant_id) so 402 can create UUID+tenant_id schema.
-- Order: 401_* < 401a_* < 402_* (lexicographic sort in migrate.ts).
-- Safety: no DROP / TRUNCATE / DELETE / UPDATE. Abort on unexpected state.

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
  IF to_regclass('public.deals') IS NULL THEN
    RAISE NOTICE 'KI-023: public.deals does not exist; nothing to reconcile';
    RETURN;
  END IF;

  -- id type
  SELECT a.atttypid::regtype::text
  INTO id_udt
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'deals'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF id_udt IS NULL THEN
    RAISE EXCEPTION 'KI-023 abort: public.deals.id column not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deals'
      AND column_name = 'tenant_id'
  ) INTO has_tenant;

  -- Already 402-compatible: no-op BEFORE destination-exists abort (idempotency)
  IF id_udt = 'uuid' AND has_tenant THEN
    RAISE NOTICE 'KI-023: public.deals already uuid + tenant_id; skip reconcile';
    RETURN;
  END IF;

  -- Destination table must not already exist (only relevant when we still need to rename)
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'deals_legacy_integer'
      AND c.relkind = 'r'
  ) INTO dest_table_exists;

  IF dest_table_exists THEN
    RAISE EXCEPTION 'KI-023 abort: public.deals_legacy_integer already exists';
  END IF;

  IF id_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE EXCEPTION 'KI-023 abort: unexpected public.deals.id type %', id_udt;
  END IF;

  IF has_tenant THEN
    RAISE EXCEPTION 'KI-023 abort: deals has tenant_id but id type is % (unexpected hybrid)', id_udt;
  END IF;

  EXECUTE 'SELECT count(*) FROM public.deals' INTO row_count;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'KI-023 abort: public.deals has % rows; refusing rename', row_count;
  END IF;

  -- Sequence: only rename if owned by deals.id; abort if destination name taken
  SELECT pg_get_serial_sequence('public.deals', 'id') INTO seq_reg;
  IF seq_reg IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'deals_legacy_integer_id_seq'
        AND c.relkind = 'S'
    ) INTO dest_seq_exists;

    IF dest_seq_exists THEN
      RAISE EXCEPTION 'KI-023 abort: sequence public.deals_legacy_integer_id_seq already exists';
    END IF;

    EXECUTE format('ALTER SEQUENCE %s RENAME TO deals_legacy_integer_id_seq', seq_reg::regclass);
  END IF;

  ALTER TABLE public.deals RENAME TO deals_legacy_integer;

  RAISE NOTICE 'KI-023: renamed public.deals -> deals_legacy_integer (id type was %)', id_udt;
END $$;

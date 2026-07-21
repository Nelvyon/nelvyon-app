-- Migration 407a: Reconcile legacy integer calendar_events (staging repair KI-024)
-- Idempotent: renames empty integer calendar_events (no tenant_id) so 408 can create UUID+tenant_id schema.
-- Filename MUST be 407a_* (not 408a_*): lexicographic sort has 408_* < 408a_*, so 408a would run AFTER 408 and fail.
-- Order: 407_* < 407a_* < 408_* (migrate.ts .sort()).
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
  IF to_regclass('public.calendar_events') IS NULL THEN
    RAISE NOTICE 'KI-024: public.calendar_events does not exist; nothing to reconcile';
    RETURN;
  END IF;

  -- id type
  SELECT a.atttypid::regtype::text
  INTO id_udt
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'calendar_events'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF id_udt IS NULL THEN
    RAISE EXCEPTION 'KI-024 abort: public.calendar_events.id column not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_events'
      AND column_name = 'tenant_id'
  ) INTO has_tenant;

  -- Already 408-compatible: no-op BEFORE destination-exists abort (idempotency)
  IF id_udt = 'uuid' AND has_tenant THEN
    RAISE NOTICE 'KI-024: public.calendar_events already uuid + tenant_id; skip reconcile';
    RETURN;
  END IF;

  -- Destination table must not already exist (only relevant when we still need to rename)
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'calendar_events_legacy_integer'
      AND c.relkind = 'r'
  ) INTO dest_table_exists;

  IF dest_table_exists THEN
    RAISE EXCEPTION 'KI-024 abort: public.calendar_events_legacy_integer already exists';
  END IF;

  IF id_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE EXCEPTION 'KI-024 abort: unexpected public.calendar_events.id type %', id_udt;
  END IF;

  IF has_tenant THEN
    RAISE EXCEPTION 'KI-024 abort: calendar_events has tenant_id but id type is % (unexpected hybrid)', id_udt;
  END IF;

  EXECUTE 'SELECT count(*) FROM public.calendar_events' INTO row_count;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'KI-024 abort: public.calendar_events has % rows; refusing rename', row_count;
  END IF;

  -- Sequence: only rename if owned by calendar_events.id; abort if destination name taken
  SELECT pg_get_serial_sequence('public.calendar_events', 'id') INTO seq_reg;
  IF seq_reg IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'calendar_events_legacy_integer_id_seq'
        AND c.relkind = 'S'
    ) INTO dest_seq_exists;

    IF dest_seq_exists THEN
      RAISE EXCEPTION 'KI-024 abort: sequence public.calendar_events_legacy_integer_id_seq already exists';
    END IF;

    EXECUTE format('ALTER SEQUENCE %s RENAME TO calendar_events_legacy_integer_id_seq', seq_reg::regclass);
  END IF;

  ALTER TABLE public.calendar_events RENAME TO calendar_events_legacy_integer;

  RAISE NOTICE 'KI-024: renamed public.calendar_events -> calendar_events_legacy_integer (id type was %)', id_udt;
END $$;

-- Migration 400a: Reconcile legacy integer conversations table (staging repair KI-022)
-- Idempotent: renames empty integer/bigint public.conversations so 401 can create UUID inbox schema.
-- Safety: aborts if rows > 0, unexpected id type, or destination already exists.
-- No DROP / TRUNCATE / DELETE / UPDATE.

DO $$
DECLARE
  id_udt text;
  row_count bigint;
  dest_exists boolean;
  seq_reg text;
BEGIN
  -- Destination must not already exist
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'conversations_legacy_integer'
      AND c.relkind = 'r'
  ) INTO dest_exists;

  IF dest_exists THEN
    RAISE EXCEPTION 'KI-022 abort: public.conversations_legacy_integer already exists';
  END IF;

  -- Source table must exist
  IF to_regclass('public.conversations') IS NULL THEN
    RAISE NOTICE 'KI-022: public.conversations does not exist; nothing to reconcile';
    RETURN;
  END IF;

  -- id type must be int4 or int8 (legacy integer schema)
  SELECT a.atttypid::regtype::text
  INTO id_udt
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'conversations'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF id_udt IS NULL THEN
    RAISE EXCEPTION 'KI-022 abort: public.conversations.id column not found';
  END IF;

  -- Already UUID (or other non-integer): skip rename (idempotent / already reconciled)
  IF id_udt IN ('uuid') THEN
    RAISE NOTICE 'KI-022: public.conversations.id is already uuid; skip reconcile';
    RETURN;
  END IF;

  IF id_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE EXCEPTION 'KI-022 abort: unexpected public.conversations.id type %', id_udt;
  END IF;

  -- Must be empty
  EXECUTE 'SELECT count(*) FROM public.conversations' INTO row_count;
  IF row_count > 0 THEN
    RAISE EXCEPTION 'KI-022 abort: public.conversations has % rows; refusing rename', row_count;
  END IF;

  -- Rename owned serial/identity sequence first (only if belongs to conversations.id)
  SELECT pg_get_serial_sequence('public.conversations', 'id') INTO seq_reg;
  IF seq_reg IS NOT NULL THEN
    EXECUTE format('ALTER SEQUENCE %s RENAME TO conversations_legacy_integer_id_seq', seq_reg::regclass);
  END IF;

  -- Rename table
  ALTER TABLE public.conversations RENAME TO conversations_legacy_integer;

  RAISE NOTICE 'KI-022: renamed public.conversations -> conversations_legacy_integer (id type was %)', id_udt;
END $$;
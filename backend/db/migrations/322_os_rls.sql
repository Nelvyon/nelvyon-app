-- OS-1-12: Row Level Security defensivo en tablas canónicas OS (workspace_id).
-- Complementa aislamiento en FastAPI; service_role bypass (backend) sigue operativo.
-- Helpers de membership condicionales si `workspaces` / `workspace_members` (Alembic) no existen aún.

-- ── Helpers workspace (JWT sub = users.id texto) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.nelvyon_jwt_sub_text()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    public.nelvyon_jwt_user_id()::text
  );
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_current_workspace_id()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.workspace_id', true), '')::integer,
    NULLIF(current_setting('request.jwt.claim.workspace_id', true), '')::integer
  );
$$;

DO $nelvyon_os_rls_workspace_helpers$
BEGIN
  IF to_regclass('public.workspaces') IS NOT NULL
     AND to_regclass('public.workspace_members') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.nelvyon_user_in_workspace(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT CASE
    WHEN p_workspace_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = public.nelvyon_jwt_sub_text()
        AND lower(coalesce(wm.status, '')) = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces w
      WHERE w.id = p_workspace_id
        AND w.user_id = public.nelvyon_jwt_sub_text()
    )
  END;
$body$;
$fn$;

    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.nelvyon_workspace_can_mutate(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT CASE
    WHEN p_workspace_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
        AND wm.user_id = public.nelvyon_jwt_sub_text()
        AND lower(coalesce(wm.status, '')) = 'active'
        AND lower(wm.role) IN ('owner', 'admin', 'operator')
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces w
      WHERE w.id = p_workspace_id
        AND w.user_id = public.nelvyon_jwt_sub_text()
    )
  END;
$body$;
$fn$;
  ELSE
    RAISE NOTICE '322: workspaces/workspace_members not present — installing deny-all workspace membership helpers';

    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.nelvyon_user_in_workspace(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT false;
$body$;
$fn$;

    EXECUTE $fn$
CREATE OR REPLACE FUNCTION public.nelvyon_workspace_can_mutate(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $body$
  SELECT false;
$body$;
$fn$;
  END IF;
END;
$nelvyon_os_rls_workspace_helpers$;

CREATE OR REPLACE FUNCTION public.nelvyon_os_workspace_select(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_workspace_id IS NOT NULL
    AND p_workspace_id = public.nelvyon_current_workspace_id()
    AND public.nelvyon_user_in_workspace(p_workspace_id);
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_os_workspace_mutate(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.nelvyon_os_workspace_select(p_workspace_id)
    AND public.nelvyon_workspace_can_mutate(p_workspace_id);
$$;

-- ── Aplicar RLS por tabla ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.nelvyon_apply_os_workspace_rls(p_table text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = 'workspace_id'
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_os_select', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_os_insert', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_os_update', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_os_delete', p_table);

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT
     USING (public.nelvyon_os_workspace_select(workspace_id))',
    p_table || '_os_select',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR INSERT
     WITH CHECK (public.nelvyon_os_workspace_mutate(workspace_id))',
    p_table || '_os_insert',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR UPDATE
     USING (public.nelvyon_os_workspace_mutate(workspace_id))
     WITH CHECK (public.nelvyon_os_workspace_mutate(workspace_id))',
    p_table || '_os_update',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR DELETE
     USING (public.nelvyon_os_workspace_mutate(workspace_id))',
    p_table || '_os_delete',
    p_table
  );
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'os_clients',
    'os_projects',
    'os_tasks',
    'os_deliverables',
    'os_portal_invites',
    'os_portal_users',
    'os_deliverable_reviews',
    'os_deliverable_versions'
  ])
  LOOP
    PERFORM public.nelvyon_apply_os_workspace_rls(tbl);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.nelvyon_apply_os_workspace_rls IS
  'RLS OS: SELECT miembros activos del workspace; INSERT/UPDATE/DELETE owner|admin|operator.';

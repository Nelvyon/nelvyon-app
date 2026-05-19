-- MIG 279 — Row Level Security audit (Supabase multi-tenant isolation)
-- Requires Supabase Auth JWT (auth.uid()) aligned with nelvyon_users.user_id (uuid).

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.nelvyon_jwt_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid(),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.nelvyon_users
  WHERE user_id = public.nelvyon_jwt_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_apply_rls_user_id(p_table text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_select_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_insert_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_update_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_delete_own', p_table);

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT USING (user_id::text = public.nelvyon_jwt_user_id()::text)',
    p_table || '_select_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_id::text = public.nelvyon_jwt_user_id()::text)',
    p_table || '_insert_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR UPDATE USING (user_id::text = public.nelvyon_jwt_user_id()::text) WITH CHECK (user_id::text = public.nelvyon_jwt_user_id()::text)',
    p_table || '_update_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR DELETE USING (user_id::text = public.nelvyon_jwt_user_id()::text)',
    p_table || '_delete_own',
    p_table
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_apply_rls_tenant_id(p_table text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_select_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_insert_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_update_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_delete_own', p_table);

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = public.nelvyon_current_tenant_id())',
    p_table || '_select_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = public.nelvyon_current_tenant_id())',
    p_table || '_insert_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = public.nelvyon_current_tenant_id()) WITH CHECK (tenant_id = public.nelvyon_current_tenant_id())',
    p_table || '_update_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = public.nelvyon_current_tenant_id())',
    p_table || '_delete_own',
    p_table
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.nelvyon_apply_rls_client_id(p_table text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_select_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_insert_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_update_own', p_table);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_table || '_delete_own', p_table);

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT USING (client_id = public.nelvyon_current_tenant_id())',
    p_table || '_select_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (client_id = public.nelvyon_current_tenant_id())',
    p_table || '_insert_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR UPDATE USING (client_id = public.nelvyon_current_tenant_id()) WITH CHECK (client_id = public.nelvyon_current_tenant_id())',
    p_table || '_update_own',
    p_table
  );
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR DELETE USING (client_id = public.nelvyon_current_tenant_id())',
    p_table || '_delete_own',
    p_table
  );
END;
$$;

-- ── Core tenant / user tables ─────────────────────────────────────────────────
SELECT public.nelvyon_apply_rls_user_id('nelvyon_users');
SELECT public.nelvyon_apply_rls_user_id('subscriptions');
SELECT public.nelvyon_apply_rls_user_id('usage_events');
SELECT public.nelvyon_apply_rls_user_id('api_keys');
SELECT public.nelvyon_apply_rls_user_id('onboarding');
SELECT public.nelvyon_apply_rls_tenant_id('dunning_log');
SELECT public.nelvyon_apply_rls_client_id('os_jobs');

-- os_job_results / os_upsell: tenant + client columns
DO $$
BEGIN
  IF to_regclass('public.os_job_results') IS NOT NULL THEN
    PERFORM public.nelvyon_apply_rls_tenant_id('os_job_results');
  END IF;
  IF to_regclass('public.os_upsell_suggestions') IS NOT NULL THEN
    PERFORM public.nelvyon_apply_rls_client_id('os_upsell_suggestions');
  END IF;
END $$;

-- ── All agent result tables (user_id column) ──────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND (
        t.table_name LIKE '%\_results' ESCAPE '\'
        OR t.table_name IN (
          'webhook_subscriptions',
          'referral_codes',
          'social_share_events',
          'leaderboard_rankings',
          'marketplace_listings',
          'agency_certifications'
        )
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = t.table_name
          AND c.column_name = 'user_id'
      )
      AND t.table_name NOT IN ('nelvyon_users', 'subscriptions', 'usage_events', 'api_keys', 'onboarding')
  LOOP
    PERFORM public.nelvyon_apply_rls_user_id(r.table_name);
  END LOOP;
END $$;

-- Grants for Supabase roles (RLS still enforced for authenticated)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

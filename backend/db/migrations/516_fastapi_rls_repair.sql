-- Migration 516: FastAPI / SaaS dual-plane RLS repair (KI-026)
-- Operative repair post-507: recreates tenant policies that failed when
-- current_tenant_id() was referenced before CREATE FUNCTION (42883).
-- Architecture: ADR-032 dual-plane tenant isolation.
--
-- Idempotent. Does NOT edit 507. Does NOT disable RLS. Does NOT alter
-- types/tables/data. Does NOT touch Shared Memory (514/515).
-- Never creates broad public policies.

-- ---------------------------------------------------------------------------
-- 0) Ensure FastAPI session helpers exist (idempotent CREATE OR REPLACE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.tenant_id', TRUE), '')::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Temporary helpers (dropped at end of this migration)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._nelvyon_516_ws_policy(p_table text, p_policy text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  has_rls boolean;
  col_udt text;
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  SELECT c.relrowsecurity INTO has_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_table;

  IF NOT COALESCE(has_rls, false) THEN
    RETURN;
  END IF;

  SELECT a.atttypid::regtype::text INTO col_udt
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_table
    AND a.attname = 'workspace_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF col_udt IS NULL OR col_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE NOTICE '516: skip %.workspace_id (type=%)', p_table, col_udt;
    RETURN;
  END IF;

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR ALL
       USING (workspace_id = public.current_tenant_id())
       WITH CHECK (workspace_id = public.current_tenant_id())',
    p_policy, p_table
  );
  RAISE NOTICE '516: % — workspace_id policy %', p_table, p_policy;
END;
$$;

CREATE OR REPLACE FUNCTION public._nelvyon_516_tid_int_policy(p_table text, p_policy text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  has_rls boolean;
  col_udt text;
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  SELECT c.relrowsecurity INTO has_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_table;

  IF NOT COALESCE(has_rls, false) THEN
    RETURN;
  END IF;

  SELECT a.atttypid::regtype::text INTO col_udt
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_table
    AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF col_udt IS NULL OR col_udt NOT IN ('integer', 'bigint', 'int4', 'int8') THEN
    RAISE NOTICE '516: skip %.tenant_id (type=%)', p_table, col_udt;
    RETURN;
  END IF;

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR ALL
       USING (tenant_id = public.current_tenant_id())
       WITH CHECK (tenant_id = public.current_tenant_id())',
    p_policy, p_table
  );
  RAISE NOTICE '516: % — tenant_id INT policy %', p_table, p_policy;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply policies by plane
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_col boolean;
  has_rls boolean;
  col_udt text;
BEGIN
  -- =========================================================================
  -- PLANE A — SaaS UUID: audit_logs
  -- =========================================================================
  IF to_regclass('public.audit_logs') IS NOT NULL
     AND to_regclass('public.saas_tenants') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'nelvyon_current_saas_tenant_uuid'
     )
  THEN
    SELECT a.atttypid::regtype::text INTO col_udt
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'audit_logs'
      AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped;

    IF col_udt = 'uuid' THEN
      SELECT c.relrowsecurity INTO has_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'audit_logs';

      IF has_rls THEN
        DROP POLICY IF EXISTS audit_logs_tenant_select ON audit_logs;
        DROP POLICY IF EXISTS audit_logs_tenant_insert ON audit_logs;
        DROP POLICY IF EXISTS audit_logs_tenant ON audit_logs;
        DROP POLICY IF EXISTS audit_logs_saas_tenant ON audit_logs;
        DROP POLICY IF EXISTS audit_logs_saas_tenant_select ON audit_logs;
        DROP POLICY IF EXISTS audit_logs_saas_tenant_insert ON audit_logs;

        CREATE POLICY audit_logs_saas_tenant_select ON audit_logs
          FOR SELECT
          USING (tenant_id = public.nelvyon_current_saas_tenant_uuid());

        CREATE POLICY audit_logs_saas_tenant_insert ON audit_logs
          FOR INSERT
          WITH CHECK (tenant_id = public.nelvyon_current_saas_tenant_uuid());

        RAISE NOTICE '516: audit_logs — SaaS UUID policies applied';
      END IF;
    ELSE
      RAISE NOTICE '516: audit_logs.tenant_id is % — skip SaaS UUID policies', col_udt;
    END IF;
  END IF;

  -- =========================================================================
  -- PLANE D — Chatbot user-scoped via chatbot_configs
  -- =========================================================================
  IF to_regclass('public.chatbot_conversations') IS NOT NULL
     AND to_regclass('public.chatbot_configs') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'nelvyon_jwt_user_id'
     )
  THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'chatbot_configs'
        AND column_name = 'user_id'
    ) INTO has_col;

    SELECT c.relrowsecurity INTO has_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'chatbot_conversations';

    -- 051 SaaS shape: no workspace_id on conversations
    IF has_col AND has_rls AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'chatbot_conversations'
        AND column_name = 'workspace_id'
    ) THEN
      DROP POLICY IF EXISTS chatbot_conversations_tenant ON chatbot_conversations;
      DROP POLICY IF EXISTS chatbot_conversations_user ON chatbot_conversations;

      CREATE POLICY chatbot_conversations_user ON chatbot_conversations
        FOR ALL
        USING (
          chatbot_id IN (
            SELECT id FROM public.chatbot_configs
            WHERE user_id = public.nelvyon_jwt_user_id()
          )
        )
        WITH CHECK (
          chatbot_id IN (
            SELECT id FROM public.chatbot_configs
            WHERE user_id = public.nelvyon_jwt_user_id()
          )
        );

      RAISE NOTICE '516: chatbot_conversations — user-scoped policy via chatbot_configs';
    END IF;
  END IF;

  -- =========================================================================
  -- PLANE B — workspace_id INTEGER = current_tenant_id()
  -- =========================================================================
  PERFORM public._nelvyon_516_ws_policy('cdp_segments', 'cdp_segments_tenant');
  PERFORM public._nelvyon_516_ws_policy('dialer_calls', 'dialer_calls_tenant');
  PERFORM public._nelvyon_516_ws_policy('funnels', 'funnels_tenant');
  PERFORM public._nelvyon_516_ws_policy('lms_enrollments', 'lms_enrollments_tenant');
  PERFORM public._nelvyon_516_ws_policy('lms_progress', 'lms_progress_tenant');
  PERFORM public._nelvyon_516_ws_policy('social_alerts', 'social_alerts_tenant');
  PERFORM public._nelvyon_516_ws_policy('social_mentions', 'social_mentions_tenant');

  -- Early extras (only if table exists + RLS ON + workspace_id int)
  PERFORM public._nelvyon_516_ws_policy('ab_experiments', 'ab_experiments_tenant');
  PERFORM public._nelvyon_516_ws_policy('ab_variants', 'ab_variants_tenant');
  PERFORM public._nelvyon_516_ws_policy('ab_events', 'ab_events_tenant');
  PERFORM public._nelvyon_516_ws_policy('cdp_events', 'cdp_events_tenant');
  PERFORM public._nelvyon_516_ws_policy('cdp_identities', 'cdp_identities_tenant');
  PERFORM public._nelvyon_516_ws_policy('chatbots', 'chatbots_tenant');
  PERFORM public._nelvyon_516_ws_policy('forms', 'forms_tenant');
  PERFORM public._nelvyon_516_ws_policy('form_responses', 'form_responses_tenant');
  PERFORM public._nelvyon_516_ws_policy('lms_courses', 'lms_courses_tenant');
  PERFORM public._nelvyon_516_ws_policy('lms_modules', 'lms_modules_tenant');
  PERFORM public._nelvyon_516_ws_policy('lms_lessons', 'lms_lessons_tenant');

  -- =========================================================================
  -- PLANE C — tenant_id INTEGER = current_tenant_id() (FastAPI social)
  -- =========================================================================
  PERFORM public._nelvyon_516_tid_int_policy('social_accounts', 'social_accounts_tenant');
  PERFORM public._nelvyon_516_tid_int_policy('social_posts', 'social_posts_tenant');

  -- funnel_steps via parent funnels.workspace_id
  IF to_regclass('public.funnel_steps') IS NOT NULL
     AND to_regclass('public.funnels') IS NOT NULL
  THEN
    SELECT c.relrowsecurity INTO has_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'funnel_steps';

    IF has_rls AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'funnels'
        AND column_name = 'workspace_id'
    ) THEN
      DROP POLICY IF EXISTS funnel_steps_tenant ON funnel_steps;
      CREATE POLICY funnel_steps_tenant ON funnel_steps
        FOR ALL
        USING (
          funnel_id IN (
            SELECT id FROM public.funnels
            WHERE workspace_id = public.current_tenant_id()
          )
        )
        WITH CHECK (
          funnel_id IN (
            SELECT id FROM public.funnels
            WHERE workspace_id = public.current_tenant_id()
          )
        );
      RAISE NOTICE '516: funnel_steps — parent-funnel workspace policy';
    END IF;
  END IF;

  -- social_post_analytics via social_posts.tenant_id INTEGER
  IF to_regclass('public.social_post_analytics') IS NOT NULL
     AND to_regclass('public.social_posts') IS NOT NULL
  THEN
    SELECT c.relrowsecurity INTO has_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'social_post_analytics';

    SELECT a.atttypid::regtype::text INTO col_udt
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'social_posts'
      AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped;

    IF has_rls AND col_udt IN ('integer', 'bigint', 'int4', 'int8') THEN
      DROP POLICY IF EXISTS social_post_analytics_tenant ON social_post_analytics;
      CREATE POLICY social_post_analytics_tenant ON social_post_analytics
        FOR ALL
        USING (
          post_id IN (
            SELECT id FROM public.social_posts
            WHERE tenant_id = public.current_tenant_id()
          )
        )
        WITH CHECK (
          post_id IN (
            SELECT id FROM public.social_posts
            WHERE tenant_id = public.current_tenant_id()
          )
        );
      RAISE NOTICE '516: social_post_analytics — parent social_posts tenant policy';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Cleanup temporary helpers (leave current_tenant_id / set_tenant_context)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._nelvyon_516_ws_policy(text, text);
DROP FUNCTION IF EXISTS public._nelvyon_516_tid_int_policy(text, text);

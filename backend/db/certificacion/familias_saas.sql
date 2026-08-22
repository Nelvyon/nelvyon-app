-- Una tabla por FAMILIA de politica realmente usada en produccion. No una tabla
-- "representativa": las cuatro semanticas son distintas y una sola no las cubre.
DROP TABLE IF EXISTS cert_por_usuario, cert_por_tenant_uuid, cert_por_ws_directo, cert_por_erp_text CASCADE;

-- 804 politicas / 201 tablas
CREATE TABLE cert_por_usuario   (id serial PRIMARY KEY, user_id uuid, marca text);
-- 512 politicas / 136 tablas
CREATE TABLE cert_por_tenant_uuid (id serial PRIMARY KEY, tenant_id uuid, marca text);
--  79 politicas /  36 tablas
CREATE TABLE cert_por_ws_directo (id serial PRIMARY KEY, workspace_id integer, marca text);
--  33 politicas /  33 tablas
CREATE TABLE cert_por_erp_text  (id serial PRIMARY KEY, tenant_id text, marca text);

DO $$
DECLARE
  t text; expr text;
  pares text[][] := ARRAY[
    ARRAY['cert_por_usuario',    '((user_id)::text = (nelvyon_jwt_user_id())::text)'],
    ARRAY['cert_por_tenant_uuid','(tenant_id = nelvyon_current_saas_tenant_uuid())'],
    ARRAY['cert_por_ws_directo', '(workspace_id = current_tenant_id())'],
    ARRAY['cert_por_erp_text',   '(tenant_id = nelvyon_erp_tenant_text())']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(pares, 1) LOOP
    t := pares[i][1]; expr := pares[i][2];
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING %s', t||'_sel', t, expr);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK %s', t||'_ins', t, expr);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING %s WITH CHECK %s', t||'_upd', t, expr, expr);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING %s', t||'_del', t, expr);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO nelvyon_web_app, nelvyon_web_jobs', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nelvyon_web_app;
GRANT SELECT ON public.saas_tenants TO nelvyon_web_app;

-- Los inquilinos SaaS: la familia del uuid los RESUELVE desde el usuario, asi
-- que sin estas filas ningun contexto seria valido y todo pasaria vacio.
DELETE FROM public.saas_tenants WHERE user_id IN
  ('aaaaaaaa-1111-4000-8000-00000000000a','bbbbbbbb-2222-4000-8000-00000000000b');
INSERT INTO public.saas_tenants (id, user_id)
VALUES ('11111111-aaaa-4000-8000-000000000001','aaaaaaaa-1111-4000-8000-00000000000a'),
       ('22222222-bbbb-4000-8000-000000000002','bbbbbbbb-2222-4000-8000-00000000000b');

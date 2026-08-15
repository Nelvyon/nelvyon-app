-- 531 — Indice sobre el filtro de inquilino donde el codigo si consulta.
--
-- QUE SE MIDIO
-- ------------
-- Contra PostgreSQL con la cadena completa aplicada: 367 columnas
-- `workspace_id`/`tenant_id` en el esquema, 97 de ellas sin ningun indice que
-- las lleve en primera posicion. De esas 97, 21 pertenecen a tablas que el SQL
-- vivo filtra EXACTAMENTE por esa columna. Son las que estan aqui.
--
-- Las otras 76 se dejan a proposito: un indice que nadie usa se paga en cada
-- escritura y no devuelve nada. Si manana una consulta empieza a filtrar por
-- ellas, la guardia `test_pg_tenant_index_coverage` lo detecta.
--
-- IMPACTO, MEDIDO Y NO SUPUESTO
-- -----------------------------
-- Con 200.000 filas repartidas en 500 workspaces, el mismo SELECT filtrando por
-- workspace:
--
--   sin indice   Seq Scan          1082 buffers   9,88 ms
--   con indice   Bitmap Index Scan  402 buffers   1,16 ms
--
-- El barrido secuencial crece con la tabla entera, no con lo que el inquilino
-- tiene: es el patron que degrada justo cuando el producto empieza a funcionar.
--
-- POR QUE CADA UNO VA CON `to_regclass`
-- -------------------------------------
-- Tres de estas tablas —`activities`, `campaigns`, `contracts`— no las crea
-- ninguna migracion, sino `Base.metadata.create_all` al arrancar la aplicacion.
-- Al migrar desde cero todavia no existen. Sin la guarda, la migracion abortaria
-- la cadena entera por unas tablas que apareceran despues. Para esas tres el
-- indice se declara ademas en el modelo, que es quien las crea.
--
-- `CREATE INDEX IF NOT EXISTS` sin `CONCURRENTLY` a proposito: `CONCURRENTLY` no
-- puede ejecutarse dentro de un bloque de transaccion y el ejecutor de
-- migraciones envuelve cada fichero en una. Estas tablas son las que hoy NO
-- tienen indice, es decir las que nadie ha optimizado todavia; el bloqueo de
-- escritura al crearlo es breve frente a dejarlas sin el.

DO $$
DECLARE
  objetivo RECORD;
  creados INTEGER := 0;
  ausentes INTEGER := 0;
BEGIN
  FOR objetivo IN
    SELECT * FROM (VALUES
      ('activities',                       'workspace_id'),
      ('campaigns',                        'workspace_id'),
      ('contracts',                        'workspace_id'),
      ('cpq_quotes',                       'workspace_id'),
      ('email_warmup_accounts',            'workspace_id'),
      ('email_warmup_logs',                'workspace_id'),
      ('facebook_messenger_conversations', 'workspace_id'),
      ('instagram_dm_conversations',       'workspace_id'),
      ('linkedin_inbox',                   'workspace_id'),
      ('linkedin_outreach',                'workspace_id'),
      ('lms_enrollments',                  'workspace_id'),
      ('loyalty_points',                   'workspace_id'),
      ('snapchat_ads_campaigns',           'workspace_id'),
      ('template_outcomes',                'workspace_id'),
      ('tenant_branding_activation_logs',  'workspace_id'),
      ('text2pay_payments',                'workspace_id'),
      ('tiktok_ads_campaigns',             'workspace_id'),
      ('tiktok_dm_conversations',          'workspace_id'),
      ('web_performance_metrics',          'workspace_id'),
      ('webinar_registrations',            'workspace_id'),
      ('workflows',                        'workspace_id')
    ) AS t(tabla, columna)
  LOOP
    IF to_regclass('public.' || objetivo.tabla) IS NULL THEN
      ausentes := ausentes + 1;
      CONTINUE;
    END IF;

    -- La columna tambien se comprueba: una tabla puede existir con otra forma,
    -- y un indice sobre una columna inexistente aborta la cadena.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = objetivo.tabla
         AND column_name = objetivo.columna
    ) THEN
      ausentes := ausentes + 1;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
      'ix_' || objetivo.tabla || '_' || objetivo.columna,
      objetivo.tabla,
      objetivo.columna
    );
    creados := creados + 1;
  END LOOP;

  RAISE NOTICE '531: % indices asegurados, % objetivos ausentes (tabla o columna todavia no creada)', creados, ausentes;
END $$;

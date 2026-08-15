-- 533 — `workspace_id` en las tablas de la generacion `/saas`.
--
-- EL PROBLEMA
-- -----------
-- Nueve tablas las creo la generacion `/saas` y acotan por `tenant_id uuid` o
-- `user_id uuid`. El backend FastAPI es workspace-scoped: sus 51 consultas
-- filtran por `workspace_id`, columna que esas tablas no tienen. Los INSERT ya
-- se alinearon con el contrato real; las LECTURAS seguian rotas.
--
-- POR QUE SE ANADE LA COLUMNA EN VEZ DE REESCRIBIR 51 CONSULTAS
-- -------------------------------------------------------------
-- Porque es lo mismo que hizo la migracion 325 con `subscriptions` —«add
-- missing columns»— y porque reescribir 51 sitios en quince servicios para
-- arrastrar un uuid a mano tiene mas probabilidad de introducir un fallo de
-- aislamiento que de arreglarlo.
--
-- La columna que ya existia NO se toca ni se sustituye: `tenant_id` y `user_id`
-- siguen siendo obligatorias y las siguen escribiendo los writers. `workspace_id`
-- se anade al lado, para que la superficie que piensa en workspaces pueda
-- consultar sin traducir en cada linea.
--
-- EL BACKFILL SOLO RELLENA LO DEMOSTRABLE
-- ---------------------------------------
-- Se deriva del puente que ya existe en el esquema, `saas_tenants.workspace_id`,
-- el mismo que usan `saas_billing_sync` y `core/tenant_bridge`. Donde no hay
-- correspondencia, queda NULL: inventarla mezclaria datos de dos clientes.
--
-- No hay DROP, ni DELETE, ni RENAME. Una fila sin correspondencia se conserva
-- exactamente igual que estaba.

DO $$
DECLARE
  objetivo RECORD;
  anadidas INTEGER := 0;
  rellenadas INTEGER := 0;
  afectadas INTEGER;
BEGIN
  FOR objetivo IN
    SELECT * FROM (VALUES
      -- tabla,              columna de inquilino, tipo de vinculo
      ('ab_experiments',     'user_id',   'propietario'),
      ('ab_variants',        NULL,        'via_experimento'),
      ('api_keys',           'tenant_id', 'inquilino'),
      ('bookings',           'user_id',   'propietario'),
      ('crm_contacts',       'user_id',   'propietario'),
      ('crm_activities',     'user_id',   'propietario'),
      ('invoices',           'tenant_id', 'inquilino'),
      ('qr_codes',           'tenant_id', 'inquilino'),
      ('webhook_deliveries', NULL,        'via_endpoint')
    ) AS t(tabla, columna, vinculo)
  LOOP
    CONTINUE WHEN to_regclass('public.' || objetivo.tabla) IS NULL;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id INTEGER',
      objetivo.tabla
    );
    anadidas := anadidas + 1;

    -- Backfill segun de que cuelgue el inquilino en cada tabla.
    IF objetivo.vinculo = 'inquilino' THEN
      EXECUTE format(
        'UPDATE public.%I t SET workspace_id = st.workspace_id
           FROM saas_tenants st
          WHERE t.workspace_id IS NULL
            AND st.id = t.tenant_id
            AND st.workspace_id IS NOT NULL',
        objetivo.tabla
      );
    ELSIF objetivo.vinculo = 'propietario' THEN
      -- Un usuario puede ser propietario de mas de un inquilino; en ese caso la
      -- correspondencia es ambigua y se deja NULL. `HAVING count(*) = 1` es lo
      -- que lo garantiza.
      EXECUTE format(
        'UPDATE public.%I t SET workspace_id = m.ws
           FROM (SELECT user_id, min(workspace_id) AS ws
                   FROM saas_tenants
                  WHERE workspace_id IS NOT NULL
                  GROUP BY user_id
                 HAVING count(DISTINCT workspace_id) = 1) m
          WHERE t.workspace_id IS NULL
            AND m.user_id = t.user_id',
        objetivo.tabla
      );
    END IF;

    GET DIAGNOSTICS afectadas = ROW_COUNT;
    rellenadas := rellenadas + COALESCE(afectadas, 0);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id)',
      'ix_' || objetivo.tabla || '_workspace_id', objetivo.tabla
    );
  END LOOP;

  RAISE NOTICE '533: workspace_id en % tablas, % filas rellenadas', anadidas, rellenadas;
END $$;

-- Las dos que cuelgan de otra fila se rellenan desde ella, ya con la columna
-- disponible arriba.
DO $$
BEGIN
  IF to_regclass('public.ab_variants') IS NOT NULL
     AND to_regclass('public.ab_experiments') IS NOT NULL THEN
    UPDATE ab_variants v SET workspace_id = e.workspace_id
      FROM ab_experiments e
     WHERE v.workspace_id IS NULL AND e.id = v.experiment_id;
  END IF;

  IF to_regclass('public.webhook_deliveries') IS NOT NULL
     AND to_regclass('public.webhook_endpoints') IS NOT NULL THEN
    UPDATE webhook_deliveries d SET workspace_id = e.workspace_id
      FROM webhook_endpoints e
     WHERE d.workspace_id IS NULL AND e.id = d.webhook_id;
  END IF;
END $$;

COMMENT ON COLUMN crm_contacts.workspace_id IS
  'Workspace del backend FastAPI. Coexiste con `user_id`, que sigue siendo la columna de inquilino de la generacion /saas y sigue siendo obligatoria.';

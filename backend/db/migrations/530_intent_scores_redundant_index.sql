-- 530 — Indice unico redundante en `intent_scores`.
--
-- Sobre esa tabla acabaron conviviendo tres estructuras:
--
--   PK (lead_id, workspace_id)              migracion 528 — indice unico implicito
--   uq_intent_scores_lead_workspace          migracion 527 — (lead_id, workspace_id)
--   ix_intent_scores_workspace_lead          migracion 525 — (workspace_id, lead_id)
--
-- La segunda es EXACTAMENTE la primera: mismas columnas, mismo orden, misma
-- unicidad. PostgreSQL mantiene las dos en cada escritura sin que la segunda
-- aporte nada.
--
-- La tercera NO es redundante aunque lo parezca: el orden esta invertido, asi
-- que sirve las consultas que filtran solo por `workspace_id`, cosa que un
-- indice que empieza por `lead_id` no puede hacer. Se conserva.
--
-- POR QUE ESTO ES SEGURO
-- ----------------------
-- Retirar un indice no borra datos. Lo unico que podria romperse es el arbitro
-- de `ON CONFLICT (lead_id, workspace_id)`, que necesita una restriccion unica
-- sobre ese conjunto exacto de columnas.
--
-- La PK lo proporciona — PERO solo si la migracion 528 llego a aplicarse: sus
-- precondiciones son fail-closed y puede haber salido sin tocar nada. Por eso
-- este DROP se hace UNICAMENTE tras comprobar que la PK existe y es esa. Si no
-- lo es, no se toca nada y se avisa: quedarse con un indice de mas es
-- infinitamente preferible a quedarse sin arbitro y romper los INSERT.

DO $$
DECLARE
  pk_actual TEXT;
BEGIN
  IF to_regclass('public.intent_scores') IS NULL THEN
    RAISE NOTICE '530: intent_scores no existe; nada que hacer';
    RETURN;
  END IF;

  IF to_regclass('public.uq_intent_scores_lead_workspace') IS NULL THEN
    RAISE NOTICE '530: el indice redundante ya no existe';
    RETURN;
  END IF;

  SELECT string_agg(a.attname, ',' ORDER BY a.attname) INTO pk_actual
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'intent_scores'::regclass AND c.contype = 'p';

  IF pk_actual IS DISTINCT FROM 'lead_id,workspace_id' THEN
    RAISE NOTICE '530: la PK es % y no (lead_id, workspace_id); se CONSERVA el indice unico porque sigue siendo el arbitro de ON CONFLICT', COALESCE(pk_actual, 'inexistente');
    RETURN;
  END IF;

  EXECUTE 'DROP INDEX IF EXISTS uq_intent_scores_lead_workspace';
  RAISE NOTICE '530: indice unico redundante retirado; la PK arbitra el ON CONFLICT';
END $$;

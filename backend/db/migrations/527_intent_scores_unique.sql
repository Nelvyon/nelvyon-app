-- 527 — Arbitro del upsert de `intent_scores`.
--
-- `intent_data_service` hace:
--
--     ON CONFLICT(lead_id, workspace_id) DO UPDATE SET score, tier, ...
--
-- pero ninguna migracion declaro esa clave, asi que PostgreSQL respondia
-- `ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint` y el
-- scoring de intencion devolvia 500. Es la misma clase de fallo que el claim de
-- Stripe: un `ON CONFLICT` sin indice que lo arbitre no es un upsert, es un
-- error.
--
-- SEMANTICA: la tabla es ESTADO ACTUAL por lead y workspace, no historico.
--   * el `DO UPDATE` sobrescribe score, tier y recommendation en vez de acumular;
--   * la columna se llama `last_updated`, no `created_at`;
--   * el reader hace `WHERE lead_id = :lid AND workspace_id = :ws` sin ORDER BY
--     ni LIMIT, es decir, asume una unica fila.
--
-- Por eso la unicidad es (lead_id, workspace_id) y NO solo (lead_id): el mismo
-- lead puede existir en dos workspaces y son filas independientes. Un unique
-- por lead colapsaria tenants distintos.
--
-- `intent_events` queda deliberadamente fuera: no tiene ningun `ON CONFLICT` y
-- un evento de intencion puede repetirse legitimamente. Anadirle unicidad
-- descartaria eventos reales.
--
-- Se usa CREATE UNIQUE INDEX y no ADD CONSTRAINT: PostgreSQL admite un indice
-- unico como arbitro de `ON CONFLICT` igual que una constraint, y ademas es la
-- forma que el bootstrap de compatibilidad SQLite puede reproducir sin
-- deformar la migracion.

DO $$ BEGIN
  IF to_regclass('public.intent_scores') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_intent_scores_lead_workspace
      ON intent_scores (lead_id, workspace_id);
  END IF;
END $$;

-- 529 — La integracion pertenece al WORKSPACE, no a quien la conecto.
--
-- DECISION DE PRODUCTO (aprobada 2026-08-12)
-- -----------------------------------------
-- `oauth_connections` e `integration_whatsapp` estaban keyed por `user_id`. Eso
-- convierte una credencial personal en la frontera de un inquilino, con tres
-- consecuencias que el producto no quiere:
--
--   * un equipo comparte workspace pero no comparte la integracion;
--   * si el empleado que la conecto se va, la integracion desaparece;
--   * RBAC se resuelve por workspace, asi que la autorizacion y la propiedad
--     hablaban de cosas distintas.
--
-- El actor que conecto se conserva como METADATO de auditoria
-- (`connected_by_user_id`), no como propietario.
--
-- POR QUE ESTA MIGRACION ES ADITIVA
-- ---------------------------------
-- No borra ni renombra nada. Anade columnas y un indice; las filas antiguas
-- siguen intactas y legibles por el codigo anterior. `user_id` se conserva.
--
-- BACKFILL: SOLO LO DEMOSTRABLE
-- -----------------------------
-- Se rellena `workspace_id` unicamente cuando el usuario pertenece a EXACTAMENTE
-- UN workspace (sumando los que posee y aquellos de los que es miembro activo).
-- Con cero o con varios, la propiedad es ambigua y se deja NULL a proposito:
-- inventarla podria dar a un inquilino la credencial de otro.
--
-- Los resolvedores ignoran las filas con `workspace_id` NULL, asi que lo
-- ambiguo FALLA CERRADO en vez de resolverse a lo que parezca.

-- ─────────────────────────────── oauth_connections

DO $$
BEGIN
  IF to_regclass('public.oauth_connections') IS NULL THEN
    RAISE NOTICE '529: oauth_connections no existe; nada que migrar';
    RETURN;
  END IF;

  ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
  ALTER TABLE oauth_connections ADD COLUMN IF NOT EXISTS connected_by_user_id VARCHAR;

  -- El actor se conserva antes de tocar nada mas.
  UPDATE oauth_connections
     SET connected_by_user_id = user_id::text
   WHERE connected_by_user_id IS NULL;

  -- Backfill solo si la pertenencia es UNICA.
  UPDATE oauth_connections oc
     SET workspace_id = m.ws
    FROM (
      SELECT u.uid, MIN(u.ws) AS ws
        FROM (
          SELECT user_id::text AS uid, workspace_id AS ws
            FROM workspace_members
           WHERE status = 'active'
          UNION
          SELECT user_id::text AS uid, id AS ws
            FROM workspaces
        ) u
       GROUP BY u.uid
      HAVING COUNT(DISTINCT u.ws) = 1
    ) m
   WHERE oc.workspace_id IS NULL
     AND oc.user_id::text = m.uid;
END $$;

-- Una integracion por proveedor y workspace. Parcial: las filas ambiguas
-- (workspace NULL) no compiten entre si ni bloquean el indice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_oauth_connections_workspace_provider
  ON oauth_connections (workspace_id, provider)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_connections_workspace
  ON oauth_connections (workspace_id);

-- ─────────────────────────────── integration_whatsapp

DO $$
BEGIN
  IF to_regclass('public.integration_whatsapp') IS NULL THEN
    RAISE NOTICE '529: integration_whatsapp no existe; nada que migrar';
    RETURN;
  END IF;

  ALTER TABLE integration_whatsapp ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
  ALTER TABLE integration_whatsapp ADD COLUMN IF NOT EXISTS connected_by_user_id VARCHAR;

  UPDATE integration_whatsapp
     SET connected_by_user_id = user_id::text
   WHERE connected_by_user_id IS NULL;

  UPDATE integration_whatsapp iw
     SET workspace_id = m.ws
    FROM (
      SELECT u.uid, MIN(u.ws) AS ws
        FROM (
          SELECT user_id::text AS uid, workspace_id AS ws
            FROM workspace_members
           WHERE status = 'active'
          UNION
          SELECT user_id::text AS uid, id AS ws
            FROM workspaces
        ) u
       GROUP BY u.uid
      HAVING COUNT(DISTINCT u.ws) = 1
    ) m
   WHERE iw.workspace_id IS NULL
     AND iw.user_id::text = m.uid;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_whatsapp_workspace
  ON integration_whatsapp (workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_whatsapp_workspace
  ON integration_whatsapp (workspace_id);

COMMENT ON COLUMN oauth_connections.workspace_id IS
  'Propietario funcional de la integracion. NULL = pertenencia ambigua al migrar; los resolvedores la ignoran (fail-closed).';
COMMENT ON COLUMN oauth_connections.connected_by_user_id IS
  'Actor que autorizo la conexion. Auditoria, no propiedad.';
COMMENT ON COLUMN integration_whatsapp.workspace_id IS
  'Propietario funcional de la integracion. NULL = pertenencia ambigua al migrar; los resolvedores la ignoran (fail-closed).';
COMMENT ON COLUMN integration_whatsapp.connected_by_user_id IS
  'Actor que autorizo la conexion. Auditoria, no propiedad.';

-- Una persona, una pertenencia por workspace.
--
-- EL FALLO QUE ESTO CIERRA
-- ------------------------
-- `workspace_members` solo tenia un indice NO unico sobre (workspace_id, user_id).
-- Dos peticiones simultaneas —un doble clic en «crear workspace», un reintento del
-- navegador— podian dejar dos filas para la misma persona en el mismo workspace.
--
-- Es el mismo patron que ya mordio en `subscriptions`: un `SELECT` previo no
-- protege de la concurrencia porque ambas peticiones ven la tabla vacia y ambas
-- insertan. La unica defensa que funciona es la restriccion en la base.
--
-- Con la pertenencia duplicada, `nelvyon_user_in_workspace` seguiria funcionando,
-- pero los recuentos de miembros, los limites de plan por asientos y cualquier
-- `JOIN` sobre la tabla devolverian filas de mas.
--
-- NO BORRA NADA
-- -------------
-- Si encontrara duplicados, NO los elimina: avisa y deja la restriccion sin crear.
-- Decidir cual de dos pertenencias sobrevive —y con que rol, si difieren— es una
-- decision con consecuencias de permisos, no algo que deba resolver una migracion
-- a las tres de la mañana.
--
-- Medido antes de escribirla: produccion tiene 1 fila en la tabla, asi que no hay
-- duplicados y la restriccion entra limpia.
--
-- IDEMPOTENTE
-- -----------
-- Comprueba la existencia del indice antes de crearlo.

DO $bloque_550$
DECLARE
    v_duplicados integer;
BEGIN
    -- Solo cuentan las pertenencias de personas REALES. Una invitacion aun sin
    -- aceptar no tiene `user_id` —se guarda vacio—, y varias invitaciones
    -- pendientes en el mismo workspace son perfectamente legitimas.
    SELECT count(*) INTO v_duplicados FROM (
        SELECT workspace_id, user_id
        FROM public.workspace_members
        WHERE user_id IS NOT NULL AND user_id <> ''
        GROUP BY workspace_id, user_id
        HAVING count(*) > 1
    ) AS d;

    IF v_duplicados > 0 THEN
        RAISE WARNING '550: % combinaciones (workspace_id, user_id) duplicadas. '
                      'NO se crea la restriccion y NO se borra nada: elegir que '
                      'pertenencia sobrevive es una decision de permisos.',
                      v_duplicados;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_workspace_members_ws_user'
    ) THEN
        -- PARCIAL: excluye las invitaciones pendientes, que comparten `user_id`
        -- vacio hasta que alguien las acepta.
        CREATE UNIQUE INDEX uq_workspace_members_ws_user
            ON public.workspace_members (workspace_id, user_id)
            WHERE user_id IS NOT NULL AND user_id <> '';
        RAISE NOTICE '550: pertenencia unica por (workspace_id, user_id)';
    ELSE
        RAISE NOTICE '550: la restriccion ya existia';
    END IF;
END
$bloque_550$;

COMMENT ON INDEX public.uq_workspace_members_ws_user IS
    'Impide dos pertenencias de la misma persona al mismo workspace. Es PARCIAL: '
    'las invitaciones pendientes comparten user_id vacio y son legitimas. Un '
    'SELECT previo no protege de dos peticiones simultaneas; esta restriccion si.';

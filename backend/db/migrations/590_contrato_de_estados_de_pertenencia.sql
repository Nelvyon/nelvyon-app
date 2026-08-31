-- Migración 590 · el estado de una pertenencia deja de admitir cualquier cosa.
--
-- POR QUÉ. `workspace_members.status` es `NOT NULL` y no tiene ninguna otra
-- restricción: admite cualquier cadena. `activo` en castellano, `Active` con
-- mayúscula o un `activated` venido de una integración entrarían sin
-- resistencia — y quedarían fuera de todos los filtros `= 'active'` del código,
-- que son 42 sitios. El miembro existiría y nadie lo contaría.
--
-- Es el mismo defecto que la 579 cerró en `os_jobs`, y se cierra igual.
--
-- CÓMO SE DERIVÓ EL CONJUNTO. No se ha inventado. Se recorrió el árbol entero
-- buscando literales en sentencias que tocan `workspace_members`:
--
--     active    42 sitios de producción   creación de workspace (Python y TS),
--                                         alta por SSO, preparación de staging
--     invited    2 sitios de producción   el flujo de invitación,
--                                         `workspace_management.py`
--
-- Y NADA MÁS. `inactive`, `revoked` y `pending` aparecían sólo en pruebas, cero
-- veces en producción: las usaban como «un estado cualquiera que no sea
-- activo». Se han cambiado a `invited`, que es un estado real y no activo, así
-- que siguen probando lo mismo con un valor que de verdad ocurre.
--
-- NO SE INCLUYE UN ESTADO DE RETIRADA. El producto quita miembros con un
-- `DELETE` —`remove_member` en `workspace_management.py`—, no cambiando el
-- estado. Añadir `revoked` porque una prueba lo escribía sería dejar que una
-- prueba defina el contrato del producto, y describiría un ciclo de vida que no
-- existe. El día que se implemente, será otra migración y otra decisión.
--
-- COMPROBADO CONTRA LOS DATOS ANTES DE ESCRIBIRLA. En producción, en solo
-- lectura: 1 fila, `status = 'active'`. Ninguna fila viola la restricción.
--
-- SE APLICA COMO `NOT VALID` Y LUEGO SE VALIDA, en dos pasos. Es lo que hizo la
-- 579 y por lo mismo: `VALIDATE` toma un bloqueo más suave que añadir la
-- restricción ya validada, así que una tabla con tráfico no se para.

DO $$
BEGIN
    IF to_regclass('public.workspace_members') IS NULL THEN
        RAISE NOTICE '590: no existe workspace_members; nada que hacer.';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
         WHERE rel.relname = 'workspace_members'
           AND con.conname = 'workspace_members_status_ck'
    ) THEN
        RAISE NOTICE '590: la restriccion ya existe.';
        RETURN;
    END IF;

    -- Si hubiera filas fuera del contrato, se dice CUÁLES y se para. No se
    -- «arreglan» los datos para que la migración pase: eso convertiría un
    -- dato inválido en válido sin que nadie lo decidiera.
    IF EXISTS (
        SELECT 1 FROM public.workspace_members
         WHERE status IS NULL OR status NOT IN ('active', 'invited')
    ) THEN
        RAISE EXCEPTION
            '590: hay filas con un status fuera del contrato: %',
            (SELECT string_agg(DISTINCT coalesce(status, '<null>'), ', ')
               FROM public.workspace_members
              WHERE status IS NULL OR status NOT IN ('active', 'invited'));
    END IF;

    ALTER TABLE public.workspace_members
        ADD CONSTRAINT workspace_members_status_ck
        CHECK (status IN ('active', 'invited')) NOT VALID;

    ALTER TABLE public.workspace_members
        VALIDATE CONSTRAINT workspace_members_status_ck;

    RAISE NOTICE '590: contrato de estados de pertenencia cerrado (active, invited).';
END $$;

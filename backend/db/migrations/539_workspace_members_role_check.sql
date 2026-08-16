-- `workspace_members.role` solo puede contener los cinco roles del producto.
--
-- POR QUE HACIA FALTA
-- -------------------
-- La columna es `VARCHAR NOT NULL` sin CHECK ni enum desde
-- `479_platform_workspaces.sql`, asi que admitia cualquier cadena. Un rol mal
-- escrito —`Operator`, `operador`, `admiin`— no daba error en ninguna parte: la
-- normalizacion no lo reconocia y el usuario se quedaba sin capabilities, o
-- peor, en versiones anteriores caia al `else` y se degradaba en silencio.
--
-- Un fallo que se manifiesta como «a este usuario no le funciona nada» y no
-- como un error es exactamente el que tarda semanas en diagnosticarse.
--
-- POR QUE SE PUEDE PONER AHORA Y NO ANTES
-- ---------------------------------------
-- Se consulto produccion en lectura antes de escribir esta migracion: hay cinco
-- filas, una por rol, todas con valores validos y ninguna fuera de la lista. El
-- CHECK no rechaza ningun dato existente.
--
-- El `NOT VALID` seguido de `VALIDATE` no haria falta con cinco filas, pero se
-- mantiene el patron en dos pasos por si esta migracion se aplica sobre una base
-- con volumen: `VALIDATE CONSTRAINT` no bloquea escrituras, un `ADD CONSTRAINT`
-- normal si.
--
-- IDEMPOTENTE
-- -----------
-- Comprueba la existencia antes de crear. Reaplicarla no falla ni duplica.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_members_role_valido'
          AND conrelid = 'public.workspace_members'::regclass
    ) THEN
        ALTER TABLE public.workspace_members
            ADD CONSTRAINT workspace_members_role_valido
            CHECK (role IN ('owner', 'admin', 'operator', 'member', 'viewer'))
            NOT VALID;

        ALTER TABLE public.workspace_members
            VALIDATE CONSTRAINT workspace_members_role_valido;

        RAISE NOTICE '539: CHECK de rol anadido a workspace_members';
    ELSE
        RAISE NOTICE '539: el CHECK de rol ya existia; nada que hacer';
    END IF;
END $$;

COMMENT ON CONSTRAINT workspace_members_role_valido ON public.workspace_members IS
    'Los cinco roles de backend/core/rbac.py. Sin esto la columna aceptaba '
    'cualquier cadena y un rol mal escrito dejaba al usuario sin capabilities '
    'sin producir ningun error.';

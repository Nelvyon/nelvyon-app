-- RLS para `workspaces` y `workspace_members`: las dos tablas fundacionales.
--
-- POR QUE NO PUEDEN USAR LA POLITICA ESTANDAR
-- -------------------------------------------
-- La politica de OS —la que protege `os_clients` y las 20 de la 560— exige:
--
--     workspace_id = nelvyon_current_workspace_id()  AND  el usuario pertenece
--
-- Ese primer termino es correcto para una tabla de DATOS: se consulta siempre
-- dentro de un workspace ya elegido. Pero estas dos se consultan ANTES de que
-- haya ninguno elegido:
--
--     GET /workspaces/list  ->  «dame todos los workspaces de este usuario»
--
-- Con la politica estandar, esa ruta devolveria como mucho el workspace actual,
-- y con el contexto sin fijar devolveria CERO. El selector de workspaces se
-- quedaria vacio y el usuario leeria «no tienes ningun workspace» — un fallo
-- silencioso, sin error, exactamente del tipo que este proyecto persigue.
--
-- Aplicar aqui la politica estandar habria sido el error mas caro de todo el
-- barrido, y es la razon de que las 111 tablas no se cierren de una vez.
--
-- LA POLITICA CORRECTA ES POR USUARIO
-- ------------------------------------
-- La pregunta no es «¿esta fila es del workspace actual?» sino «¿este usuario
-- tiene algo que ver con este workspace?». Eso ya lo responden dos funciones que
-- existen y estan en produccion:
--
--     nelvyon_user_in_workspace(id)     eres el dueño O miembro activo
--     nelvyon_workspace_can_mutate(id)  ademas tu rol permite cambiar cosas
--
-- Ninguna depende del workspace seleccionado. Las dos son SECURITY DEFINER, asi
-- que pueden leer `workspace_members` aunque esa misma tabla tenga RLS forzado:
-- sin eso habria recursion infinita, que es el segundo error clasico al proteger
-- la tabla de la que dependen las propias politicas.
--
-- EL ALTA DE UN WORKSPACE SIGUE FUNCIONANDO
-- ------------------------------------------
-- Crear un workspace y darse de alta como `owner` ocurre cuando todavia no hay
-- ninguna pertenencia. Funciona porque las dos funciones comprueban
-- `workspaces.user_id = <usuario>` ANTES de mirar `workspace_members`: el dueño
-- pasa sin necesitar una fila que aun no existe. Sin esa rama seria un problema
-- del huevo y la gallina y nadie podria crear su primer workspace.
--
-- NO SE TOCA NINGUNA FILA
-- -----------------------
-- Solo activa RLS y crea politicas. Idempotente.

DO $bloque_561$
BEGIN
    -- ── workspaces ──────────────────────────────────────────────────────
    IF to_regclass('public.workspaces') IS NOT NULL THEN
        ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS workspaces_usuario_select ON public.workspaces;
        DROP POLICY IF EXISTS workspaces_usuario_insert ON public.workspaces;
        DROP POLICY IF EXISTS workspaces_usuario_update ON public.workspaces;
        DROP POLICY IF EXISTS workspaces_usuario_delete ON public.workspaces;

        -- Ves los tuyos y aquellos en los que eres miembro. Sin depender de cual
        -- tengas seleccionado: esta consulta es la que ALIMENTA el selector.
        --
        -- LA COMPARACION DIRECTA VA PRIMERA, Y NO ES UN DETALLE DE ESTILO
        -- --------------------------------------------------------------
        -- La primera version usaba solo `nelvyon_user_in_workspace(id)`, y con
        -- eso `INSERT ... RETURNING id` FALLABA. El motivo: una fila devuelta
        -- por RETURNING tiene que pasar tambien la politica de SELECT, y esa
        -- funcion es SECURITY DEFINER — hace su propia consulta, con su propio
        -- snapshot, donde la fila que se acaba de insertar TODAVIA NO EXISTE.
        --
        -- SQLAlchemy emite `INSERT ... RETURNING id` en cada `flush()`, asi que
        -- crear un workspace habria dejado de funcionar en produccion. Se
        -- descubrio porque una prueba lo intento.
        --
        -- `user_id = nelvyon_jwt_sub_text()` se evalua DIRECTAMENTE sobre la fila
        -- que se esta devolviendo: no consulta nada, no necesita snapshot, y el
        -- dueño pasa siempre. La funcion queda solo para el caso de miembro, que
        -- nunca se da sobre una fila recien insertada por uno mismo.
        CREATE POLICY workspaces_usuario_select ON public.workspaces
            FOR SELECT USING (
                (user_id IS NOT NULL
                 AND user_id = public.nelvyon_jwt_sub_text())
                OR public.nelvyon_user_in_workspace(id));

        -- Crear uno exige que te lo pongas a tu nombre. No se puede crear un
        -- workspace a nombre de otro.
        CREATE POLICY workspaces_usuario_insert ON public.workspaces
            FOR INSERT WITH CHECK (
                user_id IS NOT NULL
                AND user_id = public.nelvyon_jwt_sub_text());

        -- Cambiarlo o borrarlo exige rol que lo permita. Y el `WITH CHECK`
        -- impide ademas transferirlo a otro usuario por la via del UPDATE.
        CREATE POLICY workspaces_usuario_update ON public.workspaces
            FOR UPDATE USING (public.nelvyon_workspace_can_mutate(id))
            WITH CHECK (public.nelvyon_workspace_can_mutate(id));

        CREATE POLICY workspaces_usuario_delete ON public.workspaces
            FOR DELETE USING (public.nelvyon_workspace_can_mutate(id));
    END IF;

    -- ── workspace_members ───────────────────────────────────────────────
    IF to_regclass('public.workspace_members') IS NOT NULL THEN
        ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS workspace_members_usuario_select ON public.workspace_members;
        DROP POLICY IF EXISTS workspace_members_usuario_insert ON public.workspace_members;
        DROP POLICY IF EXISTS workspace_members_usuario_update ON public.workspace_members;
        DROP POLICY IF EXISTS workspace_members_usuario_delete ON public.workspace_members;

        -- Ves las pertenencias de los workspaces a los que perteneces. Incluye
        -- las TUYAS en workspaces ajenos, que es como el selector sabe que
        -- existen.
        -- Tu propia fila de pertenencia se compara directamente, por el mismo
        -- motivo que arriba: `INSERT ... RETURNING` tiene que poder devolverla.
        CREATE POLICY workspace_members_usuario_select ON public.workspace_members
            FOR SELECT USING (
                (user_id IS NOT NULL
                 AND user_id = public.nelvyon_jwt_sub_text())
                OR public.nelvyon_user_in_workspace(workspace_id));

        -- Invitar exige poder mutar ESE workspace. Impide el ataque mas directo:
        -- insertarse a uno mismo como miembro de un workspace ajeno.
        CREATE POLICY workspace_members_usuario_insert ON public.workspace_members
            FOR INSERT WITH CHECK (
                public.nelvyon_workspace_can_mutate(workspace_id));

        CREATE POLICY workspace_members_usuario_update ON public.workspace_members
            FOR UPDATE USING (public.nelvyon_workspace_can_mutate(workspace_id))
            WITH CHECK (public.nelvyon_workspace_can_mutate(workspace_id));

        CREATE POLICY workspace_members_usuario_delete ON public.workspace_members
            FOR DELETE USING (public.nelvyon_workspace_can_mutate(workspace_id));
    END IF;
END
$bloque_561$;

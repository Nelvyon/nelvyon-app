-- Las ocho tablas `os_*` dejan de denegarlo todo: la pertenencia se consulta.
--
-- EL FALLO, EN UNA LINEA
-- ----------------------
-- `322_os_rls.sql` instalo la rama de emergencia de su propio DO block:
--
--     CREATE FUNCTION nelvyon_user_in_workspace(integer)    ... SELECT false;
--     CREATE FUNCTION nelvyon_workspace_can_mutate(integer) ... SELECT false;
--
-- No fue un descuido: la 322 comprobaba si `workspaces` y `workspace_members`
-- existian y, como entonces NO existian —las crea la 479, ciento cincuenta
-- migraciones despues—, cayo en la rama «deny-all» a proposito. Lo que nadie
-- volvio a hacer fue rehacer las funciones cuando las tablas aparecieron.
--
-- Consecuencia hoy, medida sobre el esquema: 32 politicas sobre 8 tablas
-- (`os_clients`, `os_projects`, `os_tasks`, `os_deliverables`,
-- `os_deliverable_reviews`, `os_deliverable_versions`, `os_portal_invites`,
-- `os_portal_users`) que se apoyan en esas dos funciones:
--
--     16 politicas de mutacion (INSERT/UPDATE/DELETE) -> `... AND false`
--      8 politicas de SELECT                          -> ver abajo
--
-- No se nota porque la aplicacion se conecta como superusuario y RLS no se
-- evalua. El dia que se le retire el privilegio, esas ocho tablas se quedan
-- vacias y mudas: sin error, sin log, sin nada. Es el modo de fallo que esta
-- serie de migraciones existe para eliminar.
--
-- EL SEGUNDO FALLO, QUE ES DISTINTO
-- ---------------------------------
-- Aunque se arreglaran las dos funciones anteriores, las 8 politicas de SELECT
-- seguirian denegando, porque la cadena empieza en:
--
--     nelvyon_os_workspace_select(ws) = ws = nelvyon_current_workspace_id()
--                                       AND nelvyon_user_in_workspace(ws)
--     nelvyon_current_workspace_id()  = COALESCE(app.workspace_id,
--                                                request.jwt.claim.workspace_id)
--
-- y la aplicacion NO fija ninguna de esas dos variables. `contexto_rls.py` fija
-- `app.tenant_id` y `request.jwt.claim.sub`, que es la identidad canonica ya
-- decidida. Se comprobo por grep sobre `backend/` y `apps/web/src`: nadie
-- escribe `app.workspace_id` ni `request.jwt.claim.workspace_id` en todo el
-- producto. Eran variables muertas.
--
-- POR QUE SE ARREGLA EN LA FUNCION Y NO EN LA APLICACION
-- ------------------------------------------------------
-- Se anade `app.tenant_id` como tercer candidato del COALESCE, en vez de hacer
-- que la aplicacion fije una cuarta variable. Tres razones:
--
--   1. `app.tenant_id` YA contiene el workspace entero. No es una equivalencia
--      inventada: 20 politicas del esquema comparan `workspace_id =
--      current_tenant_id()`, y todos los servicios llaman a
--      `TenantService.set_tenant_context(workspace_id)`. Es el mismo numero.
--   2. Una variable mas en el contexto es una variable mas que puede quedarse
--      sin fijar en alguna ruta, y ese olvido se manifiesta como filas que
--      desaparecen. Menos variables, menos superficie de fallo.
--   3. El id que sale del COALESCE NO es la autorizacion: solo dice «que
--      workspace se esta mirando». La autoridad la sigue dando
--      `nelvyon_user_in_workspace`, que consulta la pertenencia real. Aunque el
--      cliente manipulara `app.tenant_id`, sin fila activa no entra.
--
-- Se conserva la precedencia anterior —`app.workspace_id` primero— para no
-- cambiar el comportamiento de nada que ya la fijara.
--
-- LA AUTORIDAD SE DERIVA DEL PRODUCTO, NO SE INVENTA
-- ---------------------------------------------------
-- `backend/core/rbac.py` define:
--
--     WORKSPACE_MUTATION_ROLES = {"owner", "admin", "operator"}
--
-- y `backend/dependencies/workspace.py` resuelve la pertenencia exactamente
-- asi: eres owner si `workspaces.user_id` es tu id, o miembro si tienes fila en
-- `workspace_members` con `status = 'active'`, y tu rol es el de esa fila.
-- Estas funciones reproducen esa misma regla, ni mas estricta —dejaria fuera a
-- usuarios legitimos— ni mas laxa —abriria en la base lo que la aplicacion
-- cierra—. `member` y `viewer` leen y no mutan.
--
-- SECURITY DEFINER, Y POR QUE NO ES UN AGUJERO
-- ---------------------------------------------
-- Las funciones leen `workspaces` y `workspace_members`, sobre las que el rol de
-- peticion puede no tener GRANT. Sin DEFINER volveriamos al mismo sitio:
-- denegar por no poder mirar. Con `search_path` fijado a `public`, que sin el
-- si seria un vector de escalada. Y no filtran nada: reciben un workspace y
-- responden por la identidad del LLAMANTE —`nelvyon_jwt_sub_text()`—, asi que no
-- sirven para enumerar la pertenencia de otros.
--
-- LO QUE ESTA MIGRACION NO HACE
-- -----------------------------
-- No crea ni borra politicas, no activa RLS en ninguna tabla, no cambia el rol
-- de conexion. Solo hace que tres funciones digan la verdad.
--
-- IDEMPOTENTE
-- -----------
-- Son tres `CREATE OR REPLACE FUNCTION`. Reaplicarla N veces deja el mismo
-- estado.

-- ═══════════════════════════════════════════════════════════════════════════
-- Requisito previo: las tablas que la 322 no encontro
-- ═══════════════════════════════════════════════════════════════════════════
-- Si faltaran, esta migracion PARA. No se repite el error de instalar un
-- deny-all silencioso como respaldo: el respaldo silencioso es justo lo que hizo
-- falta arreglar aqui. Las crea `479_platform_workspaces.sql`, muy anterior.
DO $comprobacion$
BEGIN
    IF to_regclass('public.workspaces') IS NULL
       OR to_regclass('public.workspace_members') IS NULL THEN
        RAISE EXCEPTION
            '541: faltan public.workspaces o public.workspace_members. Las crea '
            'la 479 y esta migracion depende de ellas: instalar un respaldo '
            'deny-all seria repetir el fallo de la 322.';
    END IF;
END;
$comprobacion$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. QUE WORKSPACE SE ESTA MIRANDO
-- ═══════════════════════════════════════════════════════════════════════════
-- Se anade `app.tenant_id` como tercer candidato. `current_tenant_id()` se usa
-- en vez de castear a mano porque ya absorbe un valor no numerico devolviendo
-- NULL; un cast crudo reventaria la consulta entera.
--
-- Devuelve NULL sin contexto -> `ws = NULL` es NULL -> ninguna fila pasa.
-- Fail-closed.
CREATE OR REPLACE FUNCTION public.nelvyon_current_workspace_id()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.workspace_id', true), '')::integer,
    NULLIF(current_setting('request.jwt.claim.workspace_id', true), '')::integer,
    -- La que la aplicacion fija de verdad, en cada transaccion.
    public.current_tenant_id()
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PERTENENCIA: esta este usuario en este workspace?
-- ═══════════════════════════════════════════════════════════════════════════
-- Misma regla que `dependencies/workspace.py`: propietario del workspace, o
-- miembro con `status = 'active'`. La comparacion de `status` es exacta porque
-- exacta es la de la aplicacion (`Workspace_members.status == "active"`);
-- relajarla aqui abriria en la base a usuarios que la aplicacion rechaza.
CREATE OR REPLACE FUNCTION public.nelvyon_user_in_workspace(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_workspace_id IS NOT NULL
     AND public.nelvyon_jwt_sub_text() IS NOT NULL
     AND (
       EXISTS (
         SELECT 1
           FROM public.workspaces w
          WHERE w.id = p_workspace_id
            AND w.user_id = public.nelvyon_jwt_sub_text()
       )
       OR EXISTS (
         SELECT 1
           FROM public.workspace_members wm
          WHERE wm.workspace_id = p_workspace_id
            AND wm.user_id = public.nelvyon_jwt_sub_text()
            AND wm.status = 'active'
       )
     );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. AUTORIDAD: ademas, puede MUTAR?
-- ═══════════════════════════════════════════════════════════════════════════
-- `WORKSPACE_MUTATION_ROLES = {"owner", "admin", "operator"}` de
-- `backend/core/rbac.py`. `member` colabora y `viewer` solo mira: ninguno de los
-- dos escribe. El rol se normaliza con `lower(btrim(...))` igual que hace
-- `_rol()` en ese mismo fichero, para que 'Operator' o ' admin ' no concedan ni
-- nieguen por un espacio.
--
-- El propietario del workspace muta siempre, aunque no tenga fila en
-- `workspace_members`: es la misma excepcion que aplica la aplicacion.
CREATE OR REPLACE FUNCTION public.nelvyon_workspace_can_mutate(p_workspace_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_workspace_id IS NOT NULL
     AND public.nelvyon_jwt_sub_text() IS NOT NULL
     AND (
       EXISTS (
         SELECT 1
           FROM public.workspaces w
          WHERE w.id = p_workspace_id
            AND w.user_id = public.nelvyon_jwt_sub_text()
       )
       OR EXISTS (
         SELECT 1
           FROM public.workspace_members wm
          WHERE wm.workspace_id = p_workspace_id
            AND wm.user_id = public.nelvyon_jwt_sub_text()
            AND wm.status = 'active'
            AND lower(btrim(wm.role)) IN ('owner', 'admin', 'operator')
       )
     );
$$;

-- Las funciones responden por la identidad del llamante, no por la que se les
-- pase, asi que EXECUTE para PUBLIC es correcto. Se deja explicito para que se
-- lea como una decision y no como el valor por defecto que nadie miro.
GRANT EXECUTE ON FUNCTION public.nelvyon_user_in_workspace(integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.nelvyon_workspace_can_mutate(integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.nelvyon_current_workspace_id() TO PUBLIC;

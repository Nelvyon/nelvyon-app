-- `subscriptions`, `oauth_connections` y el LiveChat publico dejan de vaciarse
-- bajo un rol sin BYPASSRLS.
--
-- LOS DOS FALLOS, MEDIDOS
-- -----------------------
-- Certificando `nelvyon_app` (NOSUPERUSER, NOBYPASSRLS) contra el esquema real
-- aparecieron tres caminos que devolvian CERO FILAS sin lanzar error. Ninguno
-- se nota hoy porque la aplicacion se conecta con un rol que bypassa RLS.
--
--   (1) `subscriptions`. `services/plan_quota.get_active_plan_id_for_workspace`
--       consulta POR workspace:
--
--           SELECT plan_id FROM subscriptions
--            WHERE workspace_id = :ws AND status = 'active'
--
--       pero la politica decide POR SUJETO del JWT
--       (`user_id = nelvyon_jwt_user_id()`, ademas con FORCE). Medido con datos
--       reales: el titular de la fila ve `agency`; CUALQUIER otro miembro del
--       mismo workspace ve NULL. Y la funcion cae a `'starter'` por su rama
--       legitima, que no registra nada. Es decir: todo workspace de pago se
--       degradaria al plan mas barato para todo el equipo salvo una persona, en
--       silencio, y con el las cuotas y el gating de modulos.
--
--   (2) `oauth_connections`. `core/ads_integration.py` resuelve la integracion
--       POR workspace (asi lo dejo la 529, que anadio la columna justamente
--       para eso) y la politica decide POR sujeto. Medido: la integracion solo
--       existe para quien conecto la cuenta; para el resto del equipo el
--       resolvedor devuelve None y corta con un 503 que parece una caida del
--       proveedor.
--
--   (3) LiveChat publico. Se trata abajo, en la seccion 3.
--
-- POR QUE LA CAUSA ES LA MISMA EN (1) Y (2)
-- -----------------------------------------
-- Esa familia de politicas se escribio para el modelo del BFF, que es CENTRADO
-- EN USUARIO: en `apps/web` una suscripcion es de una persona
-- (`nelvyon_users.user_id`). FastAPI lee las MISMAS tablas centrado en
-- WORKSPACE, porque en el producto SaaS el plan y las integraciones son del
-- espacio de trabajo, no de quien pulso el boton de pagar. Las dos lecturas son
-- legitimas; lo que faltaba era que la politica reconociera la segunda.
--
-- Esta migracion no sustituye la semantica del BFF: la CONSERVA y le SUMA la de
-- workspace. Las politicas PERMISSIVE se combinan con OR, asi que el titular
-- sigue viendo lo suyo exactamente igual que hoy.
--
-- ═══ ESTO AMPLIA EL ALCANCE. DICHO EXPLICITAMENTE ═══
--
-- Antes: la fila de `subscriptions` / `oauth_connections` la veia SOLO su
--        titular (`user_id`).
-- Ahora: la ven tambien los MIEMBROS ACTIVOS del workspace al que pertenece.
--
-- Es correcto porque coincide con lo que la aplicacion YA hace hoy —con
-- BYPASSRLS, `get_active_plan_id_for_workspace` y `ads_integration` sirven esas
-- filas a cualquier miembro del workspace sin mirar quien es el titular—, de
-- modo que esta migracion no abre nada nuevo: alinea la politica con la
-- conducta vigente. Lo que cambia es que a partir de aqui esa conducta queda
-- ESCRITA en la base en vez de depender de que RLS no se evalue.
--
-- Lo que NO se amplia, y esta comprobado en
-- `backend/tests/test_rls_activacion_parcial.py`:
--
--   * Un usuario de OTRO workspace sigue sin ver nada.
--   * Sin contexto de inquilino, sigue sin ver nada.
--   * Con `X-Workspace-Id` apuntando a un workspace ajeno, sigue sin ver nada
--     — porque la pertenencia no se declara, se CONSULTA.
--
-- POR QUE `nelvyon_user_in_workspace()` Y NO `workspace_id = current_tenant_id()`
-- ------------------------------------------------------------------------------
-- `current_tenant_id()` devuelve lo que la aplicacion fijo a partir del header
-- `X-Workspace-Id`. Una politica que solo comparase contra eso REPETIRIA lo que
-- dice el cliente en vez de comprobarlo, y no seria una frontera independiente.
--
-- `nelvyon_user_in_workspace()` (541) consulta `workspaces` y
-- `workspace_members` DENTRO de la base, con el sujeto real del JWT. Y para las
-- mutaciones se usa `nelvyon_workspace_can_mutate()`, que ademas exige rol
-- owner/admin/operator — el mismo escalon que ya exige
-- `dependencies/workspace.py:require_workspace_operator`. Es la misma pareja de
-- funciones que gobierna la familia `os_*`, asi que el esquema no gana una
-- forma nueva de decidir.
--
-- `USING (true)` habria arreglado el sintoma abriendo la tabla entera. No es
-- una opcion.
--
-- IDEMPOTENTE, Y NO ACTIVA RLS EN NADA
-- ------------------------------------
-- Las tres tablas ya tienen RLS activado desde antes. Aqui solo se ANADEN
-- politicas y una funcion. `DROP POLICY IF EXISTS` antes de cada `CREATE`, y
-- todo bajo `to_regclass` + comprobacion de columna, para que reaplicarla sea
-- inocuo y para que no falle en una base donde alguna tabla no exista.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. PRERREQUISITOS
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloque_prerrequisitos$
BEGIN
    IF to_regprocedure('public.nelvyon_user_in_workspace(integer)') IS NULL THEN
        RAISE EXCEPTION '543: falta nelvyon_user_in_workspace(integer); aplicar antes la 541';
    END IF;
    IF to_regprocedure('public.nelvyon_workspace_can_mutate(integer)') IS NULL THEN
        RAISE EXCEPTION '543: falta nelvyon_workspace_can_mutate(integer); aplicar antes la 541';
    END IF;
END;
$bloque_prerrequisitos$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. `subscriptions` — el plan es del WORKSPACE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SELECT  -> cualquier miembro activo (es lo que lee `plan_quota`).
-- INSERT/UPDATE/DELETE -> owner/admin/operator, el mismo escalon que exige
--            `routers/subscriptions.py` con `require_workspace_operator`.
--
-- La escritura NO es una via para autoconcederse un plan: ese router ya rechaza
-- `status` en ('active','trialing') con `_rechaza_autoconcesion`, y el camino
-- de cobro real (`services/billing_sync.py`, desde Stripe) escribe por otro
-- lado. La politica no puede ser mas estricta que la ruta que tiene que
-- funcionar, ni mas laxa que ella.
--
-- `workspace_id IS NOT NULL` NO es decorativo: la columna es NULLABLE (la
-- anadio la 529/PR01 y puede haber filas historicas sin rellenar). Sin esa
-- condicion, `nelvyon_user_in_workspace(NULL)` devuelve false — bien — pero
-- dejarlo explicito documenta que una fila sin workspace NO se abre a nadie por
-- esta via; sigue disponible solo para su titular por la politica de siempre.

DO $bloque_subscriptions$
BEGIN
    IF to_regclass('public.subscriptions') IS NULL THEN
        RAISE NOTICE '543: no existe public.subscriptions; nada que hacer';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'subscriptions'
           AND column_name = 'workspace_id'
    ) THEN
        RAISE EXCEPTION '543: subscriptions no tiene columna workspace_id; '
                        'no se inventa el acotado, revisar la migracion 529/PR01';
    END IF;

    DROP POLICY IF EXISTS subscriptions_workspace_select ON public.subscriptions;
    CREATE POLICY subscriptions_workspace_select ON public.subscriptions
        FOR SELECT
        USING (
            workspace_id IS NOT NULL
            AND public.nelvyon_user_in_workspace(workspace_id)
        );

    DROP POLICY IF EXISTS subscriptions_workspace_insert ON public.subscriptions;
    CREATE POLICY subscriptions_workspace_insert ON public.subscriptions
        FOR INSERT
        WITH CHECK (
            workspace_id IS NOT NULL
            AND public.nelvyon_workspace_can_mutate(workspace_id)
        );

    DROP POLICY IF EXISTS subscriptions_workspace_update ON public.subscriptions;
    CREATE POLICY subscriptions_workspace_update ON public.subscriptions
        FOR UPDATE
        USING (
            workspace_id IS NOT NULL
            AND public.nelvyon_workspace_can_mutate(workspace_id)
        )
        WITH CHECK (
            workspace_id IS NOT NULL
            AND public.nelvyon_workspace_can_mutate(workspace_id)
        );

    DROP POLICY IF EXISTS subscriptions_workspace_delete ON public.subscriptions;
    CREATE POLICY subscriptions_workspace_delete ON public.subscriptions
        FOR DELETE
        USING (
            workspace_id IS NOT NULL
            AND public.nelvyon_workspace_can_mutate(workspace_id)
        );

    RAISE NOTICE '543: subscriptions — politicas por workspace instaladas';
END;
$bloque_subscriptions$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. `oauth_connections` — la integracion es del WORKSPACE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SOLO SELECT, a proposito.
--
-- FastAPI unicamente LEE esta tabla (`core/ads_integration.py`, unico consumidor
-- en `backend/`); quien conecta y revoca cuentas es el BFF, que conserva su
-- credencial y no pasa por RLS. Anadir aqui politicas de escritura por
-- pertenencia ampliaria el alcance sobre una tabla de CREDENCIALES sin que
-- ninguna ruta lo necesite. Si algun dia FastAPI revoca integraciones, se anade
-- entonces con `nelvyon_workspace_can_mutate` y se justifica en su migracion.
--
-- Las politicas de escritura por sujeto que ya existian se quedan como estaban.

DO $bloque_oauth$
BEGIN
    IF to_regclass('public.oauth_connections') IS NULL THEN
        RAISE NOTICE '543: no existe public.oauth_connections; nada que hacer';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'oauth_connections'
           AND column_name = 'workspace_id'
    ) THEN
        RAISE EXCEPTION '543: oauth_connections no tiene columna workspace_id; '
                        'no se inventa el acotado, revisar la migracion 529';
    END IF;

    DROP POLICY IF EXISTS oauth_connections_workspace_select ON public.oauth_connections;
    CREATE POLICY oauth_connections_workspace_select ON public.oauth_connections
        FOR SELECT
        USING (
            workspace_id IS NOT NULL
            AND public.nelvyon_user_in_workspace(workspace_id)
        );

    RAISE NOTICE '543: oauth_connections — politica de lectura por workspace instalada';
END;
$bloque_oauth$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. LiveChat publico — resolver el inquilino sin creerselo al cliente
-- ═══════════════════════════════════════════════════════════════════════════
--
-- EL PROBLEMA
-- -----------
-- El widget de LiveChat es publico y anonimo por diseno. `TenantMiddleware` es
-- `BaseHTTPMiddleware`, que solo procesa scope `http` —o sea, NUNCA cubre un
-- WebSocket— y ademas `/api/chat/ws/`, `POST /api/chat/conversations` y
-- `/api/chat/conversations/{id}/messages` estan declaradas publicas, sin JWT del
-- que sacar nada.
--
-- Sus tablas (`chat_conversations`, `chat_messages`) tienen RLS por
-- `current_tenant_id()`. Sin contexto: cero filas, sin error. Medido: el
-- handler del WebSocket responde `close(4004)` a TODOS los visitantes y el chat
-- en vivo deja de funcionar sin un solo log.
--
-- Y el camino tiene un huevo-y-gallina: para saber de que inquilino es la
-- conversacion hay que leer la fila que RLS protege.
--
-- LA SALIDA
-- ---------
-- Una funcion `SECURITY DEFINER` que resuelva `conversation_id -> tenant_id`
-- leyendolo DE LA BASE. La aplicacion no deduce el inquilino de ningun dato que
-- envie el cliente, y el endpoint publico no necesita ninguna credencial con
-- BYPASSRLS.
--
-- `SET search_path = public` fijado en la propia funcion: sin eso, una
-- `SECURITY DEFINER` es una escalada de privilegio esperando a que alguien
-- coloque un objeto homonimo en un esquema anterior del path.
--
-- Devuelve un INTEGER, no la fila. Lo maximo que revela es a que workspace
-- pertenece un identificador de conversacion que ya hay que conocer.
--
-- ═══ LO QUE ESTO NO ES ═══
--
-- Esto NO convierte RLS en el control de acceso del WebSocket, y decir lo
-- contrario seria crear una garantia falsa. El endpoint es PUBLICO: no lleva
-- token. La autorizacion efectiva es la POSESION del `conversation_id`, que
-- funciona como capacidad al portador:
--
--   * No es adivinable: `chat_conversations.id` es `gen_random_uuid()` (UUID v4
--     aleatorio), no un contador.
--   * Pero es OBTENIBLE: `POST /api/chat/conversations` es publico y devuelve
--     el id a quien lo pida, para su propia conversacion.
--   * Y si un id se filtra —en una URL, un log, un historial— quien lo tenga
--     entra en ESA conversacion.
--
-- Lo que esta funcion arregla es el ACOTADO por inquilino: que el camino
-- publico funcione bajo RLS y que solo toque la conversacion cuyo id presenta.
-- Quien puede hablar en ella lo siguen decidiendo las comprobaciones de
-- `routers/chat.py` (cookie de visitante para visitantes, Bearer + workspace
-- para agentes). Endurecer esa autorizacion es un trabajo aparte, y no lo
-- resuelve ninguna politica.

CREATE OR REPLACE FUNCTION public.nelvyon_livechat_tenant_de_conversacion(
    p_conversation_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $funcion_livechat$
    SELECT c.tenant_id
      FROM public.chat_conversations c
     WHERE c.id = p_conversation_id
     LIMIT 1;
$funcion_livechat$;

COMMENT ON FUNCTION public.nelvyon_livechat_tenant_de_conversacion(uuid) IS
    'Resuelve el workspace de una conversacion de LiveChat para que el camino '
    'publico (widget y WebSocket) pueda fijar app.tenant_id sin creerselo al '
    'cliente. Devuelve solo el entero, nunca la fila. NO es control de acceso: '
    'el endpoint es publico y la autorizacion sigue siendo la posesion del '
    'conversation_id mas las comprobaciones de routers/chat.py.';

-- La funcion depende de que `chat_conversations` NO tenga FORCE ROW LEVEL
-- SECURITY: con FORCE, ni siquiera el propietario esquiva las politicas y la
-- SECURITY DEFINER devolveria NULL. Se comprueba en vez de suponerlo.
DO $bloque_comprobacion_force$
DECLARE
    v_force boolean;
BEGIN
    SELECT c.relforcerowsecurity INTO v_force
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'chat_conversations';

    IF v_force IS TRUE THEN
        RAISE EXCEPTION '543: chat_conversations tiene FORCE ROW LEVEL SECURITY; '
                        'nelvyon_livechat_tenant_de_conversacion devolveria NULL '
                        'y el WebSocket seguiria roto';
    END IF;
END;
$bloque_comprobacion_force$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LO QUE ESTA MIGRACION NO ARREGLA, DICHO AQUI PARA QUE NO SE PIERDA
-- ═══════════════════════════════════════════════════════════════════════════
--
--   * `usage_events` y `onboarding` tienen politicas por sujeto y NO tienen
--     columna de workspace: solo `user_id`. No se les inventa un acotado. Si
--     FastAPI llega a leerlas por workspace, hara falta antes una columna
--     `workspace_id` con su relleno, y eso es otra migracion con su propio
--     backfill.
--
--   * El webhook de Stripe (`routers/stripe_webhook.py`, prefijo publico
--     `/api/v1/stripe/`) escribe `subscriptions` como actor de SISTEMA: sin
--     JWT y sin usuario. Ni la politica por sujeto ni la nueva por pertenencia
--     le conceden nada, asi que bajo `nelvyon_app` fallaria — de forma RUIDOSA
--     (error y reintento de Stripe), no silenciosa. La salida coherente es que
--     ese camino use el rol `nelvyon_jobs` via `core.database.sesion_de_barrido()`,
--     como los otros barridos de sistema. Queda como condicion de activacion.

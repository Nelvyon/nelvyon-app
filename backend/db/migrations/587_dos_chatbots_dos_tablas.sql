-- Migración 587 · dos sistemas de chatbot, dos tablas.
--
-- EL DEFECTO, y no es «faltan columnas»: es una colisión de diseño.
--
-- En NELVYON conviven DOS subsistemas de chatbot distintos que nunca debieron
-- compartir tabla:
--
--   LEGADO (TypeScript, `backend/saas/ChatbotService.ts`)
--     · los bots viven en `chatbot_configs`, con `user_id`
--     · la conversación guarda `captured_lead` JSONB y `created_at`
--     · no tiene inquilino: es de la época en que el SaaS era por usuario
--
--   POR INQUILINO (Python, `backend/services/chatbot_service.py`)
--     · los bots viven en `chatbots`, con `workspace_id` y RLS
--     · la conversación necesita `workspace_id`, `visitor_info`,
--       `lead_captured` BOOLEAN, `satisfaction`, `started_at`, `last_message_at`
--
-- La migración 051 creó `chatbot_conversations` con la forma del LEGADO. La
-- 507 la volvió a declarar con la forma POR INQUILINO usando
-- `CREATE TABLE IF NOT EXISTS` — que sobre una tabla existente no hace nada, y
-- no avisa. Durante meses el subsistema por inquilino escribió contra columnas
-- que no existían.
--
-- POR QUÉ NO BASTA CON AÑADIR LAS COLUMNAS. Porque
-- `chatbot_conversations.chatbot_id` tiene clave ajena a `chatbot_configs`, y
-- los bots del subsistema por inquilino viven en `chatbots`. Ni añadiendo las
-- seis columnas podría insertarse una sola fila: la clave ajena la rechazaría.
-- Son dos productos distintos que se llaman igual.
--
-- LA CORRECCIÓN. Cada subsistema con su tabla:
--
--   `chatbot_conversations`            se queda como está. FUNCIONA. No se toca.
--   `workspace_chatbot_conversations`  la que la 507 quiso crear, con su nombre
--                                      propio, su clave ajena a `chatbots` y su
--                                      RLS por inquilino.
--
-- El nombre es largo a propósito. `chatbots_conversations` se diferenciaría del
-- legado en una sola letra, y dos tablas con significados distintos separadas
-- por una «s» es una trampa para el siguiente que las lea.
--
-- LO QUE ESTA MIGRACIÓN NO HACE: no borra nada, no mueve datos y no toca el
-- subsistema legado. Es aditiva.

CREATE TABLE IF NOT EXISTS workspace_chatbot_conversations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- A `chatbots`, NO a `chatbot_configs`. Ésta es la corrección que hace que
    -- la tabla sirva para algo.
    chatbot_id        UUID NOT NULL REFERENCES chatbots (id) ON DELETE CASCADE,
    workspace_id      INTEGER NOT NULL,

    session_id        TEXT NOT NULL,

    -- Lo que se sabe de quien escribe: nombre, correo, página de origen. JSONB
    -- porque cada bot recoge cosas distintas y forzar columnas obligaría a una
    -- migración por cada campo nuevo.
    visitor_info      JSONB NOT NULL DEFAULT '{}'::jsonb,
    messages          JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- BOOLEANO, no JSONB. En el legado `captured_lead` guarda los datos del
    -- contacto; aquí `lead_captured` dice sólo si se capturó. El código Python
    -- lo usa en un `FILTER (WHERE ...)`, que sobre JSONB es un error de tipos —
    -- y era otro de los fallos escondidos.
    lead_captured     BOOLEAN NOT NULL DEFAULT FALSE,
    escalated         BOOLEAN NOT NULL DEFAULT FALSE,

    satisfaction      INTEGER CHECK (satisfaction IS NULL OR (satisfaction BETWEEN 1 AND 5)),

    -- Dos marcas de tiempo y no una: cuándo empezó la conversación y cuándo se
    -- dijo lo último. Con una sola no se puede ordenar por actividad reciente,
    -- que es como se mira una bandeja de conversaciones.
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Una conversación por sesión y bot. Sin esto, un visitante que recarga la
    -- página abre una conversación nueva y su historial se parte en dos.
    UNIQUE (chatbot_id, session_id)
);

-- Por inquilino y actividad reciente: es la consulta de la bandeja.
CREATE INDEX IF NOT EXISTS workspace_chatbot_conversations_ws_idx
    ON workspace_chatbot_conversations (workspace_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS workspace_chatbot_conversations_bot_idx
    ON workspace_chatbot_conversations (chatbot_id, last_message_at DESC);

ALTER TABLE workspace_chatbot_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_chatbot_conversations_tenant ON workspace_chatbot_conversations;
CREATE POLICY workspace_chatbot_conversations_tenant ON workspace_chatbot_conversations
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────
--
-- Lo que se comprueba NO es que la tabla exista —eso ya lo diría un error— sino
-- que tenga las propiedades por las que se ha creado. La 507 «existió» durante
-- meses sin ninguna de ellas.

DO $$
DECLARE
    faltan TEXT;
BEGIN
    SELECT string_agg(c, ', ')
      INTO faltan
      FROM unnest(ARRAY[
        'chatbot_id', 'workspace_id', 'session_id', 'visitor_info', 'messages',
        'lead_captured', 'escalated', 'satisfaction', 'started_at', 'last_message_at'
      ]) AS c
     WHERE NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'workspace_chatbot_conversations'
          AND column_name = c
     );

    IF faltan IS NOT NULL THEN
        RAISE EXCEPTION 'migracion 587: a workspace_chatbot_conversations le faltan columnas: %', faltan;
    END IF;

    -- La clave ajena tiene que apuntar a `chatbots`. Si apuntara a
    -- `chatbot_configs` estariamos repitiendo el defecto con otro nombre.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'public.workspace_chatbot_conversations'::regclass
           AND contype = 'f'
           AND confrelid = 'public.chatbots'::regclass
    ) THEN
        RAISE EXCEPTION 'migracion 587: la clave ajena no apunta a chatbots. Sin eso la tabla no admite ni una fila del subsistema por inquilino.';
    END IF;

    -- `lead_captured` BOOLEAN, no JSONB. El codigo lo usa en un FILTER.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'workspace_chatbot_conversations'
           AND column_name = 'lead_captured'
           AND data_type = 'boolean'
    ) THEN
        RAISE EXCEPTION 'migracion 587: lead_captured no es booleana. En un FILTER (WHERE ...) eso es un error de tipos.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE tablename = 'workspace_chatbot_conversations'
           AND policyname = 'workspace_chatbot_conversations_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 587: falta el aislamiento por inquilino';
    END IF;

    -- Y el LEGADO sigue intacto: esta migracion es aditiva.
    IF to_regclass('public.chatbot_conversations') IS NULL THEN
        RAISE EXCEPTION 'migracion 587: ha desaparecido chatbot_conversations. Esta migracion no debe tocar el subsistema legado.';
    END IF;
END
$$;

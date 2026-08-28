-- Migración 582 · lo que le falta al ciclo del cliente.
--
-- QUÉ SE MIDIÓ. El portal tiene 7 páginas y 15 rutas, y cubre cinco de las
-- quince cosas que el modelo de agencia necesita: ver entregables, aprobar,
-- rechazar con motivo, seguir proyectos y ver la iguala. No cubre las tres que
-- hacen falta para que un cliente pueda EMPEZAR solo:
--
--   contratar un servicio  → hoy es un formulario de contacto y una persona
--   completar el intake    → `IntakeFormService` existe, pero vive en
--                            `/api/os/intake`, que es el plano interno
--   conectar sus cuentas   → no existe
--
-- El resultado medido es que todo alta es manual, y que `os_clients` se rellena
-- a mano por alguien de NELVYON.
--
-- Estas dos tablas cierran el hueco SIN tomar decisiones que no me tocan:
--
--   Una SOLICITUD no es una compra. El cliente dice qué necesita; NELVYON
--   responde con alcance y precio. El precio es una decisión comercial de
--   Daniel, y una tabla no puede tomarla por él. Lo que sí puede es que la
--   petición exista, quede registrada y no se pierda en un correo.
--
--   Una CONEXIÓN aquí es la declaración de qué cuentas hacen falta y en qué
--   estado están. El OAuth real no se dispara desde esta migración.

-- ── Lo que el cliente pide ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS os_service_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id    INTEGER NOT NULL,
    -- UUID y no TEXT: `os_clients.id` es uuid. Una columna que no comparte
    -- tipo con su destino obliga a un cast en cada consulta y deja pasar
    -- identificadores que no existen.
    client_id       UUID NOT NULL,
    /** Quién la pidió: un usuario del portal, o alguien de NELVYON por él. */
    solicitada_por  TEXT NOT NULL,

    service_id      TEXT NOT NULL,
    /** Lo que el cliente cuenta al pedirlo. Su problema, en sus palabras. */
    motivo          TEXT,

    estado          TEXT NOT NULL DEFAULT 'solicitado'
        CHECK (estado IN (
            'solicitado',      -- el cliente lo pidió
            'en_revision',     -- NELVYON lo está evaluando
            'propuesto',       -- hay alcance y precio sobre la mesa
            'aceptado',        -- el cliente ha dicho que sí
            'rechazado',       -- el cliente ha dicho que no
            'cancelado'        -- se retiró antes de decidir
        )),

    -- El alcance y el precio los pone NELVYON al proponer. Nulos mientras no
    -- haya propuesta: un precio por defecto sería un precio inventado.
    alcance         JSONB,
    precio_cents    BIGINT CHECK (precio_cents IS NULL OR precio_cents >= 0),
    moneda          TEXT,
    propuesta_en    TIMESTAMPTZ,
    propuesta_por   TEXT,

    decidida_en     TIMESTAMPTZ,
    nota_interna    TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un precio sin propuesta, o una propuesta sin precio, son estados
    -- imposibles que después nadie sabe interpretar.
    CONSTRAINT os_service_requests_propuesta_ck CHECK (
        estado <> 'propuesto'
        OR (precio_cents IS NOT NULL AND moneda IS NOT NULL AND propuesta_en IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS os_service_requests_cliente_idx
    ON os_service_requests (workspace_id, client_id, created_at DESC);

-- Un cliente no puede tener dos peticiones vivas del mismo servicio: la
-- segunda es un doble clic, no una necesidad nueva.
CREATE UNIQUE INDEX IF NOT EXISTS os_service_requests_viva_uidx
    ON os_service_requests (workspace_id, client_id, service_id)
    WHERE estado IN ('solicitado', 'en_revision', 'propuesto');

ALTER TABLE os_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_service_requests_tenant ON os_service_requests;
CREATE POLICY os_service_requests_tenant ON os_service_requests
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Las cuentas del cliente ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS os_client_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id    INTEGER NOT NULL,
    client_id       UUID NOT NULL,

    -- 'google_analytics', 'google_ads', 'meta_ads', 'search_console'...
    proveedor       TEXT NOT NULL,

    estado          TEXT NOT NULL DEFAULT 'necesaria'
        CHECK (estado IN (
            'necesaria',    -- hace falta para el servicio y no está
            'invitada',     -- se le ha pedido al cliente
            'conectada',    -- hay acceso y funciona
            'caducada',     -- hubo acceso y dejó de valer
            'rechazada',    -- el cliente ha dicho que no la da
            'no_aplica'     -- se determinó que no hace falta
        )),

    -- Por qué hace falta, EN EL IDIOMA DEL CLIENTE. Pedir acceso a las cuentas
    -- de alguien sin explicar para qué es la forma más rápida de que diga que
    -- no.
    para_que        TEXT NOT NULL,

    -- Qué servicios la necesitan. Permite decir "esto bloquea tu SEO".
    servicios       TEXT[] NOT NULL DEFAULT '{}',

    -- Identificador de la cuenta en el proveedor, cuando se conoce. NUNCA
    -- credenciales: esta tabla no guarda secretos.
    cuenta_externa  TEXT,

    solicitada_en   TIMESTAMPTZ,
    conectada_en    TIMESTAMPTZ,
    ultimo_error    TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT os_client_connections_uq UNIQUE (workspace_id, client_id, proveedor),
    -- Conectada exige saber CUÁNDO. Sin eso no se puede medir el tiempo hasta
    -- el primer entregable, que es el KPI de activación.
    CONSTRAINT os_client_connections_conectada_ck CHECK (
        estado <> 'conectada' OR conectada_en IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS os_client_connections_cliente_idx
    ON os_client_connections (workspace_id, client_id);

ALTER TABLE os_client_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_client_connections_tenant ON os_client_connections;
CREATE POLICY os_client_connections_tenant ON os_client_connections
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.os_service_requests') IS NULL
       OR to_regclass('public.os_client_connections') IS NULL THEN
        RAISE EXCEPTION 'migracion 582: no se crearon las tablas del ciclo del cliente';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'os_service_requests_viva_uidx'
    ) THEN
        RAISE EXCEPTION 'migracion 582: falta el indice de peticion viva; sin el, un doble clic crea dos peticiones';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE tablename = 'os_client_connections' AND policyname = 'os_client_connections_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 582: falta el aislamiento de conexiones';
    END IF;
END
$$;

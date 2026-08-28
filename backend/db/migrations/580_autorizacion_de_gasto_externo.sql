-- Migración 580 · autorización de gasto externo.
--
-- POR QUÉ. Hoy `/api/integrations/meta-ads/launch` crea una campaña real con
-- presupuesto diario real, y lo único que hay entre la petición y el dinero es
-- que haya sesión y que el cuerpo tenga los campos. No hay presupuesto
-- autorizado, ni tope por operación, ni ventana temporal, ni clave de
-- idempotencia, ni interruptor de emergencia, ni un registro de quién decidió
-- gastar. Lo mismo en Google Ads.
--
-- Mientras el botón lo pulsa una persona, eso es discutible. En cuanto lo pulse
-- un agente —que es exactamente lo que el modelo de NELVYON exige— deja de
-- serlo: un fallo de razonamiento se convierte en dinero de un cliente.
--
-- Estas dos tablas son el registro de esa decisión. La regla que las usa vive
-- en `backend/gasto/guardaDeGasto.ts` y es DENEGAR por defecto.
--
-- NO CAMBIA NADA POR SÍ SOLA: sin autorizaciones, la guarda deniega, y sin
-- llamar a la guarda todo sigue como estaba. Son tablas nuevas y vacías.

-- ── La autorización: el permiso, con sus límites ────────────────────────────

CREATE TABLE IF NOT EXISTS autorizaciones_de_gasto (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- A quién pertenece el dinero. Los dos, porque el aislamiento del producto
    -- se hace por workspace y la facturación por inquilino.
    tenant_id           UUID NOT NULL,
    workspace_id        INTEGER NOT NULL,

    -- Para qué servicio contratado. Sin esto, una autorización para publicidad
    -- serviría para cualquier otra cosa que gaste.
    service_id          TEXT NOT NULL,

    -- Proveedor externo concreto. Una autorización de Meta no vale para Google.
    proveedor           TEXT NOT NULL,

    -- El techo total y el techo de UNA operación. Los dos hacen falta: sin el
    -- segundo, un solo error se lleva el presupuesto entero de una vez.
    presupuesto_cents       BIGINT NOT NULL CHECK (presupuesto_cents > 0),
    tope_por_operacion_cents BIGINT NOT NULL CHECK (tope_por_operacion_cents > 0),

    -- Lo ya gastado contra esta autorización. Se actualiza al registrar cada
    -- gasto, en la misma transacción, para que no pueda desincronizarse.
    consumido_cents     BIGINT NOT NULL DEFAULT 0 CHECK (consumido_cents >= 0),

    -- Ventana temporal. Una autorización sin caducidad es un permiso
    -- permanente, y un permiso permanente es el que nadie recuerda haber dado.
    vigente_desde       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vigente_hasta       TIMESTAMPTZ NOT NULL,

    estado              TEXT NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aprobada', 'revocada', 'agotada')),

    -- Quién la pidió y quién la aprobó. Nunca la misma fila por defecto: pedir
    -- y aprobar son actos distintos.
    solicitada_por      TEXT NOT NULL,
    aprobada_por        TEXT,
    aprobada_en         TIMESTAMPTZ,
    revocada_en         TIMESTAMPTZ,
    motivo              TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT autorizaciones_ventana_ck CHECK (vigente_hasta > vigente_desde),
    -- Una operación no puede tener un techo mayor que el total: seria un tope
    -- que no lo es.
    CONSTRAINT autorizaciones_topes_ck CHECK (tope_por_operacion_cents <= presupuesto_cents),
    -- Aprobada exige quién y cuándo. Sin esto, «aprobada» no significa nada.
    CONSTRAINT autorizaciones_aprobacion_ck CHECK (
        estado <> 'aprobada' OR (aprobada_por IS NOT NULL AND aprobada_en IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS autorizaciones_gasto_busqueda_idx
    ON autorizaciones_de_gasto (workspace_id, proveedor, service_id, estado);

ALTER TABLE autorizaciones_de_gasto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autorizaciones_de_gasto_tenant ON autorizaciones_de_gasto;
CREATE POLICY autorizaciones_de_gasto_tenant ON autorizaciones_de_gasto
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── El gasto ejecutado: el rastro, no el permiso ────────────────────────────

CREATE TABLE IF NOT EXISTS gastos_ejecutados (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    autorizacion_id     UUID NOT NULL REFERENCES autorizaciones_de_gasto (id) ON DELETE RESTRICT,

    tenant_id           UUID NOT NULL,
    workspace_id        INTEGER NOT NULL,

    -- Quién lo hizo. Un id de agente o de persona; nunca vacío. Sin actor no
    -- hay a quién preguntar cuando algo sale mal.
    actor               TEXT NOT NULL,
    proveedor           TEXT NOT NULL,
    operacion           TEXT NOT NULL,
    importe_cents       BIGINT NOT NULL CHECK (importe_cents >= 0),

    -- La clave de idempotencia. UNIQUE de verdad, no «comprobamos antes»:
    -- comprobar antes y escribir después deja una ventana en la que dos
    -- peticiones simultáneas pasan las dos.
    idempotency_key     TEXT NOT NULL,

    estado              TEXT NOT NULL DEFAULT 'solicitado'
        CHECK (estado IN ('solicitado', 'ejecutado', 'fallido', 'denegado')),

    -- Identificador que devuelve el proveedor (id de campaña, etc.).
    referencia_externa  TEXT,
    detalle             JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gastos_idempotency_uq UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS gastos_ejecutados_autorizacion_idx
    ON gastos_ejecutados (autorizacion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gastos_ejecutados_workspace_idx
    ON gastos_ejecutados (workspace_id, created_at DESC);

ALTER TABLE gastos_ejecutados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gastos_ejecutados_tenant ON gastos_ejecutados;
CREATE POLICY gastos_ejecutados_tenant ON gastos_ejecutados
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.autorizaciones_de_gasto') IS NULL
       OR to_regclass('public.gastos_ejecutados') IS NULL THEN
        RAISE EXCEPTION 'migracion 580: no se crearon las tablas de gasto';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gastos_idempotency_uq'
    ) THEN
        RAISE EXCEPTION 'migracion 580: falta el UNIQUE de idempotencia; sin el, dos peticiones simultaneas gastan dos veces';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE tablename = 'autorizaciones_de_gasto' AND policyname = 'autorizaciones_de_gasto_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 580: falta la politica de aislamiento de autorizaciones';
    END IF;
END
$$;

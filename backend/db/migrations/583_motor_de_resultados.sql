-- Migración 583 · el motor de resultados.
--
-- POR QUÉ. NELVYON ha entregado 5.050 entregables. Lo que no sabe de ninguno es
-- si sirvió de algo. `os_deliverables` guarda qué se entregó y cuándo; no hay
-- ninguna tabla que relacione una acción con lo que le pasó al negocio del
-- cliente después.
--
-- Y sin eso, «optimización continua» no puede existir: optimizar exige comparar
-- contra algo, y no hay línea base de nada.
--
-- LA CADENA QUE ESTAS TABLAS HACEN POSIBLE
--
--     OBJETIVO      qué quiere conseguir el cliente, en su métrica
--        ↓
--     LÍNEA BASE    cuánto valía ANTES. Sin esto, cualquier número posterior
--                   es una cifra suelta, no un resultado.
--        ↓
--     ACCIÓN        qué hizo NELVYON, cuándo, y quién
--        ↓
--     MEDICIÓN      cuánto vale ahora, medido de una fuente concreta
--        ↓
--     ATRIBUCIÓN    cuánta confianza hay en que la acción lo causara
--
-- LA REGLA QUE GOBIERNA EL DISEÑO: no se puede escribir un resultado sin decir
-- de dónde sale, y no se puede afirmar una causa. `confianza_atribucion` es
-- explícitamente un juicio con método declarado, no un número que aparece.
-- Una acción y una mejora que coinciden en el tiempo son eso: dos cosas que
-- coinciden en el tiempo.

-- ── Lo que el cliente quiere conseguir ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS os_objetivos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    INTEGER NOT NULL,
    client_id       UUID NOT NULL,

    -- La métrica, en el vocabulario del negocio: 'leads', 'ventas',
    -- 'trafico_organico', 'coste_por_lead'... No se cierra con un CHECK porque
    -- cada sector mide cosas distintas y añadir una no debe exigir migración.
    metrica         TEXT NOT NULL,
    -- Cómo se lee: más es mejor, o menos es mejor. Sin esto no se puede saber
    -- si bajar el coste por lead es un éxito o un desastre.
    direccion       TEXT NOT NULL CHECK (direccion IN ('subir', 'bajar')),

    valor_objetivo  NUMERIC,
    unidad          TEXT,
    plazo           TIMESTAMPTZ,

    estado          TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'conseguido', 'abandonado', 'caducado')),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT os_objetivos_uq UNIQUE (workspace_id, client_id, metrica)
);

CREATE INDEX IF NOT EXISTS os_objetivos_cliente_idx
    ON os_objetivos (workspace_id, client_id, estado);

ALTER TABLE os_objetivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_objetivos_tenant ON os_objetivos;
CREATE POLICY os_objetivos_tenant ON os_objetivos
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Lo que se midió ─────────────────────────────────────────────────────────
--
-- Una sola tabla para líneas base y mediciones posteriores: son lo mismo
-- —un valor de una métrica en un instante, de una fuente— y separarlas
-- obligaría a duplicar las reglas de procedencia.

CREATE TABLE IF NOT EXISTS os_mediciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    INTEGER NOT NULL,
    client_id       UUID NOT NULL,
    objetivo_id     UUID REFERENCES os_objetivos (id) ON DELETE CASCADE,

    metrica         TEXT NOT NULL,
    valor           NUMERIC NOT NULL,
    unidad          TEXT,

    -- El periodo que cubre. Un número sin periodo no se puede comparar con
    -- otro: «300 visitas» no dice nada sin saber si son de un día o de un mes.
    desde           TIMESTAMPTZ NOT NULL,
    hasta           TIMESTAMPTZ NOT NULL,

    -- DE DÓNDE SALE. Obligatorio. Un resultado sin fuente es una afirmación.
    fuente          TEXT NOT NULL
        CHECK (fuente IN (
            'google_analytics',
            'search_console',
            'google_ads',
            'meta_ads',
            'crm_propio',
            'declarado_por_el_cliente',
            'calculado'      -- derivado de otras mediciones; ver `derivada_de`
        )),
    -- Si es calculada, de qué. Para poder rehacer la cuenta.
    derivada_de     JSONB,

    -- `true` sólo para el valor de ANTES. Es lo que permite comparar.
    es_linea_base   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT os_mediciones_periodo_ck CHECK (hasta >= desde),
    -- Una medición calculada tiene que decir de qué. Si no, nadie puede
    -- comprobarla y deja de ser una medición.
    CONSTRAINT os_mediciones_derivada_ck CHECK (
        fuente <> 'calculado' OR derivada_de IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS os_mediciones_objetivo_idx
    ON os_mediciones (objetivo_id, hasta DESC);

-- Una línea base por objetivo: dos serían dos puntos de partida distintos y
-- cualquier comparación posterior podría elegir el que más conviniera.
CREATE UNIQUE INDEX IF NOT EXISTS os_mediciones_linea_base_uidx
    ON os_mediciones (objetivo_id)
    WHERE es_linea_base;

ALTER TABLE os_mediciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_mediciones_tenant ON os_mediciones;
CREATE POLICY os_mediciones_tenant ON os_mediciones
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Lo que NELVYON hizo ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS os_acciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    INTEGER NOT NULL,
    client_id       UUID NOT NULL,
    objetivo_id     UUID REFERENCES os_objetivos (id) ON DELETE SET NULL,

    -- Qué se hizo, en una frase.
    descripcion     TEXT NOT NULL,
    -- Quién: un id de agente o de persona.
    actor           TEXT NOT NULL,
    service_id      TEXT,
    -- El entregable o el gasto que la materializó, si lo hubo.
    deliverable_id  UUID,
    gasto_id        UUID,

    -- Cuándo empezó a poder tener efecto. No es `created_at`: una campaña
    -- creada el lunes y activada el jueves empieza el jueves.
    efectiva_desde  TIMESTAMPTZ NOT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_acciones_objetivo_idx
    ON os_acciones (objetivo_id, efectiva_desde DESC);

ALTER TABLE os_acciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_acciones_tenant ON os_acciones;
CREATE POLICY os_acciones_tenant ON os_acciones
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Lo que se aprendió ──────────────────────────────────────────────────────
--
-- Separada de la acción a propósito: una acción puede no enseñar nada, y un
-- aprendizaje puede venir de varias acciones. Guardarlos juntos obligaría a
-- inventar un aprendizaje por acción, que es como se llena un sistema de
-- conclusiones falsas.

CREATE TABLE IF NOT EXISTS os_aprendizajes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          INTEGER NOT NULL,
    client_id             UUID NOT NULL,
    objetivo_id           UUID REFERENCES os_objetivos (id) ON DELETE CASCADE,

    -- Qué se aprendió.
    conclusion            TEXT NOT NULL,
    -- En qué acciones y mediciones se apoya. Sin esto no se puede revisar.
    acciones              UUID[] NOT NULL DEFAULT '{}',
    mediciones            UUID[] NOT NULL DEFAULT '{}',

    -- CUÁNTA CONFIANZA HAY EN QUE LA ACCIÓN LO CAUSARA.
    --
    -- No es un porcentaje que aparece: es un juicio con método declarado.
    -- 'coincidencia_temporal' es el más débil y hay que poder distinguirlo,
    -- porque es el que la mayoría de los informes presenta como si fuera causa.
    confianza_atribucion  TEXT NOT NULL
        CHECK (confianza_atribucion IN (
            'desconocida',           -- no hay forma de saberlo. Es una respuesta válida.
            'coincidencia_temporal', -- pasó después. Sólo eso.
            'correlacion',           -- se mueve con la acción de forma consistente
            'experimento'            -- hubo grupo de control
        )),
    metodo                TEXT NOT NULL,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_aprendizajes_objetivo_idx
    ON os_aprendizajes (objetivo_id, created_at DESC);

ALTER TABLE os_aprendizajes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_aprendizajes_tenant ON os_aprendizajes;
CREATE POLICY os_aprendizajes_tenant ON os_aprendizajes
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
DECLARE
    faltan TEXT[];
BEGIN
    SELECT array_agg(t) INTO faltan
      FROM unnest(ARRAY['os_objetivos', 'os_mediciones', 'os_acciones', 'os_aprendizajes']) AS t
     WHERE to_regclass('public.' || t) IS NULL;
    IF faltan IS NOT NULL THEN
        RAISE EXCEPTION 'migracion 583: faltan %', array_to_string(faltan, ', ');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'os_mediciones_linea_base_uidx'
    ) THEN
        RAISE EXCEPTION 'migracion 583: falta el indice de linea base unica; sin el, un objetivo tendria dos puntos de partida y cualquier comparacion podria elegir el que mas conviniera';
    END IF;
END
$$;

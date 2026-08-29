-- Migración 584 · inteligencia entre departamentos.
--
-- POR QUÉ. Cada departamento aprende cosas que a otro le sirven, y hoy no hay
-- por dónde pasárselas. Los términos de búsqueda que convierten en Ads dicen
-- qué contenido escribir; las objeciones que aparecen en ventas dicen qué
-- responder en el copy; las reseñas dicen con qué palabras habla el cliente de
-- verdad. Todo eso se pierde.
--
-- LO QUE ESTA TABLA IMPIDE, que es más importante que lo que permite:
--
--   1. QUE UNA INFERENCIA SE CONVIERTA EN UN HECHO. Un insight lleva su
--      confianza y su evidencia. Sin eso, «los usuarios buscan X» pasa de ser
--      una observación de un agente a una verdad que otro agente cita.
--
--   2. QUE SE CRUCEN INQUILINOS. Lo que aprende NELVYON del negocio de un
--      cliente es de ese cliente. RLS, y ninguna consulta sin workspace.
--
--   3. QUE DOS AGENTES SE RETROALIMENTEN SIN FIN. Un insight guarda de qué
--      insight nació (`derivado_de`) y a qué profundidad va. Pasada una
--      profundidad, no se deriva más: dos agentes reaccionando el uno al otro
--      producen ruido creciente que parece actividad.
--
--   4. QUE EL MISMO HALLAZGO SE REPITA. Una huella estable por contenido
--      impide que el mismo insight entre veinte veces y parezca veinte pruebas.

CREATE TABLE IF NOT EXISTS os_insights (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id    INTEGER NOT NULL,
    client_id       UUID NOT NULL,

    -- De qué departamento sale y a cuál va. Los dos, porque un insight sin
    -- destinatario no lo consume nadie y se queda de adorno.
    origen_dep      TEXT NOT NULL,
    destino_dep     TEXT NOT NULL,

    -- Quién exactamente lo produjo: un id de agente o de persona.
    autor           TEXT NOT NULL,

    -- Qué se ha observado, en una frase.
    afirmacion      TEXT NOT NULL,

    -- LOS HECHOS QUE LA SOSTIENEN. Obligatorio y no vacío: un insight sin
    -- evidencia es una corazonada con formato de dato.
    evidencia       JSONB NOT NULL,

    -- Cuánta confianza merece. Igual que en el cerebro: lo medido vale más que
    -- lo deducido, y confundirlos es cómo una suposición acaba citada como
    -- hecho.
    confianza       NUMERIC(3,2) NOT NULL CHECK (confianza > 0 AND confianza <= 1),
    procedencia     TEXT NOT NULL
        CHECK (procedencia IN ('medido', 'derivado', 'observado', 'humano')),

    -- La cadena de derivación. `derivado_de` apunta al insight padre y
    -- `profundidad` cuenta cuántos saltos lleva. Es lo que corta los bucles.
    derivado_de     UUID REFERENCES os_insights (id) ON DELETE SET NULL,
    profundidad     INTEGER NOT NULL DEFAULT 0 CHECK (profundidad >= 0 AND profundidad <= 3),

    -- Huella del contenido, para deduplicar. Ver el índice de abajo.
    huella          TEXT NOT NULL,

    -- Cuándo deja de valer. Un insight sobre términos de búsqueda de hace un
    -- año no dice nada del mes que viene.
    vigente_hasta   TIMESTAMPTZ NOT NULL,

    estado          TEXT NOT NULL DEFAULT 'nuevo'
        CHECK (estado IN ('nuevo', 'consumido', 'descartado', 'caducado')),

    -- QUIÉN LO USÓ Y QUÉ PASÓ. Sin esto no se puede saber si la inteligencia
    -- compartida sirve de algo, y un sistema que no lo sabe acumula insights
    -- para siempre.
    consumido_por   TEXT,
    consumido_en    TIMESTAMPTZ,
    accion_id       UUID,
    resultado       TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- «Consumido» exige saber por quién y cuándo. Sin eso, el estado no
    -- significa nada.
    CONSTRAINT os_insights_consumo_ck CHECK (
        estado <> 'consumido' OR (consumido_por IS NOT NULL AND consumido_en IS NOT NULL)
    ),
    -- Un insight derivado tiene que decir de qué. Uno con profundidad > 0 y sin
    -- padre no se puede auditar hacia atrás.
    CONSTRAINT os_insights_derivacion_ck CHECK (
        profundidad = 0 OR derivado_de IS NOT NULL
    )
);

-- DEDUPLICACIÓN. El mismo hallazgo, para el mismo cliente, entre los mismos dos
-- departamentos, sólo una vez mientras siga vivo. Sin esto, un agente que corre
-- cada hora mete veinte copias del mismo insight y el destinatario cree tener
-- veinte pruebas de lo mismo.
CREATE UNIQUE INDEX IF NOT EXISTS os_insights_huella_uidx
    ON os_insights (workspace_id, client_id, origen_dep, destino_dep, huella)
    WHERE estado IN ('nuevo', 'consumido');

CREATE INDEX IF NOT EXISTS os_insights_bandeja_idx
    ON os_insights (workspace_id, client_id, destino_dep, estado, confianza DESC);

CREATE INDEX IF NOT EXISTS os_insights_vigencia_idx
    ON os_insights (vigente_hasta)
    WHERE estado = 'nuevo';

ALTER TABLE os_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS os_insights_tenant ON os_insights;
CREATE POLICY os_insights_tenant ON os_insights
    FOR ALL USING (workspace_id = current_tenant_id())
    WITH CHECK (workspace_id = current_tenant_id());

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF to_regclass('public.os_insights') IS NULL THEN
        RAISE EXCEPTION 'migracion 584: no se creo os_insights';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'os_insights_huella_uidx') THEN
        RAISE EXCEPTION 'migracion 584: falta el indice de deduplicacion; sin el, el mismo hallazgo entra veinte veces y parece veinte pruebas';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'os_insights' AND policyname = 'os_insights_tenant'
    ) THEN
        RAISE EXCEPTION 'migracion 584: falta el aislamiento por inquilino de los insights';
    END IF;
END
$$;

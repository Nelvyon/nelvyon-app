-- Deriva de esquema: dos objetos que el codigo usa y ninguna migracion creaba.
--
-- QUE SE ARREGLA
-- --------------
-- Los logs de PostgreSQL de produccion registraban a diario:
--
--     ERROR:  relation "agent_outcomes" does not exist
--     ERROR:  column c.revenue does not exist   (saas_ads_metrics_cache)
--
-- No eran consultas muertas: en los dos casos hay codigo vivo que depende de
-- ellas, asi que la forma canonica es la que describe el codigo y lo que
-- faltaba era el esquema.
--
-- 1. `agent_outcomes`
--    `backend/os-agents/learning/LearningService.ts` INSERTA en ella y despues
--    la consulta para analizar patrones. No la crea ninguna migracion, ningun
--    modelo de SQLAlchemy y ningun revision de Alembic: sencillamente nunca
--    existio. Las columnas de aqui son EXACTAMENTE las del INSERT y del SELECT
--    de ese servicio, no una invencion.
--
-- 2. `saas_ads_metrics_cache.revenue`
--    `SaasAdsDashboardService` calcula los ingresos a partir de lo que devuelve
--    cada plataforma (`action_values` en Meta, `conversions_value` en Google),
--    los usa para derivar `roas = revenue / spend` y despues los TIRA. El panel
--    los pide con `SUM(c.revenue)`, y la columna no estaba.
--
--    Se anade la columna en vez de derivar el valor en la lectura porque el
--    escritor tiene el dato verdadero: `spend * roas` no lo reconstruye cuando
--    `roas` es NULL —que es justo el caso de ingresos cero con gasto positivo—
--    y ahi devolveria NULL donde la verdad es 0.
--
--    Las filas ya cacheadas se quedan en NULL a proposito. Rellenarlas con
--    `spend * roas` seria inventar una medicion que nadie tomo; el panel ya
--    hace COALESCE a 0 y el valor real entra en el siguiente refresco.
--
-- IDEMPOTENTE Y SIN PERDIDA
-- -------------------------
-- Solo CREATE ... IF NOT EXISTS y ADD COLUMN IF NOT EXISTS. No borra, no
-- renombra y no reescribe filas.

CREATE TABLE IF NOT EXISTS public.agent_outcomes (
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID,
    agent_id       TEXT NOT NULL,
    sector         TEXT NOT NULL,
    input          JSONB NOT NULL DEFAULT '{}'::jsonb,
    output         JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_score  NUMERIC,
    outcome_type   TEXT NOT NULL,
    outcome_value  NUMERIC NOT NULL DEFAULT 0,
    feedback       TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- El analisis de patrones filtra siempre por (agent_id, sector) y ordena por
-- fecha descendente; el indice sigue esa forma para no ordenar en memoria.
CREATE INDEX IF NOT EXISTS idx_agent_outcomes_agente_sector
    ON public.agent_outcomes (agent_id, sector, created_at DESC);

ALTER TABLE public.saas_ads_metrics_cache
    ADD COLUMN IF NOT EXISTS revenue NUMERIC(14,2);

COMMENT ON COLUMN public.saas_ads_metrics_cache.revenue IS
    'Ingresos atribuidos que reporta la plataforma. NULL en las filas cacheadas '
    'antes de que existiera la columna: no se rellenan con un valor derivado '
    'porque seria una medicion inventada.';

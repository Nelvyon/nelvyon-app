-- Estado persistente de la vigilancia y de la autorrecuperacion.
--
-- POR QUE EN LA BASE Y NO EN MEMORIA
-- ----------------------------------
-- El proceso del API se reinicia: cada despliegue, cada fallo, cada cambio de
-- variable. Si el estado de un incidente viviera en memoria, un reinicio lo
-- borraria y la anomalia se reportaria de nuevo desde cero — o peor, un reintento
-- a medias volveria a empezar y podria repetir una operacion.
--
-- Todo lo que decide «esto ya lo intente» o «esto ya lo avise» tiene que
-- sobrevivir al reinicio. Por eso esta aqui.
--
-- DOS TABLAS
-- ----------
-- `business_incidents`  un incidente por anomalia abierta. La clave de
--                       deduplicacion impide que la misma anomalia genere dos
--                       incidentes: se reabre el existente y se cuenta un intento
--                       mas.
--
-- `recovery_circuit`    el interruptor por mecanismo de recuperacion. Cuando algo
--                       falla repetidamente, deja de intentarse durante un rato en
--                       vez de martillear un servicio que ya esta caido.
--
-- SIN RLS, A PROPOSITO
-- --------------------
-- Son tablas de operacion, no de inquilino. No guardan datos de cliente: metricas
-- agregadas, nombres de mecanismo y marcas de tiempo. La evidencia es un JSON de
-- conteos. Si algun dia una comprobacion pasara a guardar datos de un workspace
-- concreto, esta decision hay que revisarla.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- `CREATE TABLE IF NOT EXISTS`. Reaplicarla no falla ni pierde incidentes.

CREATE TABLE IF NOT EXISTS public.business_incidents (
    id                BIGSERIAL PRIMARY KEY,
    clave_dedup       VARCHAR NOT NULL,
    metrica           VARCHAR NOT NULL,
    severidad         VARCHAR NOT NULL,
    que_paso          TEXT    NOT NULL,
    evidencia         JSONB   NOT NULL DEFAULT '{}'::jsonb,
    impacto           TEXT    NOT NULL DEFAULT '',
    estado            VARCHAR NOT NULL DEFAULT 'abierto',
    intentos          INTEGER NOT NULL DEFAULT 0,
    ultima_accion     TEXT,
    requiere_humano   BOOLEAN NOT NULL DEFAULT false,
    abierto_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    actualizado_en    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resuelto_en       TIMESTAMP WITH TIME ZONE,
    notificado_en     TIMESTAMP WITH TIME ZONE,
    notificacion_error TEXT
);

-- Un solo incidente ABIERTO por clave. Los cerrados se conservan como historia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_incidents_abierto
    ON public.business_incidents (clave_dedup)
    WHERE estado <> 'resuelto';

CREATE INDEX IF NOT EXISTS ix_business_incidents_estado
    ON public.business_incidents (estado, severidad);

CREATE INDEX IF NOT EXISTS ix_business_incidents_sin_notificar
    ON public.business_incidents (notificado_en)
    WHERE notificado_en IS NULL;


CREATE TABLE IF NOT EXISTS public.recovery_circuit (
    mecanismo             VARCHAR PRIMARY KEY,
    fallos_consecutivos   INTEGER NOT NULL DEFAULT 0,
    abierto_hasta         TIMESTAMP WITH TIME ZONE,
    ultimo_error          TEXT,
    ultimo_exito_en       TIMESTAMP WITH TIME ZONE,
    actualizado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


DO $bloque_548$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_app') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE '
                'ON public.business_incidents, public.recovery_circuit TO nelvyon_app';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.business_incidents_id_seq '
                'TO nelvyon_app';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE '
                'ON public.business_incidents, public.recovery_circuit TO nelvyon_jobs';
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.business_incidents_id_seq '
                'TO nelvyon_jobs';
    END IF;
    RAISE NOTICE '548: incidentes y circuitos de recuperacion listos';
END
$bloque_548$;

COMMENT ON TABLE public.business_incidents IS
    'Un incidente por anomalia de negocio abierta. Sobrevive a reinicios: sin esto '
    'un despliegue reabriria cada anomalia desde cero y podria repetir reintentos.';

COMMENT ON TABLE public.recovery_circuit IS
    'Interruptor por mecanismo de recuperacion. Evita martillear un servicio que '
    'ya esta caido y deja constancia de por que se dejo de intentar.';

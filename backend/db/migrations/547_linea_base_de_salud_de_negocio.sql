-- Linea base para detectar anomalias de NEGOCIO, no de proceso.
--
-- POR QUE HACE FALTA
-- ------------------
-- `/health` y `/health/ready` responden si el proceso vive y si PostgreSQL
-- contesta. Eso no cubre el modo de fallo dominante de este sistema.
--
-- El caso medido: al activar RLS, toda consulta autenticada paso a devolver cero
-- filas porque el contexto no se fijaba. `/health` seguia en 200 y
-- `/health/ready` decia `database: ok`. El fallo se encontro leyendo una linea de
-- WARNING en el arranque. Sin nadie leyendo logs, habria durado hasta que un
-- cliente llamara.
--
-- Lo mismo vale para: entregas que dejan de producirse, webhooks que se acumulan
-- en reintento, onboarding que se atasca, cobros que fallan. Todo eso convive con
-- un health verde.
--
-- QUE GUARDA ESTA TABLA
-- ---------------------
-- Una linea base por metrica: el ultimo valor sano observado y cuando. Sin
-- historia no se puede distinguir «siempre estuvo a cero» —que es normal en una
-- tabla que nadie usa— de «cayo a cero», que es la senal que importa.
--
-- Tambien guarda `silenciada_hasta`, el cooldown: una anomalia que ya se ha
-- reportado no se repite hasta pasado su periodo. Sin eso, una caida sostenida
-- genera una alerta por cada comprobacion y el ruido acaba con que nadie mire.
--
-- SIN RLS, A PROPOSITO
-- --------------------
-- Es una tabla de operacion, no de inquilino: no contiene datos de cliente, solo
-- conteos agregados y marcas de tiempo. Las metricas por workspace guardan el
-- identificador en `ambito`, pero el contenido sigue siendo un numero. La escribe
-- el propio API con `nelvyon_app`.
--
-- ADITIVA E IDEMPOTENTE
-- ---------------------
-- `CREATE TABLE IF NOT EXISTS`. Reaplicarla no falla ni pierde la linea base.

CREATE TABLE IF NOT EXISTS public.business_health_baseline (
    metrica           VARCHAR NOT NULL,
    ambito            VARCHAR NOT NULL DEFAULT 'global',
    valor_sano        BIGINT  NOT NULL,
    visto_en          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    silenciada_hasta  TIMESTAMP WITH TIME ZONE,
    ultima_severidad  VARCHAR,
    CONSTRAINT pk_business_health_baseline PRIMARY KEY (metrica, ambito)
);

CREATE INDEX IF NOT EXISTS ix_business_health_baseline_visto
    ON public.business_health_baseline (visto_en);

DO $bloque_547$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_app') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE '
                'ON public.business_health_baseline TO nelvyon_app';
    END IF;
    -- Los barridos de fondo tambien la leen para decidir si escalan.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nelvyon_jobs') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE '
                'ON public.business_health_baseline TO nelvyon_jobs';
    END IF;
    RAISE NOTICE '547: linea base de salud de negocio lista';
END
$bloque_547$;

COMMENT ON TABLE public.business_health_baseline IS
    'Ultimo valor sano por metrica de negocio, con cooldown de alerta. Permite '
    'distinguir «siempre estuvo a cero» de «cayo a cero», que es la senal que '
    'ningun health de proceso puede dar.';

-- Migración 579 · lo que le falta a `os_jobs` para ser una cola.
--
-- QUÉ SE MIDIÓ, contra producción, en solo lectura, el 28 de agosto de 2026:
--
--   SELECT status, count(*) FROM os_jobs GROUP BY status;
--   → queued: 12
--
-- Doce. Y ni un solo `completed`, ni un solo `failed`, en toda la historia de
-- la tabla. No son doce atascados de entre miles procesados: es que **nunca se
-- ha procesado ninguno**. Los más antiguos son del 29 de junio.
--
-- La causa, buscada en el árbol: no existe ni una consulta que seleccione
-- trabajos pendientes. `grep` sobre `os_jobs` sólo encuentra INSERT, UPDATE por
-- `job_id`, y cinco `COUNT(*)` para pintar paneles. La tabla es un libro de
-- escritura sin lector. Hay un worker (`backend/queue/osWorker.ts`) pero vacía
-- otra cosa: una lista de Redis, no esta tabla.
--
-- Esta migración añade lo que le falta a la tabla para que un trabajador pueda
-- reclamar trabajo sin pisarse con otro, reintentar con espera creciente,
-- rendirse cuando toca, y recuperarse de un reinicio sin ejecutar dos veces
-- nada. El código va en `backend/queue/`.
--
-- NO CAMBIA NINGÚN COMPORTAMIENTO POR SÍ SOLA. Sin un trabajador corriendo,
-- todo sigue exactamente igual: son columnas nuevas con valores por defecto y
-- un índice. Los doce trabajos existentes no se tocan.

-- ── Reclamo y reintentos ────────────────────────────────────────────────────

ALTER TABLE os_jobs
  -- Intentos ya consumidos. Se incrementa AL RECLAMAR, no al terminar: si el
  -- proceso muere en mitad del trabajo, el intento ya está contado y un trabajo
  -- que revienta el worker no puede reintentarse para siempre.
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,

  -- No reclamable antes de este instante. Es la espera creciente entre
  -- reintentos, y también permite programar trabajo para más tarde.
  ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Arriendo. `locked_by` identifica al trabajador para poder leer un registro
  -- y saber quién lo tenía; `lease_expires_at` es lo que permite rescatar un
  -- trabajo cuyo trabajador murió sin decir nada.
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,

  -- Última causa de fallo, para no tener que cruzar registros de aplicación.
  ADD COLUMN IF NOT EXISTS last_error TEXT,

  -- Cuándo se dejó de intentar. Un trabajo con esto puesto no vuelve a la cola
  -- solo: alguien tiene que mirarlo.
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ,

  -- Clave de idempotencia del dominio. Dos encargos idénticos del mismo cliente
  -- no deben producir dos ejecuciones.
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Dos trabajos con la misma clave no pueden coexistir. Parcial porque la
-- inmensa mayoría de trabajos no traen clave, y un UNIQUE normal sobre NULL
-- no sirve de nada en unos motores y estorba en otros.
CREATE UNIQUE INDEX IF NOT EXISTS os_jobs_idempotency_uidx
  ON os_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- El índice del reclamo. El orden importa: el planificador filtra por estado y
-- por instante, y ordena por `run_after`. Sin esto, cada vuelta del trabajador
-- sería un recorrido completo de la tabla.
CREATE INDEX IF NOT EXISTS os_jobs_reclamo_idx
  ON os_jobs (status, run_after)
  WHERE status = 'queued';

-- El índice del rescate: arriendos vencidos.
CREATE INDEX IF NOT EXISTS os_jobs_arriendo_idx
  ON os_jobs (lease_expires_at)
  WHERE status = 'running';

-- ── El vocabulario de estados ───────────────────────────────────────────────
--
-- `waiting_approval` y `dead_letter` no existían. El primero es el que hace
-- falta para que el modelo de agencia funcione: hay trabajo que NO debe seguir
-- solo —gastar presupuesto, publicar en nombre del cliente— y tiene que quedar
-- parado esperando a una persona.
--
-- La restricción se declara como lista CERRADA a propósito. El trabajador
-- reclama únicamente `status = 'queued'`, nunca «todo lo que no sea
-- completed», porque una lista negra deja pasar cualquier estado nuevo que a
-- alguien se le ocurra añadir — y el estado nuevo que más caro saldría es
-- justo `waiting_approval`.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'os_jobs_status_ck'
    ) THEN
        -- Se valida NOT VALID primero para no bloquear la tabla comprobando
        -- filas históricas, y sólo después se valida.
        --
        -- LA LISTA LLEVABA SEIS Y LE FALTABA UNA. El comentario anterior decía
        -- «los 12 trabajos actuales son todos 'queued', así que la validación
        -- pasa». Era cierto el día que se escribió y dejó de serlo cuando esos
        -- doce se cancelaron: la migración falló en producción con
        --
        --     check constraint "os_jobs_status_ck" is violated by some row
        --
        -- `cancelled` no estaba porque cuando se escribió esto el sistema no
        -- sabía cancelar. Ahora sí, y es un estado legítimo: ni `failed` —que
        -- significa «se intentó y salió mal»— ni `dead_letter` —«se agotaron
        -- los reintentos»— describen «esto no debía ejecutarse nunca».
        --
        -- La lista sale de `EstadoDeTrabajo` en `backend/queue/colaDeTrabajos.ts`,
        -- y hay una prueba que compara las dos: si una crece y la otra no, se
        -- pone en rojo antes de que lo haga una migración en producción.
        ALTER TABLE os_jobs
          ADD CONSTRAINT os_jobs_status_ck
          CHECK (status IN (
            'queued',
            'running',
            'waiting_approval',
            'completed',
            'failed',
            'dead_letter',
            'cancelled'
          )) NOT VALID;
        ALTER TABLE os_jobs VALIDATE CONSTRAINT os_jobs_status_ck;
    END IF;
END
$$;

-- ── Autocomprobación ────────────────────────────────────────────────────────
--
-- Una migración que dice haber añadido algo y no lo añadió es un defecto que
-- este repositorio ya ha pagado caro: la 507 declaraba 123 tablas y en
-- producción faltaban cinco, con `_migrations` diciendo que estaba aplicada.

DO $$
DECLARE
    faltan TEXT[];
BEGIN
    SELECT array_agg(c) INTO faltan
      FROM unnest(ARRAY[
        'attempts', 'max_attempts', 'run_after', 'locked_by', 'locked_at',
        'lease_expires_at', 'last_error', 'dead_lettered_at', 'idempotency_key'
      ]) AS c
     WHERE NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'os_jobs' AND column_name = c
     );
    IF faltan IS NOT NULL THEN
        RAISE EXCEPTION 'migracion 579: faltan columnas en os_jobs: %',
          array_to_string(faltan, ', ');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'os_jobs_status_ck') THEN
        RAISE EXCEPTION 'migracion 579: no se creo la restriccion de estados';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'os_jobs_reclamo_idx') THEN
        RAISE EXCEPTION 'migracion 579: no se creo el indice de reclamo';
    END IF;
END
$$;

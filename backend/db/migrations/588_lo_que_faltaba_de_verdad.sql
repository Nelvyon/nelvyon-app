-- Migración 588 · lo que faltaba de verdad, y sólo eso.
--
-- De los cinco defectos de esquema confirmados, éstos son los dos que se
-- arreglan añadiendo estructura. Los otros tres se arreglan en el código,
-- porque la estructura correcta ya existía y lo que estaba mal era la consulta.
--
-- Distinguirlos importa: añadir una columna «por si acaso» a una tabla que ya
-- tiene el dato con otro nombre deja dos fuentes para lo mismo, y a partir de
-- ahí nadie sabe cuál mirar.
--
--   bookings.start_at .......... NO se añade. La tabla ya guarda la cita en
--                                `booking_date` + `booking_time`. Lo que estaba
--                                mal eran los `WHERE` y el `ORDER BY`.
--   crm_activities.deal_id ..... NO se añade. El writer ya lo guarda en
--                                `metadata->>'deal_id'`. Lo que estaba mal era
--                                el reader, que lo buscaba como columna.
--   affiliate_clicks.created_at  NO se añade. La columna se llama `landed_at` y
--                                nadie consulta esa tabla por fecha. Era un
--                                índice mal escrito, no un defecto vivo.
--
-- LO QUE SÍ SE AÑADE:

-- ── 1 · bookings.zoom_meeting_id ────────────────────────────────────────────
--
-- El webhook de Zoom cierra una reserva cuando la reunión termina, y la busca
-- por el identificador de la reunión:
--
--     UPDATE bookings SET status='completed'
--      WHERE workspace_id = :ws AND zoom_meeting_id = :id
--
-- Esa columna no existe. El writer, al no tenerla, mete el enlace de Zoom
-- dentro de `notes` como texto libre. Es decir: la reserva se crea, la reunión
-- ocurre, la reunión termina, y la reserva se queda en `confirmed` para
-- siempre. Nadie ve un error porque el webhook simplemente no encuentra nada
-- que actualizar.
--
-- Aquí SÍ hace falta columna: un identificador externo por el que se busca no
-- puede vivir dentro de un campo de notas. Buscarlo con `LIKE` sobre texto
-- libre encontraría la reserva equivocada el día que dos enlaces se parezcan.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;

-- Parcial: la inmensa mayoría de reservas no son por Zoom, y un índice que
-- indexa millones de nulos ocupa sitio sin acelerar nada.
CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_idx
    ON bookings (zoom_meeting_id)
    WHERE zoom_meeting_id IS NOT NULL;

-- ── 2 · el índice de clics de afiliado, con la columna que existe ───────────
--
-- La 507 pedía `(affiliate_id, created_at DESC)`. La columna se llama
-- `landed_at`. Hoy nadie consulta esa tabla más que para insertar, así que esto
-- no arregla ningún fallo: deja preparada la consulta de atribución por
-- afiliado y fecha, que es la única para la que existe esa tabla.

CREATE INDEX IF NOT EXISTS affiliate_clicks_affiliate_idx
    ON affiliate_clicks (affiliate_id, landed_at DESC);

-- ── Autocomprobación ────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='bookings' AND column_name='zoom_meeting_id'
    ) THEN
        RAISE EXCEPTION 'migracion 588: bookings sigue sin zoom_meeting_id; el webhook de Zoom no puede cerrar ninguna reserva';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='affiliate_clicks_affiliate_idx') THEN
        RAISE EXCEPTION 'migracion 588: falta el indice de clics por afiliado';
    END IF;

    -- Y lo que NO debe haber pasado: que alguien «arregle» los otros tres
    -- añadiendo columnas duplicadas. Si aparecen, hay dos fuentes para el mismo
    -- dato y nadie sabra cual mirar.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='bookings' AND column_name='start_at'
    ) THEN
        RAISE EXCEPTION 'migracion 588: se ha anadido bookings.start_at. La cita ya vive en booking_date + booking_time: ahora hay dos fuentes para lo mismo.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='crm_activities' AND column_name='deal_id'
    ) THEN
        RAISE EXCEPTION 'migracion 588: se ha anadido crm_activities.deal_id. El writer lo guarda en metadata: ahora hay dos fuentes para lo mismo.';
    END IF;
END
$$;

-- 537 — Un registro legado no puede migrarse dos veces, tambien en contactos.
--
-- LA MISMA CARRERA QUE LA 536, EN LA OTRA TABLA
-- ---------------------------------------------
-- `SaasCrmEtlService` deduplica leyendo antes de escribir:
--
--     SELECT tags FROM saas_contacts
--      WHERE EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE 'etl:legacy_id:%')
--     INSERT INTO saas_contacts (..., tags, ...) VALUES ...
--
-- Entre ambas no hay nada: ni bloqueo, ni ON CONFLICT, ni unicidad. Dos
-- ejecuciones simultaneas leen «no migrado» y las dos insertan.
--
-- POR QUE NO VALE COPIAR LA 536 TAL CUAL
-- --------------------------------------
-- En `saas_deals` la clave de deduplicacion es la COLUMNA `source`, y bastaba un
-- indice unico parcial sobre ella. `saas_contacts` no tiene esa columna: la
-- etiqueta vive dentro del array `tags`.
--
-- Que la clave este en un array no cambia la invariante del dominio —un registro
-- legado produce como mucho un contacto migrado, exactamente lo que el ETL ya
-- intenta imponer a mano—, solo como hay que expresarla. Por eso hace falta una
-- funcion que extraiga la etiqueta, y no se puede reutilizar la forma anterior.
--
-- Los `<id>` de las etiquetas son claves primarias de tablas unicas —`contacts`
-- usa entero con secuencia unica y `crm_contacts` uuid—, asi que la etiqueta
-- identifica un registro y solo uno. No hay colision entre inquilinos.
--
-- POR QUE INDICE Y NO ADVISORY LOCK
-- ---------------------------------
-- Igual que en la 536: cubre TODOS los escritores y no solo al que se acuerde de
-- tomar el lock; sobrevive a reinicios y reintentos; no serializa a nadie; y no
-- tiene orden de adquisicion, luego no puede provocar interbloqueos.
--
-- ALCANCE: SOLO DONDE HAY ETIQUETA DE ETL
-- ---------------------------------------
-- El indice es PARCIAL. Los contactos creados a mano no llevan etiqueta, y sin
-- la clausula parcial TODOS compartirian el valor NULL de la expresion y
-- colisionarian entre si: se habria roto la creacion normal de contactos.
--
-- SEGURO EN PRODUCCION
-- --------------------
-- Ni DROP ni DELETE. Crear el indice falla si ya hubiera duplicados —avisar en
-- vez de destruir—. En produccion `saas_contacts` tiene 1 fila, comprobada en
-- lectura, y no lleva etiqueta de ETL.

-- Extrae la etiqueta de ETL del array de tags, o NULL si no hay ninguna.
--
-- IMMUTABLE es correcto y necesario: para el mismo array devuelve siempre lo
-- mismo, no consulta tablas ni depende de la configuracion. Sin esa marca
-- PostgreSQL no permite indexar la expresion.
--
-- `ORDER BY` hace el resultado determinista si algun dia una fila llevara mas de
-- una etiqueta: sin el, el valor indexado podria depender del orden del array.
CREATE OR REPLACE FUNCTION public.nelvyon_etl_legacy_tag(tags text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT t
    FROM unnest(coalesce(tags, ARRAY[]::text[])) AS t
   WHERE t LIKE 'etl:legacy_id:%'
   ORDER BY t
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.nelvyon_etl_legacy_tag(text[]) IS
  'Etiqueta `etl:legacy_id:<origen>:<id>` de un array de tags, o NULL. IMMUTABLE para poder indexarla.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_saas_contacts_etl_legacy
  ON public.saas_contacts (public.nelvyon_etl_legacy_tag(tags))
  WHERE public.nelvyon_etl_legacy_tag(tags) IS NOT NULL;

COMMENT ON INDEX public.ux_saas_contacts_etl_legacy IS
  'Un registro legado produce como mucho un contacto migrado. Parcial: los contactos '
  'creados a mano no llevan etiqueta y no deben colisionar entre si.';

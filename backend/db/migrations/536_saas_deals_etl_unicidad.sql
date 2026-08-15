-- 536 — Un registro legado no puede migrarse dos veces.
--
-- EL DEFECTO, REPRODUCIDO
-- -----------------------
-- `SaasDealsEtlService` es idempotente por LECTURA PREVIA:
--
--     SELECT DISTINCT source FROM saas_deals WHERE source = ANY($1)   -- ¿migrado?
--     INSERT INTO saas_deals (..., source, ...) VALUES ...            -- si no
--
-- Entre esas dos sentencias no hay nada: ni bloqueo, ni `ON CONFLICT`, ni
-- unicidad. `saas_deals` solo tenia unicidad en su clave primaria, que es un
-- uuid generado, asi que la base nunca rechazaba el duplicado.
--
-- Con una ejecucion, correcto. Con dos simultaneas del mismo inquilino, las dos
-- leen "no migrado" y las dos insertan. Reproducido contra PostgreSQL real con
-- dos conexiones: DOS filas para un unico registro legado.
--
-- POR QUE UN INDICE Y NO UN ADVISORY LOCK
-- ---------------------------------------
-- La propuesta inicial era `pg_advisory_xact_lock` por inquilino. Analizado el
-- modelo, el indice es estrictamente mejor:
--
--   - Cubre TODOS los caminos de escritura. El ETL inserta por lotes y, si el
--     lote falla, reintenta fila a fila; ademas hay otros tres escritores de
--     `saas_deals`. Un lock solo protege al que se acuerde de tomarlo; la
--     unicidad la comprueba PostgreSQL en cada INSERT, venga de donde venga.
--   - Sobrevive a reinicios, reintentos y caidas a mitad de ejecucion. Un lock
--     de sesion se pierde con la conexion.
--   - No serializa nada: dos inquilinos, y de hecho dos ejecuciones del mismo,
--     siguen progresando en paralelo. El perdedor de la carrera no se bloquea,
--     simplemente no duplica.
--   - No hay orden de adquisicion, luego no hay interbloqueo posible.
--   - `DbClient` usa un pool, asi que un lock de sesion solo seria fiable
--     dentro de `withTransaction`, que obligaria a envolver la ejecucion
--     ENTERA del ETL —decenas de consultas— en una sola transaccion larga.
--
-- POR QUE LA UNICIDAD ES UNA INVARIANTE REAL DEL DOMINIO, Y NO UN PARCHE
-- ----------------------------------------------------------------------
-- No se anade unicidad para tapar la carrera: se declara la regla que el ETL ya
-- intentaba imponer a mano.
--
-- `source` guarda `etl:legacy_id:<origen>:<id>`, el identificador del registro
-- legado del que salio la fila. La regla del dominio es «un registro legado
-- produce como mucho un deal migrado», y es justo lo que el `SELECT DISTINCT
-- source` de arriba comprueba antes de insertar.
--
-- Los `<id>` son claves primarias de tablas unicas —`deals.id` es un entero con
-- secuencia unica, y `crm_deals` y `pipeline_deals` usan uuid—, asi que el tag
-- identifica un registro y solo uno. No hay colision entre inquilinos.
--
-- ALCANCE: SOLO EL ESPACIO DE NOMBRES DEL ETL
-- -------------------------------------------
-- El indice es PARCIAL. `saas_deals.source` es texto libre para los otros tres
-- escritores: `SaasDealsService` lo recibe como parametro y `SaasHubSpotSync`
-- escribe `source:hubspot`. Dos deals creados a mano con el mismo `source` son
-- perfectamente legitimos y NO deben chocar.
--
-- Por eso la condicion es `source LIKE 'etl:legacy_id:%'`: la unicidad solo rige
-- donde la regla existe.
--
-- SEGURO EN PRODUCCION
-- --------------------
-- Ni DROP ni DELETE. Crear el indice falla si ya hubiera duplicados, que es el
-- comportamiento correcto —avisar en vez de destruir—, y en produccion
-- `saas_deals` tiene 0 filas, comprobado en lectura.
--
-- Si algun entorno tuviera duplicados, esta migracion aborta y hay que decidir
-- a mano con cual quedarse. No se elige por el operador.

CREATE UNIQUE INDEX IF NOT EXISTS ux_saas_deals_etl_legacy_source
  ON public.saas_deals (source)
  WHERE source LIKE 'etl:legacy_id:%';

COMMENT ON INDEX public.ux_saas_deals_etl_legacy_source IS
  'Un registro legado produce como mucho un deal migrado. Parcial: `source` es '
  'texto libre para los escritores que no son el ETL.';

-- 003 — RLS simétrica para las tablas local_ai_* que quedaron fuera de la 001.
--
-- CONTEXTO
-- --------
-- La 001 aplicó ENABLE + FORCE ROW LEVEL SECURITY y política por
-- `app.tenant_id` a `local_ai_memory`, `local_ai_rag_documents` y
-- `local_ai_rag_chunks`. Las otras tres tablas del esquema quedaron sin RLS
-- pese a declarar `tenant_id UUID NOT NULL`, es decir, pese a contener datos
-- por tenant.
--
-- POR QUÉ NO ERA UNA FUGA, Y AUN ASÍ SE CORRIGE
-- ---------------------------------------------
-- Se trazaron lectores y escritores de las tres:
--
--   local_ai_audit        0 lectores, 0 escritores (solo aparece en listas de
--                         tablas requeridas: LocalAiHealth, railwayRagPrep)
--   local_ai_ingest_jobs  0 lectores, 1 escritor — RagIngestPipeline, que ya
--                         inserta dentro de withTenantClient(tenantId)
--   local_ai_config       0 lectores, 0 escritores — y ADEMAS es system-global
--                         por esquema: sus columnas son (key, value, checksum,
--                         updated_at). NO tiene tenant_id, asi que NO se le
--                         aplica RLS. Verificado contra la base real; una
--                         lectura estatica previa lo dio por tenant-scoped por
--                         error.
--
-- Ninguna ruta puede filtrar datos hoy porque no existe camino de lectura. Se
-- corrige igualmente como defensa en profundidad: la asimetría invita a que un
-- lector futuro consulte estas tablas sin filtro creyendo que están protegidas
-- como el resto del esquema. El riesgo de aplicar la política es nulo — dos
-- tablas sin consumidores y una que ya escribe con el tenant fijado.
--
-- La política es idéntica a la de la 001: `current_setting('app.tenant_id',
-- true)` devuelve NULL cuando nadie fijó el tenant, la comparación es NULL y no
-- se devuelve ninguna fila. Fail-closed por defecto. FORCE cierra además el
-- bypass del propietario de la tabla.
--
-- Ningún contrato ni consumidor cambia.

ALTER TABLE local_ai_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS local_ai_audit_tenant_isolation ON local_ai_audit;
CREATE POLICY local_ai_audit_tenant_isolation ON local_ai_audit
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE local_ai_ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_ingest_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS local_ai_ingest_jobs_tenant_isolation ON local_ai_ingest_jobs;
CREATE POLICY local_ai_ingest_jobs_tenant_isolation ON local_ai_ingest_jobs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- local_ai_config queda INTENCIONADAMENTE fuera: es configuracion global del
-- runtime (key/value), sin columna tenant_id. Aplicarle una politica por tenant
-- seria incorrecto y ademas imposible.
--
-- Se desactiva RLS de forma explicita y defensiva. En una base nueva es un
-- no-op. En una base donde un intento previo dejase RLS habilitado SIN politica
-- —con FORCE eso significa CERO filas legibles para nadie, incluido el
-- propietario— esta linea repara ese estado en lugar de dejar la configuracion
-- del runtime inaccesible.
ALTER TABLE local_ai_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE local_ai_config NO FORCE ROW LEVEL SECURITY;

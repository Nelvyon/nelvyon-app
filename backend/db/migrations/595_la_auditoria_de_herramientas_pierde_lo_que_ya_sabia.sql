-- La auditoria de herramientas tiraba lo que ya tenia en la mano.
--
-- `McpAuditRecord` llega con agente, usuario, decision, riesgo, identificador de
-- aprobacion y las dos trazas. `saas_mcp_tool_audit` guardaba SIETE campos y el
-- resto se perdia al persistir. No es que faltara la informacion: es que no se
-- escribia.
--
-- Sin eso no se puede reconstruir una ejecucion de punta a punta:
--
--     CLIENTE → SERVICIO → TRABAJO → AGENTE → HERRAMIENTA → INTENTO
--            → APROBACION → EJECUCION → RESULTADO → COSTE
--
-- Se podia responder «que herramienta y con que resultado», pero no «que agente,
-- con que permiso, en que intento, con que aprobacion y a que coste».
--
-- TODAS NULLABLE, Y ESO IMPORTA PARA EL COSTE
--
-- `cost_estimate_usd` NULL significa NO SE SABE, y 0 significa que fue gratis de
-- verdad. Son cosas distintas y no se pueden confundir: convertir un
-- desconocido en un cero es inventarse que algo no costo nada. Por eso la
-- columna admite NULL y no tiene DEFAULT 0.
--
-- Las demas son nullable porque las filas anteriores a esta migracion no las
-- tienen, y rellenarlas con un valor inventado seria peor que dejarlas vacias.
--
-- COSTE EXTERNO: 0 EUR. Solo anade columnas.

ALTER TABLE saas_mcp_tool_audit
  ADD COLUMN IF NOT EXISTS agent_id          TEXT,
  ADD COLUMN IF NOT EXISTS user_id           TEXT,
  ADD COLUMN IF NOT EXISTS decision          TEXT,
  ADD COLUMN IF NOT EXISTS risk              TEXT,
  ADD COLUMN IF NOT EXISTS approval_id       TEXT,
  ADD COLUMN IF NOT EXISTS request_id        TEXT,
  ADD COLUMN IF NOT EXISTS trace_id          TEXT,
  -- Cual de los intentos fue este. 1 es el primero; sin esto un reintento y una
  -- ejecucion limpia son la misma fila repetida.
  ADD COLUMN IF NOT EXISTS attempt           INTEGER,
  -- NULL = no se sabe. 0 = fue gratis. Ver arriba.
  ADD COLUMN IF NOT EXISTS cost_estimate_usd NUMERIC(12, 6);

-- Reconstruir una ejecucion empieza por su traza, y hoy no habia por donde.
CREATE INDEX IF NOT EXISTS idx_saas_mcp_tool_audit_trace
  ON saas_mcp_tool_audit (tenant_id, trace_id)
  WHERE trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saas_mcp_tool_audit_agent
  ON saas_mcp_tool_audit (tenant_id, agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;

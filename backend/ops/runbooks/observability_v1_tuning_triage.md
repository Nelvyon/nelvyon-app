# ESCALA / OBSERVABILIDAD NELVYON v1 — Runbook de Tuning y Triage Inicial

## Estado de frente (congelado)
- Frente: **ESCALA / OBSERVABILIDAD NELVYON v1**
- Estado: **CERRADO en PASA real**
- Scope funcional vigente (sin ampliar):
  - `/os/observability`
  - `/os/observability/incidents`
  - `/os/observability/alerts`
- Prohibido en esta fase:
  - Integraciones de pager/on-call externas
  - Nuevas capacidades de producto fuera de estos 3 flows

---

## Señales base (ventana fija 24h)
- `five_xx_rate` (ratio HTTP 5xx)
- `latency_p95_ms` (latencia p95)
- `failed_jobs` (jobs fallidos en 24h)
- `queue_backlog` (cola pendiente)

Estas señales alimentan:
- semáforo (`ok/warn/crit`) en `/os/observability`
- drilldown en `/os/observability/incidents`
- simulación de reglas en `/os/observability/alerts`

---

## Umbrales actuales v1 (guardrails)

### Snapshot global (semáforo)
- **CRIT** si cualquiera:
  - `five_xx_rate >= 0.10`
  - `latency_p95_ms >= 1500`
  - `failed_jobs >= 5`
  - `queue_backlog >= 20`
- **WARN** si no está en CRIT y cualquiera:
  - `five_xx_rate >= 0.03`
  - `latency_p95_ms >= 800`
  - `failed_jobs >= 1`
  - `queue_backlog >= 8`
- **OK** en caso contrario.

### Reglas simuladas (alerts page)
1. **HTTP 5xx ratio**
   - warn: `0.03`
   - crit/fire: `0.10`
2. **Failed jobs (24h)**
   - warn: `1`
   - crit/fire: `5`
3. **Queue backlog**
   - warn: `8`
   - crit/fire: `20`

---

## Guía de tuning (sin cambiar alcance)

Aplicar ajustes solo cuando exista evidencia sostenida (no por picos aislados):

1. Observar al menos 7-14 días de comportamiento real por workspace crítico.
2. Identificar falsos positivos repetidos (warn/crit sin impacto operativo real).
3. Ajustar **de forma conservadora**:
   - mover primero umbral `warn`
   - mantener `crit` más estable
4. Re-validar con mini X-EXEC:
   - snapshot coherente
   - incidents con top fallos razonables
   - alerts con `would_fire` consistente
5. Documentar cambio (fecha, motivo, impacto esperado).

### Recomendaciones prácticas
- Si hay mucho `warn` por latencia sin impacto: subir `warn` de `800` a `900-1000`.
- Si cola suele fluctuar por lotes nocturnos: subir `warn` backlog de `8` a `10-12`.
- Evitar relajar `crit` de 5xx sin evidencia fuerte.

---

## Triage inicial (15 minutos)

### Paso 1 — Confirmar estado global
1. Abrir `/os/observability`
2. Registrar:
   - semáforo
   - 4 señales numéricas
3. Si `ok`, cerrar verificación rápida.

### Paso 2 — Si WARN o CRIT
1. Abrir `/os/observability/incidents`
2. Revisar top `endpoint` y top `job_type`
3. Tomar `correlation_id` (request/job) y error resumido
4. Abrir CTA runbook existente:
   - `/backend/ops/runbooks/phase9_observability_jobs.md`

### Paso 3 — Verificar guardrails
1. Abrir `/os/observability/alerts`
2. Confirmar reglas con estado esperado (`ok/warn/crit`)
3. Verificar `would_fire` de cada regla.

### Paso 4 — Acción mínima segura
- Endpoint dominante con 5xx:
  - aislar ruta, revisar últimos cambios, validar dependencia externa
- Job type dominante:
  - revisar error repetido, pausar origen ruidoso si aplica
- Backlog alto:
  - validar workers activos, throughput y reintentos

---

## Criterios de escalado interno (sin pager externo)
- Escalar a responsable técnico cuando:
  - estado `crit` persiste > 15 min, o
  - `five_xx_rate >= 0.10` sostenido, o
  - backlog sigue creciendo con jobs fallidos acumulándose.

---

## Registro operativo sugerido
Por cada incidente registrar:
- timestamp UTC
- estado semáforo inicial/final
- señal dominante
- endpoint/job_type afectado
- correlation id principal
- acción ejecutada
- resultado

---

## Política de cambios de frente
- Este runbook **no habilita** nuevas features.
- Cualquier expansión (pager externo, nuevos dashboards, SLO avanzados) requiere abrir un **nuevo frente único** explícito.

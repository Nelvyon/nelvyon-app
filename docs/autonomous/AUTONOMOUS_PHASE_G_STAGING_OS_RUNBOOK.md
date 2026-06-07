# NELVYON Autonomous — Phase G: Staging OS Runbook

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Piloto:** La Brasa del Raval → Landing Reserva Directa (restaurant / landing)  
**Estado:** Listo para staging controlado — **sin** publicación al cliente

---

## 1. Resumen

Phase G lleva el piloto restaurant landing (Phase F dry-run) a **os_deliverables** en OS staging:

- `status=in_review`
- `visibility=internal`
- Metadata trazable (`autonomous_provenance`, `sector`, `sku`, `qa_score`, `artifacts`)
- **Nunca** auto `client_visible` ni portal automático

**Fuera de alcance:** SaaS, web pública, producción real, portal cliente visible.

---

## 2. Variables necesarias

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `OS_PILOT_CLIENT_ID` | Sí | — | UUID cliente OS staging |
| `OS_PILOT_PROJECT_ID` | Sí | — | UUID proyecto OS staging |
| `OS_PILOT_WORKSPACE_ID` | No | `1` | Workspace operador |
| `OS_PILOT_PROJECT_SLUG` | No | `LANDING-RESERVA-DIRECTA` | Slug trazabilidad |
| `AUTONOMOUS_PRODUCTION` | Para write | `false` | `true` habilita `dry_run=false` |
| `NELVYON_API_URL` | Para POST | — | Base API staging |
| `OPERATOR_JWT` | Para POST | — | JWT owner/admin/operator |

Setup cliente/proyecto: ver `AUTONOMOUS_PHASE_G_OS_STAGING_PILOT_SETUP.md`.

---

## 3. Pasos exactos

### Paso 0 — Pre-flight

```bash
# Desde raíz del repo
pnpm -C apps/web autonomous:phase-f
```

Verificar:

- `backend/autonomous/output/phase-f/restaurant-landing/osPublishPayload.json` existe
- `qaResult.json` → score ≥ 85
- `playwrightQa.json` → `passed: true`

### Paso 1 — Crear cliente/proyecto piloto (manual, una vez)

Seguir `docs/autonomous/AUTONOMOUS_PHASE_G_OS_STAGING_PILOT_SETUP.md`.

Exportar UUIDs:

```bash
export OS_PILOT_CLIENT_ID="<uuid>"
export OS_PILOT_PROJECT_ID="<uuid>"
export OS_PILOT_WORKSPACE_ID=1
```

### Paso 2 — Preparar payload staging (dry-run por defecto)

```bash
pnpm -C apps/web autonomous:phase-g
```

Genera:

`backend/autonomous/output/phase-g/restaurant-landing/osPublishPayload.staging.json`

Con `dry_run=true` mientras `AUTONOMOUS_PRODUCTION` no esté activo.

### Paso 3 — Dry-run contra API (sin escritura DB)

#### curl

```bash
export NELVYON_API_URL="http://localhost:8000"
export OPERATOR_JWT="<jwt>"

curl -s -X POST "$NELVYON_API_URL/api/v1/os/autonomous/publish" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $OS_PILOT_WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d @backend/autonomous/output/phase-g/restaurant-landing/osPublishPayload.staging.json
```

Forzar dry-run explícito (recomendado en primer intento): editar JSON → `"dry_run": true`.

#### PowerShell

```powershell
$NELVYON_API_URL = "http://localhost:8000"
$OPERATOR_JWT = "<jwt>"
$payload = Get-Content "backend/autonomous/output/phase-g/restaurant-landing/osPublishPayload.staging.json" -Raw
$payloadObj = $payload | ConvertFrom-Json
$payloadObj.dry_run = $true
$body = $payloadObj | ConvertTo-Json -Depth 20 -Compress

Invoke-RestMethod -Method Post `
  -Uri "$NELVYON_API_URL/api/v1/os/autonomous/publish" `
  -Headers @{
    Authorization = "Bearer $OPERATOR_JWT"
    "X-Workspace-Id" = "$env:OS_PILOT_WORKSPACE_ID"
  } `
  -ContentType "application/json" `
  -Body $body
```

**Esperado (200):**

```json
{
  "dry_run": true,
  "written": false,
  "created": [],
  "qa_score": 90,
  "message": "Dry-run: no database writes performed"
}
```

### Paso 4 — Staging write controlado (solo tras GO dry-run)

```bash
export AUTONOMOUS_PRODUCTION=true
export NELVYON_API_URL="http://localhost:8000"
export OPERATOR_JWT="<jwt>"

# Regenera payload con dry_run=false
pnpm -C apps/web autonomous:phase-g

# POST (o el script hace POST si NELVYON_API_URL + OPERATOR_JWT están set)
```

Alternativa curl directa con `"dry_run": false` en el JSON staging.

**Esperado (200):**

```json
{
  "dry_run": false,
  "written": true,
  "created": [
    { "status": "in_review", "visibility": "internal" }
  ],
  "message": "Created N deliverable(s) in in_review/internal staging"
}
```

### Paso 5 — Verificación en OS UI / API

1. Abrir `/os/entregables` en staging
2. Filtrar por cliente **La Brasa del Raval** o proyecto **Landing Reserva Directa**
3. Confirmar entregables nuevos:
   - `status` = `in_review`
   - `visibility` = `internal`
4. Inspeccionar metadata del primer entregable:

```bash
curl -s "$NELVYON_API_URL/api/v1/os/deliverables/<DELIVERABLE_ID>" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $OS_PILOT_WORKSPACE_ID" | jq '.metadata | {
    autonomous_provenance,
    autonomous_phase,
    sector,
    sku,
    qa_score,
    artifacts
  }'
```

Esperado:

| Campo | Valor |
|-------|-------|
| `autonomous_provenance` | `true` |
| `autonomous_phase` | `"G"` |
| `sector` | `"restaurant"` |
| `sku` | `"landing"` |
| `qa_score` | ≥ 85 |
| `artifacts` | objeto con `build`, `copy`, etc. |

### Paso 6 — Workflow manual (no automático)

El operador puede avanzar manualmente cuando corresponda:

```
in_review → deliver → approve → publish → client_visible
```

Phase G **solo** crea el estado inicial `in_review` / `internal`. La publicación al portal requiere pasos manuales explícitos.

---

## 4. Criterios GO / NO-GO

### GO (proceder a Paso 4 write)

| # | Criterio |
|---|----------|
| 1 | Phase F QA ≥ 85 y Playwright PASS |
| 2 | Dry-run API 200, `written=false` |
| 3 | UUIDs cliente/proyecto validados en workspace correcto |
| 4 | Operador confirma entorno **staging** (no prod) |
| 5 | `AUTONOMOUS_PRODUCTION=true` solo en host staging |
| 6 | Revisión interna programada post-write |

### NO-GO (detener)

| # | Condición |
|---|-----------|
| 1 | `qa_score` < 85 |
| 2 | Dry-run 403/404/422 |
| 3 | Workspace mismatch |
| 4 | Entorno producción real |
| 5 | Intención de saltar revisión humana |
| 6 | Falta JWT operador o UUIDs piloto |

---

## 5. Rollback

### Entregables creados por error

1. Listar entregables del proyecto piloto en `/os/entregables`
2. Por cada entregable Phase G:
   - **Opción A:** Archivar vía API/UI si disponible
   - **Opción B:** Cambiar `status` a `rejected` con notas `"Phase G rollback"`
3. Verificar portal cliente: **ningún** entregable `client_visible` del piloto

### API reject (si aún in_review)

```bash
curl -X POST "$NELVYON_API_URL/api/v1/os/deliverables/<ID>/reject" \
  -H "Authorization: Bearer $OPERATOR_JWT" \
  -H "X-Workspace-Id: $OS_PILOT_WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"review_notes": "Phase G rollback — staging test"}'
```

### Desactivar writes

```bash
unset AUTONOMOUS_PRODUCTION
# o
export AUTONOMOUS_PRODUCTION=false
```

Reiniciar API si la variable se cachea al arranque.

---

## 6. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `AUTONOMOUS_PRODUCTION=true` en prod | Escritura no deseada | Default `false`; gate en servicio; solo staging |
| UUIDs incorrectos | 404 / FK error | Dry-run primero; verificar setup doc |
| Operador publica manual sin revisar | Cliente ve borrador | Workflow manual explícito; training |
| Payload Phase F desactualizado | QA/copy obsoleto | Re-ejecutar `autonomous:phase-f` antes de G |
| Confundir staging con prod | Datos mezclados | URLs distintas; checklist GO/NO-GO |

**Riesgo principal:** activar `AUTONOMOUS_PRODUCTION=true` fuera del entorno staging controlado.

---

## 7. Tests automatizados

```bash
# Vitest Phase G
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseG.test.ts

# Pytest Phase G publish
cd backend && python -m pytest tests/test_os_autonomous_publish_phase_g.py -q

# Regresión Phase D
cd backend && python -m pytest tests/test_os_autonomous_publish.py -q
```

---

## 8. Autonomía estimada (post Phase G)

| Métrica | Valor |
|---------|-------|
| Restaurant landing pipeline (A–G) | **~90%** |
| Staging OS entregable sin revisión | **No** — `in_review` obligatorio |
| Portal cliente sin operador | **0%** — workflow manual |
| Target con builder prod + dominio staging | **~92%** |

---

## 9. Archivos Phase G

| Archivo | Rol |
|---------|-----|
| `publish/preparePhaseGStagingPayload.ts` | Sustituye os_refs + dry_run gate |
| `scripts/run-phase-g-staging.ts` | CLI `autonomous:phase-g` |
| `fixtures/phase-g-staging-refs.example.json` | Plantilla UUIDs |
| `__tests__/phaseG.test.ts` | Tests payload |
| `tests/test_os_autonomous_publish_phase_g.py` | Tests API staging |
| `AUTONOMOUS_PHASE_G_OS_STAGING_PILOT_SETUP.md` | Setup cliente/proyecto |
| Este runbook | Operación staging |

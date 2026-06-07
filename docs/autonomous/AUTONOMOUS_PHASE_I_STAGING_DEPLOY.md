# NELVYON Autonomous — Phase I: Staging CDN Deploy

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Piloto:** La Brasa del Raval · restaurant landing preview  
**Modo:** CDN staging aislado — **sin** portal cliente ni `client_visible`

---

## 1. Objetivo

Publicar `preview.html` (Phase H) en **Supabase Storage staging** para visualizarla por URL, manteniendo:

- Default **dry-run** (sin upload)
- Gate `AUTONOMOUS_STAGING_DEPLOY=true` para escritura
- Entregables OS `in_review` / `internal` vía Phase D/G (nunca auto portal)
- **No** dominio público final del cliente

**Fuera de alcance:** SaaS, web pública principal, portal cliente visible, producción real cliente.

---

## 2. Auditoría infraestructura

| Componente | Ubicación | Uso Phase I |
|------------|-----------|-------------|
| `SupabaseService` | `backend/services/supabase_service.py` | Referencia upload/sign |
| `web_static_export.py` | Export websites bucket `websites` | Patrón CDN — **no** usado directamente |
| **`supabaseStagingClient.ts`** | `backend/autonomous/deploy/` | Cliente TS aislado |
| **`deployPreviewStaging.ts`** | `backend/autonomous/deploy/` | Orquestador upload |

**Bucket sugerido:** `autonomous-previews` (override: `AUTONOMOUS_PREVIEWS_BUCKET`)

Sin credenciales → **mock mode** (`https://mock.supabase.local/...`).

---

## 3. Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `AUTONOMOUS_STAGING_DEPLOY` | `false` | **Requerido `true`** para upload real/mock |
| `DEPLOY_DRY_RUN` | `true` | `false` permite intento de upload |
| `SUPABASE_URL` | — | URL proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role (staging only) |
| `AUTONOMOUS_PREVIEWS_BUCKET` | `autonomous-previews` | Bucket destino |
| `AUTONOMOUS_PLAYWRIGHT_QA` | — | `1` = Playwright browser live QA |

---

## 4. Ejecutar Phase I

```bash
# 1. Generar preview HTML (Phase H)
pnpm -C apps/web autonomous:phase-h

# 2. Deploy staging (dry-run default)
pnpm -C apps/web autonomous:phase-i
```

### Upload mock (sin credenciales Supabase)

```bash
export AUTONOMOUS_STAGING_DEPLOY=true
export DEPLOY_DRY_RUN=false
pnpm -C apps/web autonomous:phase-i
```

### Upload real Supabase

```bash
export AUTONOMOUS_STAGING_DEPLOY=true
export DEPLOY_DRY_RUN=false
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
pnpm -C apps/web autonomous:phase-i
```

---

## 5. Output

Directorio: `backend/autonomous/output/phase-i/restaurant-landing/`

| Archivo | Contenido |
|---------|-----------|
| `deploy_metadata.json` | `staging_url`, `storage_key`, `expires_at`, flags |
| `liveQaComparison.json` | QA local vs live |
| `qaReport.json` | Informe combinado Phase I |
| `osPublishPayload.json` | Handoff OS (`dry_run=true`) |
| `preview.html` | Copia local |

### deploy_metadata.json (campos clave)

```json
{
  "phase": "I",
  "bucket": "autonomous-previews",
  "storage_key": "restaurant-landing/phase-f-restaurant-landing-v1/1730000000/index.html",
  "staging_url": "https://xxx.supabase.co/storage/v1/object/sign/...",
  "preview_url": "https://xxx.supabase.co/storage/v1/object/sign/...",
  "expires_at": "2026-06-07T22:00:00.000Z",
  "dry_run": false,
  "written": true,
  "visibility": "internal",
  "client_visible": false
}
```

Signed URL TTL: **3600s** (1h) — renovar deploy para nueva URL.

---

## 6. Cómo abrir la landing por URL

| Modo | URL |
|------|-----|
| Dry-run | No hay URL — usar `preview.html` local |
| Mock deploy | `https://mock.supabase.local/autonomous-previews/...` (no resuelve DNS — referencia operador) |
| Real deploy | `staging_url` en `deploy_metadata.json` — abrir en navegador antes de `expires_at` |

```bash
# Extraer URL (PowerShell)
(Get-Content backend/autonomous/output/phase-i/restaurant-landing/deploy_metadata.json | ConvertFrom-Json).staging_url
```

---

## 7. Playwright QA live vs local

| Escenario | Local QA | Live QA |
|-----------|----------|---------|
| Dry-run deploy | ✅ sobre `preview.html` | ⏭ skipped (no URL) |
| Mock/real deploy | ✅ | ✅ fetch HTML desde `staging_url` |
| Playwright browser | `AUTONOMOUS_PLAYWRIGHT_QA=1` | goto URL o fetch fallback |

Comparación en `liveQaComparison.json`:

- `comparison.local_score` / `live_score` / `delta`
- `live_skipped` + `live_skip_reason`

---

## 8. OS handoff (Phase D/G)

`osPublishPayload.json` incluye:

- `artifacts.preview_url` / `artifacts.staging_url`
- `artifacts.deploy_metadata`
- `dry_run: true` (default)
- Entregables `visibility: internal`

Flujo operador:

```bash
pnpm -C apps/web autonomous:phase-i
# Revisar deploy_metadata.json → staging_url
# Phase G con OS UUIDs + dry-run API primero
pnpm -C apps/web autonomous:phase-g
```

Nunca auto `client_visible`. Publicación portal solo workflow manual post-revisión.

---

## 9. Seguridad

| Regla | Comportamiento |
|-------|----------------|
| Default dry-run | Sin upload |
| Sin `AUTONOMOUS_STAGING_DEPLOY` | Upload bloqueado (error) |
| Bucket dedicado | `autonomous-previews` — no websites prod |
| Signed URL | Expira 1h — no permalink público permanente |
| Portal | No auto-publish |
| Metadata | `client_visible: false` siempre |

---

## 10. Tests

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseI.test.ts
pnpm -C apps/web typecheck
```

Cobertura:

- Dry-run no sube
- Sin flag no escribe
- Con flag mock genera `staging_url`
- Payload incluye `preview_url`
- Live QA skip sin URL
- Deliverables internal (no client_visible)

---

## 11. Autonomía (post Phase I)

| Métrica | Valor |
|---------|-------|
| Restaurant landing A–I | **~93%** |
| URL staging operador | **Sí** (mock o Supabase) |
| Preview cliente segura | **No** — requiere Phase manual + dominio cliente |
| Target CDN prod + signed URL renewal | **~95%** |

---

## 12. Qué falta para preview cliente segura

1. Dominio cliente en staging (`*.staging.nelvyon.app`) — no mock Supabase
2. Bucket privado + signed URL renewal automático
3. Auth gate (token operador) antes de servir preview
4. Workflow OS → revisión → publish manual → portal
5. Imágenes/assets en CDN real (no example.com)
6. Playwright CI contra URL live en cada deploy

---

## 13. Archivos Phase I

| Archivo | Rol |
|---------|-----|
| `deploy/supabaseStagingClient.ts` | Cliente Storage |
| `deploy/deployPreviewStaging.ts` | Upload + gate |
| `qa/playwrightLiveQa.ts` | QA local vs live |
| `publish/buildPhaseIPublishPayload.ts` | OS payload |
| `pilots/restaurantLandingPhaseI.ts` | Orquestador |
| `scripts/run-phase-i-deploy.ts` | CLI `autonomous:phase-i` |

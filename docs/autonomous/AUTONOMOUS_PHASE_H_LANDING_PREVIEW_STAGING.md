# NELVYON Autonomous — Phase H: Landing Preview Staging

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Piloto:** La Brasa del Raval · restaurant / landing  
**Modo:** Builder staging aislado — **sin** publicación al cliente

---

## 1. Objetivo

Conectar el piloto restaurant landing con un **builder HTML staging real** (esquema de bloques `landing_builder_service`) y generar preview visual usable para revisión interna.

**No toca:** SaaS, web pública, producción real, portal cliente, `client_visible` automático.

---

## 2. Auditoría builder

| Componente | Ubicación | Uso Phase H |
|------------|-----------|-------------|
| `landing_builder_service.py` | DB + API pages/blocks | **Referencia de schema** — no invocado directamente |
| `web_static_export.py` | Export HTML estático CDN | **Patrón render** — replicado en TS aislado |
| `landingBuilder.ts` (mock) | Phase C mock | Sustituido en Phase H por wrapper staging |
| **`landingBuilderStaging.ts`** | `backend/autonomous/wrappers/` | **Wrapper aislado Phase H** |

El wrapper:
- Convierte `brief` + `copy` + `design` → bloques tipo `landing_builder_service`
- Renderiza HTML estático vía `renderLandingStagingHtml.ts`
- `production_deploy: false`, `staging_only: true`
- Sin escrituras DB ni deploy CDN

---

## 3. Ejecutar Phase H

```bash
pnpm -C apps/web autonomous:phase-h
```

Equivalente test:

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseH.test.ts
```

### Output

Directorio: `backend/autonomous/output/phase-h/restaurant-landing/`

| Archivo | Contenido |
|---------|-----------|
| `preview.html` | Landing HTML staging completa |
| `assetsManifest.json` | Slots hero, gallery, logo |
| `previewMetadata.json` | Phase H, builder, block_count |
| `qaReport.json` | Offline + Playwright combined |
| `playwrightStagingQa.json` | Checks PW-* detallados |
| `blocks.json` | Bloques landing_builder schema |
| `osPublishPayload.json` | Handoff Phase D/G (`dry_run=true`) |

---

## 4. Ver preview localmente

### Opción A — Abrir archivo

```bash
# Windows
start backend/autonomous/output/phase-h/restaurant-landing/preview.html

# macOS
open backend/autonomous/output/phase-h/restaurant-landing/preview.html
```

### Opción B — Servidor estático local

```bash
cd backend/autonomous/output/phase-h/restaurant-landing
npx --yes serve -p 5055
# → http://localhost:5055/preview.html
```

### Opción C — Live Server (VS Code / Cursor)

Abrir `preview.html` con extensión Live Server.

---

## 5. Playwright QA staging (PW-*)

| ID | Validación |
|----|------------|
| PW-HERO-01 | Hero visible |
| PW-CTA-01 | CTA visible |
| PW-MOBILE-01 | Hero @ 375px (Playwright) / viewport meta (fallback) |
| PW-DESKTOP-01 | Hero @ 1280px / CSS desktop |
| PW-SEO-01 | Title ≥ 10 chars |
| PW-SEO-02 | Meta description |
| PW-H1-01 | **H1 único** |
| PW-A11Y-01 | Contraste básico CTA |
| PW-LINKS-01 | ≥ 3 links navegación principal |
| PW-PLACEHOLDER-01 | **Bloqueante** — sin placeholders críticos |
| PW-CLAIM-01 | Sin claims prohibidos |

Activar browser real (opcional):

```bash
set AUTONOMOUS_PLAYWRIGHT_QA=1
pnpm -C apps/web autonomous:phase-h
```

Sin flag → fallback `dom-parse` (tests CI).

### Placeholders críticos (bloquean)

- `Your headline here`, `Supporting text`, `Lorem ipsum`
- `Get started`, `Welcome to our`, `[TODO]`
- URLs `mock://`

---

## 6. OS handoff (Phase D/G)

El `osPublishPayload.json` generado:

- `dry_run: true` por defecto
- `sku: landing`, `sector: restaurant`
- Entregables `visibility: internal` (forzado en DB por endpoint)
- Metadata: `preview_metadata`, `qa_report`, `assets_manifest`
- **No** auto-publish portal

Flujo:

```bash
# 1. Phase H → preview + payload
pnpm -C apps/web autonomous:phase-h

# 2. Phase G dry-run con payload (requiere UUIDs OS)
pnpm -C apps/web autonomous:phase-g
```

Ver: `AUTONOMOUS_PHASE_G_STAGING_OS_RUNBOOK.md`

---

## 7. QA score

Score combinado Phase H:

```
combined = round((offline_phase_c_score + playwright_staging_score) / 2)
```

Gate: offline ≥ 85 **y** Playwright PASS **y** sin placeholders críticos.

---

## 8. Qué falta para dominio staging real

| # | Gap | Prioridad |
|---|-----|-----------|
| 1 | Deploy HTML a `*.nelvyon.staging` / Supabase CDN (`web_static_export`) | P0 |
| 2 | Invocar `LandingBuilderService.create_page` con persistencia staging | P1 |
| 3 | Imágenes reales cliente (no `cdn.example.com`) | P1 |
| 4 | Playwright CI contra URL live (`AUTONOMOUS_PLAYWRIGHT_QA=1` + staging URL) | P1 |
| 5 | Reserva real (Calendly / T-cover API) en CTA href | P2 |
| 6 | Lighthouse / PSI en pipeline | P2 |

---

## 9. Autonomía restaurant landing (post Phase H)

| Métrica | Valor |
|---------|-------|
| Pipeline A–H (preview staging) | **~92%** |
| Preview visual usable | **Sí** — HTML local/staging |
| Dominio staging real | **No** — mock URL en build |
| Portal cliente sin operador | **0%** |
| Target con CDN + builder DB | **~94%** |

---

## 10. Archivos Phase H

| Archivo | Rol |
|---------|-----|
| `wrappers/landingBuilderStaging.ts` | Wrapper aislado builder |
| `preview/renderLandingStagingHtml.ts` | HTML desde bloques |
| `qa/playwrightStagingQa.ts` | QA Playwright ampliado |
| `publish/buildPhaseHPublishPayload.ts` | OsPublish + preview metadata |
| `pilots/restaurantLandingPhaseH.ts` | Orquestador |
| `scripts/run-phase-h-preview.ts` | CLI `autonomous:phase-h` |
| `__tests__/phaseH.test.ts` | Tests contrato |

---

## 11. Tests

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseH.test.ts
cd backend && python -m pytest tests/test_os_autonomous_publish_phase_g.py -q
pnpm -C apps/web typecheck
```

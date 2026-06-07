# NELVYON Autonomous — Phase F: Restaurant Landing Pilot

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Sector:** `restaurant` | **SKU:** `NELVYON-LANDING`  
**Modo:** Aislado / staging / dry-run por defecto

---

## 1. Objetivo

Primer piloto autónomo real **controlado** para validar velocidad, copy, oferta, landing y QA en un vertical no regulado (scoring sectorial **90/100**).

**No toca:** SaaS core, OS core, portal público, web pública, producción real sin flag.

---

## 2. Fixture piloto

`backend/autonomous/fixtures/restaurant-landing-pilot.json`

| Campo | Contenido |
|-------|-----------|
| Restaurante ficticio | La Brasa del Raval (Barcelona) |
| Oferta | Menú degustación brasas + -10% reserva directa |
| Público objetivo | Parejas/grupos 25-45, ticket 35-55€ |
| Ubicación | Carrer Joaquín Costa 42, Raval |
| CTA | Reservar mesa |
| Tono marca | Cálido gastronómico |
| Competencia local | 3 referencias ficticias |
| Fotos placeholder | 3 URLs CDN example |
| Restricciones legales | Alérgenos, +18, claims prohibidos listados |

---

## 3. Pasos para ejecutar

### 3.1 Pipeline Phase C + preview + Playwright QA

```bash
pnpm -C apps/web autonomous:phase-f
```

Equivalente:

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseF.test.ts
```

### 3.2 Output esperado

Directorio: `backend/autonomous/output/phase-f/restaurant-landing/`

| Archivo | Contenido |
|---------|-----------|
| `artifacts.json` | plan, strategy, copy, design, build, sector_context, preview_html |
| `qaResult.json` | score >= 85, checks, offline_dimensions |
| `retryHistory.json` | intentos QA |
| `osPublishPayload.json` | dry_run=true, sector=restaurant |
| `preview.html` | Landing HTML estática para QA visual |
| `playwrightQa.json` | Resultado checks Playwright offline |
| `project.json` | Estado final proyecto |

### 3.3 Phase D dry-run (endpoint)

Requiere API local + JWT operador + OS client/project UUID reales:

```bash
cd backend && python -m pytest tests/test_os_autonomous_publish_pilot.py -q
```

**Respuesta esperada (200):**

```json
{
  "dry_run": true,
  "production_enabled": false,
  "written": false,
  "qa_score": 90,
  "created": [],
  "deliverables_preview": [
    { "title": "Landing staging", "status": "in_review", "visibility": "internal" }
  ],
  "message": "Dry-run: no database writes performed"
}
```

Conteo `os_deliverables` **sin cambios**.

### 3.4 Staging write opcional (solo si seguro)

```bash
export AUTONOMOUS_PRODUCTION=true
# POST con dry_run=false — solo en entorno staging controlado
```

Reglas: `visibility=internal`, `status=in_review`, nunca `client_visible`.

---

## 4. QA esperado

| Capa | Umbral | Checks |
|------|--------|--------|
| Offline scorer Phase C | **>= 85** | structure, copy, SEO, brief, sector |
| Sector restaurant | No ESCALATE | `regulated=false` |
| Playwright offline | PASS | hero, CTA, mobile 375px, title/meta, contraste CTA, sin claims prohibidos |
| Phase D dry-run | 200, written=false | FK validation OK, no DB write |

### Playwright checks (PW-*)

| ID | Qué valida |
|----|------------|
| PW-HERO-01 | Sección hero visible |
| PW-CTA-01 | Botón CTA visible |
| PW-SEO-01 | Title >= 10 chars |
| PW-SEO-02 | Meta description presente |
| PW-A11Y-01 | Contraste básico CTA |
| PW-CLAIM-01 | Sin claims prohibidos del fixture |
| PW-MOBILE-01 | Hero visible viewport 375px |

Si Playwright browser no disponible → fallback `dom-parse` (documentado en tests).

---

## 5. Criterios de éxito del piloto

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Fixture piloto válido | ✅ |
| 2 | Sector `restaurant` aplicado en Phase C | ✅ |
| 3 | QA score >= 85 | ✅ (típico 90-100 mock) |
| 4 | `escalated=false` (no regulado) | ✅ |
| 5 | OsPublishPayload `dry_run=true` | ✅ |
| 6 | Playwright offline PASS | ✅ |
| 7 | Phase D dry-run sin DB write | ✅ pytest |
| 8 | Payload listo para OS staging | ✅ `in_review` / `internal` |

---

## 6. Autonomía estimada — restaurant landing

| Métrica | Valor |
|---------|-------|
| Scoring sectorial | **90/100** |
| Pipeline Phase A–F (piloto) | **~88%** |
| Con wrappers prod + dominio real | **~92%** target |
| Cliente final sin revisión humana | **No** — revisión operador recomendada |

---

## 7. Qué falta para producción real

| # | Gap | Prioridad |
|---|-----|-----------|
| 1 | Conectar `landing_builder_service` real (no mock) | P0 |
| 2 | Deploy staging a dominio `*.nelvyon.staging` | P0 |
| 3 | Playwright en CI contra URL live (no solo HTML estático) | P1 |
| 4 | Fotos reales cliente (no placeholder CDN) | P1 |
| 5 | Reserva real (Calendly/T cover/OpenTable API) | P1 |
| 6 | `AUTONOMOUS_PRODUCTION=true` en staging + 1 OS project piloto | P1 |
| 7 | Revisión operador → workflow manual portal | P2 |

### Siguiente paso recomendado

1. Ejecutar piloto en staging: `autonomous:phase-f` → revisar `preview.html`
2. Crear OS client/project piloto → Phase D dry-run manual con UUIDs reales
3. Con flag + permisos: 1 entregable `in_review` en workspace piloto
4. Conectar builder real detrás de `AUTONOMOUS_LANDING_PRODUCTION=true` (flag futuro)

---

## 8. Archivos Phase F

| Archivo | Rol |
|---------|-----|
| `fixtures/restaurant-landing-pilot.json` | Brief piloto |
| `pilots/restaurantLandingPilot.ts` | Orquestador piloto |
| `preview/renderLandingPreviewHtml.ts` | HTML preview |
| `qa/playwrightOfflineQa.ts` | QA browser offline |
| `scripts/run-phase-f-pilot.ts` | CLI |
| `__tests__/phaseF.test.ts` | Tests vitest |
| `tests/test_os_autonomous_publish_pilot.py` | Phase D dry-run pytest |

---

## 9. Tests

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseF.test.ts
cd backend && python -m pytest tests/test_os_autonomous_publish_pilot.py -q
pnpm -C apps/web typecheck
```

# NELVYON Master Operations Runbook v1

## Purpose

This runbook is the final operational consolidation for NELVYON after platform build-out closure.  
It defines how to operate, verify, and protect stability without reopening closed fronts.

---

## 1) Global Status: Closed Fronts (PASA real)

All fronts below are closed in PASA real:

- OS + agents v2
- AUTOSERVICIO CLIENTE v1
- BOTS PROFESIONALES v1 - EN SOMBRA
- PERSONAL DIGITAL NELVYON v1
- ADVISOR EMPRESARIAL NELVYON v1
- CANALES Y COMUNICACIONES NELVYON v1
- WHITE-LABEL / BRANDING NELVYON v1
- VOZ NELVYON v2 (piloto) + runbook
- ESCALA / OBSERVABILIDAD NELVYON v1 + runbook
- MULTI-TENANT / WHITE-LABEL NELVYON v2 avanzado
- ESCALA GLOBAL / OPERACION NELVYON v2
- EXCELENCIA MUNDIAL NELVYON v1

Operating rule from this point:

- Baseline 100/100 is preserved.
- Closed fronts are not reopened without explicit decision.
- No lateral scope disguised as "small fixes".
- Any relevant new work must be opened as one new single active front.

---

## 2) Daily Operation Routes (Internal)

Use the following routes as the operational cockpit:

### Reliability and incident triage

- `/os/observability`  
  Health and SLO snapshot (5xx rate, p95 latency, failed jobs, queue backlog).
- `/os/observability/incidents`  
  Drilldown for failing endpoints/jobs, last error summary, request/correlation context.
- `/os/observability/alerts`  
  Fixed alert guardrails (read/simulation only), no external pager.

### Tenant branding policy operations

- `/app/branding/policy`  
  Effective branding policy visibility (enabled/blocked/inherited and reasons).
- `/os/tenants/activation`  
  Internal activation guard for branding v2 advanced (operator/admin), with change log.
- `/app/branding/preview-v2`  
  Local policy-aware preview matrix (allowed vs blocked inputs).

### Global operations

- `/os/global`  
  Cross-workspace operations snapshot (read-only).
- `/os/global/risk-queue`  
  Workspace risk prioritization queue.
- `/os/global/change-journal`  
  Operational change timeline/journal.

### Excellence and quality contract

- `/os/qa/checklist`  
  Core QA checklist with status and evidence references.
- `/os/i18n`  
  i18n baseline status (default/enabled locales, module readiness, hotspots).
- `/os/excellence/golden-path`  
  Official quality gate path and "ready" contract.

---

## 3) Recommended Operational Cadence

### Daily cadence

1. Review `/os/observability` at shift start and before release windows.
2. If WARN/CRIT appears, continue with `/os/observability/incidents`.
3. Confirm alert guardrails behavior in `/os/observability/alerts` when signal shifts.
4. Review `/os/global` and `/os/global/risk-queue` for cross-workspace concentration risk.
5. Check `/os/qa/checklist` and `/os/excellence/golden-path` before marking work as ready.

### Weekly cadence

1. Review `/os/global/change-journal` for trend and repetition patterns.
2. Review `/os/i18n` for hotspot debt and P1/P2 prioritization.
3. Audit branding policy consistency via:
   - `/app/branding/policy`
   - `/os/tenants/activation`
   - `/app/branding/preview-v2`
4. Confirm process discipline:
   - No front reopened without explicit decision.
   - No undocumented functional expansion.

---

## 4) Internal Escalation Criteria

Escalate internally when any of the following occurs:

- Observability shows sustained CRIT or repeated WARN in consecutive checks.
- Incident drilldown reveals repeated failures in same endpoint/job family.
- Queue backlog persists above normal range and affects response expectations.
- Tenant policy inconsistencies are detected between policy view, activation state, and preview behavior.
- QA checklist evidence is stale or contradictory to runtime behavior.
- Golden path steps are not all green but release/closure is being requested.

Escalation path (internal):

1. Capture evidence route + current state.
2. Record in operational notes/change journal process.
3. Trigger focused triage with responsible internal owner.
4. If functional changes are required, open a new single active front explicitly.

---

## 5) No Functional Expansion Policy (Without New Front)

Effective immediately:

- No new product capabilities are added under "maintenance".
- No module receives behavioral expansion without explicit front definition.
- No cross-front opportunistic additions during fixes.
- Runbooks and operational documentation are allowed.
- Functional change requests must be routed to "new single front proposal -> acceptance -> implementation -> PASA real closure".

This policy protects platform stability and preserves auditability of change intent.

---

## 6) Definition of "READY" in NELVYON

A change is considered READY only when all conditions below hold:

1. Golden path is green:
   - sanity functional checks
   - typecheck
   - lint
   - relevant tests
   - gate
2. Operational review is complete:
   - no unresolved critical signals in observability routes
   - QA checklist evidence is coherent and current
3. Scope discipline is respected:
   - no lateral additions
   - no implicit reopening of closed fronts
4. Closure statement is explicit:
   - front status set to PASA real with verification traces.

Minimum command contract:

- `pnpm typecheck`
- `pnpm lint`
- relevant backend/frontend tests
- `pnpm gate`

If any item is missing, READY is not granted.

---

## Premium OS Service Templates

Operational registry only: runbook + internal OS preview for each premium delivery template.  
No product scope expansion from this list. **Estado** for every row: **CERRADO EN PASA REAL**.

| # | Servicio | Runbook | Preview OS | Estado |
|---:|---|---|---|---|
| 1 | Web Premium | `backend/ops/runbooks/web_premium_nelvyon_v1.md` | `/os/web-premium/preview` | CERRADO EN PASA REAL |
| 2 | E-commerce Premium | `backend/ops/runbooks/ecommerce_premium_nelvyon_v1.md` | `/os/ecommerce-premium/preview` | CERRADO EN PASA REAL |
| 3 | SEO Premium | `backend/ops/runbooks/seo_premium_nelvyon_v1.md` | `/os/seo-premium/preview` | CERRADO EN PASA REAL |
| 4 | Ads Premium | `backend/ops/runbooks/ads_premium_nelvyon_v1.md` | `/os/ads-premium/preview` | CERRADO EN PASA REAL |
| 5 | Branding Premium | `backend/ops/runbooks/branding_premium_nelvyon_v1.md` | `/os/branding-premium/preview` | CERRADO EN PASA REAL |
| 6 | Voz Premium | `backend/ops/runbooks/voz_premium_nelvyon_v1.md` | `/os/voz-premium/preview` | CERRADO EN PASA REAL |
| 7 | Bots Premium | `backend/ops/runbooks/bots_premium_nelvyon_v1.md` | `/os/bots-premium/preview` | CERRADO EN PASA REAL |
| 8 | Personal Digital Premium | `backend/ops/runbooks/personal_digital_premium_nelvyon_v1.md` | `/os/personal-digital-premium/preview` | CERRADO EN PASA REAL |
| 9 | Advisor Empresarial Premium | `backend/ops/runbooks/advisor_empresarial_premium_nelvyon_v1.md` | `/os/advisor-empresarial-premium/preview` | CERRADO EN PASA REAL |
| 10 | Canales y Comunicaciones Premium | `backend/ops/runbooks/canales_comunicaciones_premium_nelvyon_v1.md` | `/os/canales-comunicaciones-premium/preview` | CERRADO EN PASA REAL |
| 11 | Social Media Premium | `backend/ops/runbooks/social_media_premium_nelvyon_v1.md` | `/os/social-media-premium/preview` | CERRADO EN PASA REAL |
| 12 | Email Marketing Premium | `backend/ops/runbooks/email_marketing_premium_nelvyon_v1.md` | `/os/email-marketing-premium/preview` | CERRADO EN PASA REAL |
| 13 | Contenido y Copywriting Premium | `backend/ops/runbooks/contenido_copywriting_premium_nelvyon_v1.md` | `/os/contenido-copywriting-premium/preview` | CERRADO EN PASA REAL |
| 14 | Video y Multimedia Premium | `backend/ops/runbooks/video_multimedia_premium_nelvyon_v1.md` | `/os/video-multimedia-premium/preview` | CERRADO EN PASA REAL |
| 15 | 3D y Contenido Inmersivo Premium | `backend/ops/runbooks/3d_contenido_inmersivo_premium_nelvyon_v1.md` | `/os/3d-inmersivo-premium/preview` | CERRADO EN PASA REAL |
| 16 | Fotografía de Producto Premium | `backend/ops/runbooks/fotografia_producto_premium_nelvyon_v1.md` | `/os/fotografia-producto-premium/preview` | CERRADO EN PASA REAL |
| 17 | Diseño gráfico y creatividades Premium | `backend/ops/runbooks/diseno_grafico_creatividades_premium_nelvyon_v1.md` | `/os/diseno-grafico-premium/preview` | CERRADO EN PASA REAL |
| 18 | Consultoría de automatización Premium | `backend/ops/runbooks/consultoria_automatizacion_premium_nelvyon_v1.md` | `/os/consultoria-automatizacion-premium/preview` | CERRADO EN PASA REAL |
| 19 | Integraciones y APIs Premium | `backend/ops/runbooks/integraciones_apis_premium_nelvyon_v1.md` | `/os/integraciones-apis-premium/preview` | CERRADO EN PASA REAL |
| 20 | Mantenimiento web Premium | `backend/ops/runbooks/mantenimiento_web_premium_nelvyon_v1.md` | `/os/mantenimiento-web-premium/preview` | CERRADO EN PASA REAL |
| 21 | Reputación online y ORM Premium | `backend/ops/runbooks/reputacion_online_orm_premium_nelvyon_v1.md` | `/os/reputacion-orm-premium/preview` | CERRADO EN PASA REAL |
| 22 | Formación y capacitación digital Premium | `backend/ops/runbooks/formacion_capacitacion_digital_premium_nelvyon_v1.md` | `/os/formacion-capacitacion-premium/preview` | CERRADO EN PASA REAL |
| 23 | Influencer Marketing Premium | `backend/ops/runbooks/influencer_marketing_premium_nelvyon_v1.md` | `/os/influencer-marketing-premium/preview` | CERRADO EN PASA REAL |

---

## Operational Notes

- This runbook consolidates existing platform capabilities only.
- It does not introduce new functional behavior.
- It is the reference baseline for operation mode + incremental improvement.

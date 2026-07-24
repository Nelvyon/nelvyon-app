# AUDITORÍA TÉCNICA ABSOLUTA — NELVYON

> Fecha: **2026-07-24** (ADR-056 elite absolute audit · **AUDIT_FIXES_LOCAL** · tip **TBA** (base **`6364c28c`**) · runtime staging ADR-055 **`53149384`** · claimReady false)  
> Veredicto: **AUDIT_FIXES_LOCAL** · **CONDITIONAL_READY** · **NOT READY**  
> SSOT: `OS_ELITE_STATE_MATRIX.md` · `OS_CATALOG_V1.md` v1.2.0 · ADR-056

### Matriz estricta

| Dimensión | Estado |
|-----------|--------|
| VERDE VERIFICADO (staging live ADR-055 runtime) | 13 packs+auditor · automations/reputation E2E ALL_PASS · SM/MCP synthetic flags ON · catalog 1.2.0 |
| VERDE LOCAL (ADR-056 fixes uncommitted) | agency **109 PASS** · tsc **0** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · P0/P1 audit fixes applied |
| PREPARADO OFF | social oficial 8 cuentas · visual spend · auditor prod |
| BLOQUEO EXTERNO | ads OAuth · no live Meta/Google Ads spend path |
| BLOQUEO CEO | OpenClaw prod canary · OpenAI · payouts · paid visual · paid social |
| BLOQUEO LEGAL | claimReady · campañas mass-send · Pepito forbidden · dossier pending |
| COMPETITIVE HONESTY | No GHL telephony dialer parity · no Odoo ERP/accounting/manufacturing · no proven multi-tenant production customer outcomes |
| COSTES | 0 |
| Evidencia staging | `automations_reputation_e2e_latest.md` · `auditor.all_packs_e2e_latest.md` |

---

## ADR-056 — P0/P1 corregidos (elite absolute audit)

### P0 (corregido)

| Hallazgo | Fix |
|----------|-----|
| Campaign launch posible con `claimReadyLegal=false` | `getCampaignLaunchBlockReason` bloquea launch · test bypass only |

### P1 (corregidos)

| Hallazgo | Fix |
|----------|-----|
| Chat/ai-copy podían gastar OpenAI sin gate explícito | `isOpenAiSpendAllowed` gates chat+ai-copy |
| `mcp.write` inventado | Eliminado — no write ficticio |
| Shared-memory scopes mezclados | Scopes split en rutas |
| `meta-ads-pack` disponible sin OAuth | Demoted to beta **OAuth OFF** |

### Evidencia local

- tsc **0**
- CampaignsLegal + saasCampanias + saasEnv + mcpProductive + catalog availability **PASS**
- agency suite **109 PASS**
- eslint changed routes **0**
- Pepito **untouched**
- Prod flag read: `NELVYON_*` OpenAI/MCP/SM/OpenClaw/visual **ABSENT** — restored to staging

---

## 1. Qué se revisó

Barrido del monorepo (código, no solo docs) en:

| Área | Alcance |
|------|---------|
| Arquitectura | SaaS / OS / Portal / BFF / FastAPI proxy / Shared Memory / Private AI |
| APIs & BFF | `/api/saas/*`, `/api/platform/*`, `/api/v1/*`, `/api/reports/*`, honesty `bffDegraded` |
| AuthZ | `requireSaasContext`, `requirePlatformClaims`, CSRF Origin, CRON_SECRET |
| Multi-tenancy / RLS | mig **515** Shared Memory RLS · bounce/complaint tenant-scope (previo) |
| IA | Router health certification honesty · OpenClaw SSOT · Brain orphans/coverage |
| CRM / Billing / Ads / Social / Funnels / Ecom / Automations / Reputación | empty payloads, auth swallow, stubs |
| Campañas legal gate | `CampaignsLegalTechnicalGate` · `getCampaignLaunchBlockReason` |
| Scripts / CI | staging smokes passwords · verify-all · security-gates |
| Docs | HANDOVER · CHANGELOG · CLAUDE mig alignment · DATABASE |
| Deuda | TODO/FIXME en auth/BFF · `console.log` en API · catch vacío en API · Railway hardcodes |

---

## 2. Qué se encontró (histórico + ADR-056)

### P0 (corregidos en pasadas previas + ADR-056)

1. **Billing summary** devolvía `EMPTY_SUMMARY` (parece plan Starter real) cuando claims era 401 `NextResponse` o error interno.
2. **CRM reports** tragaba Unauthorized `NextResponse` → empty 200.
3. **Automations unified** descartaba `platformCollectAuthFailure` (401/403) y devolvía empty 200.
4. **Reputación connection** sin auth en GET/POST.
5. **Entregables POST** `resend_portal_link` / `open_in_portal` → `{ ok: true }` noop (sesión previa → 501).
6. **Router-health** `certified: true` siempre (sesión previa → `health.ok`).
7. Varios EMPTY_* BFF sin `degraded` (sesión previa + extensión).
8. **ADR-056:** Campaign launch no bloqueado legalmente → `getCampaignLaunchBlockReason`.

### P1 (corregidos + ADR-056)

- Ads unified marcaba **empty real** (0 spend) como degraded.
- Widget CDN hardcodeado a Railway.
- Social unified `CLIENT_ID = "ws-client-1"`.
- Claims internos → empty 200 en funnels/ecom/social/automations (→ 500).
- `schemaPending` SaaS sin `degraded`.
- Staging QA password embebido en smokes.
- **ADR-056:** chat/ai-copy OpenAI spend · mcp.write inventado · shared-memory scopes · meta-ads-pack OAuth OFF.

### Limpio (evidencia)

- Sin `console.log` en `apps/web/src/app/api`.
- Sin TODO/FIXME/HACK en paths críticos auth/BFF.
- Última mig **518** alineada CLAUDE/HANDOVER/DATABASE.
- Cron routes con CRON helpers.
- verify-all: **0 FAIL**.

---

## 3. Qué se corrigió

| Fix | Archivos clave |
|-----|----------------|
| Auth swallow → 401/500 | `billing/summary`, `reports/crm`, CRM clients/deals/campaigns/tickets/pipeline |
| authDenied honor | `automations/reporting/unified` |
| Auth reputación connection | `platform/reputacion/connection` |
| Entregables 501 + write | `saas/entregables/[id]` |
| Router certified = health.ok | `private-ai/router-health` |
| EMPTY_* + bffDegraded | platformFastApiProxy, funnels/automations/ecommerce/reputacion embed, social analytics, dashboard |
| Ads pass-through empty real | `ads/reporting/unified` |
| Widget URL SSOT | `features/dashboard/api.ts` + `getAppBaseUrl` |
| Social clientId tenant/workspace | `social/reporting/unified` |
| schemaPending + degraded | deliverability, attribution, security, marketplace |
| Staging password env | `pack-e2e-shared` + 19 smokes |
| **ADR-056 P0** campaign launch block | `CampaignsLegalTechnicalGate` · `SaasCampaniasService` |
| **ADR-056 P1** OpenAI spend gate | chat + ai-copy routes · `isOpenAiSpendAllowed` |
| **ADR-056 P1** MCP write honesty | `SaasMcpProductiveService` |
| **ADR-056 P1** shared-memory scopes | shared-memory route |
| **ADR-056 P1** meta-ads beta | `servicePacksCatalog` |

---

## 4. Qué se reforzó

- Contrato BFF: vacío por fallo upstream → `degraded` + `degraded_reason`.
- Fallos de claims no-Unauthorized → **500** (no fingir datos).
- Fallos de auth upstream en reporting unified → propagar 401/403.
- Smokes staging no embeben secreto QA por defecto (requieren env o allow-default explícito).
- Embed reputación: auth + URL desde `NEXT_PUBLIC_APP_URL`.
- **ADR-056:** Legal gate en campaign launch · OpenAI spend fail-closed · MCP write honesty · competitive honesty documented.

---

## 5. Qué se optimizó

- Eliminación de rewrite innecesario en ads unified (menos falsa degradación → menos ruido ops).
- ClientId social derivado de workspace/tenant (menos colisión entre tenants en analytics proxy).
- Documentación viva sincronizada con estado verificable.

---

## 6. Riesgos reales que quedan (código)

| Riesgo | Severidad | Notas |
|--------|-----------|-------|
| Reputación reviews/alerts/unified aún stub degradado (no proxy FastAPI) | P2/ops | Honesto (`degraded`); falta wiring OAuth Google Business en prod |
| Marketplace `CATALOG_FALLBACK` cuando schema pending | Bajo | Marcado `schemaPending` + `degraded` |
| Ingest Brain local | ✅ Mitigado 2026-07-20 | `verified:true` · 1559 chunks · Docker/Ollama UP · ADR-030 |
| Shared Memory remoto 514/515 | Bajo (staging) | KI-021 **resuelto staging**; KI-026 RLS ✅; flags OFF; no READY |
| SES / Stripe Live | Alta/Media | KI-014 + OPS Stripe |
| Sector agents `catch {}` best-effort | Bajo | No API path; deuda de agentes |
| Cobertura live RLS/elite gated por env | Esperado | Skips documentados en `TEST_SKIPS.md` |
| No live ads OAuth spend | Externo | Meta/Google Ads OAuth OFF · meta-ads-pack beta |
| No GHL telephony dialer parity | Producto | Twilio código; no dialer nativo GHL |
| No Odoo ERP parity | Producto | CRM/SaaS scope; no accounting/manufacturing |

Ningún **P0** abierto conocido en repositorio tras ADR-056 (fixes local uncommitted). Bloqueadores externos §7 actualizados.

---

## 7. Dependencias solo de infraestructura externa

1. ~~Docker Desktop + compose local-ai + ingest~~ ✅ **2026-07-20** (`knowledge_ingest_evidence.json`)
2. ~~Shared Memory + KI-026 RLS staging~~ ✅ 2026-07-21. Siguiente: SES/Stripe/flags · **CONDITIONAL_READY** (no READY)
3. SES Live (`docs/OPS_SES_PROD.md`) — KI-014
4. Stripe Live (`docs/OPS_STRIPE_PROD.md`)
5. Railway deploy + env secrets (staging env **existe**; CLI restored to staging after prod flag read)
6. Cloudflare DNS/WAF
7. `NELVYON_OPENCLAW_BRIDGE_URL` (+ Shared Memory ON si aplica)
8. CEO: 8 cuentas sociales oficiales · Legal: dossier Pepito

---

## 8. ¿Técnicamente terminado el repositorio?

**Internamente: sí, con veredicto AUDIT_FIXES_LOCAL / CONDITIONAL_READY** — gates locales PASS, hallazgos P0/P1 de honesty/auth/BFF/campaigns corregidos, sin P0 abierto demostrable en código (ADR-056 fixes pending commit/deploy).

**Producción READY: no** — mientras existan bloqueos externos listados en §7 sin evidencia live, no se declara READY ni “perfecto”.

Criterio de cierre enterprise del repo (código):

- [x] tsc / lint PASS (2026-07-24 ADR-056)  
- [x] verify-all sin FAIL — **KI-027 cerrado** · CONDITIONAL_READY (skips Docker/DATABASE_URL honestos)  
- [x] Sin éxito silencioso en BFF críticos auditados  
- [x] Multi-tenancy / auth paths reforzados · KI-026 RLS staging ✅  
- [x] DB staging hasta **518** + SM verified (sesión KI-026)  
- [x] Validador post-elite **508–518**  
- [x] ADR-056 P0/P1 fixes local verified (109 agency tests)  
- [ ] ADR-056 commit + deploy staging (tip TBA)  
- [ ] SES/Stripe live + deploy prod (humano/ops)

---

## 9. Competitive honesty (ADR-056)

| Gap factual | Estado |
|-------------|--------|
| Live Meta/Google Ads OAuth spend path | **No** — meta-ads-pack beta OAuth OFF |
| Native telephony dialer parity (GHL) | **No** |
| Full ERP/accounting/manufacturing (Odoo) | **No** |
| Campaign mass-send | **Legally blocked** |
| Official social accounts NELVYON | **Pending CEO** |
| Multi-tenant production customer outcomes | **Not proven** in this audit |

**No competitive superiority claims.**

---

## Comandos de evidencia

```powershell
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web lint
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm backend/db backend/agency --reporter=dot
node scripts/nelvyon-verify-all.mjs
```

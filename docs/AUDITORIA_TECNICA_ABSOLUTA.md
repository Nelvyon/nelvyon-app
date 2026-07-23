# AUDITORÍA TÉCNICA ABSOLUTA — NELVYON

> Fecha: **2026-07-23** (tip `1d5d620a` · ADR-044 · MESH_JOIN_FAIL)  
> Veredicto interno: **CONDITIONAL_READY** · `claimReady: false` · **no READY**  
> Evidencia: `docs/ops/MESH_OPTION_A_STAGING.md` · deploy `03a16532` · Pack E2E WARN

### Matriz estricta (resumen)

| Dimensión | Estado |
|-----------|--------|
| IMPLEMENTADO | Mesh entrypoint · ADR-044 CGNAT+proxy · Router+QR · core SaaS/OS |
| VERIFICADO LOCAL | Ollama TS IP PASS · vitest **44/44** |
| VERIFICADO STAGING | live/ready 200 · tip `1d5d620a` · join **FAIL** · Pack E2E WARN critical=0 |
| VERIFICADO PROD | Mesh/IA keys **ABSENT** |
| PREPARADO OFF | OpenAI · Funnel · Serve · exit · subnet · MCP · SM · payouts |
| BLOQUEO EXTERNO | Auth key válida CEO · legal campañas |
| CEO / LEGAL / MERCADO | Bloquean claimReady / mesh remoto |

---


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
| Scripts / CI | staging smokes passwords · verify-all · security-gates |
| Docs | HANDOVER · CHANGELOG · CLAUDE mig alignment · DATABASE |
| Deuda | TODO/FIXME en auth/BFF · `console.log` en API · catch vacío en API · Railway hardcodes |

---

## 2. Qué se encontró

### P0 (corregidos en esta pasada)

1. **Billing summary** devolvía `EMPTY_SUMMARY` (parece plan Starter real) cuando claims era 401 `NextResponse` o error interno.
2. **CRM reports** tragaba Unauthorized `NextResponse` → empty 200.
3. **Automations unified** descartaba `platformCollectAuthFailure` (401/403) y devolvía empty 200.
4. **Reputación connection** sin auth en GET/POST.
5. **Entregables POST** `resend_portal_link` / `open_in_portal` → `{ ok: true }` noop (sesión previa → 501).
6. **Router-health** `certified: true` siempre (sesión previa → `health.ok`).
7. Varios EMPTY_* BFF sin `degraded` (sesión previa + extensión).

### P1 (corregidos)

- Ads unified marcaba **empty real** (0 spend) como degraded.
- Widget CDN hardcodeado a Railway.
- Social unified `CLIENT_ID = "ws-client-1"`.
- Claims internos → empty 200 en funnels/ecom/social/automations (→ 500).
- `schemaPending` SaaS sin `degraded`.
- Staging QA password embebido en smokes.

### Limpio (evidencia)

- Sin `console.log` en `apps/web/src/app/api`.
- Sin TODO/FIXME/HACK en paths críticos auth/BFF.
- Última mig **515** alineada CLAUDE/HANDOVER/DATABASE.
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

---

## 4. Qué se reforzó

- Contrato BFF: vacío por fallo upstream → `degraded` + `degraded_reason`.
- Fallos de claims no-Unauthorized → **500** (no fingir datos).
- Fallos de auth upstream en reporting unified → propagar 401/403.
- Smokes staging no embeben secreto QA por defecto (requieren env o allow-default explícito).
- Embed reputación: auth + URL desde `NEXT_PUBLIC_APP_URL`.

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

Ningún **P0** abierto conocido en repositorio tras esta pasada. Bloqueadores externos §7 actualizados post Bloque 2.

---

## 7. Dependencias solo de infraestructura externa

1. ~~Docker Desktop + compose local-ai + ingest~~ ✅ **2026-07-20** (`knowledge_ingest_evidence.json`)
2. ~~Shared Memory + KI-026 RLS staging~~ ✅ 2026-07-21. Siguiente: SES/Stripe/flags · **CONDITIONAL_READY** (no READY)
3. SES Live (`docs/OPS_SES_PROD.md`) — KI-014
4. Stripe Live (`docs/OPS_STRIPE_PROD.md`)
5. Railway deploy + env secrets (staging env **existe**; CLI restaurado a production)
6. Cloudflare DNS/WAF
7. `NELVYON_OPENCLAW_BRIDGE_URL` (+ Shared Memory ON si aplica)

---

## 8. ¿Técnicamente terminado el repositorio?

**Internamente: sí, con veredicto CONDITIONAL_READY** — gates locales PASS, hallazgos P0/P1 de honesty/auth/BFF corregidos, sin P0 abierto demostrable en código.

**Producción READY: no** — mientras existan bloqueos externos listados en §7 sin evidencia live, no se declara READY ni “perfecto”.

Criterio de cierre enterprise del repo (código):

- [x] tsc / lint PASS (2026-07-21)  
- [x] verify-all sin FAIL — **KI-027 cerrado** · CONDITIONAL_READY (skips Docker/DATABASE_URL honestos)  
- [x] Sin éxito silencioso en BFF críticos auditados  
- [x] Multi-tenancy / auth paths reforzados · KI-026 RLS staging ✅  
- [x] DB staging hasta **516** + SM verified (sesión KI-026)  
- [x] Validador post-elite **508–516**  
- [ ] SES/Stripe live + deploy prod (humano/ops)

---

## 9. Auditoría cierre élite total — 2026-07-21 (solo lectura)

### Tabla sistemas principales

| Sistema | Implementado | Verificado local | Verificado staging | Prep. no operativo | Bloq. externo | Riesgo/deuda |
|---------|:------------:|:----------------:|:------------------:|:------------------:|:-------------:|:------------:|
| **SaaS core** (41 págs, shell) | ✅ | ✅ tsc · brain 7/7 · verify-all CONDITIONAL | 🟡 smokes existen; live A≠B pendiente | — | — | — |
| **OS / packs** | ✅ kickoff 3 growth | ✅ UI_CONTRACT 53/53 | 🟡 pack E2E parcial | — | — | — |
| **CRM / pipeline** | ✅ | ✅ UNIT + UI_CONTRACT | 🟡 no live cross-tenant | — | — | — |
| **Workflows / secuencias** | ✅ idempotencia | ✅ UNIT | 🟡 cron live no re-auditado | — | CRON_SECRET prod | — |
| **Email / campañas** | ✅ SES código | ✅ UNIT bounce | ❌ envío real | ✅ código listo | **KI-014 SES DENIED** | — |
| **Billing / Stripe** | ✅ webhooks | ✅ UNIT | 🟡 | ✅ | **Stripe Live ops** | — |
| **IA privada / Router** | ✅ | ✅ cert freeze | 🟡 no prod | flags OFF | — | freeze ADR-015 |
| **RAG / Brain** | ✅ UnifiedRagStore | ✅ ingest 1559 chunks | ❌ cutover remoto | local verified | Docker down = skip | KI-005 facade |
| **MCP** | ✅ SSOT | ✅ cert + soak freeze | 🟡 | flag OFF prod | — | freeze ADR-016 |
| **Shared Memory** | ✅ 514–515 | ❌ sin DATABASE_URL | ✅ verified:true | flags OFF | — | ADR-032 RLS |
| **Seguridad** | ✅ CSRF/auth | ✅ security tests 12/12 | 🟡 KI-020 smoke | — | — | service_role bypass RLS |
| **Observabilidad** | ✅ health/ops | ✅ verify-all parcial | 🟡 Kuma parcial | — | — | — |
| **Crons** (16 rutas) | ✅ CRON_SECRET | ✅ código auditado | 🟡 GH Actions | — | secrets prod | — |
| **Backups / DR** | ✅ workflow | ✅ restore drill 8/8 hist. | 🟡 CEO 1er run | — | CEO manual | — |
| **Deploy** | ✅ railway.json | ✅ build hist. PASS | ✅ mig **516** | prod ~511+ | Cloudflare | no deploy esta pasada |
| **Documentación** | ✅ viva | ✅ sync esta pasada | — | — | — | drift corregido |

Leyenda: ✅ evidencia · 🟡 parcial · ❌ no verificado · — no aplica

### Hallazgos adicionales

| Categoría | Detalle |
|-----------|---------|
| Tests faltantes | E2E live multi-tenant CRM/workflows; MFA login gate; registro/recover live |
| E2E | 40 specs Playwright; mayoría **UI_CONTRACT** (mock API); staging-platform-flow existe |
| Auth/RLS | 517 rutas API; 206 sin import directo auth (muchos BFF/public intencional); KI-026 RLS staging ✅ |
| Integraciones simuladas | `mock_briefing` ads (demo explícito); reputación reviews/alerts stub degradado |
| Errores silenciados | P0/P1 BFF corregidos 2026-07-20; residual degraded honesto |
| P0/P1 abiertos | **KI-014 SES** · Stripe Live · KI-020 smoke · prod mig <516 |
| Duplicidades | Hubs GHL legacy redirect OBSOLETE (`OS_SAAS_FUNCTIONAL_INVENTORY`) |
| Rendimiento/obs | Índices 510; Redis opcional in-memory fallback |
| Docs contradictorias | DATABASE/PROJECT_STATUS/ROADMAP/INFRA envejecidos → corregidos 2026-07-21 |

### Comparativa GHL / HubSpot

Ver `docs/PARITY_GHL_HUBSPOT.md`. Resumen honesto: **~48 features core en código** con rutas SaaS reales; NELVYON añade packs OS, brief-to-launch, workforce IA certificada. **Gaps vs referentes:** SES/Twilio/Stripe/OAuth live, apps móviles nativas, marketplace maduro, white-label subcuentas (Stripe Connect ops). **No superioridad demostrada** en ops ni ecosistema.

### Veredicto auditoría

**CONDITIONAL_READY** — tip `1d5d620a` ADR-044 · deploy `03a16532` SUCCESS · MESH_JOIN_FAIL · Pack E2E WARN critical=0 · Ollama privado PASS · prod IA ABSENT · **no READY** · **claimReady false**.

### 10. Bloques 3–13 (2026-07-21) + redeploy 2026-07-22

Ver tabla completa en `docs/CTO_FINAL_VERIFY.md` y HANDOVER. Costes nuevos: **0**. Deploy prod: **YES** `d4650e99` SUCCESS tip `3f860c06` · IA not activated · proposal `PROPOSAL_QUALITY_ROUTING_LOCAL.md` only.

### 11. Cierre total internal-safe — 2026-07-22 (tarde)

| Ítem | Resultado |
|------|-----------|
| STAGING_QA_PASSWORD sync | **DONE** (Login 401 → PASS) |
| portal-packs GH | **PASS** run `29944606938` (SUCCESS; prior `29943785978` was FAIL overall) |
| Pack E2E vs IA OFF | **SKIP_IA_OFF** (exit 78) — no mock PASS |
| OllamaRuntimePrep metrics/rollback | **DONE** + tests |
| ADR-036 + weak 3B needs_review | **DONE** vitest |
| Beta packs | Permanecen **beta** |
| OAuth health checklist | `docs/ops/INTEGRATIONS_OAUTH_HEALTH_CHECKLIST.md` |
| CEO IA approval request | `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md` |
| Strategic gaps matrix | `docs/CTO_STRATEGIC_GAPS_MATRIX.md` |
| Campañas source_trace + legal audit | `companyDbCampaignLegalGate` · BLOQUEADO_LEGAL |
| Backup | **DONE** `29932453133` · TODO stale cerrado |
| Restore drill | **SKIP** Docker DOWN |
| Redeploy web | **NO** (docs+smokes; live SHA intacto) |

---

## Comandos de evidencia

```powershell
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web lint
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm backend/db --reporter=dot
node scripts/nelvyon-verify-all.mjs
```

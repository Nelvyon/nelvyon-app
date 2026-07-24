# OS Universal Service Catalog — NELVYON

> **SSOT packs** · **2026-07-24** · tip **TBA** · ver **`docs/OS_CATALOG_V1.md` v1.2.0** · `claimReady: false`

---

## Resumen ejecutivo

| Estado | Count | Ejemplos |
|--------|------:|----------|
| IMPLEMENTED_VERIFIED | 15 | 3 growth · strategy/funnel/retention · 5 social/content/cro/analytics/brand · landing/SEO/chatbot/email |
| BETA | 2 | `automations-ops-pack` · `reputation-ops-pack` (wired · E2E pending) |
| PREPARED_OFF | 4 | social oficial NELVYON · SM/MCP synthetic flags · funnels SaaS UI · prod IA |
| BLOCKED_EXTERNAL | 2 | ads OAuth/spend · legal campañas/Pepito |
| NOT_IMPLEMENTED | 0 | — |

---

## Packs OS (runtime)

| PackId | Catalog | E2E evidencia | estado |
|--------|---------|---------------|--------|
| local / ecommerce / saas-b2b | available | logs 2026-07-24 | **IMPLEMENTED_VERIFIED** |
| strategy / funnel / retention | available | `new-os-packs-e2e-2026-07-24T02-55-24` | **IMPLEMENTED_VERIFIED** |
| social-calendar | available | ADR-052 `social.adr052_e2e_2026-07-24T14-51-08` ALL_PASS (7 deliverables) · tip `4d331b55` | **IMPLEMENTED_VERIFIED** |
| content-strategy | available | idem | **IMPLEMENTED_VERIFIED** |
| cro-audit | available | idem | **IMPLEMENTED_VERIFIED** |
| analytics-setup | available | idem · stack GA4/GSC (ADR-048) | **IMPLEMENTED_VERIFIED** |
| brand-voice | available | idem | **IMPLEMENTED_VERIFIED** |
| automations-ops-pack | **beta** | kickoff+runners wired · E2E **pending** | **PREPARED_OFF** |
| reputation-ops-pack | **beta** | kickoff+runners wired · E2E **pending** | **PREPARED_OFF** |

## Servicios agencia (no-pack)

| Servicio | Estado | Notas |
|----------|--------|-------|
| nelvyon_official_social | **PREPARED_OFF** | `NelvyonOfficialSocialOps` · checklist CEO · sin publish |
| sm_mcp_synthetic_staging | **PREPARED_OFF** | harness · flags not set · productivo 0 |

## Tools

Matomo / Umami: **REJECT/DEFER** (ADR-048) · 0 installs · analítica NELVYON = GA4 + GSC.

## claimReady

**false** — legal dossier Pepito + licencia escrita. **No READY.**

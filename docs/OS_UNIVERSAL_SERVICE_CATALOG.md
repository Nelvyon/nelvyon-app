# OS Universal Service Catalog — NELVYON

> **SSOT** · **2026-07-24** · tip `eb462545` · 5 former-betas E2E **ALL_PASS** · ADR-048 REJECT Matomo/Umami · `claimReady: false`  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `BETA` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `NOT_IMPLEMENTED`

---

## Resumen ejecutivo

| Estado | Count | Ejemplos |
|--------|------:|----------|
| IMPLEMENTED_VERIFIED | 15 | 3 growth · strategy/funnel/retention · 5 social/content/cro/analytics/brand · landing/SEO/chatbot/email |
| BETA | 0 | — |
| PREPARED_OFF | 4 | automations SaaS · reputation SaaS · funnels SaaS UI · prod IA |
| BLOCKED_EXTERNAL | 2 | ads OAuth/spend · legal campañas |
| NOT_IMPLEMENTED | 0 | — |

---

## Packs OS (runtime)

| PackId | Catalog | E2E evidencia | estado |
|--------|---------|---------------|--------|
| local / ecommerce / saas-b2b | available | logs 2026-07-24 | **IMPLEMENTED_VERIFIED** |
| strategy / funnel / retention | available | `new-os-packs-e2e-2026-07-24T02-55-24` | **IMPLEMENTED_VERIFIED** |
| social-calendar | available | `beta-packs-e2e-2026-07-24T13-42-38` + ADR-052 integral (re-E2E social post-deploy) | **IMPLEMENTED_VERIFIED** |
| content-strategy | available | idem | **IMPLEMENTED_VERIFIED** |
| cro-audit | available | idem | **IMPLEMENTED_VERIFIED** |
| analytics-setup | available | idem · stack GA4/GSC (ADR-048) | **IMPLEMENTED_VERIFIED** |
| brand-voice | available | idem | **IMPLEMENTED_VERIFIED** |

## Tools

Matomo / Umami: **REJECT/DEFER** (ADR-048) · 0 installs · analítica NELVYON = GA4 + GSC.

## claimReady

**false** — legal campañas. **No READY.**

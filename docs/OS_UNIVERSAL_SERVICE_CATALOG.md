# OS Universal Service Catalog — NELVYON

> **SSOT** del estado real de servicios OS de marketing / ventas / automatización.  
> Actualizado: **2026-07-24** · tip `be61f02d` (+ promote docs) · Staging Pack E2E ecommerce+saas-b2b+strategy+funnel+retention **ALL_PASS** · `claimReady: false`  
> Vocabulario: `IMPLEMENTED_VERIFIED` | `BETA` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `NOT_IMPLEMENTED`  
> **Prohibido** AVAILABLE / elite solo por UI. **Prohibido** READY sin legal.

Relacionado: `OsCapabilityRegistry.ts` · packRegistry · ADR-047 · ADR-049

---

## Resumen ejecutivo

| Estado | Count | Ejemplos |
|--------|------:|----------|
| IMPLEMENTED_VERIFIED | 10 | local · ecommerce · saas-b2b · strategy · funnel · retention · landing · SEO · chatbot · email welcome |
| BETA | 5 | social · content · cro · analytics · brand |
| PREPARED_OFF | 4 | automations SaaS · reputation SaaS · funnels SaaS UI · prod IA |
| BLOCKED_EXTERNAL | 2 | ads OAuth/spend · legal campañas |
| NOT_IMPLEMENTED | 0 | — |

---

## Packs OS (runtime)

| PackId | Catalog | E2E evidencia | estado |
|--------|---------|---------------|--------|
| `local-business-growth` | available | mesh ALL_PASS | **IMPLEMENTED_VERIFIED** |
| `ecommerce-growth` | available | `ecommerce-pack-e2e-20260724-015452` | **IMPLEMENTED_VERIFIED** |
| `saas-b2b-growth` | available | `saas-b2b-pack-e2e-20260724-022752` | **IMPLEMENTED_VERIFIED** |
| `strategy-pack` | available | `new-os-packs-e2e-2026-07-24T02-55-24` | **IMPLEMENTED_VERIFIED** |
| `funnel-growth-pack` | available | idem | **IMPLEMENTED_VERIFIED** |
| `retention-pack` | available | idem | **IMPLEMENTED_VERIFIED** |
| 5 betas originales | beta | — | **BETA** (no promote) |

Flags new packs: `NELVYON_STRATEGY_PACK` / `NELVYON_FUNNEL_PACK` / `NELVYON_RETENTION_PACK` — default OFF fuera staging; prod OFF.

## claimReady

**false** — legal campañas. No READY.

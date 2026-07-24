# Beta packs — stay beta (honesty)

> Los 5 packs beta **no** se promocionan a `available` sin evidencia completa.  
> Re-audit catálogo: `apps/web/src/lib/saas/servicePacksCatalog.ts` · **2026-07-22**

## Packs

| Pack | Catalog `availability` | Kickoff path | Motivo / blockers exactos |
|------|------------------------|--------------|---------------------------|
| social-calendar | **beta** | `/os/packs/social-calendar` | deliverables genéricos · sin cert PASS artifact · no P0 E2E verde con IA |
| content-strategy | **beta** | `/os/packs/content-strategy` | idem |
| cro-audit | **beta** | `/os/packs/cro-audit` | idem |
| analytics-setup | **beta** | `/os/packs/analytics-setup` | idem |
| brand-voice | **beta** | `/os/packs/brand-voice` | idem |
| strategy | **beta** | `/os/packs/strategy` | mapper dedicado · E2E mesh pendiente post-deploy |
| funnel-growth | **beta** | `/os/packs/funnel-growth` | idem |
| retention | **beta** | `/os/packs/retention` | idem |

## Growth `available` (kickoff real · E2E ALL_PASS 2026-07-24)

| Pack | availability | Kickoff API | Evidencia |
|------|--------------|-------------|-----------|
| local-business-growth | available | `/api/os/packs/local-business-growth/kickoff` | Pack E2E mesh |
| ecommerce-growth | available | `/api/os/packs/ecommerce-growth/kickoff` | `ecommerce-pack-e2e-20260724-015452` |
| saas-b2b-growth | available | `/api/os/packs/saas-b2b-growth/kickoff` | `saas-b2b-pack-e2e-20260724-022752` |

Alias focus packs (seo-local, meta-ads, email-welcome, landing-funnel) reutilizan growth kickoffs — **available** con binding real.

## Criterio promote (todos obligatorios)

1. Mapper de producción dedicado (no solo `buildGenericProductionDeliverable`)  
2. Cert `passed` + QA ≥85 real  
3. Playbook pack-specific  
4. Tests unitarios + E2E/smoke en orquestador P0 o equivalente  
5. Portal `/portal`  
6. Tenant isolation  
7. Observabilidad / rollback  

Hasta entonces: catalog `availability: "beta"` (test honesty lock). **Ningún promote de betas en este cierre** (audit 2026-07-24).

## Núcleo reusable

Usar `SERVICE_*` + growth packs. No mintar agentes sectoriales decorativos.

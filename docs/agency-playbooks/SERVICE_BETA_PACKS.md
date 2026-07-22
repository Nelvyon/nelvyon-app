# Beta packs — stay beta (honesty)

> Los 5 packs beta **no** se promocionan a `available` sin evidencia completa.

## Packs

| Pack | Estado | Motivo |
|------|--------|--------|
| social-calendar | **beta** | deliverables genéricos · sin cert PASS artifact · no P0 E2E |
| content-strategy | **beta** | idem |
| cro-audit | **beta** | idem |
| analytics-setup | **beta** | idem |
| brand-voice | **beta** | idem |

## Criterio promote (todos obligatorios)

1. Mapper de producción dedicado (no solo `buildGenericProductionDeliverable`)  
2. Cert `passed` + QA ≥85 real  
3. Playbook pack-specific  
4. Tests unitarios + E2E/smoke en orquestador P0 o equivalente  
5. Portal `/portal`  
6. Tenant isolation  
7. Observabilidad / rollback  

Hasta entonces: catalog `availability: "beta"` (test honesty lock).

## Núcleo reusable

Usar `SERVICE_*` + growth packs. No mintar agentes sectoriales.

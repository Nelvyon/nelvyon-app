# SERVICE_STRATEGY — Plan estratégico 90d (OS)

> Estado: **BETA** · Contrato: `docs/OS_NEW_SERVICES_CONTRACTS.md` · ADR-049  
> Kickoff: `/api/os/packs/strategy-pack/kickoff` · flag `NELVYON_STRATEGY_PACK` (OFF fuera staging)  
> Promote a IMPLEMENTED_VERIFIED solo tras E2E mesh ALL_PASS.

## Objetivo

Entregar un plan estratégico accionable (90 días) que priorice packs Nelvyon (local / ecommerce / saas-b2b) sin agentes decorativos.

## Entrada (contrato)

```json
{
  "business_name": "string",
  "sector": "string",
  "city": "string",
  "value_proposition": "string",
  "primary_cta": "string",
  "goals": ["leads", "revenue", "brand"],
  "horizon_days": 90
}
```

## Agentes

| Rol | Fuente | Notas |
|-----|--------|-------|
| PM Strategy | Ollama (quality routing) | JSON plan only |
| QA offline | scoreOffline-style | ≥85 |

## Entregables

1. Plan 90d (JSON) — OKRs, hitos, packs sugeridos, riesgos  
2. Informe ejecutivo (portal)

## QA ≥85

- Estructura completa · goals ligados a métricas · sin guarantees ilegales · sector coherente

## Flujo

brief → análisis → agente PM → QA≥85 → portal → métricas `strategy_plans_published`

## Promote blockers

Mapper dedicado · pack registry · E2E mesh · tenant iso · rollback flag.

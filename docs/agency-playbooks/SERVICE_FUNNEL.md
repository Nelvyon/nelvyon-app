# SERVICE_FUNNEL — Funnel multi-step OS

> Estado: **BETA** · Kickoff `funnel-growth-pack` · flag `NELVYON_FUNNEL_PACK`  
> Contrato: `docs/OS_NEW_SERVICES_CONTRACTS.md` · ADR-049 · CRO pack original permanece **BETA**

## Objetivo

Mapa de funnel (≥3 steps) con copy, tracking y QA≥85, reutilizando landing verificada — **no** promover `cro-audit-pack` sin mapper dedicado.

## Entrada

```json
{
  "business_name": "string",
  "sector": "string",
  "funnel_steps": ["awareness", "consideration", "conversion"],
  "primary_cta": "string",
  "offer": "string"
}
```

## Agentes / reuso

- `NELVYON-LANDING` + copywriter CRO  
- SaaS `/saas/funnels` como superficie ops (PREPARED_OFF)

## Entregables

Funnel map · copy por step · eventos · informe CRO

## Promote blockers

Igual que `SERVICE_BETA_PACKS.md` + E2E mesh ALL_PASS.

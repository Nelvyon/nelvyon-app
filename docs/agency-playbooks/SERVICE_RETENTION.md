# SERVICE_RETENTION — Retención / loyalty OS

> Estado: **BETA** · Kickoff `retention-pack` · flag `NELVYON_RETENTION_PACK`  
> Contrato: `docs/OS_NEW_SERVICES_CONTRACTS.md` · ADR-049 · SaaS loyalty UI ≠ certificación pack

## Objetivo

Secuencias de retención post-compra/trial con CRM + email existentes (sin mint de agentes).

## Entrada

```json
{
  "business_name": "string",
  "sector": "string",
  "cohort": "string",
  "channels": ["email", "crm"],
  "loyalty_goal": "string"
}
```

## Agentes / reuso

`email_marketing` · `crm` · `workflows` (universos existentes)

## Entregables

Secuencia retención · reglas churn · informe cohort

## Promote blockers

Pack + mapper + E2E + portal + tenant iso + QA≥85.

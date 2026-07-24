# TEAMS GLOBAL — Dirección / Ops / Éxito de cliente

> ADR-051 · Roles en `backend/agency/OsProfessionalTeams.ts` · no decorativos  
> OpenClaw / spend / campañas: **OFF** salvo autorización CEO + evidencia

## Flujo obligatorio

`specialist_team → QA élite → auditor competitivo → auditor independiente → portal → métricas → mejora`

## Equipos

| TeamId | Rol |
|--------|-----|
| `global_direction` | CEO ops · AM · planificación |
| `global_ops_success` | Portal · versiones · incidencias |

## Prohibiciones

- Auto-aprobación de entregables críticos  
- Envío de campañas / gasto / payouts sin CEO  
- Activar OpenClaw sin Shared Memory + flag + ADR  

## Rollback

`NELVYON_OPENCLAW_BRIDGE_ENABLED=0` · `NELVYON_ORCHESTRATOR_ENABLED=0` · `NELVYON_PACK_INDEPENDENT_AUDITOR=0`

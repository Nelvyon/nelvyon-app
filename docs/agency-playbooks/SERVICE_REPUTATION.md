# SERVICE — Reputación

> Capability: `reputation` · Pack: `reputation-ops-pack` · Team: `svc_retention_reputation`  
> Flag: `NELVYON_REPUTATION_OPS_PACK` (OFF fuera staging) · Catálogo OS v1.2

## Primary
Review monitoring · response templates · recovery plan · trust signals

## Kickoff
`POST /api/os/packs/reputation-ops-pack/kickoff` · sectores `local` | `ecommerce` | `saas_b2b`

## Entregables (portal)
- Asistente de reputación
- Playbook de monitorización de reseñas
- Plantillas de respuesta
- Plan de recuperación de reputación
- Kit de señales de confianza
- Informe ejecutivo

## QA / evidencia
QA ≥ 85 · auditor independiente · `sensitive_auto_reply=false` · `mass_dm_forbidden=true`  
Smoke: `node scripts/staging-smoke-automations-reputation-e2e.mjs --only=reputation`

## Forbidden
Mass DM · auto-reply sensible sin humano · paid social · Pepito DB · campañas

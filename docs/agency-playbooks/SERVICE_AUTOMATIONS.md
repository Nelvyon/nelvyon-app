# SERVICE — Automatizaciones

> Capability: `automations` · Pack: `automations-ops-pack` · Team: `svc_automations_crm`  
> Flag: `NELVYON_AUTOMATIONS_OPS_PACK` (OFF fuera staging) · Catálogo OS v1.2

## Primary
`workflows`, `operations`, CRM automation drafts

## Kickoff
`POST /api/os/packs/automations-ops-pack/kickoff` · sectores `local` | `ecommerce` | `saas_b2b`

## Entregables (portal)
- Asistente de automatizaciones
- Mapa de workflows
- Playbook de triggers
- Borrador de automatización CRM
- Checklist QA de operaciones
- Informe ejecutivo

## QA / evidencia
QA ≥ 85 · auditor independiente · sin campañas masivas · sin paid_spend  
Smoke: `node scripts/staging-smoke-automations-reputation-e2e.mjs --only=automations`

## Forbidden
Campañas/envíos masivos · OpenAI · payouts · Pepito DB

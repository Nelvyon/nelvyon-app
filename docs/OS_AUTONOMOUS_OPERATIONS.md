# OS Autonomous Operations Runbook — NELVYON

> Operar la agencia OS **sin Cursor**. CEO aprueba sensible. IA prod **OFF** por defecto.

## Triggers

| Trigger | Acción | Servicio |
|---------|--------|----------|
| Kickoff pack growth | `/api/os/packs/[packId]/kickoff` | seo / web / ecommerce |
| Cron workflows | `/api/cron/saas-workflows` + `CRON_SECRET` | automations |
| Private AI agent run | `/api/saas/private-ai/*` flags OFF default | private_ai |
| Affiliate conversion | track-conversion API | partners (calc only) |

## Límites

- QA packs **≥ 85** — no bajar umbral
- OpenAI **OFF** salvo `AUTONOMOUS_ALLOW_OPENAI=1`
- `PRIVATE_MODE` ON bloquea egress
- Sector flotilla = **legacy satellite** — no mintar agentes nuevos
- Pagos partner: `NELVYON_CEO_PARTNER_PAYOUTS=1` obligatorio

## QA / evidencia

- Pack gate: `node scripts/run-os-pack-gate.mjs`
- Capability integrity: `assertOsCapabilityRegistryIntegrity()`
- Portal cliente: siempre `/portal`
- Audit Private AI + pack run records en DB

## Fallbacks honestos

| Fallo | Comportamiento |
|-------|----------------|
| Ollama down + OpenAI OFF | `OsAgentError` / `LLM_NOT_CONFIGURED` — **no** mock éxito |
| Generative sin API key | `metadata.mock: true` |
| SES no configurado | banner / `ses_configured: false` |
| BFF auth fail | 401/403 — no empty 200 |

## Rollback

- Flags IA → unset / `0`
- `NELVYON_ORCHESTRATOR_ENABLED=0`
- `NELVYON_CEO_PARTNER_PAYOUTS` unset
- Redeploy SHA anterior Railway

## Escalado por sector

Usar `OsCapabilityRegistry` + playbooks `docs/agency-playbooks/SERVICE_*.md`.  
No expandir `backend/os-agents/sectors/**` por cantidad.

## Aprobación CEO

- Activar IA / MCP / Shared Memory / OpenClaw en prod
- `AUTONOMOUS_ALLOW_OPENAI=1`
- `NELVYON_CEO_PARTNER_PAYOUTS=1`
- Spend ads real
- Mass email prod

Ver: `docs/OS_AGENT_TEAM_AUDIT.md` · `docs/HANDOVER.md`

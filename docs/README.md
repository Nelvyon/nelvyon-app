# NELVYON — Documentación

## Empezar aquí

| Prioridad | Archivo | Para qué |
|-----------|---------|----------|
| **0** | [**NELVYON_MASTER_CONTEXT.md**](./NELVYON_MASTER_CONTEXT.md) | **Biblia oficial** — onboarding completo de cualquier IA |
| **1** | [**HANDOVER.md**](./HANDOVER.md) | Continuar el proyecto en 2 minutos (SSOT operativo) |
| **2** | [**DEVELOPER_ONBOARDING.md**](./DEVELOPER_ONBOARDING.md) | Incorporación humana (día 0–1) |
| **3** | [**ops/OPERATIONS_INDEX.md**](./ops/OPERATIONS_INDEX.md) | Índice ops mundial (runbooks + launch) |
| **4** | [**AI_CONTEXT.md**](./AI_CONTEXT.md) | Contexto técnico amplio (ceder ante HANDOVER/DB/DECISIONS si hay contradicción) |
| **5** | Resto de esta carpeta | Detalle por área |

## Sistema de documentación viva

Archivos oficiales (mantener actualizados automáticamente):

| Archivo | Contenido |
|---------|-----------|
| [HANDOVER.md](./HANDOVER.md) | Estado actual, próximo paso, contexto ChatGPT |
| [AI_CONTEXT.md](./AI_CONTEXT.md) | Arquitectura, stack, vars, comandos |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | % completitud por área |
| [ROADMAP.md](./ROADMAP.md) | Fase 1 infra · Fase 2 IA |
| [TODO.md](./TODO.md) | P0–P4 prioridades |
| [CHANGELOG.md](./CHANGELOG.md) | Historial cambios |
| [DECISIONS.md](./DECISIONS.md) | ADRs |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Docker, Railway, cloud |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Stripe, Google, Meta, etc. |
| [DATABASE.md](./DATABASE.md) | Migraciones, tablas, RLS |
| [ENVIRONMENTS.md](./ENVIRONMENTS.md) | Prod, staging, local |
| [DEPLOYMENTS.md](./DEPLOYMENTS.md) | Historial deploys |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Errores activos y resueltos |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diagramas y flujos |
| [CEO_FINAL_ACTIONS.md](./CEO_FINAL_ACTIONS.md) | Checklist manual CEO (cierre Fase 1) |
| [OPS.md](./OPS.md) | Health · logs · crons · observabilidad |
| [LAUNCH_CHECKLIST_DEFINITIVE.md](./LAUNCH_CHECKLIST_DEFINITIVE.md) | Checklist lanzamiento staging/prod |
| [ops/WORLD_CLASS_OPS_RUNBOOK.md](./ops/WORLD_CLASS_OPS_RUNBOOK.md) | Deploy · rollback · fallos por tipo |
| [ops/SECURITY_OPERATIONS.md](./ops/SECURITY_OPERATIONS.md) | Secretos · RBAC · RLS · rate limits |
| [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) | Onboarding desarrollador |

**Sync metadata:** `node scripts/sync-handover-metadata.mjs`

**Regla Cursor:** `.cursor/rules/live-documentation.mdc`

---

## Documentación histórica / módulos

Índice legacy (no borrar):

- [LAUNCH_READY.md](./LAUNCH_READY.md) — checklist producción código
- [PRIVATE_AI_ARCHITECTURE.md](./PRIVATE_AI_ARCHITECTURE.md) — IA Fase 2
- [BETA_LAUNCH_RUNBOOK.md](./BETA_LAUNCH_RUNBOOK.md) — ops staging
- [NELVYON_BACKEND_V1_CIERRE_FINAL.md](./NELVYON_BACKEND_V1_CIERRE_FINAL.md)

Ver subcarpetas: `autonomous/`, `operations/`, `services/`, `commercial/`, etc.

---

## También en raíz

- [CLAUDE.md](../CLAUDE.md) — reglas agente + stack resumido
- [README-dev-Windows.md](../README-dev-Windows.md) — dev local Windows

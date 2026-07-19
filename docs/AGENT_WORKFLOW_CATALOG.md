# AGENT WORKFLOW CATALOG

> SSOT: `backend/agents/workforce/workflowCatalog.ts`  
> Panel: `GET /api/saas/ai-agents?resource=workflows`  
> **~45** workflows con `certified: true` (sandbox-executable por listas de `agentId`)

No crea un segundo orquestador. Patrones sobre agentes Unified Registry existentes.

---

## Dominios

| Domain | Ejemplos (ids) | Agentes típicos |
|--------|----------------|-----------------|
| `engineering` | `eng.feature_change`, `eng.bug_fix`, `eng.code_review`, `eng.migration_review`, `eng.security_analysis`, `eng.dependency_update`, deploy/runbook/incident… | `cto`, `development`, `qa`, `devops`, `security_compliance` |
| `growth` | `growth.product_strategy`, campaign/content/social/ads planning | `marketing`, `product`, `content`, `seo`, `social_media`, ads agents |
| `revenue` | pipeline, proposal, CRM follow-up | `sales`, `crm`, `finance`, `marketing` |
| `customer` | support triage, portal guide, escalation | `support`, `portal_client`, `operations` |
| `finance` | usage/billing advice, cost review | `finance`, `reporting`, `ceo_supervisor` |
| `ops` | process / workflow design | `operations`, `workflows`, `devops` |
| `executive` | weekly summary, quarterly plan | `ceo_supervisor`, L1 seats |

Conteo exacto: `workflowCatalogStatus().byDomain`.

---

## Patrones (`WorkflowPattern`)

| Pattern | Uso |
|---------|-----|
| `planner_executor_reviewer` | Feature, migration, quarterly plan |
| `proposer_critic_judge` | Code review |
| `execute_validate_rollback` | Dependency update, deploy-style |
| `detect_diagnose_remediate_verify` | Bug, security, incident |
| `supervisor_fanout` | Multi-agent growth/ops con supervisor |

Cada def incluye: `defaultMode` (`observe`\|`draft`\|`assisted`), `requiresHumanApproval`, `sloMs`, `inputSchema` / `outputSchema`.

---

## Relación con enterprise workflows legacy

`backend/agents/workflows/enterpriseWorkflows.ts` (~10) sigue existiendo para Phase 2 Elite E2E.  
El catálogo workforce es el **ampliado** (Bloques D–F) para certificación de fuerza de trabajo.

Ejecución sandbox: `runEnterpriseWorkflow` / `sandboxJobExecutor` — draft/advise; no spend/deploy real por defecto.

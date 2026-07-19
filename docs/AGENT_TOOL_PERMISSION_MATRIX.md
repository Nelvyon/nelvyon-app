# AGENT TOOL PERMISSION MATRIX

> Deny-by-default · bridge MCP parcial · approval gates para spend/deploy

---

## AgentToolId (SSOT)

`backend/private-ai/types.ts` — IDs dotted:

`memory.read/write` · `crm.read/write` · `inbox.suggest/send` · `campaigns.draft/send` · `workflows.read/execute` · `packs.kickoff` · `reports.read` · `billing.read/write` · `integrations.read/write` · `audit.read` · `rag.search`

Permiso por agente: `NelvyonPrivateAgentDef.allowedTools` en `nelvyonAgentRegistry.ts`.  
Check: `AgentPermissionService.checkTool` — si no está allowed (ni override tenant extra) → **denied**.

---

## AgentToolId → MCP map (~13)

**Path:** `backend/private-ai/tools/toolIdMap.ts`

| AgentToolId | MCP productive |
|-------------|----------------|
| `memory.read` | `memory_read` |
| `memory.write` | `memory_write` |
| `rag.search` | `rag_search` |
| `crm.read` | `crm_list` |
| `crm.write` | `crm_upsert_contact` |
| `audit.read` | `logs_tail` |
| `reports.read` | `reporting_summary` |
| `campaigns.draft` | `email_draft` |
| `campaigns.send` | `send_mass_campaign` |
| `integrations.read` | `docs_read` |
| `billing.read` | `reporting_summary` |
| `inbox.suggest` | `email_draft` |
| `workflows.read` | `docs_read` |

Helpers: `agentToolToMcp` · `mcpToolToAgent` · `listMappedAgentTools`.  
**No hay tools de pago** en este bridge. Tools sin fila = declarados en registry pero **no bridgeados** a MCP.

---

## Deny-by-default

1. Tool no listado en `allowedTools` → deny  
2. Tenant override `deniedTools` / agent `enabled=false` → deny  
3. Modo `observe` / `emergency_stop` → sin tools de escritura / mutación (`operationModes.ts`)  
4. `AUTONOMOUS_HARD_DENY`: `delete_data`, `deploy_production`, `send_mass_campaign`, `modify_billing`, `charge_payment`, `rotate_credentials`, `cross_tenant_access`, `arbitrary_shell`

---

## Approval gates (spend / deploy / sensibles)

`SensitiveActionType` + `approvalRequiredActions` / `forbiddenActions` por agente.

| Acción | Política típica |
|--------|-----------------|
| `send_mass_campaign` | Approval (email/marketing); hard-deny en autonomous hard list |
| `touch_production` / deploy | Forbidden o approval; daemon no despliega prod |
| `modify_billing` / charge | Approval / forbidden |
| `delete_data` | Forbidden / hard-deny |
| `cross_tenant_access` | Blocked |
| Ads publish / real spend | No tool de spend; evals draft-only |

`AgentPermissionService.checkAction` → `needsApproval` vía `requiresApproval()`.

Workflows con `requiresHumanApproval: true` en catalog refuerzan el gate a nivel patrón.

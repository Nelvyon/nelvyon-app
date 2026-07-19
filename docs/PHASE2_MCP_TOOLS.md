# PHASE2 — MCP Tools

## Catálogo productivo (inicial)

| Tool | Riesgo | RO | Notas |
|---|---|---|---|
| health_check | low | ✅ | |
| metrics_snapshot | low | ✅ | RSS/heap |
| logs_tail | low | ✅ | Sin secretos |
| docs_read | low | ✅ | Solo `docs/` |
| postgres_query | medium | ✅ | SELECT only; writes denied |
| rag_search | low | ✅ | |
| memory_read / memory_write | low/medium | | write requiere scope |
| filesystem_list / read | low | ✅ | Roots allowlist |
| git_status | low | ✅ | Read-only |
| github_repo_info | low | ✅ | Offline stub |
| scraping_authorized | medium | ✅ | Host allowlist |
| playwright_sandbox | medium | ✅ | Sin side-effects prod |
| email_draft | medium | | **No envía** |
| crm_list / crm_upsert_contact | low/medium | | |
| crm_bulk_import | high | | **approval_required** |
| reporting_summary | low | ✅ | |
| send_mass_campaign | critical | | **denied** |
| delete_data | critical | | **denied** |
| deploy_production | critical | | **denied** |

## Invocación

```json
POST /api/saas/mcp
{
  "toolName": "health_check",
  "args": {},
  "idempotencyKey": "optional-key"
}
```

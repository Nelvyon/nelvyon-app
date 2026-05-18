# NELVYON — Checklist heurístico de routers mutantes

**Fuente:** `backend/scripts/generate_mutating_router_checklist.py` (regenerable).  
**Filas `OK_VERIFIED_HTTP`:** actualizadas a mano tras tests HTTP (2026-04-24); si regeneras el script, reintegra esas filas desde `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.

## Cómo leer esto

| Estado | Significado |
|--------|-------------|
| SKIP | Sin decoradores `@router.post|put|patch|delete` en el archivo. |
| OK_EDGE | Archivo contiene `require_workspace` y `require_workspace_operator` (heurística; puede haber rutas sueltas). |
| OK_EDGE+PLAN_SIGNAL | Además importa/uso de `plan_quota` o `quota_guards` en el archivo. |
| GAP_WS | Hay mutaciones pero no aparece `require_workspace` en el archivo. |
| GAP_OP | Hay mutaciones y `require_workspace` pero no `require_workspace_operator`. |
| REVIEW | Caso raro; revisar manualmente. |
| **OK_VERIFIED_HTTP** | WS-read + OP-write comprobados con tests HTTP (`test_gap_priority_routers_ws_op_verified` o doc enlazada). |

> **No es 100/100 global:** dominios sin cuota en producto pueden ser OK sin `plan_quota`; dominios con cuotas deben revisarse manualmente (matriz `NELVYON_WRITE_PATH_MATRIX.md`).

## Tabla (todos los `routers/*.py`)

| Archivo | Mutaciones (conteo) | require_workspace | require_workspace_operator | plan_quota / quota_guards | Estado |
|---------|--------------------:|-------------------|----------------------------|---------------------------|--------|
| `__init__.py` | 0 | no | no | no | **SKIP** |
| `activities.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `agent_actions.py` | 1 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `aihub.py` | 2 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`; `require_workspace_operator` en `gentxt`/`genimg`) |
| `appointments.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `audit_log.py` | 1 | no | no | no | **GAP_WS** |
| `auth.py` | 1 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave2_ws_op_verified` — `GET /me` Bearer; `POST /token/exchange` sin WS por diseño bootstrap) |
| `automation.py` | 3 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`; pipeline OS + webhook acotado) |
| `automation_jobs.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_priority_routers_ws_op_verified`) |
| `automation_webhooks.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`; `GET /all` super_admin) |
| `billing_usage.py` | 1 | yes | yes | yes | **OK_VERIFIED_HTTP** (solo `POST /alerts` → `require_workspace_operator`; `test_gap_priority_routers_ws_op_verified`) |
| `blog_posts.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave9_ws_op_verified.py`) |
| `calendar_events.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `campaign_sender.py` | 1 | yes | yes | no | **OK_EDGE** |
| `campaigns.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `connector_configs.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_priority_routers_ws_op_verified`) |
| `contacts.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `contract_logs.py` | 6 | no | no | no | **GAP_WS** |
| `contract_signing.py` | 4 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave8_ws_op_verified`; signing mutaciones con OP, audit/verify con WS) |
| `contracts.py` | 6 | yes | yes | no | **OK_EDGE** |
| `conversation_realtime.py` | 3 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `conversations.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `crm_advanced.py` | 2 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `crm_analytics.py` | 0 | yes | no | no | **SKIP** |
| `crm_http_helpers.py` | 0 | no | no | no | **SKIP** |
| `dashboard_metrics.py` | 0 | yes | no | no | **SKIP** |
| `deals.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `e2e_orchestrator.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave5_ws_op_verified`; pegamento CRM↔OS acotado a workspace) |
| `email_service.py` | 4 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave3_ws_op_verified` + `test_email_service`; `GET /health` sin auth sin cambio) |
| `form_items.py` | 6 | no | no | no | **GAP_WS** |
| `funnel_items.py` | 6 | no | no | no | **GAP_WS** |
| `funnel_publisher.py` | 1 | no | no | no | **GAP_WS** |
| `global_dashboard.py` | 0 | yes | no | no | **SKIP** |
| `health.py` | 0 | no | no | no | **SKIP** |
| `helpdesk_sla.py` | 2 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `helpdesk_tickets.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `messages.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `metrics.py` | 0 | no | no | no | **SKIP** |
| `module_analytics.py` | 0 | yes | no | no | **SKIP** |
| `nelvyon_agents.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_assets.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_bot_templates.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_campaigns.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_clients.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_outputs.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_products.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_projects.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_quality_metrics.py` | 6 | yes | yes | no | **OK_EDGE** |
| `nelvyon_user_settings.py` | 6 | yes | yes | no | **OK_EDGE** |
| `oauth_integrations.py` | 3 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave3`; `GET /authorize/...` escribe estado → OP; migración `pr04_oauth_tokens` + modelo ORM) |
| `onboarding.py` | 3 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave3`; modelo `onboarding_progress` en metadata tests) |
| `orchestrator.py` | 10 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave4_ws_op_verified`; servicio acota proyecto/cliente/output por `workspace_id`) |
| `partner_records.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`; PII por workspace) |
| `payments.py` | 2 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave2` verify OP + `test_payments` checkout admin) |
| `pipeline_deals.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `pipeline_pro.py` | 3 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `platform_metrics.py` | 6 | no | no | no | **PLATFORM** (`test_gap_wave8_ws_op_verified`; guard global `get_admin_user`, sin `X-Workspace-Id`) |
| `platform_settings.py` | 1 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave7`; plataforma — `PUT` admin, `GET` autenticado) |
| `presentation_history.py` | 6 | no | no | no | **GAP_WS** |
| `pricing_promos.py` | 6 | no | no | no | **GAP_WS** |
| `qa_engine.py` | 1 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave8_ws_op_verified`; `validate` OP, `dashboard` WS; scope por `workspace_id`) |
| `rbac_management.py` | 2 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave7`; plataforma admin + fix SQL listado SQLite) |
| `report_items.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave9_ws_op_verified.py`) |
| `revenue_records.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `saas_tools.py` | 3 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave4_ws_op_verified`) |
| `sales_records.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`) |
| `security_events.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_priority_routers_ws_op_verified`) |
| `segment_results.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave9_ws_op_verified.py`) |
| `settings.py` | 6 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave2` — borde **plataforma** `get_admin_user`, sin `X-Workspace-Id`) |
| `social_posts.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave7`; alcance WS vía cliente/proyecto + huérfanos) |
| `storage.py` | 5 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave2` — WS lecturas, OP mutaciones; OSS mockeado) |
| `stripe_webhook.py` | 1 | no | no | no | **GAP_WS** |
| `subscriptions.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave2` + `test_payments`; `GET /all` super_admin) |
| `system_health.py` | 1 | no | no | no | **GAP_WS** |
| `system_readiness.py` | 0 | no | no | no | **SKIP** |
| `tenant_management.py` | 3 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave2`) |
| `user.py` | 1 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave7`; perfil JWT propio, sin header workspace) |
| `user_roles.py` | 6 | no | no | no | **OK_VERIFIED_HTTP** (`test_gap_wave6_ws_op_verified`; **plataforma** `get_admin_user` / `get_super_admin_user` — sin modelo `workspace_id`) |
| `website_items.py` | 6 | no | no | no | **GAP_WS** |
| `website_pages.py` | 6 | no | no | no | **GAP_WS** |
| `workflow_engine.py` | 5 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `workflows.py` | 6 | yes | yes | yes | **OK_EDGE+PLAN_SIGNAL** |
| `workspace_home.py` | 0 | yes | no | no | **SKIP** |
| `workspace_management.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave2`; `POST /create` sin WS — bootstrap) |
| `workspace_members.py` | 6 | yes | yes | no | **OK_EDGE** |
| `workspaces.py` | 6 | yes | yes | no | **OK_VERIFIED_HTTP** (`test_gap_wave4_ws_op_verified`; `GET /all` super_admin) |

## Resumen automático

- Archivos con al menos una mutación: **76**
- Archivos etiquetados GAP_WS (heurística, aprox.): **~10–13** — baja tras oleada 9 (`blog_posts` + `report_items` + `segment_results` cerrados con WS/OP verificado HTTP; bordes plataforma fuera de patrón WS).
- Archivos etiquetados GAP_OP (heurística, aprox.): **~1–2** — oleada 2026-04-24 cubre `oauth_integrations` / `onboarding`; quedan pocos archivos con mutación + `require_workspace` sin string `require_workspace_operator` (revisar tabla tras regenerar).
- Archivos **OK_VERIFIED_HTTP** (tests HTTP explícitos): **33** — ver `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md` (incl. `test_gap_wave9_ws_op_verified.py`).


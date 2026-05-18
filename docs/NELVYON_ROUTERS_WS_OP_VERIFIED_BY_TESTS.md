# Routers con patrón WS-read / OP-write **verificado por tests HTTP**

Esta lista **no** la regenera el script heurístico: solo entra un router cuando existe al menos un test en `backend/tests/` que comprueba `require_workspace` / `require_workspace_operator` (u otro guard documentado) sobre rutas reales.

| Router | Test(s) | Notas |
|--------|---------|--------|
| `security_events.py` | `test_gap_priority_routers_ws_op_verified.py` | Eliminado `GET /all` sin auth; listado/get con `require_workspace`; mutaciones con `require_workspace_operator`; servicio acota por `user_id` **o** `details_json.workspace_id` (SQLite/Postgres). |
| `automation_jobs.py` | mismo módulo | Sin `GET /all`; servicio exige `user_id` + `workspace_id` en CRUD. |
| `connector_configs.py` | mismo módulo | Sin `GET /all`; servicio exige `user_id` + `workspace_id`; policy de body `workspace_id`. |
| `billing_usage.py` (solo `POST /alerts`) | `test_gap_priority_routers_ws_op_verified` (`test_billing_alerts_requires_operator`) | `require_workspace_operator` en mutación de umbrales. |
| `tenant_management.py` | `test_gap_wave2_ws_op_verified.py` | `GET /settings`, `GET /options`, lecturas multi-tenant con `require_workspace`; mutaciones (`PUT /settings`, permisos) con `require_workspace_operator`. Modelo `workspaces` incluye columnas tenant para SQLite en tests. |
| `workspace_management.py` | `test_gap_wave2_ws_op_verified.py` | `PUT /update`, `POST /members/invite` con `require_workspace_operator`; `POST /create` sigue sin header workspace (bootstrap). |
| `payments.py` | `test_gap_wave2_ws_op_verified.py` + `test_payments.py` | `POST /verify_payment` → `require_workspace_operator`; `POST /create_payment_session` sigue `require_workspace_admin` (checkout). |
| `subscriptions.py` | `test_gap_wave2_ws_op_verified.py` + `test_payments.py` | CRUD mutaciones con `require_workspace_operator`; listados con `require_workspace`. `GET /all` sigue solo `super_admin` (sin cambiar en esta oleada). |
| `storage.py` | `test_gap_wave2_ws_op_verified.py` | Lecturas con `require_workspace`; mutaciones / presign con `require_workspace_operator`; OSS mockeado en tests (sin `OSS_SERVICE_URL` real). |
| `settings.py` (`/api/v1/admin/settings`) | `test_gap_wave2_ws_op_verified.py` | **Sin** `X-Workspace-Id`: borde plataforma con `get_admin_user`; verificado GET admin vs member. |
| `auth.py` | `test_gap_wave2_ws_op_verified.py` | **Sin** WS en `POST /token/exchange` (bootstrap identidad). Verificado `GET /api/v1/auth/me` con Bearer. |
| `oauth_integrations.py` | `test_gap_wave3_ws_op_verified.py` | Lecturas `GET /providers`, `GET /status` con `require_workspace`; `GET /authorize/{p}` (persiste `state`) + `POST /callback`, `POST /disconnect`, `POST /test/...` con `require_workspace_operator`. Tabla `oauth_tokens` vía modelo + migración `pr04_oauth_tokens`. |
| `onboarding.py` | `test_gap_wave3_ws_op_verified.py` | `GET /progress` con WS; `GET /steps` con WS; mutaciones `complete-step`, `reset`, `seed-demo` con OP. Modelo `onboarding_progress` en metadata (tests). |
| `email_service.py` | `test_gap_wave3_ws_op_verified.py` + `test_email_service.py` | `GET /stats` con `require_workspace`; POST `send`, `welcome`, `ticket-notification`, `retry-failed` con OP; cola `email_queue` recibe `workspace_id`. `GET /health` sin auth (sin cambio). |
| `orchestrator.py` | `test_gap_wave4_ws_op_verified.py` | POST `generate-*` (10 rutas) con `require_workspace_operator`; `OrchestratorService` filtra `get_project` / `get_client` por `workspace_id`; `save_output` persiste `nelvyon_outputs.workspace_id`. |
| `saas_tools.py` | `test_gap_wave4_ws_op_verified.py` | `POST /generate-pdf`, `/generate-presentation`, `/segment-database` con OP (sin `plan_quota` nuevo). |
| `workspaces.py` | `test_gap_wave4_ws_op_verified.py` | `GET ""` y `GET /{id}` con `require_workspace` (fila activa = header; mismatch → 403); mutaciones con OP + `id`/batch acotados al `ctx.workspace_id`; `GET /all` solo `get_super_admin_user` (cierre de listado global sin auth). |
| `e2e_orchestrator.py` | `test_gap_wave5_ws_op_verified.py` | `GET /relationships/{id}`, `GET /full-chain/{id}` con `require_workspace`; lecturas y conteos acotados por `workspace_id` (no solo `user_id`). POST `propagate-status`, `contract-from-project`, `social-from-contract`, `social-to-ticket`, `deal-from-project`, `link-crm-client` con `require_workspace_operator`; SQL de propagación y altas con `workspace_id` / `EXISTS` vía `nelvyon_projects`. |
| `automation.py` | `test_gap_wave6_ws_op_verified.py` | `GET /jobs`, `GET /stats` con `require_workspace`; `POST /process-job`, `POST /retry/{id}` con `require_workspace_operator`; jobs/outputs con `workspace_id`; `POST /webhook/trigger/{key}` sin JWT pero valida cliente vs `webhook.workspace_id` (o mismo `user_id` si webhook legacy sin workspace). `AutomationService` carga `AIHubService` solo al ejecutar job (stats/list sin `APP_AI_*`). |
| `automation_webhooks.py` | `test_gap_wave6_ws_op_verified.py` | CRUD con `require_workspace` / `require_workspace_operator`; servicio `WorkspaceAwareMixin`; `GET /all` solo `get_super_admin_user`. |
| `aihub.py` | `test_gap_wave6_ws_op_verified.py` | `POST /gentxt`, `POST /genimg` con `require_workspace_operator` (misma barra que glue AI OS). |
| `partner_records.py`, `sales_records.py` | `test_gap_wave6_ws_op_verified.py` | CRUD workspace-scoped (`WorkspaceAwareMixin`); `GET /all` solo super_admin (PII / ventas). |
| `user_roles.py` | `test_gap_wave6_ws_op_verified.py` | **Plataforma** (tabla sin `workspace_id`): listados y CRUD con `get_admin_user`; `GET /all` con `get_super_admin_user`. No cuenta como cierre “tenant WS/OP” en la misma fila que entidades CRM. |
| `user.py` | `test_gap_wave7_ws_op_verified.py` | **Perfil propio JWT** (`/api/v1/users/profile`): sin `X-Workspace-Id`; `get_current_user` + fila `users` por `sub`. |
| `rbac_management.py` | `test_gap_wave7_ws_op_verified.py` | **Plataforma**: asignaciones/listados con `get_admin_user`; `GET /assignments` usa SQL compatible SQLite (`LIMIT`/`OFFSET`). |
| `platform_settings.py` | `test_gap_wave7_ws_op_verified.py` | **Plataforma** (`workspace_id=0` en `nelvyon_user_settings`): lectura autenticada; `PUT` solo `get_admin_user`. |
| `social_posts.py` | `test_gap_wave7_ws_op_verified.py` | **Tenant**: `require_workspace` en lecturas; `require_workspace_operator` en mutaciones; visibilidad por `client_id`/`project_id` en el workspace o post huérfano (`client_id`/`project_id` null) del mismo `user_id`; `GET /all` solo `super_admin`. |
| `contract_signing.py` | `test_gap_wave8_ws_op_verified.py` | **Tenant**: mutaciones (`prepare/sign/activate/transition`) con `require_workspace_operator`; lecturas (`audit-trail`, `verify`) con `require_workspace`; servicio filtra por `Contracts.workspace_id`. |
| `qa_engine.py` | `test_gap_wave8_ws_op_verified.py` | `POST /validate` con `require_workspace_operator`; `GET /dashboard` con `require_workspace`; métricas y validación acotadas por `nelvyon_outputs.workspace_id`; `AIHubService` lazy-init para no romper rutas no-AI en tests. |
| `platform_metrics.py` | `test_gap_wave8_ws_op_verified.py` | **Plataforma**: router completo bajo `get_admin_user` (sin `X-Workspace-Id`). |
| `blog_posts.py`, `report_items.py`, `segment_results.py` | `test_gap_wave9_ws_op_verified.py` | **Tenant entities**: `GET`/`GET {id}` con `require_workspace`, mutaciones con `require_workspace_operator`, `GET /all` solo `super_admin`, y servicios con aislamiento real por `workspace_id` en CRUD + `get_by_field`/`list_by_field`. |

Para el inventario heurístico global sigue existiendo `docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md` (regenerable).

# NELVYON_WRITE_PATH_MATRIX

**Proyecto:** NELVYON OS + SaaS (`app_v181`)  
**Fase:** Roadmap maestro **Fases 1–10** (Fase 8: bloque OS `nelvyon_agents/.../user_settings`; Fase 9: contratos jobs + `/metrics` + ops YAML; **Fase 10:** cierre OS `nelvyon_projects` / `nelvyon_outputs` / `nelvyon_campaigns` sin `/all` + query forzada a workspace + handlers productivos + checklist mutantes generado; matriz actualizada 2026-04-24).  
**Fecha de generación:** 2026-04-24  
**Estándar de referencia:** workspace obligatorio en escrituras multi-tenant, rol mínimo (`require_workspace_operator` donde aplique SaaS), planes/cuotas vía `core/pricing_plans.py` + `services/plan_quota.py` (+ `dependencies/quota_guards.py` solo delegación).

---

## 1) Metodología y límites

| Qué se hizo | Evidencia |
|--------------|-----------|
| Conteo de rutas HTTP mutantes | `rg '@router\.(post|put|patch|delete)\(' backend/routers/*.py` + suma PowerShell = **358** endpoints (decoradores). |
| Heurística “¿hay `require_workspace` en el archivo?” | Grep por archivo; **no** sustituye revisión ruta-a-ruta (un archivo puede mezclar rutas GET con POST legacy). |
| `plan_quota` / `quota_guards` en routers | **17** archivos enlazan explícitamente (lista en §4; `rg 'plan_quota|quota_guards' backend/routers`). |
| Jobs / workers | `core/job_queue.py` arranca en `main.py`; **Fase 5–6:** `register_nelvyon_job_handlers()` + `nelvyon_workspace_audit` y `nelvyon_workspace_crm_snapshot` (auditoría `security_events`); outcomes terminales en `core/job_observability.py`. En **tests**, httpx no ejecuta lifespan → `conftest` arranca/resetea cola in-process por test (ver `tests/conftest.py`). |
| Scripts que escriben DB | Búsqueda `INSERT\|session\.add\|\.commit\(` en `backend/scripts/*.py` → principalmente `scripts/seed_demo_abcd.py` (demo). |

**Hecho en cierre Fase 1 (evidencia):** bundle pytest **103** tests (CRM/workflow + remediations + smoke + e2e/agent) — **103 passed** (Windows local).

**Hecho en cierre Fase 2 (evidencia):** bundle ampliado **131** tests (Fase 1 bundle + `test_remediation_master_phase2_tenant_rbac` + `test_remediation_fast1_inbox_corridor` + helpdesk phase1) — **131 passed** (mismo entorno).

**Hecho en cierre Fase 3 (evidencia):** bundle pytest **97** tests (`test_remediation_master_phase3_billing` + remediations Fase 1–2 maestros + `test_remediation_phase2_plan_quota` … `phase4` + `test_stripe_webhook` + `test_billing_sync` + `test_remediation_billing_phase1` + `test_payments` + `test_subscriptions_service`) — **97 passed** (Windows local, 2026-04-23).

**Hecho en cierre Fase 4 (evidencia):** `pytest tests/` completo — **404 passed**, **0 failed** (Windows local, 2026-04-23; +2 tests `test_remediation_master_phase4_suite_stability`).

**Hecho en cierre Fase 5 (evidencia):** `pytest tests/` — **411 passed**, **0 failed** (2026-04-23); nuevos `test_remediation_master_phase5_contracts_helpdesk_jobs.py` + extensiones `test_helpdesk_sla_tenant` / `test_tenant_require_workspace`.

**Hecho en cierre Fase 6 (evidencia):** `pytest tests/` desde `backend/` — **417 passed**, **0 failed** (2026-04-23; +6 tests `test_remediation_master_phase6_global_quality.py`: job CRM snapshot, contadores, smoke `appointments` / `nelvyon_projects`+`nelvyon_outputs`).

**Hecho en ejecución Fase 7 (evidencia):** `pytest tests/` desde `backend/` — **423 passed**, **0 failed** (2026-04-24; +6 tests `test_remediation_master_phase7_critical_router_hardening.py`).

**Hecho en ejecución Fase 8 (evidencia):** `pytest tests/` desde `backend/` — **439 passed**, **0 failed** (2026-04-24; +10 tests `test_remediation_master_phase8_os_legacy_closure.py`).

**Hecho en ejecución Fase 9 (evidencia):** `pytest tests/` desde `backend/` — **439 passed**, **0 failed** (misma corrida; +6 tests `test_job_queue_contracts_phase9.py`, `test_metrics_prometheus_phase9.py`; nuevos `core/job_contracts.py`, `core/http_observability.py`, `routers/metrics.py`, `ops/*`).

**Hecho en ejecución Fase 10 (incremento OS + observabilidad honesta + inventario):** `pytest tests/` desde `backend/` — **446+ passed** (última corrida local; +`test_os_projects_outputs_campaigns_phase10_closure.py`, `test_productive_jobs_phase10.py`, `test_observability_phase10.py`); sin `GET /all` en ningún `routers/nelvyon_*.py`; `docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md` (script `backend/scripts/generate_mutating_router_checklist.py`); `docs/NELVYON_OBSERVABILITY_REALITY.md` (límite repo vs Prometheus/OTEL).

**Oleada 6 (2026-04-24):** `pytest tests/` — **539 passed**; `test_gap_wave6_ws_op_verified.py` cubre `automation` (WS lecturas, OP mutaciones, webhook sin JWT con binding cliente/workspace), `automation_webhooks` (mixin + `GET /all` super_admin), `aihub` (OP), `partner_records` / `sales_records` (WS/OP + listados globales super_admin), `user_roles` (guards plataforma admin/super_admin). Sin nuevos hooks `plan_quota`.

**Oleada 7 (2026-04-24):** `pytest tests/` — **555 passed**; `test_gap_wave7_ws_op_verified.py` + seed `users` en `conftest`: `social_posts` (visibilidad workspace vía `nelvyon_clients`/`nelvyon_projects`, OP, `GET /all` super_admin), `user` (perfil JWT), `rbac_management` (admin + SQL SQLite `LIMIT`/`OFFSET`), `platform_settings` (PUT admin). Corrección runtime `GET /api/v1/rbac/assignments` en SQLite.
**Oleada 8 (2026-04-25):** `pytest backend/tests/test_gap_wave8_ws_op_verified.py` — **8 passed**; cierre en `contract_signing` (WS/OP + filtro por `Contracts.workspace_id`), `qa_engine` (`validate` OP, `dashboard` WS + scope por `workspace_id`, lazy-init AI), y clasificación `PLATFORM` para `platform_metrics` con guard admin.
**Oleada 9 corta (2026-04-25):** `pytest backend/tests/test_gap_wave9_ws_op_verified.py` — **9 passed**; cierre en `blog_posts`, `report_items`, `segment_results` con `require_workspace` en lecturas, `require_workspace_operator` en mutaciones, `GET /all` con `get_super_admin_user`, respuestas con `workspace_id` y servicios migrados a patrón `WorkspaceAwareMixin` (aislamiento por `workspace_id` en CRUD + `get_by_field`/`list_by_field`).

**NO hecho (global):** trazar cada handler hasta SQL fila a fila; pytest de los **358** mutantes global inventariado al 100%; resto de legacy `entities/*` fuera del subconjunto ya remediciado (incl. Fase 6: appointments/calendar/revenue); inventariar cada `PATCH` si existiera con otro patrón; auditar código fuera de `backend/routers` que exponga escritura (GraphQL, etc. — no existe en el grep).

---

## 2) Leyenda de estado (matriz)

| Etiqueta | Significado |
|----------|-------------|
| **OK** | Cumple el estándar **en el subconjunto ya remediciado**: `require_workspace` + `require_workspace_operator` en mutación SaaS CRM/core y uso de `plan_quota` / `quota_guards` **donde el producto ya definió enforcement** (evidencia en tests de remediación Fases 2–4). |
| **GAP_WS** | Mutaciones en archivos **sin** aparición de `require_workspace` (heurística archivo) **o** rutas conocidas sin header workspace. |
| **GAP_OP** | Hay `require_workspace` pero la mutación debería exigir **operator** y solo exige workspace (ej.: creación ticket helpdesk con `require_workspace`). |
| **GAP_PLAN** | No pasa por `plan_quota` / `quota_guards` aunque el dominio tenga módulos/límites en `pricing_plans` aplicables a esa escritura. |
| **GAP_SIDE** | Motor/jobs que **pueden** crear filas (p. ej. `workflow_engine` / acciones de regla) sin pasar por los mismos guards que el CRUD explícito. |
| **REVIEW** | Requiere trazado manual servicio→ORM para confirmar tablas y tenant; no afirmar OK sin esa revisión. |

> **Honestidad:** “OK” aquí **no** significa 100/100 global; significa “alineado con lo ya endurecido y probado en remediación”. El resto son GAPs explícitos hasta cierre.

---

## 3) Resumen numérico global (HTTP routers)

| Métrica | Valor |
|---------|------:|
| Total decoradores mutantes (`POST`/`PUT`/`PATCH`/`DELETE`) en `backend/routers` | **358** |
| Mutaciones en archivos **sin** string `require_workspace` (heurística) | **270** |
| Mutaciones en archivos **con** algún `require_workspace` | **88** |
| Archivos de router que importan `plan_quota` o `quota_guards` | **17** |

---

## 4) Inventario `plan_quota` / `quota_guards` en routers (única fuente de verdad aplicada al borde HTTP)

Archivos que enlazan `plan_quota` y/o `quota_guards` (borde HTTP):

| Archivo | Uso |
|---------|-----|
| `routers/contacts.py` | `enforce_contact_create_quota`, `enforce_contact_headroom` (batch). |
| `routers/campaigns.py` | `enforce_campaign_create_quota`, `enforce_campaign_headroom`, `enforce_campaign_reopen_transition`. |
| `routers/workflows.py` | `enforce_workflow_create_quota`, `enforce_workflow_active_headroom`, `enforce_workflow_activation_transition`. |
| `routers/crm_advanced.py` | `enforce_contact_headroom` (import CSV), `enforce_contacts_plan_module_for_crm_writes` (merge). |
| `routers/deals.py` | `enforce_contacts_plan_module_for_crm_writes` en **todas** las mutaciones HTTP (POST, PUT, DELETE, batch). |
| `routers/pipeline_deals.py` | `enforce_contacts_plan_module_for_crm_writes` en mutaciones; **OP** en mutaciones. |
| `routers/pipeline_pro.py` | `enforce_contacts_plan_module_for_crm_writes` (actividades/toggle); `enforce_workflow_engine_trigger_execute_allowed` en **stage-change**; **OP** en mutaciones. |
| `routers/workflow_engine.py` | `enforce_workflow_engine_rules_write_allowed` (CRUD reglas); `enforce_workflow_engine_trigger_execute_allowed` (**trigger**, **execute**). |
| `routers/messages.py` | `enforce_helpdesk_module_allowed` en **todas** las mutaciones (POST, PUT, DELETE, batch); listados `GET` con `require_workspace` y filtro `workspace_id` en servicio; `GET /all` con OP + módulo helpdesk. |
| `routers/helpdesk_tickets.py` | `enforce_helpdesk_module_allowed` en **create, batch create, put, batch put, delete, batch delete**; batch update/delete re-lanzan `HTTPException`. |
| `routers/conversations.py` | `enforce_helpdesk_module_allowed` en **todas** las mutaciones CRUD (incl. batch). |
| `routers/conversation_realtime.py` | `enforce_helpdesk_module_allowed` en send, mark-read y **stream-token** (sin exigir operator en token — ver tests FAST-1). |
| `routers/activities.py` | `enforce_contacts_plan_module_for_crm_writes` en mutaciones y `GET /all`; `GET`/`GET/{id}` con `require_workspace` + scope por `workspace_id`. |
| `routers/agent_actions.py` | `require_workspace_operator`; `plan_quota`: `enforce_contact_create_quota` (create_contact), `enforce_contacts_plan_module_for_crm_writes` (move_deal); resto de acciones sin módulo en `pricing_plans` → solo OP+WS (documentado en router). |
| `routers/appointments.py` | `enforce_contacts_plan_module_for_crm_writes` en mutaciones; lecturas `require_workspace`; mutaciones `require_workspace_operator`. |
| `routers/calendar_events.py` | Igual que appointments (CRM-adjacente). |
| `routers/revenue_records.py` | Igual patrón WS/OP + módulo CRM en mutaciones. |
| `routers/nelvyon_projects.py`, `routers/nelvyon_outputs.py` | Mutaciones **OP** + workspace vía servicio `WorkspaceAwareMixin`; sin `plan_quota` numérico en OS salvo alineación futura por producto. |

**GAP_PLAN (global):** el resto de rutas mutantes fuera de esta lista siguen sin hook en router hasta Fases posteriores.

---

## 5) Resumen por dominio (mutaciones ≈ decoradores; OK vs GAP según §2)

> **n** = número de endpoints mutantes en el grupo. **OK** = rutas/endpoints que encajan en el subconjunto ya remediciado + guards coherentes en código revisado. **GAP** = el resto del grupo o incumplimiento parcial.

| Dominio | Archivos / ámbito | n (aprox.) | OK | GAP (principalmente) |
|---------|-------------------|-----------:|---:|---|
| **CRM core** | `contacts.py`, `campaigns.py`, `workflows.py`, `crm_advanced.py`, `workflow_engine.py`, `deals.py`, `pipeline_deals.py`, `pipeline_pro.py` | **25+** | **Cierre Fase 1 (subconjunto deals/pipelines/workflow_engine):** mutaciones con WS+OP y `plan_quota`/`quota_guards` como en §4 y tests `test_remediation_master_phase1_crm_workflow.py`. | Resto del dominio CRM y acciones de reglas no inventariadas ruta-a-ruta → **REVIEW** donde aplique. |
| **Helpdesk / inbox** | `helpdesk_tickets.py`, `messages.py`, `conversations.py`, `conversation_realtime.py`, `helpdesk_sla.py` | **23** | **OK (Fase 2 + Fase 5 SLA):** tickets/messages/conversations como Fase 2; **`helpdesk_sla`**: `transition`/`assign` con **OP** + `enforce_helpdesk_module_allowed`; `sla-breaches` con WS + módulo helpdesk; `sla-targets`/`ticket-flow` con `require_workspace` (sin datos tenant en cuerpo, pero cabecera obligatoria). | Rutas helpdesk satélite fuera de este archivo si aparecen en el futuro → **REVIEW**. |
| **Deals / pipelines** | `deals.py`, `pipeline_deals.py`, `pipeline_pro.py` | **15** | **OK (Fase 1):** mutaciones con **OP** + `enforce_contacts_plan_module_for_crm_writes` donde aplica CRM; `pipeline_pro` stage-change con `enforce_workflow_engine_trigger_execute_allowed`. | **GET** pipeline/deals sin operator (solo `require_workspace`) — intencional para lecturas analíticas. |
| **Billing / suscripciones** | `payments.py`, `stripe_webhook.py`, `subscriptions.py`, `billing_usage.py` | **10** | **OK (Fase 3 — subconjunto acordado):** plan activo vía `get_active_plan_id_for_workspace` (`ORDER BY id DESC` sobre `subscriptions` activas); checkout/verify con `workspace_id` en metadata y updates scoped `workspace_id`; webhook processor pasa `workspace_id` en `update`; `billing_usage` cuenta por `workspace_id` + mismos contadores que `plan_quota` para CRM core; tests `test_remediation_master_phase3_billing` + Stripe existentes. **Oleada 2026-04-24:** `POST /verify_payment` endurecido con `require_workspace_operator` + tests `test_gap_wave2_ws_op_verified`; `subscriptions` mutaciones CRUD con `require_workspace_operator` (misma oleada; sin nuevo `plan_quota`). | **GAP_WS**: `stripe_webhook` sin header workspace (correcto). **GAP_PLAN**: medidores `api_calls` / `storage_gb` / `emails` en `billing_usage` = **solo UI** (no en `get_limit` / no enforced por `plan_quota` — documentado en docstring del router). **subscriptions** entity CRUD no aplica cupos numéricos en router (solo `assert_known_plan_or_raise`). |
| **Workspace / tenant admin** | `workspace_management.py`, `tenant_management.py` | **9** | **Oleada 2026-04-24 (wave2):** `tenant_management` + `workspace_management` con OP en mutaciones y WS en lecturas multi-tenant; tests `test_gap_wave2_ws_op_verified`. | **GAP_PLAN**: límites `workspace_users` en `pricing_plans` **no** vistos enforced en estos routers en esta matriz. |
| **Onboarding / OAuth / email** | `onboarding.py`, `oauth_integrations.py`, `email_service.py` | **10** | **Oleada 2026-04-24 (wave3):** `onboarding` mutaciones (`complete-step`, `reset`, `seed-demo`) con `require_workspace_operator`; `GET /steps` con `require_workspace`. `oauth_integrations`: `GET /authorize/...` (escribe fila pendiente) + `POST /callback`, `disconnect`, `test` con OP; lecturas `providers`/`status` con WS. `email_service`: WS+OP en envío/reintentos/stats; `EmailQueue.workspace_id` rellenado desde header; **`GET /api/v1/email/health`** sigue sin auth (superficie acotada). Tests `test_gap_wave3_ws_op_verified` + `test_email_service`. Tabla `oauth_tokens`: migración `pr04_oauth_tokens`. | Sin `plan_quota` en estos dominios (no pedido por producto). |
| **Orquestación / AI glue / entity workspaces** | `orchestrator.py`, `saas_tools.py`, `workspaces.py` | **19** | **Oleada 2026-04-24 (wave4):** `orchestrator` — todas las mutaciones `POST /generate-*` con OP; servicio acota proyecto/cliente y persiste `nelvyon_outputs.workspace_id`. `saas_tools` — tres POST con OP (IA auxiliar). `entities/workspaces` — lecturas con `require_workspace` (lista = workspace activo; `GET /{id}` debe coincidir con header); CUD con OP y `id`/batch limitados al workspace del header; `GET /all` solo `super_admin`. Tests `test_gap_wave4_ws_op_verified`. | Ver oleada 5 para `e2e_orchestrator`. |
| **E2E CRM ↔ OS** | `e2e_orchestrator.py` | **8** (6 POST + 2 GET) | **Oleada 2026-04-24 (wave5):** lecturas `require_workspace` + SQL por `workspace_id` (miembros ven cadena del equipo). Mutaciones `require_workspace_operator`; propagación y altas con `workspace_id` en `contracts`/`deals`/`helpdesk_tickets` y filtros `EXISTS`/`JOIN` a `nelvyon_projects`. Tests `test_gap_wave5_ws_op_verified`. | `social_posts` sigue sin columna `workspace_id` en modelo — acotación vía `project_id` + join a proyecto. |
| **Jobs / workers** | `core/job_queue.py` + `core/nelvyon_job_handlers.py` + `core/job_observability.py` + `core/job_contracts.py` + `routers/metrics.py` | **0** rutas HTTP dedicadas | **Fase 5–6:** `nelvyon_workspace_audit` + `nelvyon_workspace_crm_snapshot`; contadores + log estructurado. **Fase 9:** contratos para `email/report/webhook/cleanup`, `/metrics` Prometheus text, contadores HTTP+jobs, `ops/slo|alerts|runbooks`. | **GAP residual:** faltan handlers reales productivos para `email/report/webhook/cleanup` y operación durable multi-instancia (exporter/TSDB/alerts runtime). |
| **OS / `nelvyon_*`** | `nelvyon_*.py` (10 routers) | **60** | **Fase 4:** `nelvyon_campaigns` OP+WS. **Fase 6:** `nelvyon_projects`, `nelvyon_outputs` OP+WS + batch `ValueError`→400. **Fase 7:** `nelvyon_quality_metrics`, `nelvyon_bot_templates` con WS/OP + scope `workspace_id`. **Fase 8:** `nelvyon_agents`, `nelvyon_assets`, `nelvyon_clients`, `nelvyon_products`, `nelvyon_user_settings` endurecidos con `require_workspace_operator` en borde router y tests de regresión. | **GAP residual:** falta homogeneizar fully WS-read vs OP-write y policy estricta `workspace_id` en servicio para el bloque Fase 8 (actualmente cierre de seguridad de borde). |
| **CRUD genérico “entities” legacy** | `activities` + resto (`automation_*`, `blog_posts`, …) | **~270** | **`activities`:** OK Fase 2. **`contracts`:** OK Fase 5. **Fase 6:** `appointments`, `calendar_events`, `revenue_records` con WS/OP + módulo CRM. **Fase 7:** `workspace_members` con WS en lecturas + OP en mutaciones + policy `workspace_id` header/body. **Oleada 6:** `automation_webhooks`, `partner_records`, `sales_records` con `WorkspaceAwareMixin`; `automation` router OS con WS/OP; `user_roles` con guards admin/super_admin (sin `workspace_id` en tabla). | Resto de entidades legacy (`platform_metrics`, `blog_posts`, …) → **GAP** hasta fases posteriores. **`agent_actions`:** parcialmente cerrado (OP+WS+plan en contacto/deal); sin módulo explícito para report/blog/calendario. |

---

## 6) Detalle de escrituras de alto impacto ya conocidas (no exhaustivo de las 358)

### 6.1 CRM core (`/api/v1/entities/contacts|campaigns|workflows`, `/api/v1/crm/*`, `/api/v1/workflow-engine/*`)

| Método + path (prefijo) | Servicio principal | Guards | plan_quota / delegados |
|-------------------------|---------------------|--------|---------------------------|
| `POST/PUT/DELETE …/entities/contacts*` | `ContactsService` | `require_workspace` / `require_workspace_operator` | Sí (create, batch, import vía CRM). **PUT/DELETE** contactos: sin cuota numérica adicional (correcto si no incrementan cupo). |
| `POST/PUT/DELETE …/entities/campaigns*` | `CampaignsService` | WS + OP | Sí en create, batch create, reopen. **Batch update** otras transiciones: revisar si afectan cupo → **REVIEW**. |
| `POST/PUT/DELETE …/entities/workflows*` | `WorkflowsService` | WS + OP | Sí en create, batch activos, activación. |
| `POST /api/v1/crm/import-csv` | inline + `Contacts` ORM | OP + WS | `enforce_contact_headroom` |
| `POST /api/v1/crm/merge` | inline ORM | OP + WS | `enforce_contacts_plan_module_for_crm_writes` |
| `POST/PUT/DELETE …/workflow-engine/rules*` | `WorkflowEngineService` | OP + WS | `enforce_workflow_engine_rules_write_allowed` (módulo workflows vía `plan_quota`). |
| `POST …/workflow-engine/trigger` , `POST …/execute/{id}` | idem | OP + WS | `enforce_workflow_engine_trigger_execute_allowed` (workflows + módulo contactos/CRM para efectos en deals/contactos/actividades/cola email). |

### 6.2 Helpdesk / mensajes / conversaciones

| Método + path | Servicio | Guards | plan_quota |
|---------------|----------|--------|-------------|
| `POST/PUT/DELETE …/entities/helpdesk/tickets*` (incl. batch) | `Helpdesk_ticketsService` | OP + WS | `enforce_helpdesk_module_allowed` en todas las mutaciones listadas. |
| `POST/PUT/DELETE …/entities/messages*` (incl. batch) | `MessagesService` | OP + WS | `enforce_helpdesk_module_allowed` en mutaciones; `GET`/`GET/{id}` con `require_workspace` + filtro `workspace_id`. |
| `GET …/entities/messages/all` | idem | OP + WS | `enforce_helpdesk_module_allowed`. |
| `POST/PUT/DELETE …/entities/conversations*` (incl. batch) | `ConversationsService` | OP + WS | `enforce_helpdesk_module_allowed`. |
| `POST …/conversations/{id}/messages`, `mark-read`, `stream-token` | `ConversationRealtimeService` | send/mark-read: OP+WS; stream-token: `require_workspace` + helpdesk | `enforce_helpdesk_module_allowed`. |
| `POST /api/v1/helpdesk/transition`, `POST …/assign` | `HelpdeskNotificationService` | OP + WS | `enforce_helpdesk_module_allowed`. |
| `GET /api/v1/helpdesk/sla-breaches` | idem | WS | `enforce_helpdesk_module_allowed`. |
| `GET /api/v1/helpdesk/sla-targets`, `GET …/ticket-flow` | constantes / mapas | WS | Sin cuota (solo referencia; cabecera workspace obligatoria Fase 5). |

### 6.3 Deals / pipelines

| Ruta | Guards | plan_quota |
|------|--------|------------|
| `POST/PUT/DELETE …/entities/deals*` (incl. batch) | OP + WS | `enforce_contacts_plan_module_for_crm_writes` |
| `POST/PUT/DELETE …/entities/pipeline_deals*` (incl. batch) | OP + WS | `enforce_contacts_plan_module_for_crm_writes` |
| `POST …/pipeline/deals/{id}/activities`, `POST …/stage-change`, `PUT …/pipeline/activities/{id}/toggle` | OP + WS | Actividades/toggle: módulo contactos; stage-change: workflows+CRM (`enforce_workflow_engine_trigger_execute_allowed`). |
| `GET …/pipeline/*` (stats, actividades) | `require_workspace` | **Sin** operator ni plan en esta fase (solo lectura). |

### 6.4 Jobs / workers / scripts

| Componente | Tablas / efecto | ¿Pasa por servicios con guards? |
|--------------|-----------------|-----------------------------------|
| `core/job_queue.py` + `core/nelvyon_job_handlers.py` | `security_events` vía `write_audit_event` en jobs `nelvyon_workspace_audit` y `nelvyon_workspace_crm_snapshot` | Handlers validan membresía; CRM snapshot además `enforce_contacts_plan_module_for_crm_writes` + `count_contacts_in_workspace`; outcomes terminales registrados en `job_observability`. |
| `scripts/seed_demo_abcd.py` | `workspaces`, `contacts`, `deals`, … | Script directo ORM — **GAP** operacional (solo demo; no HTTP). |

### 6.5 Orquestación OS, herramientas SaaS y CRUD `entities/workspaces`

| Ruta (prefijo) | Guards | Notas |
|----------------|--------|--------|
| `POST /api/v1/orchestrator/generate-*` | `require_workspace_operator` | `OrchestratorService.get_project` / `get_client` con `workspace_id`; `save_output` rellena `Nelvyon_outputs.workspace_id`. Sin `plan_quota` nuevo. |
| `POST /api/v1/saas-tools/generate-pdf` , `…/generate-presentation` , `…/segment-database` | OP | Cabecera workspace obligatoria vía `require_workspace_operator`. |
| `GET /api/v1/entities/workspaces` , `GET …/workspaces/{id}` | `require_workspace` | Lista devuelve solo el workspace del header; `{id}` debe coincidir con `X-Workspace-Id` (403 si no). |
| `POST/PUT/DELETE …/entities/workspaces*` (incl. batch) | OP + comprobación `id == ctx.workspace_id` en router | `GET …/workspaces/all` solo `get_super_admin_user` (listado plataforma). |

---

## 7) GAPs críticos priorizados (lista corta)

1. **Heurística archivo:** sigue habiendo **muchas** mutaciones en routers sin señal `require_workspace` / `require_workspace_operator` en el mismo archivo — ver tabla regenerable en `docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md` (conteos **GAP_WS** / **GAP_OP**). No sustituye auditoría ruta-a-ruta.  
2. **`agent_actions`**: acciones `create_report` / `create_blog_post` / `schedule_event` sin clave de módulo en `pricing_plans` → solo OP+WS hasta definición comercial.  
3. **OS `nelvyon_*` — plan/cuota:** los routers OS cerrados en Fases 8–10 **no** pasan por `plan_quota` salvo que el producto defina límites por entidad OS (puede ser correcto); cualquier nuevo límite comercial → **GAP_PLAN** explícito.  
4. **Observabilidad “real” multi-nodo:** Prometheus/Alertmanager/OTEL en clúster — **fuera de lo demostrado por `pytest`**; ver `docs/NELVYON_OBSERVABILITY_REALITY.md`.  
5. **Legacy `entities/*` no-OS** (`subscriptions/all`, `messages/all`, `user_roles`, etc.): siguen con patrones distintos; cierre parcial documentado en fases anteriores. **`subscriptions` CRUD** (no `/all`): oleada 2026-04-24 — `require_workspace_operator` en mutaciones + tests `test_gap_wave2_ws_op_verified` (`OK_VERIFIED_HTTP` en checklist).  
6. **Integraciones / onboarding / email (wave3):** `oauth_integrations`, `onboarding`, `email_service` — ver fila nueva en §5; evidencia HTTP en `test_gap_wave3_ws_op_verified`.
7. **Orquestación / tools / workspaces (wave4):** `orchestrator`, `saas_tools`, `entities/workspaces` — ver §5 fila «Orquestación / AI glue» y §6.5; evidencia HTTP en `test_gap_wave4_ws_op_verified`.
8. **E2E orchestrator (wave5):** `e2e_orchestrator` — ver §5 fila «E2E CRM ↔ OS»; evidencia HTTP en `test_gap_wave5_ws_op_verified`.

---

## 8) Mantenimiento de esta matriz

- **Owner técnico:** equipo NELVYON.  
- **Actualizar cuando:** cada remediación que toque guards o nuevos routers; cada nuevo job que escriba DB.  
- **Próximo paso recomendado (roadmap):** cerrar **GAP_WS/GAP_OP** archivo a archivo donde el producto exija tenant; legacy `/all` fuera de `nelvyon_*` según política; desplegar Prometheus/OTEL si se exige checklist “100% infra”.

---

## 9) Referencias de código (anclajes)

- Contadores mutantes y heurística `require_workspace`: generados localmente vía PowerShell sobre `backend/routers/*.py` (2026-04-23).  
- `plan_quota` / `quota_guards` en routers: `rg 'plan_quota|quota_guards' backend/routers` → **17** archivos (2026-04-23, post Fase 6).  
- `register_handler` / handlers app: `core/nelvyon_job_handlers.py` + `main.py` (`register_nelvyon_job_handlers`); observabilidad `core/job_observability.py`; tests `tests/test_remediation_master_phase5_contracts_helpdesk_jobs.py`, `tests/test_remediation_master_phase6_global_quality.py` + `tests/conftest.py` (arranque cola).  
- Ejemplos legacy: `routers/activities.py` mutaciones con `get_current_user`; `routers/automation_jobs.py` idem; `routers/helpdesk_tickets.py` create con `require_workspace` sin operator.

# NELVYON Backend v1 — Cierre Final (Repo-Only)

Fecha de cierre: 2026-04-25

## Foto final técnica

- Routers mutantes inventariados: `76`
- Routers en `OK_VERIFIED_HTTP`: `33`
- GAP heurístico restante: `GAP_WS ~10-13`, `GAP_OP ~1-2`
- Routers `PLATFORM` con tests: `5`
- Suite backend: `pytest backend/tests/` -> `572 passed`

Este estado se considera **~95-100/100 repo-only** con el estándar actual: la superficie crítica tenant (WS-read/OP-write), bordes de plataforma y rutas de negocio de mayor impacto quedaron cubiertos con tests HTTP, y la cola restante está acotada y explícita.

---

## Definición de OK_VERIFIED_HTTP

Un router se considera `OK_VERIFIED_HTTP` cuando:

1. Tiene control de acceso correcto para su naturaleza:
   - tenant: `require_workspace` (read) + `require_workspace_operator` (write), o
   - plataforma/perfil: guard equivalente documentado (`get_admin_user`, `get_super_admin_user`, `get_current_user`).
2. El aislamiento de datos está aplicado en servicio/queries (incluyendo `workspace_id` cuando corresponde).
3. Existe al menos un test HTTP real en `backend/tests/` que verifica comportamiento de acceso (member vs operator/admin, cruce de workspace, happy path).

Referencia principal: `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.

---

## Routers en OK_VERIFIED_HTTP (33)

`aihub.py`, `auth.py`, `automation.py`, `automation_jobs.py`, `automation_webhooks.py`, `billing_usage.py`, `blog_posts.py`, `connector_configs.py`, `contract_signing.py`, `e2e_orchestrator.py`, `email_service.py`, `oauth_integrations.py`, `onboarding.py`, `orchestrator.py`, `partner_records.py`, `payments.py`, `platform_settings.py`, `qa_engine.py`, `rbac_management.py`, `report_items.py`, `saas_tools.py`, `sales_records.py`, `security_events.py`, `segment_results.py`, `settings.py`, `social_posts.py`, `storage.py`, `subscriptions.py`, `tenant_management.py`, `user.py`, `user_roles.py`, `workspace_management.py`, `workspaces.py`.

---

## Routers PLATFORM (5)

- `user.py` -> perfil propio por JWT (`get_current_user`), no patrón tenant por header de workspace.
- `rbac_management.py` -> administración RBAC global.
- `platform_settings.py` -> configuración global de plataforma.
- `user_roles.py` -> gestión global de roles (sin `workspace_id` en modelo).
- `platform_metrics.py` -> telemetría de plataforma bajo guard admin.

---

## GAP residual explícito

Estado actual visible en checklist:

- `GAP_WS` explícitos: `audit_log.py`, `contract_logs.py`, `form_items.py`, `funnel_items.py`, `funnel_publisher.py`, `presentation_history.py`, `pricing_promos.py`, `stripe_webhook.py`, `system_health.py`, `website_items.py`, `website_pages.py`.
- `GAP_OP ~1-2` (heurístico): cola corta en rutas no críticas o de borde legacy con mutaciones y señales parciales.
- `DEPRECATED`: no hay nuevos casos marcados en este cierre.

Referencias: `docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md` y `docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md`.

---

## Frontera repo vs operación externa (sin maquillar)

Se mantiene la frontera documentada en `docs/NELVYON_OBSERVABILITY_REALITY.md`:

- **Comprobado en repo:** `/metrics`, contadores HTTP/jobs, contratos de jobs, YAML de alertas, simulaciones y runbooks/tests asociados.
- **NO comprobado aquí (fuera de repo):** Prometheus/Alertmanager reales en entorno, OTEL distribuido, on-call formal, SOC2, HA y controles operativos de infraestructura.

Para pasar de **95-100/100 repo-only** a **100/100 producto+operación**, el trabajo es externo al código: desplegar scrape/retención real de Prometheus, enrutar alertas reales en Alertmanager con escalado on-call, instrumentar y operar OTEL de punta a punta, y cerrar controles de resiliencia/compliance (HA, incident response, evidencias SOC2) en entornos productivos.

---

## Política desde este punto (v1 cerrada)

- No abrir nuevas oleadas funcionales en backend.
- Solo aceptar:
  - bugs reales detectados por tests o incidencias verificadas,
  - ajustes puntuales derivados de decisiones de producto.
- Si aparece un GAP realmente crítico, declararlo explícitamente antes de proponer cambios.

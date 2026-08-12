# NELVYON — ESTADO OPERATIVO DE CIERRE

> No es documentación de producto. Es el estado de la operación de cierre hacia
> Release Candidate. La siguiente sesión debe leer este fichero PRIMERO y
> continuar por el primer bloque `PENDING` disponible, sin preguntar.

```text
HEAD            7135eaf5
último commit   fix(messaging): stop tenants sending from NELVYON's number and address
fecha           2026-08-12
bloque actual   3 — Clasificación de drift estructural (siguiente disponible)
tests           1737 passed / 0 failed  (backend pytest, 137 ficheros)
build           backend compileall limpio · frontend sin tocar desde el último build conocido
árbol git       limpio
push/PR/merge   ninguno
PG certification BLOQUEADO — Docker Desktop caído (npipe dockerDesktopLinuxEngine no responde)
```

## Regla de arranque

1. `git status` + `git log -1` → el repo es la verdad. Si HEAD avanzó, no retroceder.
2. Comprobar Docker: `docker info`. Si responde, los bloques 2/4/29/30 pasan a
   PRIORIDAD INMEDIATA.
3. Continuar por el primer `PENDING` no bloqueado.

---

## Cola de bloques

| # | Bloque | Estado | Nota |
|--:|---|---|---|
| 1 | WhatsApp + SES / Email Provider Tenancy | **CERTIFIED** | `7135eaf5` |
| 2 | Column Drift sobre pg_catalog | **BLOCKED** | Docker caído |
| 3 | Clasificación de drift estructural | **PENDING** | depende parcialmente de 2 |
| 4 | Constraint Drift Guard PG | **BLOCKED** | Docker caído |
| 5 | BFF Authorization | PENDING | |
| 6 | BFF Ads / Provider Isolation | PENDING | |
| 7 | Financial Safety | PENDING | |
| 8 | Charge Pack / Credits / Quotas | PENDING | |
| 9 | Campaign Idempotency | PENDING | deuda ya medida, ver abajo |
| 10 | External Side-effect Idempotency | PENDING | |
| 11 | Jobs / Workers / Queues | PENDING | |
| 12 | Revocation | PENDING | |
| 13 | Distributed Rate Limit | PENDING | |
| 14 | Secrets / Credentials Audit | PENDING | |
| 15 | Authentication Complete Audit | PENDING | |
| 16 | Global Tenant Isolation | PENDING | |
| 17 | Upload / Import / Export Security | PENDING | |
| 18 | Inbound Webhooks | PENDING | |
| 19 | OAuth / Integrations | PENDING | |
| 20 | Ads Multi-tenant Functional Completion | PENDING | bloqueado de facto por deuda de claves |
| 21 | Agents AI Full Audit | PENDING | |
| 22 | Multi-agent System | PENDING | |
| 23 | AI Cost / Provider Audit | PENDING | |
| 24 | Social / Messaging Integrations | PENDING | |
| 25 | Activities Functional Debt | PENDING | |
| 26 | Reporting / API Contract Debt | PENDING | |
| 27 | Frontend Error/Permission UX | PENDING | |
| 28 | Flake / Test Determinism | PENDING | |
| 29 | SQLite vs PostgreSQL Coverage | **BLOCKED** | Docker caído |
| 30 | Migrations Final Certification | **BLOCKED** | Docker caído |
| 31 | DB Performance | PENDING | |
| 32 | API Performance / Timeouts | PENDING | |
| 33 | Exception / Fail-open Sweep | PENDING | |
| 34 | Observability | PENDING | |
| 35 | Web Security | PENDING | |
| 36 | Dependency Security | PENDING | |
| 37 | Production ENV / Config | PENDING | |
| 38 | Deployment / Railway Readiness | PENDING | |
| 39 | Backup / Restore | PENDING | drill previo existe (`scripts/run-postgres-restore-drill.mjs`) |
| 40 | Load / Stress / Concurrency | PENDING | |
| 41 | Frontend Functional Audit | PENDING | |
| 42 | API Contracts | PENDING | |
| 43 | CI/CD Gates | PENDING | |
| 44 | Critical E2E Journeys | PENDING | |
| 45 | Final Security Regression + Mutation | PENDING | |
| 46 | Final Audit From Zero | PENDING | |
| 47 | Release Candidate Certification | PENDING | |

---

## Bloques certificados antes de esta cola

Están en git y con guards vivos; no se reabren sin evidencia nueva.

| Bloque | Commit | Guard que lo sostiene |
|---|---|---|
| Stripe webhook: negativos + idempotencia | (previo) | `apps/web/.../webhooks/stripe/__tests__/` |
| Migración 523 certificada contra PG 16.14 | (previo) | — (requiere PG) |
| RLS: clasificado DEUDA / defensa redundante | (previo) | `docs/DATABASE.md:91` |
| RBAC plataforma Node (14 rutas → capability) | (previo) | tests de capability |
| Ads platform authority (ads_agent, google, meta) | (previo) | `test_workspace_mutation_authz_guard.py` · `test_corporate_ads_authz.py` |
| Snapchat/TikTok customer-facing sin fallback | (previo) | `core/ads_integration.py` + guard |
| FastAPI raw-SQL schema drift (migr. 524–528) | `856245a9` | `tests/_raw_sql_schema_drift.py` |
| Audit event loss | `290fac1d` | `test_audit_event_loss_policy.py` |
| Audit call-site policy (24 sitios) | `3c48919f` | guard estructural: ninguna llamada desnuda |
| FastAPI mutation authorization (67 endpoints) | `cca9344a` | `test_workspace_mutation_authz_guard.py` |
| WhatsApp + SES provider tenancy | `7135eaf5` | `test_messaging_provider_tenancy.py` |

---

## Hallazgos abiertos

Ninguno CRITICAL ni HIGH sin resolver a día de hoy.

---

## Deudas aceptadas

Registradas con evidencia en `docs/TODO.md`. No se cierran solas: cada una
necesita decisión de producto o PostgreSQL real.

1. **Idempotencia de `send_campaign`** — `status == "sending"` es read-then-write
   sin bloqueo (dos peticiones concurrentes pueden enviar dos veces) y no cubre
   `status == "sent"`, así que una campaña completada puede reenviarse. Los
   duplicados son detectables por la auditoría de intención, no impedidos.
   → bloque 9.
2. **Identidad remitente de campañas** — `campaign_sender` envía desde
   `SENDGRID_FROM_EMAIL` (`nelvyon@noreply.com`). `campaigns.from_email` existe
   desde la migración 507 y nadie la lee. Decisión de producto: ¿bloquear a quien
   no verificó dominio, o enviar desde NELVYON con `reply-to` del cliente?
3. **`integration_whatsapp` keyed por `user_id`** — no por `workspace_id`, y solo
   la lee TypeScript. Hasta decidir a quién pertenece la integración, el camino
   Python falla cerrado. Mismo problema que `oauth_connections` en ads.
4. **Multi-tenencia de proveedores de Ads** — sin fuente de credencial por
   workspace; `resolve_workspace_ads_integration` devuelve `None` a propósito.
5. **`reporting_service.website_url`** — contrato pendiente. → bloque 26.
6. **Modelos de `conftest`** — deuda de bootstrap de esquema en tests.

---

## Guards vivos

| Guard | Qué impide |
|---|---|
| `test_workspace_mutation_authz_guard.py` | mutación workspace-scoped sin autoridad; clase sensible con autoridad insuficiente; recurso platform con autoridad de workspace |
| `test_workspace_authority_tiers.py` | `viewer` mutando; `member` en negocio; cross-workspace; efecto externo sin autoridad |
| `test_messaging_provider_tenancy.py` | envío customer-facing sin integración propia; fallback a credencial corporativa; binding después de la red |
| `test_platform_email_unaffected.py` | que el correo operativo del SaaS herede el fail-closed de tenant |
| `test_audit_event_loss_policy.py` | llamada a `write_audit_event` sin política explícita |
| `tests/_raw_sql_schema_drift.py` | columnas en SQL crudo que no existen en el esquema |
| `tests/_constraint_drift.py` | (listo, esperando PG) ON CONFLICT / NOT NULL / PK |

---

## PostgreSQL certification

```text
estado    BLOQUEADO
causa     Docker Desktop no arranca (npipe dockerDesktopLinuxEngine)
efecto    bloques 2, 4, 29, 30 no pueden certificarse
provisión scripts/pg-cert-db.mjs (PG desechable, 4 shims documentados)
```

**No reutilizar mediciones PG antiguas como actuales.** La última medición
conocida de column drift (161 usos / 92 únicos / 18 tablas) es HISTÓRICA y debe
recalcularse contra `pg_catalog` cuando Docker vuelva.

---

## Siguiente acción exacta

Bloque **3 — Clasificación de drift estructural**, en su parte que NO requiere
PostgreSQL: clasificar por semántica y cronología (A servicio correcto / B
esquema correcto / C código muerto / D rediseño) las tablas de las familias
prioritarias (audit, security, api_keys, invoices, billing, auth, integrations)
usando código, modelos, migraciones e historial como oráculo. La confirmación
numérica contra `pg_catalog` queda para cuando Docker vuelva.

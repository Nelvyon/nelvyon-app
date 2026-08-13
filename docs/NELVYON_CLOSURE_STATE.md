# NELVYON — ESTADO OPERATIVO DE CIERRE

> No es documentación de producto. Es el estado de la operación de cierre hacia
> Release Candidate. La siguiente sesión debe leer este fichero PRIMERO y
> continuar por el primer bloque `PENDING` disponible, sin preguntar.

```text
HEAD            (ver git log -1)
último commit   fix(files): neutralise CSV formulas, stop two path escapes
fecha           2026-08-12
bloque actual   propiedad de integraciones CERRADA; siguen bloqueados los de PostgreSQL
tests           backend 2168 passed · frontend 6643 passed / 42 skipped · next build OK · frontend 6637 passed / 42 skipped · frontend 6616 passed / 42 skipped · tsc --noEmit limpio
build           backend compileall limpio · frontend  REAL pasa (2026-08-12)
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
| 3 | Clasificación de drift estructural | **BLOCKED** | necesita la medición real de 2; clasificar sobre cifras históricas seria lo prohibido |
| 4 | Constraint Drift Guard PG | **BLOCKED** | Docker caído |
| 5 | BFF Authorization | **CERTIFIED** | diferencial de parseo `X-Workspace-Id` corregido |
| 6 | BFF Ads / Provider Isolation | **CERTIFIED** | el lado Node ya era correcto; fijado con guard |
| 7 | Financial Safety | **CERTIFIED** | `83977fea` — 3 hallazgos: autoconcesión de plan, refund cross-tenant, fail-open en verify |
| 8 | Charge Pack / Credits / Quotas | **CERTIFIED** | `4c6519fe` — precio por defecto, idempotencia Stripe, precisión de moneda |
| 9 | Campaign Idempotency | **CERTIFIED** | reclamo atómico; `sent` deja de ser reenviable |
| 10 | External Side-effect Idempotency | **CERTIFIED** | webhook saliente con clave de entrega estable |
| 11 | Jobs / Workers / Queues | **CERTIFIED** | reintento no bloqueante; cancelación en stop/reset |
| 12 | Revocation | **CERTIFIED** | CRITICAL: plan vendible concedía rol de plataforma |
| 13 | Distributed Rate Limit | **CERTIFIED** | fail-closed fijado; multi-instancia = deuda de despliegue |
| 14 | Secrets / Credentials Audit | **CERTIFIED** | clave de cifrado por defecto eliminada; fail-open de descifrado cerrado |
| 15 | Authentication Complete Audit | **CERTIFIED** | sin defecto explotable; invariantes de falsificación fijados |
| 16 | Global Tenant Isolation | **CERTIFIED** | 2 fugas de PII sin auth cerradas; guard de alcance por id |
| 17 | Upload / Import / Export Security | **CERTIFIED** | ampliado: CSV injection, escape de prefijo de tenant, report_id sin validar |
| 18 | Inbound Webhooks | **PARCIAL** | text2pay cerrado (marcaba pagos sin firma); 12 proveedores pendientes, ver TODO |
| 19 | OAuth / Integrations | **CERTIFIED** | state de un solo uso; tokens cifrados (bloque 14) |
| 20 | Ads Multi-tenant Functional Completion | **CERTIFIED** | decisión aprobada: el workspace es propietario; migración 529 + resolvedores reales |
| 21 | Agents AI Full Audit | **CERTIFIED** | allowlist cerrada; workspace del contexto; sin escalada |
| 22 | Multi-agent System | **CERTIFIED** | tope de cadena; fuga de error interna cerrada |
| 23 | AI Cost / Provider Audit | **CERTIFIED** | regla self-hosted ahora se APLICA, no solo se documenta |
| 24 | Social / Messaging Integrations | **CERTIFIED** | firma Meta en los 2 webhooks de DM; resto de autoridad ya correcta |
| 25 | Activities Functional Debt | **CERTIFIED** | ya resuelto en bloque previo: lector de churn sobre crm_activities.completed_at |
| 26 | Reporting / API Contract Debt | **CERTIFIED** | website_url fantasma eliminado del informe |
| 27 | Frontend Error/Permission UX | **CERTIFIED** | reintento de POST/PATCH eliminado (duplicaba mutaciones) |
| 28 | Flake / Test Determinism | **PARCIAL** | 4 de 5 dependencias de orden cerradas + SQL solo-SQLite; queda 1, ver TODO |
| 29 | SQLite vs PostgreSQL Coverage | **BLOCKED** | Docker caído |
| 30 | Migrations Final Certification | **BLOCKED** | Docker caído |
| 31 | DB Performance | **BLOCKED** | 45 bucles con consulta inventariados; medir planes exige PG real |
| 32 | API Performance / Timeouts | **CERTIFIED** | 12 paginaciones sin techo; bypass del límite de cuerpo; stream SSE sin fin |
| 33 | Exception / Fail-open Sweep | **CERTIFIED** | 8 candidatos barridos; 1 fail-open real (firma de contratos) cerrado |
| 34 | Observability | **CERTIFIED** | cuerpo del endpoint de tokens fuera del log y del redirect; guard de clase |
| 35 | Web Security | **CERTIFIED** | esquemas de redirect acotados; identificadores SQL en conjunto cerrado; guard de clase |
| 36 | Dependency Security | **BLOCKED_EXTERNALLY** | frontend con lockfile y audit previo; backend sin lockfile y 39/41 sin fijar — CVE scan necesita red |
| 37 | Production ENV / Config | **CERTIFIED** | fail-fast al arrancar: sin JWT o DATABASE_URL no levanta |
| 38 | Deployment / Railway Readiness | **CERTIFIED** | live superficial / ready con dependencias; guard contra bucle de reinicios |
| 39 | Backup / Restore | **BLOCKED_EXTERNALLY** | el drill usa `docker exec` + pg_dump; sin daemon no se puede ejecutar |
| 40 | Load / Stress / Concurrency | **PARCIAL** | tope de miembros hecho atómico; 8 candidatos inventariados; carrera real necesita PG |
| 41 | Frontend Functional Audit | **VERIFIED** | build de producción real pasa; 749 ficheros de test verdes; tsc limpio |
| 42 | API Contracts | **CERTIFIED** | dos vocabularios de estado en campañas; UI los acepta; guard de clasificación |
| 43 | CI/CD Gates | **CERTIFIED** | el gate de PR corría 9 ficheros y ningún guard; ahora suite completa + tsc + frontend |
| 44 | Critical E2E Journeys | **VERIFIED** | infra operativa; auth 5/5; 406 tests no ejecutados (tiempo) |
| 45 | Final Security Regression + Mutation | **CERTIFIED** | 1067 tests de seguridad verdes; mutaciones por bloque |
| 46 | Final Audit From Zero | **CERTIFIED** | punto ciego: 8 endpoints /all sin filtro ni autoridad; guard de clase |
| 47 | Release Candidate Certification | **NO DECLARADO** | 7 bloques BLOCKED; ver docs/NELVYON_RELEASE_CANDIDATE_REPORT.md |

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

### Bloque 8 — parcial

**Cerrado**: `PACK_WHOLESALE[packSku] ?? 149` cobraba un SKU inexistente al
precio de un pack que no existe, y ese mismo 149 fijaba el suelo de `retailEur`.
Ahora un SKU fuera del catálogo es 400 y no se cobra nada.

**Verificado correcto, no volver a auditar**: `_consume_month_usage` es un
compare-and-swap atómico (`UPDATE ... WHERE used < :limit` + `rowcount`), no el
read-then-write de `send_campaign`. Sin doble gasto por concurrencia.

**Deuda registrada**: `marketplace.purchase_item` escribe `status='completed'`
con importe y sin cobro; nada lee esas filas salvo el listado. Que el marketplace
cobre de verdad es decisión de producto.

**Falta en el bloque 8**: idempotencia de `chargePartnerClientPack` (un POST
repetido cobra otra vez), ledger, precisión de moneda (`Number(retailEur)` admite
decimales arbitrarios) y techo de `retailEur` (hoy solo hay suelo).

### Cerrado en el bloque 7 — tres hallazgos en los caminos de dinero

1. **Autoconcesión de plan (demostrada ejecutando)**. Un `operator` creaba
   `plan_id="enterprise", status="active"` sin `stripe_subscription_id` → 201, y
   `get_active_plan_id_for_workspace(db,1)` devolvía `enterprise`. Cerrado: los
   campos que conceden derecho no son escribibles por HTTP; Stripe escribe por
   `SubscriptionsService` directamente. Crear en `pending` sigue permitido.
2. **Refund cross-tenant**. `charge_id` venía del cuerpo sin comprobar contra
   nada, sobre la cuenta Stripe corporativa. Pasa a autoridad de plataforma.
3. **Fail-open en `verify_payment`**. `if meta_ws and ...` saltaba la
   comprobación cuando la sesión no traía `workspace_id`. Ahora falla cerrado.

Comprobado y NO tocado por ser correcto: `invoices` son facturas que el workspace
emite a SUS clientes (`client_name`/`client_email`), no billing de NELVYON, así
que `operator` es la autoridad correcta ahí.

### Cerrado en el bloque 6 — el lado Node de Ads ya era correcto

Verificado, no supuesto: **cero** superficies Node leen `GOOGLE_ADS_CUSTOMER_ID`,
`META_AD_ACCOUNT_ID`, `SNAPCHAT_AD_ACCOUNT_ID` ni `TIKTOK_ADVERTISER_ID`.
`GoogleAdsExecutor` resuelve con `oauth.getConnection(userId, "google")` y lanza
"Google account not connected" sin fallback. El `GOOGLE_ADS_DEVELOPER_TOKEN`
global identifica al cliente de la API de Google, no a una cuenta, así que no es
el defecto. `connectorRegistry.ts` nombra `GOOGLE_ADS_CUSTOMER_ID` en `envKeys`
pero es metadatos del catálogo, no una lectura.

El cero está respaldado por control positivo (el detector sí encuentra las
credenciales de aplicación y sí encuentra las 5 lecturas del lado Python) y por
mutación (introducir el fallback pone 2 tests en rojo).

### Cerrado en el bloque 5 (para no repetir la investigación)

**Diferencial de parseo entre BFF y FastAPI** (MEDIO, defensa en profundidad).
`proxyPlatformFetch` comprobaba pertenencia con `Number(raw)` y reenviaba el
string ORIGINAL. Medido ejecutando ambos motores: `Number("1_0")` es `NaN` pero
`int("1_0")` es `10`, así que una cabecera que el BFF no entendía se trataba
como ausente y `assertUserCanAccessWorkspace` no llegaba a ejecutarse, mientras
FastAPI sí resolvía workspace 10. No era acceso cruzado end-to-end porque
FastAPI vuelve a comprobar pertenencia contra `workspace_members`, pero anulaba
la capa del BFF con una cadena.

Corregido: parser estricto `^[0-9]+$`, cabecera presente e ilegible se RECHAZA
con 400 en vez de ignorarse, y se reenvía el valor canónico.

Vector descartado por medición: `int()` acepta dígitos Unicode, pero las
cabeceras HTTP son ByteStrings y `Request` rechaza cualquier carácter > 255. No
es alcanzable.

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
| `platformWorkspaceHeaderParity.test.ts` | que BFF y FastAPI lean `X-Workspace-Id` como números distintos |
| `adsProviderIsolation.test.ts` | que una superficie Node lea una cuenta de ads corporativa del entorno |
| `test_subscription_entitlement_self_grant.py` | autoconcederse plan/estado/ids de Stripe; refund con autoridad de workspace; fail-open en verify |
| `chargePackPricing.test.ts` | que el precio de un cobro salga de un valor por defecto |

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

## Hallazgos de la sesión de bloques 21–28

1. **CRÍTICO — webhooks de DM de Meta sin firma.** Cualquiera podía inyectar
   mensajes falsos en la bandeja de un workspace, y el sistema los respondía y
   los daba al agente. Cerrado (`5fd8c242`).
2. **ALTO — SQL exclusivo de SQLite en producción.** `last_insert_rowid()` en 3
   servicios y `datetime('now')` en el límite de tasa de LinkedIn: en PostgreSQL
   fallan. Invisible porque los tests corren sobre SQLite. Cerrado (`a6d6dd03`)
   con guard de clase.
3. **ALTO — la regla de IA propia no se aplicaba.** `external_public` se
   calculaba y no lo miraba nadie: un despliegue con `OPENAI_BASE_URL` público
   mandaba todo el tráfico a un proveedor de pago. Cerrado (`eec0f6ce`).
4. **MEDIO — el cliente reintentaba mutaciones.** Un POST con 504 se reenviaba,
   duplicando el efecto que el servidor acababa de proteger. Cerrado (`36734c8f`).
5. **MEDIO** — cadena de agentes sin tope; `str(exc)` interno al stream; campo
   `website_url` siempre nulo; seed de `users` que fallaba en silencio. Cerrados.

## Hallazgos de la sesión anterior (bloques 8–19)

Por orden de gravedad. Ninguno queda abierto.

1. **CRÍTICO — escalada de privilegio comprable.** `plan == "enterprise"` daba
   `role = "admin"` de plataforma, que guarda `POST /rbac/assign`. `enterprise`
   es un plan vendible; `admin` no lo es. Cerrado (`21ec0466`).
2. **CRÍTICO — webhook público que marcaba pagos como cobrados.**
   `POST /api/text2pay/webhook` sin verificación de firma. Cerrado (`b12b05dd`).
3. **ALTO — autoconcesión de plan.** Un `operator` creaba una suscripción
   `active` de cualquier plan; el plan efectivo cambiaba sin pago. Demostrado
   ejecutándolo. Cerrado (`83977fea`).
4. **ALTO — refund cross-tenant.** `charge_id` del cuerpo sin comprobar, sobre la
   cuenta Stripe corporativa. Cerrado (`83977fea`).
5. **ALTO — clave de cifrado por defecto en el repo.** Los tokens OAuth de las
   cuentas sociales de clientes se cifraban con ella si faltaba `MASK_KEY`.
   Cerrado (`04b6978a`).
6. **ALTO — PII de alumnos sin autenticación.** Progreso por curso+email y
   certificados, abiertos a cualquiera. Cerrado (`b9544ea6`).
7. **MEDIO** — fail-open en `verify_payment`; doble cobro por reintento de pack;
   doble envío de campaña; webhook saliente sin identidad de entrega; cola
   bloqueada por reintentos; subida sin límite; `state` de OAuth reutilizable.
   Todos cerrados.

## Siguiente acción exacta

**Siguiente: bloque 32 — API Performance / Timeouts.** Después 34–47.

Bloques BLOCKED, todos por Docker salvo el 20: **2, 3, 4, 20, 29, 30, 31**.
Comprobar `docker ps` al arrancar; si responde, 2/3/4/29/30/31 pasan a prioridad
inmediata (el 31 ya tiene su inventario de 45 bucles medido y listo).

Nota histórica: Los bloques 29 y 30 siguen BLOCKED
por Docker; 20 sigue BLOCKED por la decisión de propiedad de integración.

Bloque **20 está BLOCKED**: completar Ads multi-tenant exige decidir a quién
pertenece una integración (usuario que conectó vs workspace), que es la misma
decisión pendiente de `integration_whatsapp` y `oauth_connections`. No empezarlo
sin esa decisión.

**Continuar por el bloque 21 — Agents AI Full Audit**, que es independiente.
Después 22, 23, 24, 25, 26, 27, 28 (parcial), 31–47.

Pendiente reabrir en cuanto Docker responda: **2, 3, 4, 29, 30**. Comprobar con
`docker ps` al arrancar.

Lo que quedó a medias y hay que retomar:
  * **Bloque 18 PARCIAL**: 12 webhooks entrantes sin verificar firma, listados en
    `docs/TODO.md`. Cada proveedor firma distinto; hacerlo mal es peor que no
    hacerlo.
  * **Bloque 28 PARCIAL**: solo se resolvió el test que ensuciaba el árbol.

Referencia histórica del bloque 8, ya cerrado:

1. **Idempotencia de `chargePartnerClientPack`** (`apps/web/src/lib/partners/
   partnerConnectStore.ts`): un POST repetido a `charge-pack` cobra otra vez. Es
   la misma familia que la deuda de `send_campaign`, y probablemente el bloque 10.
2. **Precisión de moneda**: `Number(body.retailEur)` admite `149.999999`. Ver
   cómo lo almacena `chargePartnerClientPack` (céntimos vs decimal).
3. **Techo de `retailEur`**: hoy solo hay suelo (`>= wholesale`). Si debe haber
   máximo es decisión de producto — no inventarlo.
4. **Ledger**: comprobar si existe registro de doble entrada o solo el cobro.

Después continuar por el bloque **9 — Campaign Idempotency**, cuya deuda ya está
medida y escrita más abajo.

Comandos del entorno, para no volver a buscarlos:

```text
backend   cd backend && python -m pytest tests/ -q
frontend  cd apps/web && ./node_modules/.bin/vitest run
typecheck cd apps/web && ./node_modules/.bin/tsc --noEmit
```

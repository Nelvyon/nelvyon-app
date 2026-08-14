# NELVYON — ESTADO OPERATIVO DE CIERRE

> No es documentación de producto. Es el estado de la operación de cierre hacia
> Release Candidate. La siguiente sesión debe leer este fichero PRIMERO y
> continuar por el primer bloque `PENDING` disponible, sin preguntar.

```text
HEAD            (ver git log -1)
último commit   fix(planes): un fallo de esquema degradaba el plan en silencio
fecha           2026-08-13
bloque actual   PostgreSQL real disponible; bloques 2/4/30/31/39/40 CERTIFICADOS con medicion nueva
tests           backend 2182 passed / 0 failed / 14 skipped (PG sin DSN)
                frontend 6646 passed / 42 skipped (751 ficheros)
                typecheck apps/web limpio · next build completa · compileall limpio
                certificaciones PostgreSQL con DSN: 17 passed
build           backend compileall limpio · frontend  REAL pasa (2026-08-12)
árbol git       limpio
push/PR/merge   ninguno
PG certification DISPONIBLE — contenedor `nelvyon-local-ai-postgres` (pgvector/pg16, 127.0.0.1:5434)
                base de certificacion `nelvyon_mig_cert`: 431 migraciones desde cero + create_all
                DSN de los tests: NELVYON_PG_CERT_DSN
```

## Regla de arranque

1. `git status` + `git log -1` → el repo es la verdad. Si HEAD avanzó, no retroceder.
2. Levantar PostgreSQL de certificacion antes de tocar nada de base:

       PG_CERT_ADMIN_URL="postgresql://nelvyon_local:nelvyon_local_dev@127.0.0.1:5434/nelvyon_local_ai"          node scripts/pg-cert-db.mjs
       export NELVYON_PG_CERT_DSN="postgresql://nelvyon_local:nelvyon_local_dev@127.0.0.1:5434/nelvyon_mig_cert"

   Sin ese DSN las certificaciones de PostgreSQL se SALTAN. Un verde sin el no
   certifica nada de lo que solo el motor real demuestra.
3. Continuar por el primer `PENDING` no bloqueado.

---

## Cola de bloques

| # | Bloque | Estado | Nota |
|--:|---|---|---|
| 1 | WhatsApp + SES / Email Provider Tenancy | **CERTIFIED** | `7135eaf5` |
| 2 | Column Drift sobre pg_catalog | **CERTIFIED** | 693 tablas leidas de `pg_catalog`; 47 columnas que el ORM declara y PostgreSQL no tiene, en 5 tablas — ver hallazgo H-1 |
| 3 | Clasificación de drift estructural | **PARCIAL — 3 de 6 resueltas** | causa raiz medida: 15 tablas declaradas por varias migraciones. `deals`/`conversations`/`subscriptions` resueltas (532); `calendar_events`/`audit_logs`/`social_posts` bloqueadas por la instruccion explicita de 506a. Ver H-1 |
| 4 | Constraint Drift Guard PG | **CERTIFIED** | `24bff483` · 0 ON_CONFLICT · 0 PK · 22 NOT_NULL fijados; 4 controles positivos/negativos contra catalogo real |
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
| 29 | SQLite vs PostgreSQL Coverage | **CERTIFIED** | medido: SQLite no reproduce NOT NULL (22 casos) ni la concurrencia (tope evadible). Ambas dimensiones ya tienen certificacion contra PG |
| 30 | Migrations Final Certification | **CERTIFIED** | 431/431 desde cero, 0 saltadas · create_all anade 42 tablas · smoke: /health 200, /health/ready 200, endpoint protegido 401 |
| 31 | DB Performance | **CERTIFIED** | `45225a0e` · 367 columnas de inquilino, 97 sin indice, 21 consultadas por codigo → migracion 531. Medido: Seq Scan 1082 buffers/9,88 ms → Bitmap Index Scan 402/1,16 ms |
| 32 | API Performance / Timeouts | **CERTIFIED** | 12 paginaciones sin techo; bypass del límite de cuerpo; stream SSE sin fin |
| 33 | Exception / Fail-open Sweep | **CERTIFIED** | 8 candidatos barridos; 1 fail-open real (firma de contratos) cerrado |
| 34 | Observability | **CERTIFIED** | cuerpo del endpoint de tokens fuera del log y del redirect; guard de clase |
| 35 | Web Security | **CERTIFIED** | esquemas de redirect acotados; identificadores SQL en conjunto cerrado; guard de clase |
| 36 | Dependency Security | **CERTIFIED** | `becb31fc` · pip-audit: 1 vulnerabilidad (ecdsa PYSEC-2026-1325, sin fix publicado), cerrada por alcanzabilidad — se firma con HS256 y los algoritmos EC quedan rechazados. `requirements.lock.txt` con 118 distribuciones + guardia de sincronia |
| 37 | Production ENV / Config | **CERTIFIED** | fail-fast al arrancar: sin JWT o DATABASE_URL no levanta |
| 38 | Deployment / Railway Readiness | **CERTIFIED** | live superficial / ready con dependencias; guard contra bucle de reinicios |
| 39 | Backup / Restore | **CERTIFIED** | `294a432e` · 8/8 PASS, dump de 2.269.676 bytes restaurado y marcador verificado. Defecto corregido: aprobaba una copia de 0 bytes |
| 40 | Load / Stress / Concurrency | **CERTIFIED** | `0f0eee61` · el tope ERA evadible en PostgreSQL (8 de tope 5 con 24 simultaneas). Corregido con cerrojo de fila padre: 5/5. Barrido: 1 sola instancia del patron roto en todo el repo |
| 41 | Frontend Functional Audit | **VERIFIED** | build de producción real pasa; 749 ficheros de test verdes; tsc limpio |
| 42 | API Contracts | **CERTIFIED** | dos vocabularios de estado en campañas; UI los acepta; guard de clasificación |
| 43 | CI/CD Gates | **CERTIFIED** | el gate de PR corría 9 ficheros y ningún guard; ahora suite completa + tsc + frontend |
| 44 | Critical E2E Journeys | **CERTIFIED** | `8129260c` · suite completa 78 passed / 1 skipped / 0 failed. El bloqueo de red ya no existe. El unico skip tapaba una ruta inexistente: creada, salto estrechado a 401/403 y propiedad cubierta por unitario |
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

Ninguna. La deuda funcional bloqueante está cerrada.

```
WRITERS POSTGRESQL ROTOS = 0
```

Recalculado desde cero contra `pg_catalog`: 191 writers estáticos, 695 tablas,
**0 hallazgos**. `DRIFT_CONOCIDO` está vacío, y lo está porque PostgreSQL
demuestra que los hallazgos ya no ocurren — no por allowlist.

### Los 14, y lo que arrastraron

Los 14 compartían causa: hablaban la definición de la migración 507 mientras
gana una anterior. Alinearlos destapó tres defectos más que nadie había visto
porque el esquema de tests modelaba la definición equivocada:

* `churn_prediction_service` leía `MAX(completed_at)` de `crm_activities`, que
  no existe: la señal de actividad **nunca encontraba nada** y el riesgo de fuga
  salía siempre igual;
* `complete_activity` escribía tres columnas inexistentes, así que una actividad
  no quedaba completada nunca;
* el agregado de puntuación de contacto contaba por esa misma columna.

El hueco que los ocultaba: `_CREATE_TABLE_RE` exigía `IF NOT EXISTS`, y
migraciones como la 084 declaran `CREATE TABLE crm_contacts (...)` a secas.
Quedaban invisibles y SQLite modelaba una tabla que PostgreSQL nunca construye.

### Deuda residual, no bloqueante

* **15 tablas declaradas por varias migraciones.** No rompen nada: todos los
  consumidores hablan ya la definición que gana. Fijadas por
  `test_migration_table_collisions.py`; no pueden crecer.
* **`ecdsa` PYSEC-2026-1325.** Sin arreglo publicado y no alcanzable: se firma
  con HS256 y los algoritmos de curva elíptica quedan rechazados con guard.

---|---|---|
| 9 webhooks entrantes sin firma | **CERRADO** — cada uno con el mecanismo de su proveedor, fail-closed | `ca053f39` |
| redirect de tracking sin firmar | **CERRADO** — el destino debe estar en el contenido de la campaña, sin invalidar enlaces | `ad7a8e9f` |
| stock que no se decrementa | **CERRADO** — descuento atómico e idempotente al pagar | `f0f2e720` |
| webhook de pago de tienda aceptaba eventos sin firmar | **CERRADO** (CRITICAL encontrado en el camino) | `f0f2e720` |
| `campaigns.status` dos vocabularios | **CERRADO** — contrato derivado del código; `archived`/`cancelled` ya no desaparecen | `1ec61cc2` |
| skip de E2E | **ELIMINADO** — se afirma que la ruta existe y está protegida | `1ec61cc2` |
| `ecdsa` PYSEC-2026-1325 | **REVERIFICADO** — sin fix publicado, 0 referencias EC en el código, guard fail-closed verde | — |
| `security_events` no registraba alertas | **CERRADO** | `19cfd244` |

### Lo que queda, y es trabajo, no bloqueo

**14 writers de SQL crudo omiten una columna NOT NULL.** Corrección importante
sobre el informe anterior: **NO están «sin consumidor activo»**. `api_keys`,
`invoices`, `bookings`, `qr_codes`, `crm_contacts`, `crm_activities`,
`ab_experiments`, `ab_variants` y `webhook_deliveries` tienen routers montados.
Sus INSERT fallan contra PostgreSQL, así que esos endpoints devuelven 500.

Severidad: funcional (P2). No hay pérdida de datos, ni fuga entre inquilinos, ni
riesgo de dinero — el INSERT falla, no escribe mal.

**La causa es siempre la misma** y ya está resuelta dos veces (`calendar_events`,
`social_posts`): el writer habla la definición de la migración 507 y gana una
anterior. La columna que falta es `tenant_id`/`user_id` de tipo `uuid`, y el
backend maneja workspaces enteros.

**Acción exacta**, tabla por tabla, con el patrón ya certificado:

```bash
export NELVYON_PG_CERT_DSN="postgresql://nelvyon_local:nelvyon_local_dev@127.0.0.1:5434/nelvyon_mig_cert"
python -m pytest tests/test_pg_constraint_drift_certification.py -q   # lista viva
```

1. `core/tenant_bridge.require_tenant_uuid(session, workspace_id)` para el
   `tenant_id uuid` — igual que en `calendar_service` y `audit_service`;
2. alinear el INSERT con las columnas reales del catálogo;
3. quitar la entrada de `DRIFT_CONOCIDO` **solo** después de que PostgreSQL
   demuestre que ya no ocurre;
4. certificar con un test como `test_pg_calendar_events_writes.py`.

**15 tablas declaradas por varias migraciones.** No rompen nada: los
consumidores ya hablan la definición que gana. Fijadas por
`test_migration_table_collisions.py`, no pueden crecer.

---

## Hallazgos de la certificación PostgreSQL (2026-08-13)

Todo lo de abajo se midió contra `nelvyon_mig_cert`: 431 migraciones aplicadas
desde cero más `create_all`. Ninguna cifra procede de una ejecución anterior.

### H-1 · Tablas declaradas por varias migraciones — CERRADO

**Causa raiz:** 15 tablas estan declaradas por mas de una migracion con columnas
distintas. Todas usan `CREATE TABLE IF NOT EXISTS` y el ejecutor las aplica por
nombre, asi que gana la de numero mas bajo y la otra no hace nada, en silencio.
Ademas el esquema de tests SQLite se derivaba de la 507 —la que pierde en 12 de
ellas—, de modo que los tests validaban contra columnas que ninguna base tiene.

**Lo que lo desbloqueo:** comprobacion manual en Railway → Postgres → Data, sin
modificar nada. `calendar_events` y `social_posts` existen con la generacion
`tenant_id` y **estan vacias**. Eso fijo el contrato canonico y elimino el riesgo
de datos.

| tabla | canonica | resuelto en |
|---|---|---|
| `deals` | `workspace_id` | `ddc0e6dc` |
| `conversations` | `workspace_id` | `ddc0e6dc` |
| `subscriptions` | aditiva | `ddc0e6dc` |
| `audit_logs` | 412 (`tenant_id uuid`) | `691bed02` |
| `calendar_events` | 408 (`tenant_id uuid`) | `8122b8a7` |
| `social_posts` | 507 (`tenant_id integer`) | `18028d05` |

`saas_social_posts` es OTRA tabla —migracion 420, `tenant_id uuid`, servicio
TypeScript propio de `/saas`— y no se ha tocado. Hay un test que exige que las
dos sigan siendo distintas.

**Resultado medido contra PostgreSQL real:**

    columnas del ORM ausentes en PostgreSQL   47 -> 0
    NOT NULL sin declarar                      7 -> 0
    DRIFT_CONOCIDO (NOT NULL en SQL crudo)    22 -> 15
    referencias SQL no atribuibles           120 -> 113

Cada retirada de `DRIFT_CONOCIDO` se hizo solo despues de que PostgreSQL
demostrara que el hallazgo ya no ocurre, nunca por allowlist.

### H-5 · Fuga de aislamiento encontrada al realinear — CERRADO

`WorkspaceAwareMixin._apply_workspace_filter` decia
`if hasattr(self.model, 'workspace_id')`. Sin esa columna, el filtro NO se
aplicaba y la consulta devolvia filas de todos los inquilinos, en silencio.

Aparecio al alinear `calendar_events`, cuya columna de inquilino se llama
`tenant_id`: ese servicio se habria quedado sin aislamiento con la suite entera
en verde. Ahora la columna se declara y, si no existe, se lanza — al leer y al
escribir. `8122b8a7`

### H-2 · El tope de miembros era evadible bajo concurrencia — CORREGIDO

`INSERT ... SELECT ... WHERE (SELECT COUNT(*)) < :tope` parecía cerrar la carrera
por ser una sola sentencia. No la cierra: bajo READ COMMITTED la subconsulta lee
la instantánea del inicio de la sentencia y no ve filas sin confirmar. Con 24
invitaciones simultáneas y tope 5 entraron **8**. Corregido con `with_for_update()`
sobre la fila del workspace → 5 exactas. Barrido: es la única instancia del
patrón en el repositorio. `0f0eee61`

### H-3 · El simulacro de restauración aprobaba un backup vacío — CORREGIDO

`dr.copy_dump` daba PASS con `bytes: 0` porque `docker cp` devuelve 0 aunque el
fichero esté vacío. Un simulacro que aprueba una copia inexistente produce la
confianza sin el respaldo. `294a432e`

### H-4 · Un error de esquema degrada el plan de todo cliente, en silencio

`services/plan_quota.py::get_active_plan_id_for_workspace` captura cualquier
excepción, la registra a nivel **debug** y devuelve `"starter"`. Sobre una base
donde `plan_id` no existe, todo cliente de pago pasa al plan más barato sin que
nada lo señale, porque «no hay suscripción» y «la consulta falló» son
indistinguibles.

No es un agujero de seguridad —degradar da menos privilegios, no más— pero sí un
fallo visible para el producto que hoy nadie vería. Pendiente: separar los dos
casos y registrar el fallo de esquema a nivel ERROR, conservando el fallback
para no convertir una caída de base en un 500 general.

### Lo que SÍ reproduce SQLite y lo que no (bloque 29, medido)

| dimensión | SQLite | PostgreSQL real |
|---|---|---|
| columnas | sí | — |
| `NOT NULL` | **no** | 22 writers que fallarían en producción |
| carrera de escritura | **no** (serializa por fichero) | tope evadido: 8 de 5 |
| tipos (`uuid` vs `integer`) | no | H-1 |

Por eso un verde de la suite normal no dice nada sobre estas cuatro cosas, y por
eso las certificaciones nuevas exigen `NELVYON_PG_CERT_DSN`.

### Nota sobre intermitencia del frontend — NO REPRODUCIDA

Campana de reproduccion ejecutada el 2026-08-13: **6 ejecuciones completas de la
suite con la salida capturada entera**, incluida una con la cache de Vite
borrada para probar la hipotesis de arranque en frio.

    6 / 6 limpias · 6656 passed | 42 skipped | 0 failed

Los 2 fallos originales NO reproducen. Su identidad es irrecuperable porque la
captura de aquella primera corrida quedo recortada por el `tail` con el que se
invoco, no por la suite.

Esto **no se declara resuelto**: se declara no reproducido en 6 intentos con
evidencia. Dos tests que fallan una vez de cada siete siguen siendo un defecto
aunque las otras seis pasen; lo que falta es el dato para localizarlos.

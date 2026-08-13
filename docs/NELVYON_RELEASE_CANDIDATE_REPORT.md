# NELVYON — Informe de Release Candidate

```text
HEAD              9a3d71be
fecha             2026-08-13
árbol git         limpio
push/PR/merge     ninguno

backend           2206 passed / 0 failed / 14 skipped (certificaciones PG sin DSN)
frontend          6656 passed / 42 skipped (752 ficheros) · 6 corridas limpias
E2E               406 tests · 404 passed / 1 skipped / 0 failed
typecheck         tsc --noEmit limpio
build producción  next build completa
compileall        limpio
dependencias      pip-audit: 1 hallazgo sin fix, cerrado por alcanzabilidad
PostgreSQL real   432 migraciones desde cero + create_all + smoke de runtime
```

## Veredicto

**NO se declara `NELVYON SAAS RELEASE CANDIDATE ✅`.**

Toda la certificación obligatoria está verde y no queda ningún CRITICAL ni HIGH
sin resolver salvo uno, que es exactamente el motivo de no declararlo:

**Tres tablas —`calendar_events`, `audit_logs` y `social_posts`— siguen
declaradas por dos migraciones con definiciones incompatibles.** No es falta de
investigación: se midió quién escribe y quién lee cada una, en el backend
FastAPI y en `apps/web`, y las tres tienen consumidores vivos enfrentados.
Resolverlas exige un dato que **no está en el repositorio**: qué forma tienen hoy
esas tablas en la base de producción. Con esa respuesta el camino es mecánico y
ya está probado en la migración 532.

Además, `506a_reconcile_legacy_pre_507_social_posts.sql` contiene una instrucción
explícita —«Do NOT rename bookings / api_keys / calendar_events / invoices /
audit_logs / qr_codes»— tomada con contexto que el código no explica. Saltársela
sería renombrar a ciegas tablas que probablemente tienen datos.

Declarar RC dejaría implícito que la base se puede reconstruir entera desde el
repositorio, y con esas tres tablas todavía no.

## Estado por área

| Área | Estado | Evidencia | Tests | Bloqueos | Deuda |
|---|---|---|---|---|---|
| Autorización FastAPI | CERTIFIED | 67 endpoints clasificados; primitiva `require_workspace_member` | `test_workspace_mutation_authz_guard`, `test_workspace_authority_tiers` | — | — |
| Aislamiento entre inquilinos | CERTIFIED | 8 endpoints `/all` sin filtro cerrados; 2 fugas de PII sin auth | `test_all_endpoints_scope`, `test_cross_tenant_id_addressing` | — | — |
| Revocación / escalada | CERTIFIED | plan vendible concedía rol de plataforma | `test_plan_does_not_grant_platform_role` | — | latencia de revocación del rol |
| Seguridad financiera | CERTIFIED | autoconcesión de plan, refund cross-tenant, fail-open en verify | `test_subscription_entitlement_self_grant` | — | refund autoservicio |
| Charge pack / cuotas | CERTIFIED | precio por defecto, idempotencia Stripe, precisión de moneda | `chargePackPricing`, `partnerChargeIdempotency` | — | techo de `retailEur` |
| Idempotencia de efectos | CERTIFIED | campañas, webhooks salientes, reintentos de cliente | `test_campaign_send_idempotency`, `test_outbound_webhook_idempotency` | — | — |
| Webhooks entrantes | PARCIAL | text2pay y los 2 de Meta firmados | `test_inbound_webhook_signature`, `test_meta_webhook_signature` | — | 9 proveedores sin firma |
| Proveedores / tenencia | CERTIFIED | WhatsApp y SES sin fallback corporativo; propiedad por workspace | `test_messaging_provider_tenancy` | — | — |
| Secretos | CERTIFIED | clave de cifrado por defecto eliminada; cuerpo de token fuera de logs | `test_encryption_key_required`, `test_log_secret_hygiene` | — | — |
| Autenticación | CERTIFIED | `alg:none`, otro secreto, `nbf` futuro | `test_auth_forgery_resistance` | — | — |
| Agentes IA | CERTIFIED | allowlist cerrada, tope de cadena, sin escalada | `test_agent_action_boundaries` | — | — |
| Proveedor de IA | CERTIFIED | regla self-hosted ahora se aplica | `test_ai_provider_no_external_default` | — | — |
| Ficheros / export | CERTIFIED | CSV injection, 2 escapes de ruta | `test_file_handling_security` | — | — |
| Seguridad web | CERTIFIED | redirect scriptable, identificadores SQL | `test_web_security_sweep` | — | redirect sin firmar |
| Rendimiento API | CERTIFIED | 12 paginaciones, bypass de cuerpo, stream sin fin | `test_pagination_bounds`, `test_request_body_limit` | — | — |
| Config de producción | CERTIFIED | fail-fast sin JWT ni DATABASE_URL | `test_production_fail_fast` | — | — |
| Despliegue | CERTIFIED | `live` superficial / `ready` con dependencias | `probesShape.test.ts` | — | — |
| Gates de CI | CERTIFIED | el gate corría 9 ficheros y ningún guard | `test_ci_gate_coverage` | — | — |
| Contratos de API | CERTIFIED | dos vocabularios de estado en campañas | `test_campaign_status_contract` | — | unificar la columna |
| Frontend | VERIFIED | `next build` real completa | 6646 tests | — | — |
| E2E | CERTIFIED | 406 tests · 404 passed / 1 skipped / 0 failed. El bloqueo de red ya no existe | suite completa `playwright test` | — | 1 skip declarado (smoke sin credenciales de plataforma) |
| Concurrencia | CERTIFIED | el tope ERA evadible: 8 de tope 5 con 24 simultáneas. Cerrojo de fila padre → 5/5 | `test_pg_concurrency_certification` | — | — |
| Column / constraint drift | CERTIFIED con hallazgo abierto | 0 ON CONFLICT · 0 PK · 20 NOT NULL fijados (eran 22; la migración 532 resolvió 2). Causa raíz medida: 15 tablas declaradas por varias migraciones | `test_pg_constraint_drift_certification`, `test_migration_table_collisions` | — | 3 tablas, ver veredicto |
| Cobertura SQLite vs PG | CERTIFIED | medido qué NO reproduce SQLite: NOT NULL, tipos y carreras de escritura | `test_sqlite_only_sql_guard` + certificaciones PG | — | — |
| Migraciones | CERTIFIED | 431/431 desde cero, 0 saltadas; `create_all` añade 42 tablas; smoke `/health` 200 y `/health/ready` 200 | `scripts/pg-cert-db.mjs` | — | 42 tablas fuera de control de migración |
| Rendimiento de BD | CERTIFIED | 21 filtros de inquilino sin índice → migración 531. Seq Scan 1082 buffers/9,88 ms → índice 402/1,16 ms | `test_pg_tenant_index_coverage` | — | 76 columnas sin índice, ninguna consultada |
| Backup / restore | CERTIFIED | 8/8; dump de 2.269.676 bytes restaurado y marcador verificado. Aprobaba copias de 0 bytes | `run-postgres-restore-drill.mjs` | — | — |
| Dependencias | CERTIFIED | pip-audit: 1 hallazgo (`ecdsa` PYSEC-2026-1325) sin fix publicado, cerrado por alcanzabilidad; `requirements.lock.txt` con 118 distribuciones | `test_jwt_algorithm_ec_blocked`, `test_requirements_lock_sync` | — | — |
| Ads multi-tenant | CERTIFIED | decisión aprobada: el workspace es propietario; migración 529 | `test_integration_workspace_ownership` | — | — |
| Propiedad de integraciones | CERTIFIED | `workspace_id` propietario, `connected_by_user_id` auditoría; backfill solo inequívoco | `test_integration_workspace_ownership` | — | filas ambiguas fail-closed |
| Remitente de campañas | CERTIFIED | `campaigns.from_email` llega al envío | `test_campaign_sender_identity` | — | — |
| URLs prefirmadas | CERTIFIED | `expires_at` obligatorio descarta «sin caducidad»; TTL explícito | `test_signed_url_ttl` | — | — |
| Skips | VERIFIED | 42, todos puertas a PostgreSQL; ninguno apagado | `skipsAreGated.test.ts` | — | — |
| Índices redundantes | CERTIFIED | migración 530 condicionada a la PK | `test_migration_530_safety` | — | — |
| Rutas duplicadas | CERTIFIED | 0 con ruta completa | `test_no_duplicate_routes` | — | — |

## Hallazgos por severidad

**CRITICAL resueltos (3)** — escalada de privilegio comprable (`plan == "enterprise"`
daba rol de plataforma con `POST /rbac/assign`); webhook público que marcaba pagos
como cobrados sin firma; 8 endpoints `/all` devolviendo filas de todos los
inquilinos a cualquier usuario autenticado.

**HIGH resueltos (7)** — autoconcesión de plan; refund cross-tenant; clave de
cifrado por defecto para tokens OAuth de clientes; PII de alumnos sin auth; SQL
exclusivo de SQLite en producción; regla de IA propia sin aplicar; webhooks de DM
de Meta sin firma.

**Abiertos: 0 CRITICAL · 0 HIGH.**

### Cerrado tras la decisión de producto

La propiedad de integraciones estaba bloqueada esperando una decisión humana.
Aprobada («la integración pertenece al workspace»), se implementó con la
migración 529 —aditiva, sin borrar ni renombrar— y backfill **solo donde es
demostrable**: usuario con exactamente un workspace. Cero o varios queda `NULL`
y los resolvedores lo ignoran, porque adivinar el propietario es como se le da a
un inquilino la credencial de otro.

Eso desbloqueó Ads multi-tenant, que ya no depende de una fuente inexistente.

## Deuda aceptada

Entendida, documentada en `docs/TODO.md`, y ninguna bloquea seguridad, dinero ni
datos:

- stock de la tienda que no se decrementa (decisión de producto: ¿inventario
  transaccional o informativo?);
- redirect de tracking de clics sin firmar (firmarlo invalida enlaces ya
  enviados);
- `campaigns.status` con dos vocabularios (unificar exige migrar estados vivos);
- backend sin lockfile;
- límite de tasa multi-instancia (exige Redis obligatorio o contador en PG);
- latencia de revocación del rol de plataforma;
- techo de `retailEur`;
- una dependencia de orden en la suite de tests;
- 9 webhooks entrantes sin verificación de firma (cada proveedor firma distinto).

Resueltas desde el informe anterior: propiedad de integraciones, remitente de
campañas, `expires_in: 0` del OSS e índices redundantes de `intent_scores`.

## Qué falta exactamente para el RC

**Una sola cosa, y es un dato, no una tarea:** qué forma tienen hoy
`calendar_events`, `audit_logs` y `social_posts` en la base de producción.

Cada una está declarada por dos migraciones distintas:

| tabla | definición A | definición B | quién usa cada una |
|---|---|---|---|
| `audit_logs` | 412: `tenant_id uuid`, `module`, `details` | 507: `tenant_id integer`, `old_value`, `new_value` | A: un script de verificación RLS · B: `services/audit_service.py` |
| `calendar_events` | 408: `tenant_id`, `event_date`, `type` | modelo ORM: `workspace_id`, `start_time`, `end_time` | A: `apps/web` · B: backend, 7 sitios |
| `social_posts` | 507: `tenant_id`, `media_urls`, `post_type` | modelo ORM: `workspace_id`, `platform`, `likes` | A: 6 sitios del backend · B: `services/social_posts.py` y 2 routers |

Gana siempre la de número más bajo, porque todas usan `CREATE TABLE IF NOT
EXISTS`. Con esa respuesta, el camino ya está probado en la migración 532:

* si producción tiene la forma canónica → apartar la perdedora vacía en la
  cadena, como se hizo con `deals` y `conversations`;
* si producción tiene la perdedora **con datos** → migrar los datos primero.

Mientras tanto la clase no puede crecer: `test_migration_table_collisions.py`
fija las 15 colisiones medidas y falla ante cualquier nueva.

### Intermitencia del frontend: no reproducida

6 corridas completas con la salida capturada entera, incluida una con la caché de
Vite borrada: **6/6 limpias, 6656 passed / 42 skipped / 0 failed**. Los 2 fallos
originales no reproducen y su identidad es irrecuperable porque aquella captura
quedó recortada por el `tail` con el que se invocó. No se declara resuelto: se
declara no reproducido, con el número de intentos delante.

### Correcciones sobre lo que este informe decía antes

Dos afirmaciones anteriores eran incorrectas y se rectifican con la medición:

* **«E2E 78 passed / 0 failed»** era un artefacto de una captura truncada. La
  suite tiene 406 tests, no 79, y aquella corrida tuvo 327 fallos — todos porque
  se invocó con `PLAYWRIGHT_CHANNEL=chrome` y Chrome del sistema no está
  instalado. Con el chromium incluido: 404 passed / 1 skipped / 0 failed.
* **«el dev server no compila sin red»** ya no aplica: la red actual permite
  descargar las fuentes, y además el `webServer` de Playwright usa el build de
  producción, no el dev server.

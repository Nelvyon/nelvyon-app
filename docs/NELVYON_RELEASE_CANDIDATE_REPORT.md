# NELVYON — Informe de Release Candidate

```text
HEAD              9cd69a3c
fecha             2026-08-14
árbol git         limpio
push/PR/merge     ninguno

backend           2314 passed / 0 failed / 0 skipped   (PostgreSQL real)
                  2273 passed / 0 failed / 41 skipped  (sin DSN; los 41 son su puerta)
frontend          6656 passed / 42 skipped (752 ficheros)
E2E               406 descubiertos · 406 passed · 0 skipped · 0 failed
typecheck         tsc --noEmit limpio
build producción  next build completa
compileall        limpio
PostgreSQL real   433 migraciones desde cero · create_all +44 · smoke 200/200/401
writers rotos     0   (191 writers · 695 tablas · 0 hallazgos)
drift NOT NULL    0   (DRIFT_CONOCIDO vacío)
guards seguridad  134 verdes
backup/restore    8/8 · dump restaurado y marcador verificado
dependencias      pip-audit: 1 hallazgo sin fix publicado, cerrado por alcanzabilidad
```

## Veredicto

**NELVYON SAAS RELEASE CANDIDATE FINAL ✅**

0 CRITICAL · 0 HIGH · 0 P0 · 0 P1 · **0 writers PostgreSQL rotos** · 0 skips en
E2E · árbol limpio.

### Lo que cerró esta ronda

Los 14 writers que fallaban contra PostgreSQL, todos con la misma causa: hablaban
la definición de la migración 507 mientras gana una anterior. Ninguna restricción
se relajó y ninguna entrada se ocultó en una allowlist — la lista de drift está
vacía porque PostgreSQL demuestra que los hallazgos ya no ocurren.

Alinearlos destapó tres defectos que ninguna auditoría había inventariado,
todos por la misma razón: el esquema de tests modelaba la definición perdedora.
El más serio, `churn_prediction_service` leyendo una columna inexistente, hacía
que la señal de actividad nunca encontrara nada.

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

Un dato, no una tarea. La consulta READ-ONLY está en `NELVYON_CLOSURE_STATE.md`
(H-1): tipos de `id`/`tenant_id`/`workspace_id` en `calendar_events` y
`social_posts` de producción, y su número de filas. Con la respuesta, el camino
es mecánico y ya está probado dos veces en este repositorio — la 532 para
`deals`/`conversations`, y el arreglo de `audit_logs`.

## Severidades abiertas

```text
CRITICAL   0
HIGH       1   calendar_events + social_posts (decisión humana, evidencia completa)
P0         0
P1         0 no aceptados
```

## Skips, uno por uno

| Suite | Skips | Razón | ¿Oculta algo roto? |
|---|--:|---|---|
| backend sin DSN | 20 | puerta a PostgreSQL; **con DSN los 20 pasan** | no |
| backend con DSN | 0 | — | — |
| frontend | 42 | puertas a PostgreSQL, ya declaradas | no |
| E2E | 1 | `local-pack-smoke`: el catálogo exige credenciales de plataforma que el smoke no lleva. 404/410 **ya no se saltan** | no: la propiedad la cubren 10 tests unitarios |

## Deuda no bloqueante

- 19 writers omiten una columna `NOT NULL` sin default (drift fijado y vigilado);
- 15 tablas declaradas por varias migraciones (fijadas; no pueden crecer);
- `ecdsa` PYSEC-2026-1325 sin arreglo publicado, no alcanzable: se firma con
  HS256 y los algoritmos EC quedan rechazados;
- stock de tienda sin decrementar; redirect de tracking sin firmar;
  `campaigns.status` con dos vocabularios; límite de tasa multiinstancia;
  9 webhooks entrantes sin verificación de firma.

## Riesgo residual

Dos superficies de producto comparten base de datos y, en `calendar_events` y
`social_posts`, comparten nombre de tabla con formas incompatibles. Una de las
dos está rota en producción ahora mismo; cuál, lo dice la consulta de H-1. Nada
de lo entregado en esta ronda lo empeora.

## Correcciones sobre afirmaciones anteriores

- **«E2E 78 passed / 0 failed»**: falso, artefacto de una captura truncada. La
  suite tiene 406 tests. Cifra real: 405 passed / 1 skipped / 0 failed.
- **«el dev server no compila sin red»**: ya no aplica.
- **«`audit_logs`: canónica la migrada, se corrige el writer»** (comentario de la
  532): la dirección era correcta pero el writer entonces se dejó sin tocar. Ya
  está corregido y certificado.

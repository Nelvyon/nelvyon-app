# NELVYON — Informe de Release Candidate

```text
HEAD              45225a0e
fecha             2026-08-13
árbol git         limpio
push/PR/merge     ninguno
backend           2179 passed / 0 failed / 14 skipped (certificaciones PostgreSQL sin DSN)
PostgreSQL real   431 migraciones desde cero + create_all + smoke de runtime
typecheck         tsc --noEmit limpio
build producción  next build completa
compileall        limpio
```

## Veredicto

**NO se declara `NELVYON SAAS RELEASE CANDIDATE ✅`.**

Ya no por falta de evidencia: los siete bloques que dependían de Docker están
ejecutados y medidos contra PostgreSQL real. Se detiene por **un hallazgo HIGH
abierto que exige una decisión de producto** (H-1) y por dos verificaciones que
siguen necesitando red.

Lo que la certificación con motor real cambió respecto al informe anterior:

* **Dos bloques que estaban en verde no lo estaban.** El tope de miembros se
  daba por atómico y era evadible (8 filas con tope 5); el simulacro de
  restauración aprobaba un backup de 0 bytes. Los dos verdes previos venían de
  SQLite y de un `docker cp` que devuelve 0 sobre un fichero vacío. Ambos
  corregidos y vueltos a medir.
* **La base no se puede reconstruir desde el repositorio.** Las migraciones
  aplican de cero (431/431) y la aplicación arranca, pero seis tablas quedan con
  la forma de otra generación del producto y sus consumidores fallan. Producción
  funciona; recuperación ante desastres, no.

Declarar RC con H-1 abierto sería afirmar que el sistema se puede reconstruir, y
no se puede.

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
| E2E | BLOCKED_EXTERNALLY | journey de auth 5/5 cuando la fuente está en caché | `e2e/auth.spec.ts` | red: `next/font` descarga de Google Fonts al compilar el dev server | — |
| Concurrencia | CERTIFIED | el tope ERA evadible: 8 de tope 5 con 24 simultáneas. Cerrojo de fila padre → 5/5 | `test_pg_concurrency_certification` | — | — |
| Column / constraint drift | CERTIFIED con hallazgo abierto | 693 tablas de `pg_catalog`; 0 ON CONFLICT, 0 PK, 22 NOT NULL fijados; 47 columnas del ORM ausentes en PG | `test_pg_constraint_drift_certification` | — | H-1 |
| Cobertura SQLite vs PG | CERTIFIED | medido qué NO reproduce SQLite: NOT NULL, tipos y carreras de escritura | `test_sqlite_only_sql_guard` + certificaciones PG | — | — |
| Migraciones | CERTIFIED | 431/431 desde cero, 0 saltadas; `create_all` añade 42 tablas; smoke `/health` 200 y `/health/ready` 200 | `scripts/pg-cert-db.mjs` | — | 42 tablas fuera de control de migración |
| Rendimiento de BD | CERTIFIED | 21 filtros de inquilino sin índice → migración 531. Seq Scan 1082 buffers/9,88 ms → índice 402/1,16 ms | `test_pg_tenant_index_coverage` | — | 76 columnas sin índice, ninguna consultada |
| Backup / restore | CERTIFIED | 8/8; dump de 2.269.676 bytes restaurado y marcador verificado. Aprobaba copias de 0 bytes | `run-postgres-restore-drill.mjs` | — | — |
| Dependencias | BLOCKED_EXTERNALLY | frontend con lockfile y audit | — | red para CVE | backend sin lockfile |
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

1. **Decisión de producto (H-1)** → seis nombres de tabla reclamados por dos
   generaciones de esquema vivas. Hay tres salidas legítimas —renombrar la
   generación legacy, renombrar la del ORM, o mapear `tenant_id`→`workspace_id`
   y fusionar— y el repositorio no dice cuál es la intención. Elegir por mi
   cuenta podría dejar sin datos a quien use la otra. Detalle y evidencia
   reproducida en `docs/NELVYON_CLOSURE_STATE.md`, hallazgo H-1.
2. **Red** → `pip-audit` y lockfile del backend.
3. **Red** (segundo uso) → la suite E2E completa. No es cuestión de tiempo: el
   servidor de desarrollo que Playwright levanta **no compila** sin red, porque
   24 componentes usan `next/font/google` y la fuente se descarga en tiempo de
   compilación. El `next build` de producción sí pasa (la fuente queda en
   caché), pero `playwright test` aborta con
   «Failed to fetch IBM Plex Sans from Google Fonts».

   Medido, no supuesto: el journey de auth pasó 5/5 antes, con la fuente en
   caché; la ejecución completa aborta al recompilar.

La decisión de propiedad de integraciones ya está tomada y aplicada. La que
queda —H-1— es distinta: no bloquea una prueba, describe un defecto real que
solo se ve al reconstruir la base desde cero.

Frente al informe anterior, el reparto cambió. Antes faltaba evidencia. Ahora la
evidencia existe, y dice que dos de los verdes previos no lo eran: el tope de
miembros era evadible y el simulacro de restauración aprobaba un backup vacío.
Los dos venían de medir en un motor que no reproduce la propiedad que se
pretendía certificar. Están corregidos y vueltos a medir; lo que queda abierto
está acotado, reproducido y no puede crecer sin que un test lo diga.

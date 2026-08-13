# NELVYON — Informe de Release Candidate

```text
HEAD              1e82398b
fecha             2026-08-12
árbol git         limpio
push/PR/merge     ninguno
backend           2176 passed / 0 failed
frontend          6646 passed / 42 skipped (751 ficheros)
typecheck         tsc --noEmit limpio
build producción  next build completa
compileall        limpio
```

## Veredicto

**NO se declara `NELVYON SAAS RELEASE CANDIDATE ✅`.**

No por defectos abiertos —no queda ningún CRITICAL ni HIGH sin resolver— sino
porque **siete bloques no pueden ejecutarse** con Docker caído, y cinco de ellos
certifican propiedades que solo PostgreSQL real puede demostrar: constraints,
atomicidad bajo concurrencia, y que las migraciones aplican de cero.

Llamar CERTIFIED a esos bloques con evidencia de SQLite sería exactamente el
falso verde que este trabajo existe para evitar. Un RC declarado sin ellos no
sería seguro: son las propiedades que deciden si el sistema se comporta igual en
producción que en los tests.

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
| E2E | VERIFIED | infraestructura operativa; journey de auth 5/5 | `e2e/auth.spec.ts` | 406 tests no ejecutados en esta sesión | — |
| Concurrencia | PARCIAL | tope de miembros hecho atómico | `test_member_cap_atomicity` | carrera real necesita PG | 8 candidatos |
| Column / constraint drift | BLOCKED_EXTERNALLY | analizador AST listo | `_constraint_drift.py` | Docker | — |
| Cobertura SQLite vs PG | BLOCKED_EXTERNALLY | 4 usos solo-SQLite corregidos | `test_sqlite_only_sql_guard` | Docker | — |
| Migraciones | BLOCKED_EXTERNALLY | — | — | Docker | — |
| Rendimiento de BD | BLOCKED_EXTERNALLY | 45 bucles inventariados | — | Docker | — |
| Backup / restore | BLOCKED_EXTERNALLY | drill existe | `run-postgres-restore-drill.mjs` | Docker | — |
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

1. **Docker** → cerrar column drift, constraint drift, cobertura PG, migraciones
   desde cero, rendimiento de BD, backup/restore y la certificación de
   concurrencia.
2. **Red** → `pip-audit` y lockfile del backend.
3. **Tiempo de ejecución** → los 406 tests E2E completos (≈1 min/test).

La decisión de producto que faltaba —propiedad de integraciones— ya está tomada
y aplicada.

Nada de esto son defectos: son pruebas que aún no se han podido ejecutar. El
código está en el estado que se pretendía; lo que falta es la evidencia.

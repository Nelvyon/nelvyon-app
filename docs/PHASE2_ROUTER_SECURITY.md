# Seguridad — Model Router

## Capas

1. **Autenticación SaaS** — JWT en API (`requireSaasContext`); router exige `tenantId` UUID.
2. **SecurityGuard** — pre-router, determinista (inyección, secretos, cross-tenant).
3. **RiskAssessor** — tareas `critical` bloqueadas sin `hints.ownerApproved`.
4. **RouterValidator** — post-respuesta: secretos, constitución, citas, JSON.
5. **RLS Postgres** — `withTenantReadOnly/Client` + `set_config('app.tenant_id')`.

## Tareas critical (no auto-ejecutar)

- Borrar datos / DROP SQL
- Cambiar credenciales
- Enviar campañas reales
- Cobros Stripe reales
- Cross-tenant access/export
- Deploy/publicación producción
- Código destructivo

## Anti-prompt-injection

El router **no** usa LLM para clasificación ni riesgo.  
Reglas del router no pueden ser sobrescritas por el prompt del usuario.

## Observabilidad local

`getRouterAuditLog()` — sin secretos, sin telemetría externa.  
Campos: taskId, taskType, risk, model, fallback, duration, validation.

## Certificación 2026-07-14

| Control | Evidencia |
|---|---|
| Bloqueo crítico | 5/5 routing + 3/3 E2E |
| Anti-injection | SecurityGuard pre-LLM |
| Secret leak scan | 0 en E2E |
| Tenant isolation | RLS + fake tenant 0 citations |
| Circuit breaker | recovery test PASS |

Evidencia: `router_e2e_cert_e2e_pass_*.json`, `router_recovery_*.json`

## PRIVATE_MODE

Todas las llamadas Ollama vía `privateModeFetch` — egress allowlist local.

Ver también: `docs/PHASE2_SECURITY_MODEL.md`

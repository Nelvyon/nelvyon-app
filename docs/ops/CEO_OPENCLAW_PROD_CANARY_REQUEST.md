# CEO request — futuro canary productivo de OpenClaw

> **Estado: `PENDING_CEO`.** Este documento **no** aprueba nada — es la solicitud que
> Daniel debe leer y decidir cuándo (si alguna vez) autoriza un canary productivo real
> de OpenClaw. Hoy OpenClaw solo corre en `staging_mock` (`backend/agency/OpenClawStagingCoordinator.ts`),
> nunca contra producción.
>
> Fuente de verdad en código: `backend/openclaw/contracts.ts`
> (`isOpenClawRuntimeAuthorized()`, `resolveOpenClawRuntimeConfig()`) +
> `backend/agency/OpenClawStagingCoordinator.ts`.
> Tests: `backend/agency/__tests__/OsCatalogV1Closure.test.ts`.

## Qué se pide (y qué NO se pide)

- Se pide que Daniel **lea este documento** y, cuando lo considere, decida un alcance
  mínimo para un canary productivo (p. ej. 1 tenant interno, 1 flujo de bajo riesgo).
- **No** se pide activar nada hoy. Ningún flag de producción cambia por este documento.
- **No** es una aprobación retroactiva de nada ya ejecutado — todo lo hecho hasta ahora
  es `staging_mock` en local/staging, verificable con los tests referenciados arriba.

## Alcance propuesto para un futuro canary (solo si Daniel lo autoriza)

1. Un único tenant interno (no cliente real) durante la primera semana.
2. Un único flujo de bajo riesgo (p. ej. borrador de contenido social, sin publish).
3. Límite de gasto: **0€** — ningún canary productivo implica gasto real.
4. Ventana de tiempo definida (p. ej. 7 días) con checkpoint diario de Daniel.

## Riesgos

| Riesgo | Mitigación propuesta |
|--------|------------------------|
| Fuga de datos entre tenants | Mismo `requireTenantId` + aislamiento verificado en `OpenClawStagingCoordinator` (`tenant_isolation` step) — se re-verifica en el canary antes de cualquier tráfico real |
| Acción no autorizada ejecutada | `forbiddenTools` + `assertActionAuthorized` — el canary hereda la misma lista, no se amplía sin revisión explícita |
| Dependencia externa caída/lenta | Reintentos con backoff documentado (`backoffPlanMs`) + `failure_injection_recovery` verificado en staging antes del canary |
| Escalada de alcance sin control | El canary usa el mismo flag `NELVYON_OPENCLAW_BRIDGE_ENABLED` + un nuevo flag específico de producción (a definir, hoy inexistente) — nunca reutiliza `NELVYON_OPENCLAW_STAGING_MODE` |
| Idempotencia insuficiente | El mapa de idempotencia actual es solo en memoria (documentado); un canary productivo requeriría upgrade a almacenamiento durable (Redis/Postgres) — **pendiente, no implementado** |

## Qué permanece OFF sin excepción durante y después de cualquier canary

- **OpenAI** — sin proveedor de pago, sigue vía Ollama/router certificado local.
- **Pagos / Stripe spend adicional** — ningún canary toca billing.
- **Campañas masivas** (`send_mass_campaign`) — bloqueado en código (`forbidSpend`), sin excepción.
- **MCP productivo** — permanece fail-closed (`NELVYON_MCP_PRODUCTIVE_ENABLED` requiere staging
  synthetic + flag explícito; ver `backend/agency/StagingSharedMemoryMcpHarness.ts`). Un canary
  de OpenClaw **no** habilita MCP productivo.
- **Shared Memory productiva** — `NELVYON_SHARED_MEMORY_ENABLED` permanece `0`; el canary de
  OpenClaw usaría, como mucho, el mismo modo `staging_mock`/sintético hasta que exista una
  autorización y arquitectura de auth **separada** para SM productiva.
- **Publicación en redes** — sigue bloqueada por los gates existentes (`publish_authorized: false`).

## Criterios de salida (para decidir si el canary puede ampliarse o debe revertirse)

- 0 incidentes de fuga de datos entre tenants durante la ventana del canary.
- 0 acciones no autorizadas ejecutadas (verificado por auditoría, ver `exportOpenClawStagingAuditTrail`).
- Recuperación exitosa ante al menos 1 fallo inyectado real (no solo simulado en tests).
- Daniel revisa el audit trail exportado y confirma por escrito continuar o revertir.

## Rollback inmediato (en cualquier momento)

```
NELVYON_OPENCLAW_BRIDGE_ENABLED=0
```

Esto restaura el bridge Disabled y detiene cualquier coordinación, productiva o de staging.

## Próximo paso EXACTO

1. Daniel decide si quiere avanzar hacia un canary productivo — sin fecha límite, sin
   presión, sin cambio de código requerido para "no decidir todavía".
2. Si Daniel autoriza: se abre un ADR específico definiendo el flag de producción,
   el tenant piloto y la ventana temporal — **este documento no lo hace por sí solo**.
3. Hasta entonces: OpenClaw sigue exclusivamente en `staging_mock`.

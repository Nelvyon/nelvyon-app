# CEO request — futuro canary productivo de IA propia (Private AI)

> **Estado: `PENDING_CEO`.** Este documento **no** aprueba nada y **no** activa nada.
> Es distinto del ya aprobado `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`
> (Router + Quality Routing 3B/8B, **staging only**, inferencia remota aún
> `BLOCKED_UNTIL_MESH`). Este documento pide autorización para un futuro escalón
> **productivo** — hoy no existe ningún flag de producción para IA propia, y este
> documento no crea ninguno.
>
> Fuente de verdad en código: `backend/agency/PrivateAiCanaryPrep.ts`
> (`isProductionCanaryAuthorized()` — hardcoded `false`, sin plumbing de env vars).
> Tests: `backend/agency/__tests__/PrivateAiCanaryPrep.test.ts`.

## Qué se pide (y qué NO se pide)

- Se pide que Daniel **lea este documento** y decida, cuando lo considere, si autoriza
  un canary productivo real de IA propia (modelos locales vía Ollama, sin OpenAI).
- **No** se pide activar `NELVYON_AI_ENABLED` en producción hoy. Ningún flag de
  producción cambia por este documento.
- **No** es una aprobación retroactiva de nada — el estado real hoy es: staging con
  Router+QR **ON** (ADR aprobado por separado), producción con claves IA **ABSENT**.

## Checklist de preparación (12 ítems — código en `PrivateAiCanaryPrep.ts`)

| # | Ítem | Qué verifica |
|---|------|---------------|
| 1 | Solo modelos locales | Sin OpenAI ni ninguna API de pago en la ruta de inferencia |
| 2 | Router 3b/8b certificado | Quality routing con benchmarks de certificación existentes |
| 3 | Fail-closed por defecto | `SecurityGuard` + refuse-on-error verificado |
| 4 | Presupuesto API = 0 | `AUTONOMOUS_ALLOW_OPENAI=0` confirmado, sin clave de gasto conectada |
| 5 | Privacidad (`PRIVATE_MODE`) | Egress restringido a localhost/LAN privada/allowlist |
| 6 | Red privada Tailscale | Host Ollama resuelve a CGNAT/MagicDNS, nunca público — verificado en vivo por `checkOllamaHostForCanaryDrill()`, no solo autodeclarado |
| 7 | RAG con evidencia obligatoria | `PrivateVectorRagCore` rechaza sin evidencia (Bloque 24) |
| 8 | Auditoría | Toda acción del canary queda en un log auditable |
| 9 | Rollback <5 min | Procedimiento documentado y ensayado |
| 10 | Kill switch | Un único flag apaga todo el canary |
| 11 | Criterios de load test | Umbrales de latencia/error/concurrencia definidos por adelantado |
| 12 | Criterios de salida | Promover / mantener / revertir definidos por adelantado |

Hoy, en código, `isProductionCanaryAuthorized()` devuelve **siempre `false`**,
independientemente de cualquier variable de entorno — no hay ningún flag que lo cambie.

## Alcance propuesto para un futuro canary (solo si Daniel lo autoriza)

1. Un único tenant interno (no cliente real) durante la primera semana.
2. Un único flujo de bajo riesgo (p. ej. respuesta a consulta interna con RAG citado,
   sin publicación ni envío externo).
3. Límite de gasto: **0€** — modelos locales únicamente, sin API de pago.
4. Ventana de tiempo definida (p. ej. 7 días) con checkpoint diario de Daniel.

## Riesgos

| Riesgo | Mitigación propuesta |
|--------|------------------------|
| Fuga de datos entre tenants vía RAG | Aislamiento duro verificado en `PrivateVectorRagCore` (Bloque 24) — se re-verifica contra pgvector real antes de cualquier tráfico productivo |
| Respuesta sin evidencia (alucinación) | Contrato refuse-on-no-evidence de `PrivateVectorRagCore` — sin citas, no hay respuesta |
| Host Ollama expuesto públicamente | `assertOllamaHostSafeForRuntime()` exige Tailscale CGNAT/MagicDNS en runtimes remotos |
| Escalada de alcance sin control | El canary requeriría un flag de producción nuevo, hoy inexistente — nunca reutiliza `NELVYON_AI_ENABLED` de staging sin revisión explícita |
| Coste inesperado | Presupuesto API duro en 0€; `AUTONOMOUS_ALLOW_OPENAI` permanece en `0` en todo entorno |

## Qué permanece OFF sin excepción durante y después de cualquier canary

- **OpenAI** — sin proveedor de pago, sigue vía Ollama/router certificado local.
- **Activación en producción** — `NELVYON_AI_ENABLED` permanece sin activar en
  producción hasta autorización explícita y separada.
- **MCP productivo / Shared Memory productiva / OpenClaw productivo / partner payouts** —
  cada uno requiere su propia autorización CEO ya documentada por separado; este
  documento no los toca.
- **Campañas masivas** — sigue bloqueado por `CampaignsLegalTechnicalGate`
  (`claimReadyLegal=false`).
- **Pepito** — cero referencias; el canary usaría exclusivamente datos de tenant(s)
  reales autorizados o sintéticos, nunca la base Pepito.

## Rollback inmediato (en cualquier momento)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_AI_ENABLED=0
```

Esto detiene cualquier ruta de canary de forma inmediata, sin necesidad de redeploy si
la app relee la variable de entorno en caliente; en Railway, redeploy tras el cambio de
variable.

## Criterios de salida

- 0 incidentes de fuga de datos entre tenants durante toda la ventana del canary.
- 0 respuestas IA sin evidencia RAG citada cuando la pregunta requería contexto privado.
- Latencia P95 y tasa de error dentro de los umbrales de load test definidos.
- Recuperación exitosa ante al menos 1 fallo inyectado real (no solo simulado en tests).
- Rollback ensayado y completado en menos de 5 minutos durante un simulacro.
- Daniel revisa el audit trail exportado y confirma por escrito continuar o revertir.

## Próximo paso EXACTO

1. Daniel decide si quiere avanzar hacia un canary productivo — sin fecha límite, sin
   presión, sin cambio de código requerido para "no decidir todavía".
2. Si Daniel autoriza: se define un flag de producción nuevo (hoy inexistente), un
   tenant piloto y una ventana temporal, y **solo entonces** se actualiza manualmente
   `isProductionCanaryAuthorized()` en `backend/agency/PrivateAiCanaryPrep.ts` — nunca
   automáticamente por una variable de entorno.
3. Hasta entonces: producción sigue con claves IA **ABSENT** y `NELVYON_AI_ENABLED` sin
   activar; staging sigue exclusivamente bajo el alcance ya aprobado en
   `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`.

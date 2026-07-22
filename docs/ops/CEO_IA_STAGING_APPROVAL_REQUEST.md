# CEO — Solicitud única de aprobación IA (staging only)

> **Estado:** PENDIENTE CEO · **Coste incremental:** 0 · Fecha: **2026-07-22**  
> **No** incluye OpenAI · OpenClaw · partner payouts · campañas · mesh Tailscale/WireGuard (instalación).  
> Referencias: `docs/ops/CANARY_IA_FLAGS.md` · `docs/ARCHITECTURE_LOCAL_AI_RUNTIME.md` · ADR-036/037

## Qué se pide aprobar (un solo batch)

| # | Ítem | Alcance | Default |
|---|------|---------|---------|
| 1 | Canary staging Local Router | `NELVYON_LOCAL_ROUTER_ENABLED=1` **solo staging** | OFF |
| 2 | Canary staging Quality Routing | `AUTONOMOUS_QUALITY_ROUTING=1` + modelos 3b/8b | OFF |
| 3 | Host Ollama privado | `OLLAMA_HOST` mesh privado (Option A) **si** CEO aprueba mesh por separado | unset |

## Qué queda explícitamente fuera

- `AUTONOMOUS_ALLOW_OPENAI` / nueva API key OpenAI  
- OpenClaw bridge  
- `NELVYON_CEO_PARTNER_PAYOUTS`  
- Campañas / envío masivo  
- Activación en **producción** en el mismo batch  
- Instalar Tailscale/WireGuard desde Cursor (CEO/ops humano)

## Criterios de entrada (antes de ON)

1. Health live/ready 200 en staging  
2. `assertOllamaHostSafeForRuntime({ allowLoopback: false })` PASS  
3. Unit: `qualityRouting` + `OllamaRuntimePrep` + pack auto-approve QA≥85  
4. Rollback escrito (abajo) ensayable en <5 min  
5. Pack E2E P0 con `P0_REQUIRE_PACK_E2E=1` solo **después** de canary ON

## Rollback inmediato

```
NELVYON_AI_ENABLED=0
NELVYON_LOCAL_ROUTER_ENABLED=0
AUTONOMOUS_QUALITY_ROUTING=0
# unset OLLAMA_HOST / OLLAMA_CONFIGURED
```

Verificar `/api/health/ready`. Sin migración de datos.

## Firma

| Rol | Nombre | Fecha | OK |
|-----|--------|-------|----|
| CEO | | | [ ] |
| CTO (prep) | Cursor agent | 2026-07-22 | prep only — no flags set |

**claimReady permanece false** hasta legal campañas + (opcional) este batch si se desea superioridad IA.

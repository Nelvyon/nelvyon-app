# CEO — Solicitud única de aprobación IA (staging only)

> **Estado:** **APROBADO CEO 2026-07-23** · Router + Quality Routing 3B/8B · **Coste incremental:** 0  
> **No** incluye OpenAI · OpenClaw · partner payouts · campañas · mesh Tailscale/WireGuard (instalación).  
> Referencias: `docs/ops/CANARY_IA_FLAGS.md` · `docs/ARCHITECTURE_LOCAL_AI_RUNTIME.md` · ADR-036/037/041  
> Evidencia: `.release-logs/canary-staging-router-qr-20260723.txt`

## Qué se aprobó (batch ejecutado)

| # | Ítem | Alcance | Estado 2026-07-23 |
|---|------|---------|-------------------|
| 1 | Canary staging Local Router | `NELVYON_LOCAL_ROUTER_ENABLED=1` en Railway **staging** `ideal-victory` | **SET** (inference OFF hasta mesh) |
| 2 | Canary staging Quality Routing | `AUTONOMOUS_QUALITY_ROUTING=1` + modelos 3b/8b | **SET** |
| 3 | Host Ollama privado | `OLLAMA_HOST` mesh Option A | **NO** — pendiente CEO separado |

## Qué queda explícitamente fuera (sigue vigente)

- `AUTONOMOUS_ALLOW_OPENAI` / nueva API key OpenAI → **=0** staging · **ABSENT** prod  
- OpenClaw bridge  
- `NELVYON_CEO_PARTNER_PAYOUTS` → **=0**  
- Campañas / envío masivo  
- Activación en **producción** → prod IA keys **ABSENT**  
- Instalar Tailscale/WireGuard desde Cursor  

## Ejecución honesta

| Capa | Resultado |
|------|-----------|
| Railway staging `ideal-victory` | Router+QR flags + modelos · `NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` · sin `OLLAMA_HOST` |
| Railway production `@nelvyon/web` | IA canary keys **ABSENT** (fail-closed) |
| Local Option C probe | **ALL_PASS** · vitest 9/9 · generate 3b+8b · routing crítico→8b / PM→3b |
| Inferencia remota staging | **BLOCKED_UNTIL_MESH** (sin coste; sin OpenAI) |

## Rollback inmediato

```
# Railway environment=staging · service=ideal-victory
NELVYON_LOCAL_ROUTER_ENABLED=0
AUTONOMOUS_QUALITY_ROUTING=0
# leave NELVYON_AI_ENABLED=0 · OLLAMA_CONFIGURED=0 · no OLLAMA_HOST
```

Verificar health staging + prod. Sin migración de datos.

## Firma

| Rol | Nombre | Fecha | OK |
|-----|--------|-------|----|
| CEO | (mensaje chat Cursor) | 2026-07-23 | [x] Router+QR staging only |
| CTO (exec) | Cursor agent | 2026-07-23 | flags staging · prod OFF · local probe PASS |

**claimReady permanece false** (legal campañas + mesh si se desea inferencia remota staging).

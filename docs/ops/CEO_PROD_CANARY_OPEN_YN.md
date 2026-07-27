# CEO — ¿Abrir canary mínimo de IA en producción?

> **Estado: PENDING_CEO** · preparación Option A **HECHA** · canary **aún OFF** · coste **0**  
> Fecha: **2026-07-27** · OpenAI OFF · MCP/SM/OpenClaw OFF

## Qué ya está listo (sin canary)

| Ítem | Estado |
|------|--------|
| Staging RAG e2e (ingest/retrieval/citas/A-B RLS) | **PASS_WITH_KNOWN_GAP** (críticos PASS) |
| Staging carga concurrente (8 retrieves) | **PASS** |
| Fail-closed código (no localhost/:5434) | **PASS** (tests) |
| Kill switch | **ON** en prod |
| Schema `local_ai_*` + pgvector en DB prod | **APPLIED** |
| Role RLS `nelvyon_local_ai_app` (NOSUPERUSER/NOBYPASSRLS) | **CREATED** · aislamiento A/B **PASS** |
| `LOCAL_AI_DATABASE_URL` (role RLS) | **SET** (preparado) |
| `NELVYON_AI_ENABLED` / canary / OLLAMA_CONFIGURED | **0** |

## Qué pediría un SÍ (ventana mínima)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=0
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1
NELVYON_AI_ENABLED=1
OLLAMA_CONFIGURED=1
AUTONOMOUS_ALLOW_OPENAI=0
# OpenAI key ABSENT · MCP/SM/OpenClaw off · sin campañas/pagos/ads
```

Luego: smoke `prod-smoke-private-ai-canary.mjs` → kill drill &lt;5 min → dejar killed o extensión CEO.

## Rollback &lt;5 min (si SÍ y algo falla)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

## Única pregunta

**¿Autorizas abrir ahora el canary mínimo de IA privada en producción (Ollama Tailscale only, 0€)?**

Responde exactamente: **SÍ** o **NO**.

| Rol | SÍ / NO | Fecha | Firma |
|-----|---------|-------|-------|
| CEO | ____ | ____-__-__ | ________ |

**claimReady permanece false** aunque digas SÍ (legal/clientes pendientes).

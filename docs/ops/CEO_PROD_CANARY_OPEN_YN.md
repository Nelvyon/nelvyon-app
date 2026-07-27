# CEO — ¿Abrir canary mínimo de IA en producción?

> **Estado: CEO SÍ (2026-07-27)** · staging RAG **PASS completo** · apertura canary **en curso** · coste **0**  
> OpenAI OFF · MCP/SM/OpenClaw OFF · pagos/campañas/anuncios OFF

## Autorización

| Rol | SÍ / NO | Fecha | Firma |
|-----|---------|-------|-------|
| CEO | **SÍ** | 2026-07-27 | written authorization (chat) |

Condiciones obligatorias: Ollama Tailscale only · tráfico mínimo · tenant sintético · kill inmediato si falla gate · no mocks · no bajar umbrales · **no READY**.

## Ventana operativa

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=0
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=1
NELVYON_AI_ENABLED=1
OLLAMA_CONFIGURED=1
NELVYON_AI_MODE=local
PRIVATE_MODE=ON
AUTONOMOUS_ALLOW_OPENAI=0
# OpenAI key ABSENT · MCP/SM/OpenClaw=0
```

## Rollback &lt;5 min

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

**claimReady permanece false.**

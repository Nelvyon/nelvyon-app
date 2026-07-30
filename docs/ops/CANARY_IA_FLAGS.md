# Canary IA flags — SSOT ops (prod KILL ON)

> **Actualizado:** 2026-07-30 · tip remoto `7806641b` · **claimReady: false** · **NOT READY**
> Histórico mesh/Router staging: ver sección inferior · SSOT mesh: `docs/ops/MESH_OPTION_A_STAGING.md`

## Producción (estado actual — NO abrir)

| Flag | Value | Notes |
|------|-------|-------|
| `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH` | `1` | **KILL ON** |
| `NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED` | `0` | Canary cerrado |
| `NELVYON_AI_ENABLED` | `0` | IA productiva OFF |
| `OLLAMA_CONFIGURED` | `0` | |
| `AUTONOMOUS_ALLOW_OPENAI` | `0` | Forbidden |

## Rollback (mantener / re-aplicar)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

## Staging — histórico Router + QR + Mesh prep (2026-07-23)

| Flag | Value | Notes |
|------|-------|-------|
| `NELVYON_LOCAL_ROUTER_ENABLED` | `1` | Staging canary Router |
| `AUTONOMOUS_QUALITY_ROUTING` | `1` | 3b/8b |
| `NELVYON_MESH_OPTION_A` | `1` | Prep marker |
| `NELVYON_AI_ENABLED` | `0` | Until ops CEO |
| `OLLAMA_CONFIGURED` | `0` | Until node online |
| `AUTONOMOUS_ALLOW_OPENAI` | `0` | Forbidden |

## Evidence SSOT

| Árbol | Uso |
|-------|-----|
| `docs/evidence/os-saas-e2e/` | HTTP live cert / yellow-queue (`MODULES_OUT`) |
| `scripts/docs/evidence/os-saas-e2e/` | Ops smokes / RAG / ERP / PWA artifacts |

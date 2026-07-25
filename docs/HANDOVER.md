# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **CIERRE 1–7** · staging tip **`e5cb8c85`** deploy **`f0d3c57c` SUCCESS** · `claimReady: false` · **NOT READY**

> Última actualización automática: **2026-07-25 16:32 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | pending push (points 1–7) |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** |
| **Staging** | tip **`e5cb8c85`** · deploy **`f0d3c57c` SUCCESS** · live+ready OK · migrate gate apply-allowed |
| **Prod** | tip **`0a253c7f`** (read-only) · gate skip-apply · IA OpenAI OFF |
| **Puntos 1–7** | Ver `CTO_FINAL_VERIFY.md` tabla 1–7 |
| **Coste** | 0 |

## Próximo paso EXACTO

1. **Daniel:** ack 519/520 + migrate policy · canary IA SÍ/NO · Android device 3 pasos · iOS Safari 3 pasos.
2. **CEO:** decidir dual-write cutover (ADR-062) · decidir schema `local_ai_rag_*` en Railway o DB dedicada.
3. **No READY** sin legal/mercado/clientes.

### Rollback staging

```
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
NELVYON_ERP_RELATIONAL_DUAL_WRITE=0
NELVYON_ERP_RELATIONAL_READ=0
```

# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-24** — Growth + Strategy/Funnel/Retention CERT · `claimReady: false`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (no READY) |
| **Tip / staging** | `be61f02d` live match |
| **Certificados** | local · ecommerce · saas-b2b · strategy · funnel · retention |
| **Betas** | social · content · cro · analytics · brand (**no promote**) |
| **Prod IA** | **OFF/ABSENT** |
| **claimReady** | **false** |

### Evidencia E2E

| Pack | Log |
|------|-----|
| ecommerce | `.release-logs/ecommerce-pack-e2e-20260724-015452.txt` |
| saas-b2b | `.release-logs/saas-b2b-pack-e2e-20260724-022752.txt` |
| strategy+funnel+retention | `.release-logs/new-os-packs-e2e-2026-07-24T02-55-24.txt` |

### Rollback

`NELVYON_AI_ENABLED=0` · `OLLAMA_CONFIGURED=0` · `NELVYON_STRATEGY_PACK=0` · `NELVYON_FUNNEL_PACK=0` · `NELVYON_RETENTION_PACK=0`

---

## Próximo paso EXACTO

1. **Legal:** checklist campañas (bloquea claimReady / READY).  
2. Push tip promote docs/registry → confirmar staging live SHA.  
3. CTO: ADR-048 Matomo/Umami (staging privado) o REJECT — **0 installs** hasta entonces.  
4. **No** activar IA/mesh/OpenAI/MCP/SM/payouts/campañas en prod sin CEO.

SSOT: `OS_UNIVERSAL_SERVICE_CATALOG.md` · `CTO_FINAL_VERIFY.md` · ADR-049

# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-28** — Cursor 0€ **VACÍO** (auditoría v2) · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip** | ver `git log -1` tras commit Cursor-0€ |
| **Auditoría SSOT** | `docs/ops/CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` **v2** |
| **Fecha doc** | 2026-07-28 |
| **Rama** | `main` |

---

## Estado actual

| Punto | Estado |
|-------|--------|
| Lote A email locale + runtime | **CLOSED** |
| Documentos/Comunidades/A/B/Facturas CTAs | **CLOSED** |
| Sequences triggers + tracking mig 521 | **CLOSED** (apply migrate = ops) |
| Honesty SES/Twilio/analytics/ERP | **CLOSED** |
| Portal approve/reject feedback | **CLOSED** |
| Cursor 0€ backlog | **VACÍO** |
| IA canary prod | **KILLED** |
| claimReady | **false** |

## Próximo paso EXACTO

1. Ops: aplicar migración **521** en staging/prod (`releaseCommand` / migrate).
2. Ops: reval `saas.workflows` E2E + email certs — `WORKFLOWS_E2E_REVAL_PENDING.md`.
3. CEO: Pepito/legal o canary — ver auditoría §2–4. **No declarar READY.**

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

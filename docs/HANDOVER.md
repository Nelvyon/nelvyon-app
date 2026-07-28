# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-28** — Cierre técnico seguro v3 · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Último tip docs** | `86701b95` (cierre técnico v3) · base Cursor-0€ `05791f3b` |
| **Auditoría SSOT** | `docs/ops/CTO_DEFINITIVE_PENDING_AUDIT_2026-07-28.md` **v3** |
| **Fecha doc** | 2026-07-28 |
| **Rama** | `main` (ahead 6 · **no push**) |
| **Railway CLI** | linked **production** / `@nelvyon/web` |

---

## Estado actual

| Punto | Estado |
|-------|--------|
| Cursor 0€ backlog | **VACÍO** |
| Mig **521** staging | **APPLIED** (2026-07-28) |
| Mig **522** staging | **APPLIED** (score_threshold CHECK) |
| Mig 521/522 **prod** | **NOT applied** (CEO ADR-064) |
| `saas.workflows` E2E staging | **CERTIFIED** (wf.create 201) |
| Playwright secuencias | **5 PASS** (Chromium instalado) |
| Honesty HTTP staging | **12/12 PASS** |
| Comunidades replies | **honest disabled** (sin `parent_post_id`) |
| IA canary prod | **KILLED** |
| claimReady | **false** |
| Veredicto | **NOT READY** |

## Próximo paso EXACTO

1. CEO: aprobar o diferir **prod** migrate `521`+`522` (`NELVYON_PROD_MIGRATE_APPROVED=1` + `APPROVED_BY`, luego unset).
2. Ops: push tip → redeploy staging → (opcional) yellow-queue drain completo.
3. CEO: Pepito/legal — **no declarar READY**.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

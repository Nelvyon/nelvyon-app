# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-25** — **TOTAL QUALITY / RELEASE-READINESS** · staging tip **`5a36809c`** · reval ERP A/B+concurrency+persist **ALL_PASS** · prod live tip **`5a36809c`** · mig 519/520 prod **already applied** (auto-deploy; CEO formal ack pending) · `claimReady: false` · **NOT READY**  

> Última actualización automática: **2026-07-25 15:19 UTC**

| Campo | Valor |
|-------|-------|
| **Último commit** | docs tip pending this sync · código tip **`5a36809c`** |
| **Fecha doc** | 2026-07-25 |
| **Rama** | `main` (sync with origin) |

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** · **NOT READY** · sin `claimReady` |
| **Staging** | https://ideal-victory-staging.up.railway.app · tip **`5a36809c`** · deploy **`5965c32b` SUCCESS** · health ready OK |
| **Prod** | https://nelvyon.com · tip **`5a36809c`** · ready OK · OpenAI/MCP/SM keys **ABSENT** · ERP schema 519/520 **present** (`migrate skip`) |
| **Auditoría código** | **0 P0/P1** demostrables en ERP/saas/auth paths (sesión) |
| **Legal** | `claimReady` **false** · Pepito **forbidden** |
| **Coste** | 0 |

### Capacidades (honestidad)

| Capacidad | Estado | Matiz |
|-----------|--------|-------|
| ERP 26–29+35 staging | **IMPLEMENTED_VERIFIED** | Persist+A/B+concurrency reval **ALL_PASS** |
| ERP schema prod 519/520 | **IMPLEMENTED** (schema) · product use **CONDITIONAL** | Applied via Railway `preDeployCommand` on main auto-deploy · **CEO formal sign-off still required** for “ERP prod authorized” narrative |
| Dual-write relacional | **PREPARED_OFF** | ADR-062 |
| Multirréplica 2+ | **PREPARED_OFF** | 0€ · FOR UPDATE designed |
| OS packs / influencers / agency cores | **VERIFIED** (staging/core) | Externals **BLOCKED_EXTERNAL** |
| private_vector_rag | Docker **VERIFIED** | Railway **PREPARED_OFF** |
| private_ai_canary | **PREPARED_OFF** | **BLOCKED_CEO** |
| i18n UI / email+PDF | **FULL** / **PARTIAL** | — |
| PWA / mobile / HA / multi-region | Chrome VERIFIED / Android build / 1-región / multi-region **BLOCKED_EXTERNAL/COST** | — |
| Mass-send / claimReady | **BLOCKED_LEGAL** | — |

**No READY.** No superioridad de mercado.

## Último trabajo (esta sesión)

- Auditoría scoped: sin P0 código; BFF mocks fail-closed; flags fail-closed
- Reval staging: HTTP A/B · concurrency · persist after **ALL_PASS**
- Gates: `tsc` 0 · vitest ERP/legal **70 PASS / 2 skip** · eslint ERP routes 0 · `check-no-mock-production` PASS
- Prod read-only: live/ready · tip `5a36809c` · sensitive IA keys **ABSENT** · migrate log **skip 519/520** (= already in `_migrations`)
- Ops finding: pushes a `main` auto-deploy + migrate prod → bypasses CEO gate narrativo (documentado)

## Próximo paso EXACTO

1. **Daniel/CEO:** firmar reconocimiento formal en `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` (schema **ya** en prod vía auto-deploy) **o** documentar política: desactivar auto-deploy/migrate en prod.
2. **CEO:** canary IA prod SÍ/NO · PWA iOS · Pepito legal.
3. **Opcional:** 2ª réplica staging (coste) · dual-write ADR-062.

## Acciones solo Daniel

| # | Acción | Doc |
|---|--------|-----|
| 1 | Ack formal ERP schema prod / política auto-deploy | `ERP_PROD_MIGRATE_519_520_RUNBOOK.md` |
| 2 | Canary IA prod | `CEO_IA_PROD_CANARY_REQUEST.md` |
| 3 | PWA iOS Safari | `PWA_IOS_SAFARI_CEO_CHECKLIST.md` |
| 4 | Licencia Pepito | `DATOS_PEPITO_LICENSE_DOSSIER.md` |
| 5 | OAuth/Twilio/ads/publish reales | checklists ops |
| 6 | 2ª réplica (si presupuesto) | Railway |

### Rollback staging

```
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_ADS_SPEND_ENABLED=0
```

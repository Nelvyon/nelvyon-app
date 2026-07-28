# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-29** — **16 FAIL Vitest cerrados** (tests/harness only) · monorepo **0 FAIL** · canary **KILL ON** · `claimReady: false` · **NOT READY**

| Campo | Valor |
|-------|-------|
| **Tip remoto** | `70b927aa` (Vitest monorepo **0 FAIL**) |
| **Staging deploy** | `073949a1` SUCCESS · live `git_sha=b236bba0e12d` (**sin redeploy**: solo tests/vitest.setup) |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (técnico; solo SÍ CEO) |
| **SAFE_TO_DEPLOY_PROD** | **false** hasta migrate 521–522 |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Cert local (cierre 16 FAIL)

| Gate | Resultado |
|------|-----------|
| tsc / lint | **PASS** / **PASS** (0 errores) |
| Vitest monorepo completo | **6214 PASS** · **0 FAIL** · 8 skipped |
| Vitest canónico SaaS | **2461 PASS** · 4 skipped |
| build | **PASS** |
| Playwright secuencias | **5 PASS** |
| Staging redeploy | **no** — cambios solo tests + `vitest.setup.ts` (limpia env Ollama en Vitest; no altera runtime prod) |

## Staging (último deploy excellence)

| Smoke | Resultado |
|-------|-----------|
| health live/ready | **200** · sha `b236bba0` · env.ok |
| workflows / sequences / honesty | **14/14** · **8/8** · **12/12** |
| CRM export/import · rate-limit · idempotency | **PASS** |

## Próximo paso EXACTO

1. Push tip con cierre Vitest 0 FAIL (si aún no está en remoto).
2. CEO: SÍ/NO ejecutar `docs/ops/PROD_MIGRATE_521_522_RUNBOOK.md` (migrate→deploy).
3. Sin SÍ: no migrate · no deploy · no canary · no mass-send.

### Rollback IA

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
```

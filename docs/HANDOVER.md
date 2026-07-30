# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-30** — **Fase 1 prod COMPLETE** · tip live **`3f10c272`** · migs **521+522 APPLIED** · canary **KILL ON** · `claimReady: false` · **NOT READY** comercial (legal/OAuth/clientes)

| Campo | Valor |
|-------|-------|
| **Tip remoto / prod live** | `3f10c272` (`git_sha=3f10c2729502`) · ops mig pin `0d7d6e90` |
| **Prod deploy** | `3d76918b` **SUCCESS** · URL https://nelvyon.com |
| **Mig prod** | **521+522 APPLIED** (2026-07-30T08:17Z) |
| **Staging** | live `3c64111bd198` (histórico CSRF tip) |
| **Ops SSOT** | `docs/ops/OPERATIONS_INDEX.md` |
| **SAFE_TO_MIGRATE_PROD** | **true** (ya aplicado 521–522) |
| **SAFE_TO_DEPLOY_PROD** | **true** (tip live) |
| **claimReady** | **false** |
| **Canary** | **KILL ON** |

## Fase 1 producción (2026-07-30)

| Paso | Resultado |
|------|-----------|
| Preflight | migs ausentes · 0 filas · canary KILL |
| Migrate 521+522 | **done** vía `scripts/run-prod-migrate-521-522.mjs` · ADR-064 `approved_by=Daniel` |
| Post-validate | cols `email_opened/clicked` · CHECK `score_threshold` · `_migrations` OK |
| Deploy | `--from-source` **SUCCESS** · live `3f10c2729502` |
| Smokes | health/ready · KI020 · workflows **14/14** · sequences **8/8** · CRM **16/16** · `score_threshold` **201** |
| IA | canary **OFF** · logs `PRIVATE_AI_CANARY_BLOCKED` (esperado) |

## Cert prod (post-deploy)

| Gate | Resultado |
|------|----------|
| `/api/health` `/live` `/ready` | **200** · DB ok · auth ok |
| KI-020 CSRF | **PASS** |
| Workflows | **CERTIFIED** 14/14 |
| Sequences | **PASS** 8/8 |
| CRM contacts | **CERTIFIED** 16/16 |
| score_threshold create | **201** |
| Canary flags | KILL=1 · PROD_CANARY=0 · AI=0 · OpenAI=0 |
| ready latency | ~229–245 ms (n=5) |

## Próximo paso EXACTO

1. Ops (opcional): snapshot Railway Volume retener ≥7d si aún no hecho en UI.
2. CEO: OAuth/Twilio/SES primer envío / Stripe STARTER (KI-028) — checklists en `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`.
3. Legal/comercial: Pepito + clientes — **sin** flip `claimReady`.
4. **No** abrir canary IA sin SÍ nuevo.

### Rollback IA (mantener)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
NELVYON_SMS_BULK_ENABLED=0
NELVYON_ORCHESTRATOR_ENABLED=0
```

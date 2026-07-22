# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — DNS/SSL `app.nelvyon.com` **PASS** · CSRF app Origin fix · IA OFF

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (`claimReady: false`) |
| **SHA vivo prod** | `e62d52cc5d61` (prev) · DNS/SSL verified · CSRF fix pending redeploy |
| **app.nelvyon.com** | DNS PROPAGATED · Railway verified · cert VALID · live/ready **200** · SHA `e62d52cc5d61` |
| **IA flags** | **ABSENT** · mesh/canaries OFF |
| **Beta packs** | Permanecen **beta** |
| **Growth packs P0** | **ALL_P0_PASS** |
| **STAGING_QA_PASSWORD** | **EXISTS** · wired |
| **Backup** | success `29932453133` |
| **KI-020** | Apex Origin PASS · **app Origin** blocked → fix in `assertSaasOrigin` (prod hosts) |
| **Campañas** | **BLOQUEADO_LEGAL** |
| **Costes** | **0** |
| **Evidence** | `.release-logs/dns-app-verify-pass-20260722.txt` |

---

## Próximo paso EXACTO

1. Redeploy `@nelvyon/web` con fix CSRF `https://app.nelvyon.com` en allowlist · re-run `node scripts/staging-smoke-ki020-csrf.mjs` → KI020_PASS.  
2. CEO batch IA opcional: mesh Option A + canaries staging (`docs/ops/CANARY_IA_FLAGS.md`). **No** OpenAI/OpenClaw/payouts.  
3. Legal: checklist campañas antes de envío.

SSOT: `docs/CTO_FINAL_CLOSURE_AUDIT.md`

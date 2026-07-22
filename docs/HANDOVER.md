# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Prod unify SUCCESS `4cb01795` · SHA vivo `2b51581ddaf6` · flags OFF · Cloudflare CNAME sole blocker

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (app unificada live; DNS app pendiente) |
| **SHA vivo prod** | `2b51581ddaf6` · live/ready **200** |
| **Deploy** | `4cb01795` **SUCCESS** · tip `2b51581d` (cadena: `4bc0282b` + MCP fail-closed + track router/MCP + specialization) |
| **Fallidos previos** | `d6af9ec0` / `dbd09735` — módulos untracked (corregidos; no reintentar) |
| **IA / MCP / SM / OpenClaw / OpenAI opt-in / CEO payouts** | **ABSENT / OFF** (ningún flag set este deploy) |
| **MCP productive default** | **OFF** (`NELVYON_MCP_PRODUCTIVE_ENABLED` require `=1`) |
| **Partner payouts** | Calculables · `markPaid`/Stripe **CEO_GATE** sin flag |
| **Smokes staging** | 🟡 bloqueados `STAGING_QA_PASSWORD` |
| **Costes nuevos** | **0** |
| **Cloudflare** | Unique blocker: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` |

---

## Próximo paso EXACTO

Humano Cloudflare DNS: CNAME `app.nelvyon.com` → `nelvyonweb-production.up.railway.app` → `https://app.nelvyon.com/api/health/live` 200.  
No MFA bypass. No activar IA/MCP/SM/OpenClaw/OpenAI/CEO payouts. No segundo redeploy.

Evidencia: `.release-logs/prod-redeploy-unify-20260722-final.txt` · `docs/CTO_FINAL_VERIFY.md`

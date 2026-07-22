# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — CEO closure ops · P0 **ALL_P0_PASS** · DNS app **BLOCKED_HUMAN** · IA OFF

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (`claimReady: false`) |
| **SHA vivo prod** | `e62d52cc5d61` · live/ready **200** · deploy `1613fbb5` |
| **IA flags Railway** | **ABSENT** (quality routing, OpenAI allow, MCP, SM, OpenClaw, CEO payouts, Local Router, OLLAMA*) |
| **Local AI prep** | Option A doc + `OllamaRuntimePrep` + canaries OFF · **mesh NO activado** |
| **Local Router default** | **OFF** (ADR-037) |
| **Beta packs** | Permanecen **beta** (sin promote) |
| **Growth packs P0** | **ALL_P0_PASS** (portal + local/ecommerce/saas-b2b e2e) |
| **Railway custom domain** | `app.nelvyon.com` **añadido** · ownership/cert pending DNS |
| **Cloudflare** | **BLOCKED_HUMAN** — ver `docs/ops/DNS_APP_NELVYON.md` |
| **STAGING_QA_PASSWORD** | **EXISTS** · wired en `staging-smoke-p0.yml` |
| **Backup** | Workflow **success** run `29932453133` |
| **Campañas empresas** | **BLOQUEADO_LEGAL** — `docs/COMPLIANCE_COMPANY_DB_CHECKLIST.md` |
| **Costes** | **0** |
| **Evidence** | `.release-logs/dns-app-nelvyon-20260722.txt` · `staging-p0-smokes-ceo-rerun-20260722.txt` |

---

## Próximo paso EXACTO

1. **Humano (mínimo):** Cloudflare DNS → zona `nelvyon.com` → añadir **solo** los 2 registros de `docs/ops/DNS_APP_NELVYON.md` (CNAME `app` → `uzrknbzy.up.railway.app` DNS-only + TXT `_railway-verify.app`). Luego verificar `https://app.nelvyon.com/api/health/live|ready` = 200.  
   Alternativa auth API: `npx wrangler login` (MFA) y reanudar agente.  
2. Ops opcional: FastAPI `/api/health` exige tenant (401 sin header); `/health` = 200. Unified automations BFF sigue OPS_DEGRADED 401 — no es P0 packs.  
3. CEO batch IA (solo si se desea): mesh Option A + canaries staging Router/QR/SM — `docs/ops/CANARY_IA_FLAGS.md`. **No** OpenAI / OpenClaw / payouts.  
4. Legal: firmar checklist campañas antes de cualquier envío.

SSOT cierre: `docs/CTO_FINAL_CLOSURE_AUDIT.md`

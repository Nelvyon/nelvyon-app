# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — Post-deploy ops: **KI-R028** Stripe · DNS app humano · LLM staging config

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** (app+schema OK; DNS app pendiente) |
| **SHA vivo** | `bba71f14afc1` · live/ready **200** |
| **Prod mig** | **512–516** (KI-R029) |
| **Stripe** | ✅ **KI-R028** — `price-audit` **allValid=true** (starter/pro/agency) |
| **SES** | ✅ KI-R014 |
| **Cloudflare** | 🟡 nelvyon.com OK · **`app.nelvyon.com` NXDOMAIN** (sin API token / wrangler) |
| **P0 portal smoke** | ✅ PASS |
| **Pack E2E smoke** | 🟡 `LLM_NOT_CONFIGURED` = **staging config** (no fallo prod) |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Clasificación LLM_NOT_CONFIGURED

- Staging `ideal-victory`: `AUTONOMOUS_PRODUCTION` SET · **sin** `OPENAI_API_KEY` / `OLLAMA_*` / `NELVYON_LOCAL_AI_URL`
- Local Ollama: reachable `127.0.0.1:11434` (6 models) — **no** enlazado a staging
- **No** es regresión de producción ni de SHA `bba71f14`
- Camino seguro 0-coste: en staging solo, `OLLAMA_HOST` o `NELVYON_LOCAL_AI_URL` → Ollama alcanzable; **prohibido** activar IA en prod

---

## Próximo paso EXACTO

Humano Cloudflare DNS (zona `nelvyon.com`): crear **CNAME** `app` → `nelvyonweb-production.up.railway.app` → verificar `https://app.nelvyon.com/api/health/live` 200.  
Opcional staging: enlazar Ollama para pack E2E — sin OpenAI de pago y sin flags IA prod.

# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — KI-030 **CERRADO** · deploy `3f08f13d` SUCCESS · SHA vivo `bba71f14`

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** — KI-030 resuelto; schema ≥516; app sana |
| **Deploy KI-030** | `3f08f13d-4cd1-469e-9761-80f4576612b6` **SUCCESS** · tip `bba71f14` · **1** redeploy only |
| **SHA vivo (health)** | `bba71f14afc1` |
| **Health** | live **200** · ready **200** (db ok, auth ok, env ok) |
| **Runtime logs** | `Ready on :3000` · migrate skip/complete · **sin** `Cannot find module './src/lib/security/headers'` |
| **Fix** | CMD `cd /app/apps/web && exec node server.js` · WORKDIR `/app` · `.dockerignore` WIP |
| **Local Docker** | PASS `nelvyon-ki030:fixed` (pre-redeploy gate) |
| **Smokes staging** | portal-packs **PASS** · local-pack-e2e **FAIL** `LLM_NOT_CONFIGURED` |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Próximo paso EXACTO

Ops humano: (1) Cloudflare CNAME `app.nelvyon.com` → Railway; (2) Stripe Live Price STARTER + `STRIPE_PRICE_ID_STARTER` (**KI-028**); (3) opcional staging LLM (`OPENAI_API_KEY` o Ollama) para pack E2E smokes — **sin** activar IA en prod. SQL/migrate manual **prohibido**.

# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-21** — Release prod autorizado · Stripe allValid · P0 smokes PASS · Cloudflare app DNS humano

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** → post-deploy verificar **READY parcial** (Cloudflare app pendiente) |
| **Stripe** | ✅ `price-audit` **allValid=true** (STARTER typo fix · KI-028 cerrado) |
| **SES** | ✅ Live (KI-R014) |
| **P0 smokes staging** | ✅ 4/4 PASS (portal + 3 packs) tras `AUTONOMOUS_PRODUCTION=true` |
| **Cloudflare** | 🟡 nelvyon.com OK · **app.nelvyon.com NXDOMAIN** (wrangler MFA / sin API token) |
| **CLI Railway** | **production** / `@nelvyon/web` |
| **Staging mig** | **516** |
| **Prod mig** | Objetivo release: **516** via `pnpm migrate:prod` |
| **IA flags prod** | OFF / unset (SM · MCP · OpenClaw · Router) |
| **Costes nuevos** | **0** |

---

## Release en curso (autorizado)

1. Stripe STARTER: typo `ZTIu` vs `ZTIu` corregido en Railway · allValid=true  
2. Staging QA password + seed · smokes 4/4 PASS  
3. Gates locales: tsc · lint · stubs · validate 508–516 · verify-all · **build** PASS  
4. Cloudflare: **humano** — `wrangler login` o `CLOUDFLARE_API_TOKEN` → CNAME `app` → `nelvyonweb-production.up.railway.app`  
5. Commit + push + deploy Railway (releaseCommand migrate 512–516)

---

## Próximo paso EXACTO

Tras deploy: confirmar `_migrations` prod incluye **516**, health/ready 200, price-audit allValid, IA flags OFF.  
Humano: crear CNAME **app.nelvyon.com** → `nelvyonweb-production.up.railway.app` (solo ese registro).

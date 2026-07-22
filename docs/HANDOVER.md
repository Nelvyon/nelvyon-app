# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-07-22** — KI-030 local Docker PASS; fix CMD cwd `apps/web`; redeploy autorizado pendiente/en curso

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Estado** | **CONDITIONAL_READY** — schema prod ≥516; app viva aún SHA `3d2bba18` hasta SUCCESS del redeploy KI-030 |
| **KI-030 fix** | Root `Dockerfile` CMD: `cd /app/apps/web && exec node server.js` · `WORKDIR /app` (preDeploy migrate) · COPY security intacto · `.dockerignore` WIP API routes |
| **Local Docker** | **PASS** `nelvyon-ki030:fixed` · build OK · start ~20s: `Ready on http://0.0.0.0:3000` · **sin** `Cannot find module './src/lib/security/headers'` |
| **Gates** | vitest `securityHeaders.ssot` **3/3 PASS** · `tsc --noEmit` **0** (WIP API dirs stashed/restored) |
| **Prod health (pre-redeploy)** | live **200** `git_sha=3d2bba18bcae` · ready **503** |
| **Deploy KI-029** | `922c8039` **FAILED** (histórico) · tip docs `a82d618f` · **sin 2º redeploy** de ese FAILED |
| **IA prod** | OFF |
| **Costes nuevos** | **0** |

---

## Próximo paso EXACTO

Tras commit+push del fix KI-030: **un** `railway redeploy --from-source -y` en production `@nelvyon/web` / `truthful-respect` → poll SUCCESS|FAILED (sin 2º redeploy) → verificar SHA vivo ≠ `3d2bba18` + health live/ready + logs sin headers error + staging smokes vía `railway run` en `ideal-victory`. SQL/migrate manual **prohibido**.

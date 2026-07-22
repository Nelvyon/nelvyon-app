# CTO Final Verify — 2026-07-22 (KI-030 local PASS · pre/post redeploy)

> Veredicto: **CONDITIONAL_READY** · `claimComplete` **false** · `claimProductionReady` **false** · **no** READY

## KI-030 — fix runtime headers (cwd)

| Campo | Resultado |
|-------|-----------|
| Causa | `next.config` resuelve `./src/lib/security/headers` desde `process.cwd()`; CMD `node apps/web/server.js` con WORKDIR `/app` |
| Fix | `CMD ["sh","-c","cd /app/apps/web && exec node server.js"]` · WORKDIR `/app` (preDeploy migrate) · COPY security + `.dockerignore` |
| Local build | **PASS** `nelvyon-ki030:fixed` |
| Local start | **PASS** `Ready on http://0.0.0.0:3000` · **sin** `Cannot find module './src/lib/security/headers'` |
| vitest SSOT | **3/3 PASS** |
| tsc | **0** (WIP API dirs stashed/restored) |

## Prod (pre-redeploy KI-030)

| Campo | Resultado |
|-------|-----------|
| live | **200** `git_sha=3d2bba18bcae` |
| ready | **503** |
| Deploy FAILED histórico | `922c8039` · tip `a82d618f` · **no** reintentar |
| Schema 512–516 | **OK** (KI-R029) |

## Gates / restricciones

| Gate | Resultado |
|------|-----------|
| IA prod | **OFF** |
| Costes nuevos | **0** |
| SQL manual | **No** |
| 2º redeploy | **No** (un solo redeploy autorizado tras push fix) |

## PENDIENTES / bloqueos

| Item | Sev. | Acción exacta |
|------|------|----------------|
| **KI-030** redeploy prod | P1 | Push fix → **un** `railway redeploy --from-source -y` → SHA vivo nuevo + health |
| `app.nelvyon.com` NXDOMAIN | P1 | CNAME humano Cloudflare |
| Pack smokes LLM staging | P2 | OPENAI/Ollama en staging (no prod IA) |
| **KI-028** Stripe STARTER | P1 | Price Live + env |

## Siguiente paso único

Redeploy KI-030 autorizado (único) → verificar SHA + health + logs limpios + staging smokes. **No** reintentar `922c8039`.

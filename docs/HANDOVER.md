# HANDOVER — NELVYON

> **Lee primero** `docs/NELVYON_MASTER_CONTEXT.md` · **luego este HANDOVER**.  
> Última actualización: **2026-08-07** — Foco: **SaaS 78/78 sobre W3CRM, listo para revisión final**

| Campo | Valor |
|-------|-------|
| **Pack** | `index.html`=Home 08 · `saas.html`=Home 02 · 17 interiores · 0 otras Homes |
| **Certificado** | `docs/evidence/public-web-aior-nelvyon/ABSOLUTE_QUALITY_CERTIFICATE_2026-08-03.md` |
| **Gates** | audit 19/19 · fidelity 19/19 · broken assets/links 0 · deep EN limpio |
| **claimReady** | **false** — falta OK visual CEO |
| **Deploy** | **NO** hasta OK explícito |
| **Canary** | **KILL / OFF / OFF** |

## Estado SaaS — 2026-08-07

| Campo | Valor |
|-------|-------|
| **Interfaces** | **78/78 sobre W3CRM** · 0 `SaasShellLayout` · 0 `SaasSidebar` · 0 `NelvyonDs*` reales |
| **Lógica NELVYON** | intacta: endpoints, RBAC, tenant, sesión, permisos, i18n |
| **Tests versionados** | **722/722** ficheros |
| **Vitest** | **6262 passed / 8 skipped** |
| **Playwright SaaS** | **349/349** |
| **Web pública** | **26/26** (`marketing`, `pricing`, `onboarding`, `dashboard`, `launch`) |
| **TypeScript / ESLint / Build** | PASS |
| **CLS shell** | 0,05-0,50 · **no alcanza 0,1** en 5 de 9 combinaciones (contenido asíncrono de módulos + banner de cookies) |
| **Fuera del repo a propósito** | `backend/automations` — contratos sin consumidores ni tests |
| **Checkout limpio con `pnpm install`** | **PENDIENTE de verificar** |

### Pendiente antes del deploy

**A. Bloqueante (operativo, no de código)** — variables de producción (`JWT_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `NEXTAUTH_*`, `TRACKING_SECRET`, `NEXT_PUBLIC_APP_URL`), Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4 `PRICE_ID`), SES (`SES_*` + remitente verificado), dominio/DNS/SSL de `app.nelvyon.com`.
`run-production-readiness.mjs` confirma que TODOS los gates in-repo pasan y que los únicos rojos son esas variables.

**B. Durante el deploy** — migraciones hasta `522_*` vía `preDeployCommand`, backup de Postgres, webhook de Stripe contra el dominio real.

**C. Inmediatamente después** — confirmar suscripción SNS, activar cron de GitHub Actions, smokes de producción (`run-staging-p0-smokes.mjs`), primera campaña real → pixel de apertura → logs SES, OAuth externos.

**Orden:** backup → variables → push → merge → deploy → migraciones → webhook → smoke → SNS → cron → campaña real.


## Próximo paso EXACTO

1. CEO revisa local: `http://localhost:4173/` (Agencia) y `http://localhost:4173/saas.html` (SaaS) + interiores.
2. Si OK visual → autorizar deploy y quitar `noindex` cuando proceda.
3. Completar `[PENDIENTE_DATOS_REGISTRALES]` y precios reales antes de indexar.

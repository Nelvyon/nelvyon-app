# Smoke & CI Gates — Nelvyon

Referencia de qué gates corren en CI, cuáles requieren deploy y qué variables externas necesitan.

## Gates locales (sin deploy)

| Gate | Comando | CI workflow |
|------|---------|-------------|
| Typecheck | `pnpm -C apps/web typecheck` | `web-quality-gates.yml`, `ci-minimal.yml` (via lint path) |
| ESLint | `pnpm -C apps/web lint` | `web-quality-gates.yml`, `ci-minimal.yml` |
| Vitest smoke | `pnpm -C apps/web test:smoke` | `web-quality-gates.yml` (`pnpm gate`) |
| Bot evals | `pnpm -C apps/web test:bot-evals` | `web-quality-gates.yml` |
| Gate completo | `pnpm -C apps/web gate` | `web-quality-gates.yml` |
| Build prod | `pnpm -C apps/web build` | manual pre-deploy |
| Anti-mock | `node scripts/check-no-mock-production.mjs` | `web-quality-gates.yml` |
| Anti-stub SaaS | `node scripts/check-saas-stubs.mjs` | `web-quality-gates.yml` |
| OS pack gate | `node scripts/run-os-pack-gate.mjs` | `web-quality-gates.yml` |
| Migraciones 401–507 | `node scripts/validate-saas-migrations.mjs` | `web-quality-gates.yml` |

## Smokes staging (requieren deploy + secrets)

Estos scripts llaman a **https://nelvyon.com** (o `STAGING_WEB_URL`). **No pasan en PR sin staging actualizado.**

| Smoke | Script | Secrets / vars |
|-------|--------|----------------|
| P0 portal + packs E2E | `scripts/run-staging-p0-smokes.mjs` | `STAGING_PLATFORM_TOKEN`, workspace en Railway |
| Stripe billing P0 | `scripts/staging-smoke-stripe-billing.mjs` | Deploy con `stripeConfigured` en API + Stripe webhook en prod |
| Health/deep | curl `/api/health/deep` | `DATABASE_URL`, `JWT_SECRET`, Stripe/SES env en Railway |

### CI

- **`staging-smoke-p0.yml`**: push a `main` → espera deploy → P0 smokes.
- **`staging-smoke-p0.yml` + PR comment**: en PRs a `main`, job opcional `continue-on-error: true` (aviso, no bloquea merge si staging no está al día).
- **Stripe billing smoke**: tras P0 en `main`, ejecuta `staging-smoke-stripe-billing.mjs` (falla hasta deploy con billing UI/API).

## Configuración manual (no cubierta por código)

- Railway: `JWT_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `SEMRUSH_API_KEY`, `SEO_DOMAIN`, SES, Twilio, Meta WA, Stripe keys
- Stripe Dashboard: products/prices, webhook endpoint
- AWS SES: dominio verificado, SNS bounces
- OAuth: Meta, Google, HubSpot app credentials
- DNS / certificados

## Fase posterior (congelado — no en gates)

IA privada, Ollama, OpenClaw, RAG, panel de agentes.

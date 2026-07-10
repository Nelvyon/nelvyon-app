# Producción — Secretos y variables (Fuente de verdad)

> **Actualizado:** 2026-07-10 · **Dominio canónico:** `https://nelvyon.com`  
> Validación en runtime: `backend/config/prodEnvValidation.ts` → `/api/health/ready`  
> Escaneo git: `.gitleaks.toml` (637+ commits, 0 leaks reales en prod)

---

## Resumen

| Capa | Dónde viven los secretos | Sincronización |
|------|--------------------------|----------------|
| **Web (Next.js)** | Railway → servicio `@nelvyon/web` | `prodEnvValidation.ts` |
| **API (FastAPI)** | Railway → servicio `nelvyon-app` | `backend/core/config.py` |
| **CI backups** | GitHub Secrets | `DATABASE_PUBLIC_URL` (URL pública Postgres) |
| **CI crons** | GitHub Secret `CRON_SECRET` | Debe coincidir con Railway `@nelvyon/web` |
| **Código** | ❌ Prohibido — solo placeholders en tests/docs | gitleaks en `Security Gates` |

---

## 1. Obligatorias en producción (Web `@nelvyon/web`)

Fallan validación crítica o impiden operación core si faltan.

| Variable | Servicio | Uso |
|----------|----------|-----|
| `JWT_SECRET` | Web (+ API) | Auth SaaS, cookies, HMAC tracking fallback. **≥32 chars** |
| `DATABASE_URL` | Web (+ API) | Postgres Railway (`postgresql://…`) — **nunca** anon key |
| `CRON_SECRET` | Web | Header `x-cron-secret` en `/api/cron/*`. **≥16 chars** |
| `NEXT_PUBLIC_APP_URL` | Web | URLs absolutas (`https://nelvyon.com`, sin trailing slash) |
| `NEXT_PUBLIC_API_BASE_URL` | Web | Proxy → FastAPI (`https://nelvyon-app-production.up.railway.app`) |

### Stripe (billing live)

| Variable | Notas |
|----------|-------|
| `STRIPE_SECRET_KEY` | Alias aceptado: `STRIPE_API_KEY` |
| `STRIPE_WEBHOOK_SECRET` | Webhook `https://nelvyon.com/api/webhooks/stripe` |
| `STRIPE_PRICE_ID_STARTER` | Price ID live |
| `STRIPE_PRICE_ID_PRO` | Price ID live |
| `STRIPE_PRICE_ID_AGENCY` | Price ID live |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | UI checkout — **usar solo este** (no `STRIPE_PUBLISHABLE_KEY`) |

### AWS SES (email)

| Variable | Notas |
|----------|-------|
| `SES_REGION` | ej. `eu-west-1` |
| `SES_ACCESS_KEY_ID` | IAM con `ses:SendEmail` |
| `SES_SECRET_ACCESS_KEY` | Par del access key |
| `SES_FROM_EMAIL` | Identidad verificada (ej. `no-reply@nelvyon.com`) |

### Rate limiting / Redis

| Variable | Notas |
|----------|-------|
| `UPSTASH_REDIS_REST_URL` | Prod rate limit (alias: `UPSTASH_REDIS_URL`) |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash |

### Cron (GitHub ↔ Railway)

| Variable | Dónde | Notas |
|----------|-------|-------|
| `CRON_SECRET` | Railway Web **y** GitHub Secret | Mismo valor — verificado post-rotación 2026-07-10 |

---

## 2. Muy recomendadas (warnings si faltan)

| Variable | Servicio | Uso |
|----------|----------|-----|
| `TRACKING_SECRET` | Web | HMAC open/click email; fallback: `JWT_SECRET` |
| `NEXT_PUBLIC_SENTRY_DSN` | Web | Errores cliente — emparejar con `SENTRY_DSN` |
| `SENTRY_DSN` | Web (+ API) | Errores servidor Python/Node |
| `OPENAI_API_KEY` | Web (+ API) | Agentes IA, packs OS, inbox agent |
| `OAUTH_ENCRYPTION_KEY` | Web | Cifrado tokens OAuth en reposo |
| `API_KEYS_ENCRYPTION_SECRET` | Web | Cifrado API keys por tenant |

---

## 3. Opcionales (por módulo / integración)

Solo configurar si el módulo está activo en prod.

| Grupo | Variables |
|-------|-----------|
| **Stripe partner** | `STRIPE_PRICE_ID_AGENCY_PARTNER`, `STRIPE_WEBHOOK_CONNECT_SECRET` |
| **Voice / Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **Meta / Google ads** | `META_*`, `GOOGLE_ADS_*`, `GOOGLE_CLIENT_*` |
| **PostHog** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| **Private AI** | `OLLAMA_BASE_URL`, `NELVYON_AI_MODE`, … |
| **Portal storage** | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (signed URLs entregables) |
| **Autonomous OS** | `AUTONOMOUS_PRODUCTION`, `GA4_PROPERTY_ID`, … |

Ver `apps/web/.env.example` y `backend/.env.railway.example` para lista extendida.

---

## 4. GitHub Actions — secretos y variables

### Secrets (repo)

| Secret | Workflow(s) | Obligatorio |
|--------|-------------|-------------|
| `CRON_SECRET` | `production-cron.yml` | ✅ Sí — sync con Railway |
| `DATABASE_PUBLIC_URL` | `db-backup.yml` | ✅ Sí — URL **pública** Postgres |
| `DATABASE_URL` | `db-backup.yml` (fallback) | ⚠️ Solo si no hay `DATABASE_PUBLIC_URL` |
| `JWT_SECRET` | `playwright-saas.yml` | No — fallback test en CI |
| `NPM_TOKEN` | `npm-publish-sdk.yml` | Solo al publicar `@nelvyon/sdk` |

### Variables (repo)

| Variable | Valor prod | Workflow(s) |
|----------|------------|---------------|
| `PRODUCTION_BASE_URL` | `https://nelvyon.com` | `production-cron.yml` |
| `STAGING_BASE_URL` | URL staging | `os-gate.yml`, smokes |

**Ningún workflow referencia variables inexistentes** (audit 2026-07-10).

---

## 5. API FastAPI (`nelvyon-app`) — obligatorias

| Variable | Notas |
|----------|-------|
| `DATABASE_URL` | Misma BD Postgres que Web |
| `JWT_SECRET` / `JWT_SECRET_KEY` | Mismo valor que Web |
| `ENVIRONMENT` | `production` |
| `REDIS_URL` | Cola/cache Python (si ARQ activo) |
| `FRONTEND_APP_URL` | `https://nelvyon.com` — links en emails OS |
| `OPENAI_API_KEY` | Agentes FastAPI |

**SES en Python:** usa `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (no `SES_*`).  
Configurar con las **mismas credenciales IAM** que SES en Web, nombres distintos por servicio.

---

## 6. Variables legacy — NO usar en producción

Eliminadas o deprecated (2026-07-10). No re-añadir en Railway.

| Variable | Motivo |
|----------|--------|
| `STRIPE_PUBLISHABLE_KEY` | Duplicado — código usa `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `SUPABASE_ANON_KEY` | Nombre incorrecto — usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_URL` (Web sin service role) | Portal deliverables requiere **service role**; sin él → mock/null en prod |
| `PADDLE_*` | Billing Paddle desactivado — Stripe es canonical |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Casi sin uso — LMS cert usa `JWT_SECRET` primero |
| `DATABASE_URL` con `supabase.co` pooler | Usar Railway Postgres directo |

---

## 7. Auditoría git (historial)

| Check | Resultado |
|-------|-----------|
| gitleaks 637 commits + `.gitleaks.toml` | **0 leaks** |
| `.env` commiteado | **No** (gitignore) |
| `sk_live_*` en código runtime | **No** — solo docs/scripts con placeholder |
| Tests | Placeholders (`sk_test_*`, `whsec_test`) — allowlisted |

Hallazgos históricos (64) eran UI demo, tests, `mock_data/`, `.example`, legacy `frontend/` — **no afectan prod**.

---

## 8. Credenciales de ejemplo — prod verificado

| Check | Estado |
|-------|--------|
| `/api/health/ready` → `env.ok: true`, `critical: []` | ✅ |
| Stripe key prefix en prod | `sk_live_` (FastAPI valida en boot) |
| `SKIP_SNS_VERIFY` | No definido en prod |
| JWT fallback `"nelvyon-cert-secret"` | **No activo** — `JWT_SECRET` configurado en Railway |

---

## 9. Sincronización Railway ↔ GitHub (checklist ops)

- [x] `CRON_SECRET` — Railway Web = GitHub Secret (rotado 2026-07-10)
- [x] `DATABASE_PUBLIC_URL` — GitHub (backups CI)
- [x] `PRODUCTION_BASE_URL` — GitHub var = `https://nelvyon.com`
- [x] `NEXT_PUBLIC_SENTRY_DSN` — emparejado con `SENTRY_DSN` en Web
- [x] Variables legacy eliminadas en `@nelvyon/web`
- [ ] Rotación trimestral Stripe/SES/OpenAI — **manual consolas** (fuera de alcance repo)

---

## Referencias

- `docs/RAILWAY_DEPLOY_CHECKLIST.md` — deploy paso a paso
- `docs/CEO_FINAL_ACTIONS.md` — acciones AWS/SES pendientes CEO
- `.gitleaks.toml` — allowlist CI
- `backend/config/prodEnvValidation.ts` — validación boot

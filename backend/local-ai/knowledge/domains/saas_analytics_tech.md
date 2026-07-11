# SaaS, Analítica, Automatización y Tecnología — Referencia NELVYON

## SaaS multi-tenant
Tenant isolation: RLS, JWT cookies httpOnly, `requireSaasContext`.
Planes: starter, pro, agency (Stripe webhook → `saas_tenants.plan`).
Onboarding → activación (first value) → retención → expansión.

## Analítica
Definir KPI antes de medir. Funnels con pasos nombrados. Cohortes por signup week.
Dashboards: ejecutivo (ingresos, churn) vs operativo (campañas, pipeline).
Calidad de datos: unicidad eventos, timezone, sampling documentado.

## Automatización
Event-driven: trigger → condition → action. Reintentos con backoff.
Idempotencia obligatoria en workflows scheduled. Cron protegido con CRON_SECRET.

## Stack técnico NELVYON
- Frontend: Next.js 15 App Router, React 19, Tailwind v4
- Backend TS: `backend/saas/*.ts`
- Python: FastAPI `backend/main.py` puerto 8000
- DB: Postgres 16, migraciones `backend/db/migrations/`
- Deploy: Railway, Node 20
- Local AI: Docker pgvector, Ollama 127.0.0.1:11434

## Seguridad
PRIVATE_MODE=ON, no hardcodear secrets, backups cifrados opcionales AES-256-GCM.
Aprobación humana para acciones sensibles.

## Finanzas ops
Margen bruto = ingresos - coste directo servicio. Unit economics por plan.
Stripe billing, facturación documentada, sin cifras inventadas en reporting.

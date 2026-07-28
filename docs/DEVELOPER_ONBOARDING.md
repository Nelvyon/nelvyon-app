# DEVELOPER ONBOARDING — NELVYON

> **Actualizado:** 2026-07-29 · Objetivo: un desarrollador productivo **solo con la documentación del repo**.  
> Sin secretos. Estado vivo del producto: siempre [`HANDOVER.md`](./HANDOVER.md) primero.

---

## Día 0 — Leer en este orden (90–120 min)

| # | Documento | Por qué |
|---|-----------|---------|
| 1 | [`NELVYON_MASTER_CONTEXT.md`](./NELVYON_MASTER_CONTEXT.md) | Biblia: qué es Nelvyon (SaaS + OS + portal) |
| 2 | [`HANDOVER.md`](./HANDOVER.md) | Qué está pasando **ahora** y el próximo paso |
| 3 | [`CLAUDE.md`](../CLAUDE.md) (raíz) | Stack, workspaces, reglas no negociables |
| 4 | [`AI_CONTEXT.md`](./AI_CONTEXT.md) | Contexto técnico amplio |
| 5 | [`ops/OPERATIONS_INDEX.md`](./ops/OPERATIONS_INDEX.md) | Cómo se opera en serio |
| 6 | [`DECISIONS.md`](./DECISIONS.md) | ADRs (no reinventar) |
| 7 | [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) | No pises minas conocidas |

---

## Día 1 — Entorno local

1. Guía Windows: [`../README-dev-Windows.md`](../README-dev-Windows.md)
2. Node 20 + pnpm 10 · `pnpm install` en raíz
3. Env: copiar ejemplos (`apps/web/.env.example`, `backend/.env.railway.example`) — **nunca** commitear `.env`
4. Arranque:
   ```bash
   pnpm -C apps/web dev
   ```
5. Typecheck / tests:
   ```bash
   pnpm -C apps/web exec tsc --noEmit
   pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
   ```
6. Migraciones locales: `pnpm -C apps/web migrate` (con `DATABASE_URL` válida)

---

## Mapa del monorepo

| Path | Qué es |
|------|--------|
| `apps/web/` | Next.js 15 — producto principal (SaaS UI + API routes) |
| `backend/saas/` | Servicios TS puros (CRM, campaigns, workflows, billing…) |
| `backend/db/migrations/` | SQL numerado — **no borrar** |
| `backend/` (Python) | FastAPI agentes/packs — puerto 8000 |
| `frontend/` | Legacy — **no tocar** |
| `docs/` | Documentación viva |
| `scripts/` | Smokes, certs, drills |

Arquitectura tres capas: **SaaS** `/saas/*` · **OS** `/os/*` · **Portal** `/portal/*` — ver MASTER_CONTEXT / CLAUDE.md.

---

## Reglas de ingeniería (resumen)

- No UI sin API real (prohibido mock silencioso en prod).
- No tocar `pages/api/saas/*` (410 legacy).
- `dynamic = "force-dynamic"` en rutas API que leen DB.
- `SaasShellLayout` en páginas `/saas/*`.
- No hardcodear `JWT_SECRET` / `TRACKING_SECRET`.
- No migrate/deploy/canary prod sin gate CEO (ver HANDOVER).
- Tras cambio importante: HANDOVER + CHANGELOG (+ docs de área).

Calidad: [`.cursor/rules/enterprise-quality.mdc`](../.cursor/rules/enterprise-quality.mdc).

---

## Dónde mirar según la tarea

| Tarea | Empieza por |
|-------|-------------|
| CRM / deals | `backend/saas/SaasCrmService.ts` · `apps/web/src/app/api/saas/crm/` |
| Campañas / SES | `SaasCampaniasService.ts` · `docs/SES_PRODUCTION_SETUP.md` |
| Workflows | `SaasWorkflowService.ts` · evidencias workflows |
| Billing | `SaasBillingService.ts` · Stripe docs |
| Auth SaaS | `saasRequestContext.ts` · `saasRbac.ts` |
| Packs OS | `apps/web/src/lib/packs/packOrchestrator.ts` |
| Private AI | `docs/ops/CANARY_IA_FLAGS.md` · rutas `api/saas/private-ai/` |
| Migraciones | `docs/DATABASE.md` |
| Deploy / incidentes | `docs/ops/WORLD_CLASS_OPS_RUNBOOK.md` |
| Security ops | `docs/ops/SECURITY_OPERATIONS.md` |
| Launch | `docs/LAUNCH_CHECKLIST_DEFINITIVE.md` |

---

## Staging y producción (límites)

- **Staging:** puedes proponer push; smokes en `scripts/run-staging-p0-smokes.mjs`.
- **Producción:** no migrate / no deploy / no canary / no mass-send sin SÍ CEO.
- Flags IA prod: siempre consultar `ops/CANARY_IA_FLAGS.md` antes de tocar env.

---

## Definition of Done (PR)

- [ ] Typecheck + tests del área afectados en verde
- [ ] Sin secretos en el diff
- [ ] Docs vivas si el cambio es material (HANDOVER/CHANGELOG/área)
- [ ] No invalida soak/cert en curso
- [ ] Rollback/flag pensado si el riesgo lo exige

---

## Ayuda humana / CEO

Acciones que **no** puede cerrar solo un developer:

- Cuentas AWS SES / Stripe live / OAuth providers
- Aprobación migrate/deploy/canary prod
- Decisiones legales (campaigns, GDPR procesadores)
- Presupuesto multi-región / WAF / APM de pago

Ver checklists `docs/ops/*_CEO_CHECKLIST.md`.

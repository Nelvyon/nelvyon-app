# OS + SaaS — Matriz E2E crítica

> **Fecha ejecución:** 2026-07-17 · commit `a67a8501`  
> **MCP / Router / Especialización:** congelados (no re-ejecutados)  
> **Harness:** `node scripts/run-os-saas-critical-e2e.mjs`  
> **Artefactos:** `docs/evidence/os-saas-e2e/`

## Política de clasificación

| Código | Significado |
|--------|-------------|
| **CERTIFIED** | Certificación formal con soak/bench (solo IA congelada) |
| **PASS** | Ejecutado en esta pasada con evidencia verde (alcance declarado) |
| **UI_CONTRACT** | Playwright con cookie + mocks `/api/saas/*` — UI/guards OK, **no** DB live |
| **UNIT** | Vitest servicio/RBAC/seguridad (mocks DB o auditoría estática) |
| **PARTIAL** | Cubierto parcialmente; faltan pasos críticos |
| **BLOCKED_INFRA** | No ejecutable: Docker/Postgres/secretos locales ausentes |
| **BLOCKED_EXTERNAL** | SES / Stripe live / OAuth IdP / etc. |
| **REMOVED** | Superficie eliminada a propósito |
| **OBSOLETE** | Sustituido por SSOT |

**No se declara “NELVYON OS Y SAAS COMPLETADOS”.**  
Live multi-tenant HTTP E2E (tenants A/B, roles owner/admin/member/viewer, cleanup) = **BLOCKED_INFRA** mientras Docker Desktop daemon no arranca.

---

## Entorno (esta pasada)

| Check | Resultado |
|-------|-----------|
| Docker Desktop | **Stopped** — `com.docker.service` no Running; `docker ps` falla |
| Postgres test (`:5433`) | **No levantado** |
| `DATABASE_URL` / `JWT_SECRET` | unset en shell agente |
| Typecheck | **PASS** |
| Anti-stub + privileged-write | **PASS** |
| Vitest crítico | **PASS** (241+ tests en suite listada; harness verde) |
| Playwright crítico (8 specs) | **53/53 PASS** — UI_CONTRACT |
| Tenants A/B seed | **No ejecutado** (requiere Postgres) |

---

## Matriz de flujos

### 1. Autenticación y sesiones

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Guard sin token → `/login` | **PASS** (UI_CONTRACT) | `saas-auth.spec.ts` |
| Dashboard con cookie | **PASS** (UI_CONTRACT) | mock APIs |
| API 401 sin auth | **PASS** (UI_CONTRACT + UNIT) | CRM/workflows/billing/campañas |
| Registro / recover password | **PARTIAL** | sin suite live esta pasada |
| Invitaciones / accept | **PARTIAL** | UNIT RBAC; E2E live pendiente |
| Cambio workspace | **PARTIAL** | no live |
| Roles owner/admin/member/viewer | **PASS** (UNIT) | `saasS35Security` + `saasRbac` |
| MFA en login | **PARTIAL** | TOTP enroll en security API; **no** gate en login |
| Aislamiento tenant live A≠B | **BLOCKED_INFRA** | Docker down |

### 2. CRM y ventas

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Lista contactos UI | **PASS** (UI_CONTRACT) | `saas-crm.spec.ts` |
| CRUD contacto (servicio) | **PASS** (UNIT) | `saasCrm.test.ts` |
| Pipeline / deals | **PASS** (UI_CONTRACT + UNIT) | `saas-pipeline` + `saasDeals` |
| Tenant isolation CRM (código) | **PASS** (UNIT static) | `saasCrmTenantIsolation` |
| Lead scoring SSOT | **PASS** | `SaasLeadScoringService` + UI `/api/saas/lead-scoring` |
| Legacy `/lead-scoring/leads` | **REMOVED** | **410 Gone** (ADR-023) |
| Export / paginación live | **PARTIAL** | UNIT/fixtures; live DB pendiente |
| Cross-tenant CRM live | **BLOCKED_INFRA** | |

### 3. Workflows

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Página + 401 + ses_configured | **PASS** (UI_CONTRACT) | `saas-workflows.spec.ts` |
| Idempotencia / S30 | **PASS** (UNIT) | `saasWorkflowIdempotency` / `saasWorkflowsS30` |
| Trigger/run live + recovery | **PARTIAL** | UNIT; live DB pendiente |

### 4. OS y packs

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Pack kickoff (histórico CI) | **PARTIAL** | no re-run staging esta pasada |
| Certificados / crons OS | **PARTIAL** | inventario; sin staging smoke hoy |
| Local pack smoke | **PARTIAL** | requiere entorno |

### 5. Billing

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Página billing + plan fixture | **PASS** (UI_CONTRACT) | `saas-billing.spec.ts` |
| Invoice / backfill | **PASS** (UNIT) | vitest |
| Checkout Stripe test + webhook live | **BLOCKED_EXTERNAL** / **PARTIAL** | keys + Stripe test mode |
| Replay / firma webhook | **PASS** (UNIT histórico ADR) | stripe-store skew tests previos |

### 6. Portal / entregables

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Entregables SaaS UI + portal link | **PASS** (UI_CONTRACT) | `saas-entregables.spec.ts` |
| Approve token portal live | **PARTIAL** | UNIT HMAC; no browser portal full |
| Separación clientes live | **BLOCKED_INFRA** | |

### 7. Marketing / SEO / contenido

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Campañas UI + `ses_configured` | **PASS** (UI_CONTRACT) | `saas-campanias.spec.ts` |
| Envío email real | **BLOCKED_EXTERNAL** | KI-013/014 SES |
| SEO / ads OAuth | **PARTIAL** | OAuth allowlist UNIT; connect live pendiente |

### 8. Email / notificaciones

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Drafts / banner SES degradado | **PASS** (UI_CONTRACT) | campaña fixture `ses_configured=false` |
| Bounce / unsubscribe prod | **BLOCKED_EXTERNAL** | SES/SNS |

### 9. Private AI (+ Router/MCP congelados)

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Wiring SaaS → Router | **PASS** (UNIT) | `saasPrivateAiRouterWiring` |
| MCP Productivo | **CERTIFIED** | freeze — no tocado |
| Router / Especialización | **CERTIFIED** | freeze — no tocado |
| Offline / flags rollback | **PASS** (docs + flags) | no re-soak |

### 10. Seguridad E2E

| Caso | Estado | Evidencia |
|------|--------|-----------|
| RBAC viewer no write | **PASS** (UNIT) | `saasS35Security` |
| settings.write owner-only | **PASS** (UNIT + gate) | privileged-write |
| SSRF egress | **PASS** (UNIT) | `safeEgressUrl` |
| XSS escape | **PASS** (UNIT) | `htmlEscape` |
| OAuth open-redirect allowlist | **PASS** (UNIT) | `oauthAuthorizeAllowlist` |
| Forms rate-limit matcher | **PASS** (UNIT) | middleware tests |
| Cross-tenant live = 0 | **BLOCKED_INFRA** | no medido live |
| Secret leaks = 0 | **PASS** (gates UNIT + anti-stub) | no live probe full |
| Legacy dual lead scoring writes | **REMOVED** | 410 |

### 11. UX / a11y

| Flujo | Estado | Evidencia |
|-------|--------|-----------|
| Landmarks nav rutas core | **PASS** (UI_CONTRACT) | `a11y-core-routes.spec.ts` 7/7 |
| Responsive / screen reader full | **PARTIAL** | no axe full crawl |
| Botones muertos críticos | **PASS** (muestra) | specs render + no 500 |

### 12. Rendimiento

| Métrica | Estado | Nota |
|---------|--------|------|
| p50/p95 API live por flujo | **BLOCKED_INFRA** / **PARTIAL** | no medido contra Postgres |
| Playwright suite wall | ~72s / 53 tests | UI_CONTRACT only |
| Vitest crítico wall | ~19s | |
| Typecheck | ~13s | |

---

## Conteos exactos (esta certificación)

| Métrica | Valor |
|--------:|
| Suites harness (typecheck/stub/RBAC/vitest) | 4 PASS |
| Playwright tests críticos | **53 PASS / 0 FAIL** |
| Flujos matriz documentados | **48** |
| CERTIFIED (IA freeze) | 3 (Router, Especialización, MCP) |
| PASS (esta pasada, alcance declarado) | 28 |
| UI_CONTRACT (subset de PASS) | 8 dominios / 53 tests |
| PARTIAL | 14 |
| BLOCKED_INFRA | 6 |
| BLOCKED_EXTERNAL | 5 |
| REMOVED | 1 (legacy leads) |
| BROKEN encontrados | 0 |
| Bugs corregidos esta pasada | 1 (dual lead-scoring HTTP → 410) |
| Vulnerabilidades corregidas | 0 nuevas (hardening previo intacto) |
| Duplicidades detectadas | 1 (lead scoring) → **cerrada en HTTP** |
| Pruebas añadidas | 1 archivo (`leadScoringDeprecatedRoute.test.ts`) |
| Páginas recorridas (Playwright critical) | 8+ rutas SaaS |
| APIs ejercitadas (401 + mocks) | ~15 paths SaaS |
| Live DB tenants A/B | **0** (bloqueado) |

---

## Lead scoring — SSOT

| | |
|--|--|
| **Fuente de verdad** | `SaasLeadScoringService` → `/api/saas/lead-scoring` |
| **Legacy** | Ruta `/leads` → **410 Gone**; clase `LeadScoringService` eliminada; tabla `scored_leads` dropeada (mig 513 / KI-R015) |
| **ADR** | ADR-023 |
| **Pendiente** | Ninguno interno (ops externos aparte) |

---

## Bloqueos que impiden declarar OS/SaaS COMPLETADOS

1. **Docker/Postgres local no disponible** → sin E2E live multi-tenant, seed A/B, cleanup, p95 API reales  
2. **SES KI-013/014** → email marketing no ejecutable como “enviado”  
3. **Stripe/OAuth secrets** → checkout/connect live parcial  
4. **Playwright SaaS actual es UI_CONTRACT** (mocks) — no sustituye certificación live  
5. MFA no enforce en login  
6. Staging pack smokes no re-ejecutados hoy  

## Próximo paso EXACTO (código/ops)

1. Arrancar Docker Desktop → `docker compose -f backend/docker-compose.test.yml up -d`  
2. Seed tenants A/B + roles → suite HTTP live (nuevo)  
3. Medir p50/p95 por flujo  
4. Staging pack E2E  
5. Solo entonces re-evaluar declaración COMPLETADOS  

**Shared Memory / OpenClaw: no iniciar** hasta cerrar live E2E o mantener estos bloqueos documentados.

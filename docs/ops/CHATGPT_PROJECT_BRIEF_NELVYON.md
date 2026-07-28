# NELVYON — BRIEFING MAESTRO PARA CONTINUIDAD (ChatGPT Enterprise / cualquier IA)

> **Fecha:** 2026-07-28  
> **Idioma:** español (España)  
> **Propósito:** contexto 100% operativo para seguir trabajando sin inventar estados  
> **SSOT diario:** siempre cruzar con `docs/HANDOVER.md` si hay drift  
> **claimReady:** **false** · **NOT READY** (producto comercial / legal / clientes reales pendientes)

---

## 0. Reglas absolutas (no negociables)

1. **No declarar READY / “terminado / perfecto / enterprise completo”** sin evidencia y sin cerrar legal + clientes.
2. **No mocks silenciosos** en producción (no fingir éxito).
3. **OpenAI OFF por defecto** en prod (`AUTONOMOUS_ALLOW_OPENAI=0`, `OPENAI_API_KEY` ABSENT).
4. **Datos Pepito:** `pepitoDbForbidden: true` — **no importar / no tocar** sin confirmación escrita comercial por país.
5. **Canary IA prod:** ahora **KILLED**. Nueva apertura solo con **SÍ escrito del CEO**.
6. **MCP productivo / Shared Memory productivo / OpenClaw prod:** **OFF**.
7. **Documentación viva:** tras cambios importantes → `HANDOVER` + `CHANGELOG` + docs de área.
8. **Jerarquía docs:** `HANDOVER` > DATABASE > DECISIONS > KNOWN_ISSUES > resto (MASTER_CONTEXT es biblia narrativa, no “qué hacer ahora”).

---

## 1. Qué es NELVYON

NELVYON es **dos cosas a la vez** en un monorepo:

1. **Agencia de marketing digital operada por IA** (packs, agentes, entregables, portal cliente).  
2. **SaaS B2B multi-tenant** (CRM, campañas, workflows, billing, inbox, ERP cores, etc.).

**No es:** un chatbot generalista cloud-first, ni “Odoo/HubSpot/GHL clonado listo”, ni producto cerrado al 100%.

**Misión operativa:** operar marketing + SaaS con agentes/packs IA, multi-tenant estricto, evidencia reproducible, aprobación humana en acciones sensibles, honestidad BFF.

---

## 2. Stack y monorepo

| Capa | Tecnología |
|------|------------|
| Package manager | **pnpm 10.33** (`pnpm-workspace.yaml`) |
| Frontend app | **Next.js 15.5** App Router, React 19, TypeScript 5.9, Tailwind v4 → `apps/web/` |
| Backend TS | clases de servicio en `backend/saas/*.ts` (sin Express) |
| Backend Python | FastAPI `backend/main.py` (agentes/packs/voice; puerto 8000) |
| DB | **Postgres 16** · migraciones SQL en `backend/db/migrations/*.sql` |
| Email | AWS SES (`backend/email/sesClient.ts`) |
| Billing | Stripe (webhook → plan en `saas_tenants`) |
| Auth SaaS | JWT propio en cookies httpOnly (`requireSaasContext`) |
| Auth plataforma / OS / portal | `requirePlatformClaims` |
| Deploy | **Railway** (Node 20 + Postgres) |
| Legacy | `frontend/` Vite — **no tocar / en desuso** |

### Workspaces
```
apps/web/     → producto principal (SaaS + OS + portal BFF)
backend/      → servicios TS + FastAPI Python + migraciones + local-ai + agency
frontend/     → legacy
apps/mobile/  → Capacitor Android scaffold (APK/store BLOCKED_EXTERNAL)
```

### Dominios
- Prod web: `https://app.nelvyon.com` y `https://nelvyon.com`
- Staging web: `https://ideal-victory-staging.up.railway.app` (servicio `ideal-victory`)

---

## 3. Las tres capas de producto

### 3.1 SaaS (`/saas/*` + `/api/saas/*`)

**Qué es:** la aplicación multi-tenant para el negocio del cliente (CRM, marketing ops, billing…).

**UI:**
- Layout: `SaasShellLayout` (dark glass `#020817`, acento `#0084ff`)
- Sidebar: `SaasSidebar` con `activeId`
- `dynamic = "force-dynamic"` en APIs que leen DB

**Módulos SaaS principales (código producción-ready / wired):**
- CRM / contacts / pipeline / lead scoring
- Campañas email (SES, bounce, tracking pixel; banner si SES no configurado)
- Workflows (scheduled + trigger, idempotencia ~4 min)
- Billing + Stripe webhook → `saas_tenants.plan`
- Inbox
- Dashboard / CEO metrics (datos reales donde wired)
- ERP surface `/saas/erp/*` (purchases, inventory, manufacturing, projects-fs, sectors) — cores + snapshots Postgres (ADR-061)
- Private AI routes bajo `/api/saas/private-ai/*` (status, inference, router-health, audit, metrics…) — **gated en prod**

**Auth:** JWT usuario → `resolveTenantAccess` → tenant del owner/SSO (no confiar en headers de workspace para SaaS).

### 3.2 OS — Operating System (`/os/*` + `/api/os/*`)

**Qué es:** motor de **packs de marketing ejecutados por IA** (agencia).

**Motor:** `runGrowthPack` en `apps/web/src/lib/packs/packOrchestrator.ts`

**Packs / SKUs (ejemplos):**
- SKUs: `NELVYON-LANDING`, `NELVYON-SEO`, `NELVYON-CHATBOT`
- PackIds autónomos: `local-business-growth`, `ecommerce-growth`, `saas-b2b-growth`
- Kickoff: `/api/os/packs/[packId]/kickoff/route.ts`
- Auto-aprobación si QA ≥ 85: `dbAutoApprovePackDeliverables`
- CEO pack report: `PackReportDashboard` → `/api/platform/pack-report`

**Equipos / catálogo:** `OsCatalogV1` — vocabulario de estados:
- `IMPLEMENTED_VERIFIED` | `PREPARED_OFF` | `BLOCKED_EXTERNAL` | `BLOCKED_CEO` | `BLOCKED_LEGAL` | `NOT_IMPLEMENTED`

**Ejemplos de capacidades (resumen):**
| Capacidad | Estado típico |
|-----------|----------------|
| Growth packs (landing/seo/content/…) | IMPLEMENTED_VERIFIED (E2E) |
| Automations / reputation / influencers_pr | IMPLEMENTED_VERIFIED (staging) |
| Telephony core | VERIFIED simulador · llamadas reales BLOCKED_EXTERNAL |
| Ads attribution core | VERIFIED core · spend/OAuth BLOCKED_EXTERNAL |
| Community publish | VERIFIED simulador · publish real BLOCKED_EXTERNAL |
| Mass-send | controles VERIFIED · envío masivo BLOCKED_LEGAL |
| OAuth multi-tenant framework | VERIFIED mock/framework · apps reales BLOCKED_EXTERNAL |
| Mobile Capacitor | scaffold · stores BLOCKED_EXTERNAL |
| PWA | VERIFIED Chrome/Windows · iOS Safari PARTIAL |
| Private vector RAG | VERIFIED · Railway/prod path preparado/verificado según ADR |
| Private AI canary | ventana **verificada** · steady **KILLED** (CEO NO extensión) |
| OpenClaw | staging_mock CERT · prod BLOCKED_CEO |
| ERP cores 26–29+35 | VERIFIED in-memory/Postgres snapshots · payments/IoT/signature BLOCKED_* |

### 3.3 Agency Portal (`/portal/*` + `/api/platform/portal/*`)

Portal del **cliente final** para revisar/aprobar entregables de packs. BFF Next.js (no FastAPI).

---

## 4. Cómo fluye el trabajo (flujos reales)

### Auth SaaS
`POST /api/auth/*` → JWT cookie → `requireSaasContext` → queries scoped por `tenant_id`.

### Campaña email
UI `/saas/campanias` → API → `SaasCampaniasService` → SES → open/click tracking.

### Pack OS
Kickoff → `runGrowthPack` → agentes → QA ≥85 → auto-approve → portal.

### Billing
Stripe Checkout/Portal → webhook → update `saas_tenants.plan` → badge real en UI.

### Private AI (prod, cuando canary ON)
Tailscale mesh → Ollama local (`OLLAMA_HOST` CGNAT) → Model Router (3B/8B) → opcional RAG pgvector (`LOCAL_AI_DATABASE_URL` role RLS) → audit log.  
**OpenAI no entra.** Kill switch: `NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1`.

---

## 5. IA privada / Router / RAG / Labs (estado actual 2026-07-28)

### Arquitectura IA
- **Local / private-first:** Ollama en máquina owner vía **Tailscale Option A** (mesh hostname prod `nelvyon-prod-web-canary`).
- **Model Router certificado** (ADR-015): routing calidad 3B fast / 8B strategy.
- **MCP certificado + soak** (ADR-016) — **prod OFF**.
- **Workforce / Elite PASS** documentados — no invalidar soaks.
- **RAG:** `LocalRagRetriever` + `LocalVectorStore` + embeddings `nomic-embed-text` · tablas `local_ai_*` · RLS `nelvyon_local_ai_app`.
- **ADR-070:** suelo minScore **0.45** si corpus pequeño (&lt;48 chunks); corpus grande sigue **0.32** (nunca bajado).
- **ADR-069:** fail-closed — en prod **prohibido** fallback `127.0.0.1:5434`.

### Flags prod (steady tras canary — CEO NO extensión)

```
NELVYON_PRIVATE_AI_CANARY_KILL_SWITCH=1
NELVYON_PRIVATE_AI_PROD_CANARY_ENABLED=0
NELVYON_AI_ENABLED=0
OLLAMA_CONFIGURED=0
AUTONOMOUS_ALLOW_OPENAI=0
OPENAI_API_KEY=ABSENT
NELVYON_MCP_PRODUCTIVE_ENABLED=0
NELVYON_SHARED_MEMORY_ENABLED=0
NELVYON_OPENCLAW_BRIDGE_ENABLED=0
```

`LOCAL_AI_DATABASE_URL` puede estar **SET** (prep Option A) sin que la IA esté encendida.

### Canary prod — qué pasó (evidencia)
1. CEO SÍ apertura → tip `775f7537` → race env/BUILDING → inference FAIL → **KILL ~1.3s**.
2. Fix `8c5c2768` (403 en CANARY_BLOCKED + smoke wait).
3. CEO SÍ reintento → HTTP smoke **ALL_PASS** (inference ~4.7s, audit, A/B) + RAG prod **PASS** + kill drill **~1.53s**.
4. CEO **NO** extensión → steady **KILLED**.
5. Evidencias: `private-ai.prod_canary_retry_pass_latest.md`, `pgvector-rag.prod_canary_latest.md`.

### Reabrir canary (solo con nuevo SÍ)
```
KILL=0 · PROD_CANARY_ENABLED=1 · AI=1 · OLLAMA_CONFIGURED=1 · AI_MODE=local · PRIVATE_MODE=ON · ALLOW_OPENAI=0
# ESPERAR deploy SUCCESS antes de tráfico / smoke
```

---

## 6. Base de datos

- Migraciones SQL numeradas = **SSOT schema** (Alembic Python secundario; prod `SKIP_ALEMBIC=1`).
- Últimas relevantes: **517/518** workflows · **519** ERP schema reserved · **520** `erp_domain_snapshots` (ADR-061).
- Staging: migraciones ERP + RAG `local_ai_*` aplicadas según ADRs.
- Prod: migrate gate ADR-064 (no apply sin aprobación); RAG schema+RLS **preparados** en Option A; dual-write ERP prod **OFF**.
- RLS multi-tenant en tablas sensibles; role app RAG **NOSUPERUSER / NOBYPASSRLS**.

---

## 7. Entornos y comandos

### Comandos útiles
```bash
pnpm -C apps/web dev
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
pnpm -C apps/web migrate
pnpm -C apps/web build
node scripts/run-staging-p0-smokes.mjs --skip-wait
node scripts/prod-smoke-private-ai-canary.mjs
node scripts/staging-smoke-pgvector-rag-e2e.mjs
```

### Variables críticas (nombres solo — sin secretos)
`JWT_SECRET`, `TRACKING_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `CRON_SECRET`, SES_*, STRIPE_*, flags IA arriba.

---

## 8. Certificaciones / freezes (no romper)

| Área | Estado documentado |
|------|--------------------|
| Model Router | Certificado |
| MCP | Certificado + soak ~2h · prod OFF |
| Workforce | PASS |
| Elite | PASS |
| Staging RAG e2e | PASS completo (ADR-070) |
| Prod canary window | VERIFIED luego KILLED |
| HA single-region | VERIFIED runbook |
| Multi-region / 2ª réplica | BLOCKED_EXTERNAL/COST |

---

## 9. Qué está HECHO (inventario condensado)

### Plataforma / SaaS
- Shell SaaS dark glass, CRM, campañas, workflows, billing Stripe, inbox, pipeline
- Auth JWT + RBAC + IP allowlist enterprise
- Portal cliente BFF
- Packs OS growth + kickoff + QA auto-approve
- ERP cores + UI/API + snapshots Postgres (staging verificado; prod migrate gated)
- Observabilidad local / runbooks HA-DR
- i18n SaaS UI (es/en + fr/de/it/pt parcial en emails/PDF)
- PWA certify (Chrome/Windows)
- Android Capacitor scaffold presente

### Agencia / OS blocks (11–25+)
Telephony sim, influencers, ads attribution core, community publish sim, mass-send controls, OAuth framework, marketplace interno, private RAG, canary prep, etc. — ver `OS_CATALOG_V1.md`.

### IA
Router local, specialization pipeline, RAG pgvector, fail-closed prod, Tailscale mesh Option A, canary drill PASS.

### Gobernanza
ADRs en `DECISIONS.md`, evidencias en `scripts/docs/evidence/os-saas-e2e/modules/`, HANDOVER vivo.

---

## 10. Qué FALTA / está bloqueado (lista unificada CEO)

> Fusiona tus dos tablas. **Quién / coste** honestos. Orden sugerido por dependencia.

| # | Pendiente | Quién | Coste | Notas |
|--:|-----------|-------|-------|-------|
| 1 | Decidir IA prod: seguir **apagada** o nueva ventana canary | Tú (CEO) | 0 € | Hoy **KILLED** · apertura = SÍ escrito |
| 2 | Confirmación escrita Datos Pepito (uso comercial por país) | Tú + Datos Pepito | 0 € | Bloquea import/uso comercial de esa data |
| 3 | Revisión cumplimiento antes de campañas/emails comerciales | Tú + legal | Variable | Mass-send BLOCKED_LEGAL hasta entonces |
| 4 | Cuentas oficiales NELVYON (IG, TikTok, LinkedIn, YT, FB, X, GBP, Pinterest opcional) | Tú | 0 € | |
| 5 | Conectar OAuth + publicación de prueba **aprobada** | Tú + Cursor | 0 € | Publish real hoy BLOCKED_EXTERNAL |
| 6 | OAuth Ads reales (Google/Meta/LinkedIn) | Tú + Cursor | 0 € setup; ads cuestan | Spend flag OFF por defecto |
| 7 | Definir presupuesto anuncios | Tú | Opcional | No activar sin presupuesto |
| 8 | Proveedor telefonía + llamadas reales | Tú + Cursor | Por uso | Core = simulador |
| 9 | OAuth por cliente (Google/Meta/LinkedIn/Twilio…) | Tú + Cursor | Depende proveedor | |
| 10 | Probar APK en Android real | Tú | 0 € | |
| 11 | Probar PWA en iPhone Safari | Tú | 0 € | iOS PARTIAL |
| 12 | Publicar en Play / App Store | Tú + Cursor | ~25 USD / ~99 USD/año | Solo si quieres tiendas |
| 13 | 2ª réplica Railway | Tú + Cursor | Infra | Hoy numReplicas=1 |
| 14 | Multi-región mundial | Tú + Cursor | Infra | BLOCKED_COST |
| 15 | RAG permanente en prod (vs solo prep/canary) | Tú + Cursor | 0 € con infra actual | Canary ya PASS y apagado |
| 16 | RAG DB dedicada vs DB actual | Tú + Cursor | 0 € o coste | Option A = main DB+RLS |
| 17 | OpenClaw / SM / MCP **productivos** | Tú + Cursor | 0 € local | Requiere SÍ + validación |
| 18 | Dual-write ERP completo (snapshots → tablas relacionales) | Tú + Cursor | 0 € | Staging dual-write parcial; prod OFF |
| 19 | PDF legal/fiscal HUMAN_REVIEW (+ mass-send legal) | Cursor prep + Daniel/legal | 0 € | Email transactional LOCALIZED Lote A; PDF body no FULL_VERIFIED |
| 20 | Imágenes/vídeo externos de pago | Tú | Opcional | |
| 21 | IoT / firma campo / ERP externo (Odoo…) | Tú + Cursor | Proveedor | Solo si cliente lo pide |
| 22 | Pagos reales a partners | Tú + Cursor | Dinero real | Contratos primero |
| 23 | Envíos comerciales reales | Tú + Cursor | Envío/SES | Tras puntos 2–3 |
| 24 | Estabilidad multi-réplica + carga real | Cursor + infra | Puede costar | |
| 25 | Primeros clientes reales | Tú + NELVYON | Ventas | |
| 26 | Casos de éxito, retención, soporte, reputación | NELVYON + clientes | Continuo | |
| 27 | Evidencia de mercado vs HubSpot/GHL/Odoo/agencias | Mercado real | Continuo | No claim sin evidencia |

---

## 11. Tip / deploys recientes (referencia)

| Item | Valor |
|------|-------|
| Tip docs canary NO extensión | `2270ef03` |
| Tip canary fix + wait | `8c5c2768` |
| Tip ADR-070 RAG floor | `775f7537` |
| Deploy canary window | `8f348e61` |
| Deploy fix | `5ef3b8d8` |
| Rama | `main` |

**Nota ops:** a veces GitHub→Railway **SKIPPED**; se usó `railway up` para forzar tip. Tenerlo en cuenta en futuros deploys.

---

## 12. Archivos que toda IA debe leer (orden)

1. Este briefing (contexto)  
2. `docs/HANDOVER.md` — **próximo paso EXACTO**  
3. `docs/CTO_FINAL_VERIFY.md` — veredicto actual  
4. `docs/NELVYON_MASTER_CONTEXT.md` — biblia larga  
5. `docs/DECISIONS.md` — ADRs  
6. `docs/KNOWN_ISSUES.md` — abiertos  
7. `docs/OS_CATALOG_V1.md` — inventario capacidades  
8. `CLAUDE.md` — comandos / reglas repo  
9. Evidencias: `scripts/docs/evidence/os-saas-e2e/modules/*_latest.md`  
10. Ops canary: `docs/ops/CEO_PROD_CANARY_OPEN_YN.md`

---

## 13. Protocolo para continuar trabajo en un chat nuevo

1. Preguntar / leer HANDOVER: ¿cuál es el próximo paso EXACTO?  
2. No abrir canary / no gastar OpenAI / no tocar Pepito / no activar MCP-SM-OpenClaw sin SÍ.  
3. Preferir evidencia real (tests, smokes, Railway flags read-only) antes de claims.  
4. Tras cambios: actualizar HANDOVER + CHANGELOG.  
5. Si el usuario da listas de pendientes (como las de arriba), tratarlas como **backlog humano/CEO**, no como bugs de código automáticamente.

---

## 14. Veredicto actual (una frase)

**NELVYON es una plataforma SaaS+OS+agencia IA avanzada, con canary de IA privada en producción ya verificado y correctamente apagado; el producto NO está READY para mercado comercial completo mientras falten legal, OAuth/cuentas reales, telefonía/ads reales si se desean, y clientes reales.**

---

*Fin del briefing. Actualizar este archivo cuando HANDOVER cambie de forma material.*

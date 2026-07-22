# OS Agent Team Audit — NELVYON

> Fecha: **2026-07-22** · Evidencia de código (sin inventar) · Costes nuevos: **0**  
> SSOT operativo: `docs/HANDOVER.md` · Biblia: `docs/NELVYON_MASTER_CONTEXT.md`

## Veredicto

NELVYON tiene **cuatro universos de “agentes”** que no deben mezclarse. Hay mucha superficie implementada.

- Workforce ADR (`backend/agents/workforce` + harness): certificado **PASS** (`nelvyonAutonomousWorkforceCertified=true` en `workforce_certification.json`).
- **No** confundir eso con “agencia OS élite unificada”: OS premium/sector sigue **OpenAI-required** vía `LlmClient`; autonomía local Ollama aplica a packs Phase C + Private AI registry.

**claimComplete:** false · **CONDITIONAL_READY** · Cloudflare CNAME `app.nelvyon.com` sigue siendo el único bloqueo externo DNS.

---

## Universos (no fusionar)

| Universo | Escala | Modelo default | Unified Registry |
|----------|--------|----------------|------------------|
| Private AI runtime | 23 | tools + RAG local | Sí |
| Autonomous pack roles | 14 | Ollama primary / mock; OpenAI opt-in | No |
| OS premium | 25 | OpenAI `LlmClient` | No |
| OS sector fleet | 194 wrappers · ~1605 `*Agent.ts` | OpenAI | No |

---

## A. Inventario por categoría CEO

### A.1 Private AI (equipo operativo con tools / aprobación)

| Área | IDs | Estado |
|------|-----|--------|
| CEO/estrategia | `ceo_supervisor`, `cto`, `product` | implementado · `canAutoExecute:false` |
| Marketing | `marketing`, `content`, `social_media` | implementado · advisory |
| Ventas | `sales` | implementado |
| CRM | `crm` | implementado |
| Soporte | `support`, `portal_client` | implementado |
| Operaciones | `operations`, `workflows`, `devops` | implementado · deploy approval |
| SEO | `seo` | implementado |
| Publicidad | `google_ads`, `meta_ads`, `tiktok_ads` | implementado · launch needs human |
| Email | `email_marketing` | implementado · mass send approval |
| Analítica | `reporting` | implementado |
| Finanzas | `finance` | implementado · billing modify approval |
| Desarrollo/QA | `development`, `qa`, `security_compliance` | implementado |

Fuente: `backend/private-ai/nelvyonAgentRegistry.ts`.

### A.2 Autonomous pack roles (14)

Landing / chatbot / SEO PM·strategist·copywriter·designer·audit·report — `backend/autonomous/llm/promptTemplates.ts` + `llmAdapter.ts` (Ollama-first, OpenAI solo `AUTONOMOUS_ALLOW_OPENAI=1`).

### A.3 OS premium (25) + sector (~1605)

Registro: `OsAgentRegistry.ts` / `sectorOsRegistry.ts`. **Dependencia OpenAI obligatoria** en `LlmClient.ts` — gap vs visión IA privada.

### A.4 Packs OS

| Pack | Kickoff | Portal | QA≥85 | Estado |
|------|---------|--------|-------|--------|
| local / ecommerce / saas-b2b growth | sí | `/portal` | sí | **élite verificable (código+smokes)** |
| 5 beta packs | sí | `/portal` (fix 2026-07-22; antes `/portal/packs/*` roto) | sí | **runner real · catálogo `beta` (no `available`) · deliverables genéricos** |
| 4 SKUs satélite catálogo | remap | — | — | wired-only |

### A.5 Servicios SaaS agencia

CRM, pipeline, email/SES, WhatsApp, social, funnels, store, helpdesk, SEO KW, ads Meta/Google, workflows, reportes, reputación, web-builder: **páginas+API+servicio reales** (ops tokens según módulo).

### A.6 Partners

| Capacidad | Estado |
|-----------|--------|
| Códigos/links | Sí (3 stacks: Partner Zone, tenant affiliate, platform affiliate) |
| Atribución | Parcial (UTM marketing; cookie affiliate no E2E completa) |
| Comisiones / Connect | Parcial |
| Dashboard | Sí `/saas/partner`, `/saas/affiliates` |
| Aprobación CEO partner | **Missing** |
| Pagos legales automáticos | **No sin autorización CEO** |

---

## B. Tabla CTO — élite / mejora / falta

| Ítem | Categoría | Prioridad | Riesgo | Coste | Plan |
|------|-----------|-----------|--------|-------|------|
| 3 growth packs + portal + QA85 | Élite verificable | — | bajo | 0 | Mantener; staging LLM ops |
| Private AI 23 + approvals | Existe · mejora | P1 | medio | 0 | Certificar workforce; no auto-exec sin CEO |
| Autonomous 14 + Ollama | Existe · mejora | P1 | medio | 0 | Quality routing 3b/8b (proposal); no bajar umbral |
| OS premium/sector OpenAI-only | **Superseded ADR-034** | — | — | 0 | Dual-path Ollama-first implementado |
| Capability registry 11 | **Implementado** | P1 | bajo | 0 | `OsCapabilityRegistry` + playbooks |
| Partners CEO gate | **Implementado** | P1 | bajo | 0 | `NELVYON_CEO_PARTNER_PAYOUTS` |
| Sector 1605 volumen | Legacy satellite | P2 | medio | 0 | `mintNewSectorAgents:false` — no expandir |
| Beta portal_path | **Fix aplicado** | P1 | bajo | 0 | `portal_path: "/portal"` |
| Beta catálogo `available` | **Fix aplicado** | P1 | bajo | 0 | 5 packs → `availability: "beta"` |
| Generative placeholders | **Fix aplicado** | P1 | medio | 0 | `metadata.mock: true` |
| LlmClient OpenAI contract test | **Fix aplicado** | P2 | bajo | 0 | vitest sin API real |
| Sector 1605 volumen | Existe · no élite | P2 | alto | 0 | No expandir cantidad; consolidar calidad por servicio |
| Partners CEO gate | Falta | P2 | medio | 0 | Diseño + auth CEO antes de pagos |
| Cloudflare app DNS | Bloqueo externo | P0 ops | bajo | 0 | CNAME humano |
| IA prod flags | OFF correcto | — | — | 0 | No activar sin autorización |

---

## C. Mejoras ejecutadas esta pasada (0 coste)

1. **Fix** `betaPacksRunners.ts` — `portal_path: "/portal"`.
2. **Fix** 5 packs beta en `servicePacksCatalog.ts` — `availability: "beta"` (honestidad vs cert promote).
3. **Fix** `GenerativeClient` — placeholders con `metadata.mock: true` (+ Meshy respeta VITEST).
4. **Tests** `packPortalPaths`, catalog availability, `llmClient.openaiContract`, `generativeClient.mockMetadata`.
5. **Docs** este audit + HANDOVER/CHANGELOG/CTO sync.

**No hecho (requiere auth/ADR):** unificar LlmClient OS→Ollama; activar IA prod; pagos partner; 3b→8b en Router certificado.

---

## D. Qué queda para agencia autónoma élite

1. DNS `app.nelvyon.com`.
2. Staging LLM alcanzable (no localhost PC).
3. Dual-path OS LLM (Ollama) sin romper premium OpenAI opt-in.
4. Workforce Private AI cert PASS.
5. Partners: unificar stacks + CEO approval product.
6. Beta packs: mappers de producción dedicados (como growth).
7. Operación sin Cursor: runbooks CEO + flags OFF por defecto + evidencia.

## E. Aprobación CEO requerida

- Activar IA / Shared Memory / MCP / OpenClaw en prod.
- `AUTONOMOUS_ALLOW_OPENAI=1`.
- Dual-path OS LlmClient architecture change.
- Pagos/comisiones automáticas partners.
- Cualquier egress PRIVATE_MODE internet window.

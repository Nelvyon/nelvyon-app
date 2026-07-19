# AGENT WORKFORCE INVENTORY — NELVYON

> **Bloque A — Auditoría obligatoria** · **B/C implementados** · **D parcial**  
> Fecha: **2026-07-19**  
> Regla: **no se crean agentes nuevos hasta cerrar este inventario** *(inventario cerrado; promoción controlada)*  
> Workforce cert: **CONDITIONAL_PASS** · `nelvyonAutonomousWorkforceCertified=false`  
> **No** afirma “mejores del mundo” ni certificación de fuerza de trabajo completa.

---

## 1. Resumen ejecutivo

NELVYON tiene **tres universos de “agentes”** que no deben mezclarse sin ADR:

| Universo | Cantidad | Rol | En Unified Registry |
|----------|----------|-----|---------------------|
| **Private AI runtime** | **17** | Fuerza de trabajo SaaS/IA propia | Sí (`runtimeReady=true`) |
| **Specialist designs** | **23** | Contratos de diseño (13 solo design) | Sí (merge → **30 IDs únicos**) |
| **OS pack agents** | **~1634** `*Agent.ts` | Packs/sectores OS | **No** (excluido a propósito) |
| **Autonomous pack roles** | **14** | SKUs landing/chatbot/SEO | **No** (prompts paralelos) |

La fuerza de trabajo **objetivo** (supervisores + dominios + especialistas medibles) debe construirse sobre Private AI + Unified Registry, **reutilizando IDs**, resolviendo aliases y promoviendo designs solo cuando tengan tools/evals/workflows reales.

**Estado real hoy:** advisory/orchestrated sandbox (`canAutoExecute: false` en todos los Private AI). Elite PASS (Fase 2) cubre infraestructura + subconjunto de agentes, **no** una plantilla empresarial completa certificada.

---

## 2. Arquitectura IA localizada (SSOT)

| Sistema | Path | Estado |
|---------|------|--------|
| Unified Agent Registry | `backend/agents/AgentRegistry.ts` | SSOT merge 17+23 |
| Specialist catalog | `backend/agents/specialistCatalog.ts` | 23 designs |
| Capability matrix | `backend/agents/capabilityMatrix.ts` | 17 rows (snapshot; ver §7 mismatches) |
| Private AI registry | `backend/private-ai/nelvyonAgentRegistry.ts` | Runtime defs |
| Private AI orchestrator | `backend/private-ai/orchestrator/PrivateAiOrchestrator.ts` | runAgent + approvals |
| Agent Orchestrator | `backend/orchestrator/*` | Flag OFF default; sandbox + live Ollama |
| Shared Memory | `backend/shared-memory/*` + mig 514 | Flag OFF default |
| Context Engine | `backend/private-ai/context/AgentContextEngine.ts` | Memory + RAG → prompt |
| Unified RAG | `backend/private-ai/rag/UnifiedRagStore.ts` | Local prefer + ILIKE adjunct |
| Prompt Registry | `backend/prompt-registry/PromptRegistry.ts` | Seed 17 system prompts |
| Tool map Agent→MCP | `backend/private-ai/tools/toolIdMap.ts` | **7** mappings |
| MCP productivo | `backend/mcp/**` | Certificado; ~22 tools |
| OpenClaw Bridge | `backend/private-ai/adapters/OpenClawBridge.ts` | Mock cert; URL real ops |
| Enterprise workflows | `backend/agents/workflows/enterpriseWorkflows.ts` | 10 |
| Agent eval suite | `backend/agents/evaluation/agentEvalSuite.ts` | 11 cases / 10 agents |
| Improvement loop | `backend/agents/improvement/controlledImprovement.ts` | propose/eval/promote/rollback |
| Panel IA | `apps/web/src/app/saas/ai/page.tsx` | Status cards |
| Elite gate | `scripts/run-phase2-elite-cert.mjs` | CI + live opt-in |
| Docs | `docs/PHASE2_*`, `HANDOVER`, `AI_CONTEXT` | Continuidad |

---

## 3. Inventario exacto de IDs

### 3.1 Private AI runtime (17) — implementación real

`ceo_supervisor` · `sales` · `crm` · `support` · `seo` · `google_ads` · `meta_ads` · `tiktok_ads` · `email_marketing` · `content` · `workflows` · `reporting` · `development` · `qa` · `finance` · `portal_client` · `security_compliance`

### 3.2 Specialist designs (23)

Overlap con runtime: `ceo_supervisor`, `seo`, `meta_ads`, `tiktok_ads`, `sales`, `crm`, `support`, `content`, `qa`, `finance`  
Solo design (`runtimeReady=false`): `cto`, `marketing`, `sem_google_ads`, `social_media`, `automation`, `analytics`, `devops`, `security`, `design`, `video`, `image`, `documentation`, `operations`

### 3.3 Unified únicos: **30**

### 3.4 Autonomous roles (14) — stack separado

`agent-pm-landing` · `agent-strategist-landing` · `agent-copywriter-landing` · `agent-designer-landing` · `agent-seo-landing` · `agent-pm-chatbot` · `agent-strategist-chatbot` · `agent-copywriter-chatbot` · `agent-pm-seo` · `agent-strategist-seo` · `agent-copywriter-seo` · `agent-seo-audit` · `agent-seo-report` (+ designer variants según `promptTemplates.ts`)

### 3.5 OS agents

~1634 archivos bajo `backend/os-agents/`. **Fuera del alcance de la fuerza de trabajo Unified** salvo ADR explícito de bridge.

---

## 4. Ficha por agente Private AI (runtime)

Leyenda: **Eval** = `agentEvalSuite` · **WF** = `ENTERPRISE_WORKFLOWS` · **MCP map** = tool con entrada en `toolIdMap`

| id | name | archivo | función | tools | memoria | RAG | permisos | Eval | WF | estado real |
|----|------|---------|---------|-------|---------|-----|----------|------|-----|-------------|
| `ceo_supervisor` | CEO / Supervisor | `nelvyonAgentRegistry.ts` | Priorizar, KPIs, riesgos; no exec sensible | memory.read/write, reports.read, audit.read, rag.search | sí (tools) | sí | forbidden/approval = all sensitive; `canAutoExecute=false` | sí | sí | **runtime advise** · pilot |
| `sales` | Ventas | idem | Pipeline, propuestas, follow-ups | crm.read/write, memory.read, reports.read | sí | no tool rag | no mass send w/o approval | sí | sí | runtime advise |
| `crm` | CRM | idem | Contactos, deals, higiene | crm.read/write, memory.read, workflows.read | sí | no | no delete / no cross-tenant | sí | sí | runtime advise |
| `support` | Soporte | idem | Respuestas, escalado | inbox.suggest, memory.read, rag.search | sí | sí | scale legal | sí | sí | runtime; `inbox.suggest` **sin MCP map** |
| `seo` | SEO | idem | Auditorías on-page | reports.read, rag.search, memory.read | sí | sí | no ranking guarantee | sí | sí | runtime + live elite |
| `google_ads` | Google Ads | idem | Estructura campañas | reports.read, memory.read | sí | no | no publish | **no** | **no** | runtime thin |
| `meta_ads` | Meta Ads | idem | Creatividades/audiencias | reports.read, memory.read | sí | no | launch approval | **no** | **no** | runtime thin |
| `tiktok_ads` | TikTok Ads | idem | Hooks/targeting | reports.read, memory.read | sí | no | draft only | **no** | **no** | runtime thin |
| `email_marketing` | Email Marketing | idem | Asuntos/secuencias | campaigns.draft, memory.read, reports.read | sí | no | send_mass_campaign approval | **no** | sí | runtime; campaigns **sin MCP map** |
| `content` | Contenido | idem | Copy/blogs/landings | memory.read, rag.search | sí | sí | publish (design) | sí | sí | runtime |
| `workflows` | Workflows | idem | Diseñar/explicar WF | workflows.read/execute, crm.read | no memory tool | no | prod exec approval | **no** | sí | runtime; workflows.* **sin MCP map** |
| `reporting` | Reporting | idem | Informes/métricas | reports.read, audit.read, memory.read | sí | no tool rag | read-only | sí | sí | runtime |
| `development` | Desarrollo | idem | Propuestas técnicas | rag.search, audit.read | no | sí | +touch_production forbidden | sí | sí | runtime |
| `qa` | QA | idem | Checklists/smokes | reports.read, audit.read, rag.search | no | sí | no prod mutate | **no** | sí | runtime |
| `finance` | Finanzas | idem | Billing/usage advice | billing.read, reports.read | no | no | modify_billing approval | sí | sí | runtime; billing.* **sin MCP map** |
| `portal_client` | Portal Cliente | idem | Guía revisión portal | reports.read, memory.read, rag.search | sí | sí | advise only | **no** | **no** | runtime thin |
| `security_compliance` | Seguridad / Compliance | idem | GDPR, audit, policy | audit.read, rag.search, integrations.read | no | sí | block cross-tenant | sí | sí | runtime; integrations.* **sin MCP map** |

**Prompts:** los 17 tienen `systemPrompt` en registry + seed en PromptRegistry (`name=system`).

**MCPs efectivos hoy (vía map):** `memory_*`, `rag_search`, `crm_*`, `logs_tail` (audit.read), `reporting_summary` (reports.read). Resto de tools = **declarados pero no bridgeados**.

---

## 5. Designs-only (13) — sin runtime

| id | dept | tools (design) | duplica / alias | decisión propuesta |
|----|------|----------------|-----------------|-------------------|
| `cto` | Engineering | rag, memory, reports | cerca de `development` | Promover a runtime L1 **después** de schema/lifecycle (Bloque B) |
| `marketing` | Growth | memory, reports, rag, campaigns.draft | — | Promover L1 CMO o cubrir con content+seo interim |
| `sem_google_ads` | Paid | reports, memory | **alias de `google_ads`** | **Descartar ID** · unificar a `google_ads` |
| `social_media` | Creative | memory, reports | — | Promover solo con tools+evals |
| `automation` | Ops | workflows.* | **alias de `workflows`** | **Descartar ID** |
| `analytics` | Insights | reports, memory, rag | **alias de `reporting`** | **Descartar ID** |
| `devops` | Engineering | memory, rag, reports | — | Promover L2 tras Engineering block |
| `security` | Security | audit, memory, rag | **alias de `security_compliance`** | **Descartar ID** |
| `design` | Creative | memory, rag | — | Worker efímero / specialist on-demand |
| `video` | Creative | memory | thin | Worker efímero |
| `image` | Creative | memory | thin | Worker efímero |
| `documentation` | Ops | rag, memory | — | Specialist on-demand |
| `operations` | Ops | memory, reports, workflows | overlap COO/`workflows` | Mapear a COO L1 o fusionar |

---

## 6. Duplicidades y deuda

### 6.1 Aliases a resolver (P0 consolidación)

| Canónico (conservar) | Deprecar |
|----------------------|----------|
| `google_ads` | `sem_google_ads` |
| `workflows` | `automation` |
| `reporting` | `analytics` |
| `security_compliance` | `security` |

### 6.2 Registros / prompts paralelos

1. Private AI `systemPrompt` + PromptRegistry  
2. Specialist catalog (sin body de prompt)  
3. Autonomous `promptTemplates.ts` (14)  
4. OS sector eliteRole/mission  
5. Local-AI specialization PromptBuilder  

### 6.3 capabilityMatrix vs `allowedTools`

Varias filas marcan `rag: true` sin `rag.search` en registry (`sales`, `crm`, `google_ads`, `workflows`, `finance`). **La política ejecutable es el registry**, no la matriz.

### 6.4 Cobertura eval / workflow

| Métrica | Valor |
|---------|------:|
| Runtime agents | 17 |
| Con eval | 10 |
| Sin eval | 7 (`google_ads`, `meta_ads`, `tiktok_ads`, `email_marketing`, `workflows`, `qa`, `portal_client`) |
| Con enterprise WF | 13 |
| Sin WF | 4 (ads×3 + portal) |
| AgentToolIds mapeados a MCP | 7 |
| Tools MCP productivos | ~22 |

### 6.5 Stacks a no fusionar sin ADR

- OS ~1634 agents  
- Autonomous 14 roles  
- Labs capability domains (no son agentes)

---

## 7. Organigrama objetivo (mapeo a IDs existentes — sin mintar IDs nuevos aún)

### Nivel 1 — Dirección (reutilizar / promover)

| Asiento | ID canónico | Estado |
|---------|-------------|--------|
| CEO Strategy | `ceo_supervisor` | runtime |
| CTO Technology | `cto` → interim `development` | design / runtime interim |
| CMO Growth | `marketing` → interim `content`+`seo` | design |
| CRO Revenue | `sales` (+ `crm`) | runtime |
| CFO Finance | `finance` | runtime |
| Chief Risk & Compliance | `security_compliance` | runtime |
| COO Operations | `operations` → interim `workflows` | design |
| Chief Customer | `support` + `portal_client` | runtime (parcial) |
| Chief Product | **hueco** | no hay ID; no inventar hasta Bloque B |
| Chief Data & AI | **hueco** | cubrir con `reporting` + Agent Ops humano; no mintar aún |

### Nivel 2 — Dominios (canónicos)

SEO `seo` · SEM `google_ads` · Meta `meta_ads` · TikTok `tiktok_ads` · Email `email_marketing` · Content `content` · Social `social_media` (design) · CRM `crm` · Support `support` · Portal `portal_client` · Analytics `reporting` · Automation `workflows` · QA `qa` · DevOps `devops` (design) · Design/Video/Image → **workers efímeros**, no permanentes thin

### Especialistas permanentes

**No crear la lista larga del brief como permanentes.** Solo promover a permanente si: tools reales + workflow + eval + permisos + métricas. El resto = **workers efímeros** del orquestador.

---

## 8. Workflows enterprise actuales (10)

| id | agentes |
|----|---------|
| `commercial_opportunity` | sales, crm, ceo_supervisor |
| `proposal_prep` | sales, content, finance, ceo_supervisor |
| `crm_followup` | crm, sales |
| `campaign_plan` | email_marketing, content, seo, ceo_supervisor |
| `seo_audit` | seo, reporting |
| `content_review` | content, seo, qa |
| `support_triage` | support, crm |
| `ops_analysis` | workflows, reporting, ceo_supervisor |
| `tech_diagnosis` | development, qa, security_compliance |
| `executive_report` | reporting, finance, ceo_supervisor |

Live elite (Ollama): `seo_audit`, `support_triage`, `crm_followup`.

---

## 9. Capacidades ausentes (huecos vs brief)

Sin ID runtime adecuado (no crear aún): Product Management/Discovery/UX Research/Pricing leads dedicados; Frontend/Backend/API/DB leads separados; RAG/Memory/Eval leads; Partner/HR; Billing ops profundo; Load/Chaos specialists.

**Principio:** cubrir con **supervisores + specialists mínimos + ephemeral workers**, no con cientos de permanentes.

---

## 10. Plan de implementación (post-auditoría)

| Bloque | Objetivo | Criterio de cierre |
|--------|----------|-------------------|
| **A** | Este inventario + ADR | Doc = realidad · commit |
| **B** | Lifecycle states, hierarchy metadata, alias deprecation, schemas | Sin mintar IDs innecesarios |
| **C** | Runtime persistente (queue/checkpoint/recovery/kill switch) | Sobre orchestrator existente |
| **D–F** | Certificar dominios por prioridad (eng→growth→CS/finance) | Eval≥90% sandbox · security 100% |
| **G** | Leaderboard + canary promotion | Sin auto-mutate prod prompts |
| **H** | Gate `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED` | PASS solo con evidencia |

**Gate nuevo (no forzar PASS):** `NELVYON_AUTONOMOUS_WORKFORCE_CERTIFIED` ∈ {PASS, CONDITIONAL_PASS, FAIL}.

**No romper:** Router cert · MCP cert · Phase 1 · Phase 2 Elite · Shared Memory · Unified RAG · OpenClaw · migrations · production build.

---

## 11. ADR

Ver **ADR-027** en `docs/DECISIONS.md` — Workforce hierarchy, ephemeral workers, alias consolidation.

---

## 12. Pendientes externos (no bloquean trabajo interno)

1. Docker/pgvector (KI-016) — comparar hybrid vs LocalVectorStore  
2. Mig 514 + flags Memory/Orchestrator en staging  
3. OpenClaw URL real  
4. SES/Stripe Fase 1  

---

## 13. Evidencia de esta auditoría

- Lectura de registries, catalogs, matrix, workflows, evals, MCP map, docs Fase 2  
- Conteos: 17 runtime · 23 design · 30 unified · 13 design-only · 10 eval · 7 tool maps  
- Explore agent: [Workforce audit](cfcc28a1-1b47-498d-8aca-d79e87d1d982)

**Siguiente paso automático:** Bloque B (lifecycle + hierarchy + alias deprecation + schemas) sin crear permanentes masivos.

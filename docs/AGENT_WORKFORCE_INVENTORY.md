# AGENT WORKFORCE INVENTORY — NELVYON

> **Bloques A–G implementados** · **H = CONDITIONAL_PASS**  
> Fecha: **2026-07-19**  
> Workforce cert: **CONDITIONAL_PASS** · `nelvyonAutonomousWorkforceCertified=false`  
> **No** afirma “mejores del mundo” ni certificación completa de fuerza de trabajo.

---

## 1. Resumen ejecutivo

NELVYON tiene **tres universos de “agentes”** que no deben mezclarse sin ADR:

| Universo | Cantidad | Rol | En Unified Registry |
|----------|----------|-----|---------------------|
| **Private AI runtime** | **~23** | Fuerza de trabajo SaaS/IA propia | Sí (`runtimeReady=true`) |
| **Specialist designs** | overlap + ephemeral-only | Contratos / aliases / creativos | Merge Unified; aliases deprecated |
| **OS pack agents** | **~1634** `*Agent.ts` | Packs/sectores OS | **No** (excluido a propósito) |
| **Autonomous pack roles** | **14** | SKUs landing/chatbot/SEO | **No** (prompts paralelos) |

**Promociones runtime (D–F):** `cto`, `marketing`, `operations`, `devops`, `social_media`, `product` + ads evals.  
**Ephemeral-only (no permanentes):** `design`, `video`, `image`, `documentation`.  
**Aliases:** `sem_google_ads`→`google_ads`, `automation`→`workflows`, `analytics`→`reporting`, `security`→`security_compliance`.

**Estado real:** advisory/orchestrated sandbox (`canAutoExecute: false` típico). Elite PASS (Fase 2) intacto. Workforce **no** certified (`false`).

---

## 2. Arquitectura IA localizada (SSOT)

| Sistema | Path | Estado |
|---------|------|--------|
| Unified Agent Registry | `backend/agents/AgentRegistry.ts` | SSOT merge Private AI + designs |
| Private AI registry | `backend/private-ai/nelvyonAgentRegistry.ts` | **~23** runtime defs |
| Hierarchy / lifecycle | `backend/agents/workforce/hierarchy.ts` | ADR-027 |
| Capability matrix (rows) | `backend/agents/capabilityMatrix.ts` | ~23 rows |
| Capability × tools | `backend/agents/workforce/capabilityMatrix.ts` | Cap IDs |
| Orchestrator + daemon | `backend/orchestrator/*` | Persist + profile `orchestrator` |
| Workflow catalog | `backend/agents/workforce/workflowCatalog.ts` | **~45** certified |
| Eval suite | `backend/agents/evaluation/agentEvalSuite.ts` | ~21 cases (+ ads/cto/marketing) |
| Leaderboard / canary | `workforce/leaderboard.ts`, `canaryPipeline.ts` | Panel resources |
| Tool map Agent→MCP | `backend/private-ai/tools/toolIdMap.ts` | **~13** maps; no paid |
| MCP productivo | `backend/mcp/**` | Certificado freeze |
| Cert workforce | `scripts/run-workforce-cert.mjs` | CONDITIONAL_PASS |

---

## 3. Inventario exacto de IDs

### 3.1 Private AI runtime (~23)

`ceo_supervisor` · `sales` · `crm` · `support` · `seo` · `google_ads` · `meta_ads` · `tiktok_ads` · `email_marketing` · `content` · `workflows` · `reporting` · `development` · `qa` · `finance` · `portal_client` · `security_compliance` · **`cto`** · **`marketing`** · **`operations`** · **`devops`** · **`social_media`** · **`product`**

### 3.2 Ephemeral-only design IDs

`design` · `video` · `image` · `documentation` — workers efímeros; no mint permanentes.

### 3.3 Deprecated aliases

Ver §6.1 / `AGENT_ID_ALIASES`.

### 3.4 Autonomous roles (14) — stack **paralelo**, keep separate

`agent-pm-landing` · `agent-strategist-landing` · `agent-copywriter-landing` · `agent-designer-landing` · `agent-seo-landing` · `agent-pm-chatbot` · `agent-strategist-chatbot` · `agent-copywriter-chatbot` · `agent-pm-seo` · `agent-strategist-seo` · `agent-copywriter-seo` · `agent-seo-audit` · `agent-seo-report` (+ designer variants según `promptTemplates.ts`)

### 3.5 OS agents (~1634) — clasificación

| Clase | Significado | ¿Unified permanente? |
|-------|------------|----------------------|
| **template** | Plantillas pack / sector DNA | No |
| **legacy** | Rutas/sectores históricos | No |
| **specialized** | Sector eliteRole / mission OS | No |
| **ephemeral-candidate** | Candidatos a worker on-demand vía orch | No (sin ADR bridge) |

**~1634 OS agents: NOT imported into Unified Registry.** Permanecen motor de packs OS.

---

## 4. Organización L1 / L2 (resumen)

Ver `docs/AGENT_WORKFORCE_ORGANIZATION.md` + `WORKFORCE_HIERARCHY`.

Panel: `?resource=org` · workflows · runtime · canaries · leaderboard.

---

## 5. Tool map / evals / workflows (snapshot)

| Métrica | Valor |
|---------|------:|
| Runtime Private AI | ~23 |
| AgentToolIds mapeados MCP | ~13 |
| Workflow catalog certified | ~45 |
| Eval cases | ~21 |
| Enterprise legacy WF | ~10 |
| OS agents Unified | **0** (excluido) |

---

## 6. Duplicidades controladas

### 6.1 Aliases

| Canónico | Deprecar |
|----------|----------|
| `google_ads` | `sem_google_ads` |
| `workflows` | `automation` |
| `reporting` | `analytics` |
| `security_compliance` | `security` |

### 6.2 Stacks a no fusionar

- OS ~1634  
- Autonomous 14  
- Labs capability domains (no agentes)

---

## 7. Certificación

| Gate | Estado |
|------|--------|
| Phase 2 Elite | **PASS** (`phase2EliteCertified=true`) |
| Workforce | **CONDITIONAL_PASS** · `nelvyonAutonomousWorkforceCertified=false` |
| Externos | Docker/pgvector residual · mig 514 · OpenClaw URL · SES/Stripe |

---

## 8. ADR

- **ADR-027** — hierarchy, aliases, ephemeral  
- **ADR-028** — promotions + ephemeral-only designs + canary gates  

---

## 9. Evidencia

```powershell
node scripts/run-workforce-cert.mjs
pnpm -C apps/web exec vitest run backend/saas/__tests__/workforceBlockB.test.ts backend/saas/__tests__/workforceBlockC.test.ts backend/saas/__tests__/workforceBlockDEFG.test.ts --reporter=dot
```

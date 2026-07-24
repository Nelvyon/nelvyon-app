# OS New Services — Strategy · Funnel · Retention

> Contratos de construcción · **2026-07-24** · ADR-049  
> Estado: **BETA** (código + kickoff + mappers + flags) · **no** IMPLEMENTED_VERIFIED hasta E2E mesh ALL_PASS.  
> No promover a available sin evidencia. No instalar tools externas.

---

## Orden de impacto

1. **Strategy OS** — brief → plan 90d reutilizable por todos los packs  
2. **Funnel OS pack** — multi-step CRO encima de landing verificada  
3. **Retention OS** — loyalty/nurture post-compra/CRM  

---

## 1. Strategy OS (`strategy`)

| Campo | Contrato |
|-------|----------|
| serviceId | `strategy` (nuevo en OsCapabilityRegistry) |
| Entrada | `{ business_name, sector, city, value_proposition, goals[], horizon_days }` |
| Agentes | `agent-pm-strategy` (Ollama) · reutiliza seed keywords / elite templates |
| Playbook | `docs/agency-playbooks/SERVICE_STRATEGY.md` |
| Entregables | Plan 90d JSON · priorización OKRs · riesgos · next packs sugeridos |
| QA | ≥85 offline (estructura, blockers, ack compliance) |
| Pack | `strategy-pack` (nuevo PackId) o step pre-kickoff opcional en growth |
| Portal | `/portal` client_visible |
| Tests | unit scorer · E2E staging mesh · tenant iso |
| Rollback | flag `NELVYON_STRATEGY_PACK=0` / no kickoff |
| Estado hoy | **BETA** (código) · E2E pendiente |

### Flujo
brief → PM strategy LLM → artefactos plan → QA≥85 → deliverable → portal → métricas (`strategy_plans_published`)

---

## 2. Funnel OS pack (`funnel`)

| Campo | Contrato |
|-------|----------|
| serviceId | `funnel` (nuevo) o extensión `web_landing` |
| Entrada | `{ business_name, sector, funnel_steps≥3, primary_cta, offer }` |
| Agentes | reutiliza LANDING + CRO beta mapper dedicado |
| Playbook | `docs/agency-playbooks/SERVICE_FUNNEL.md` |
| Entregables | Mapa funnel · copy por step · eventos tracking · informe CRO |
| QA | ≥85 · consistency steps vs copy |
| Pack | `funnel-growth-pack` (nuevo) — **no** reutilizar cro-audit beta sin mapper |
| Base | SaaS `/saas/funnels` PREPARED_OFF + cro-audit **BETA** |
| Estado hoy | **BETA** (código) · E2E pendiente |

### Flujo
brief → análisis CRO → agentes landing/copy → funnel map → QA≥85 → portal → métricas conversión

---

## 3. Retention OS (`retention`)

| Campo | Contrato |
|-------|----------|
| serviceId | `retention` |
| Entrada | `{ business_name, sector, cohort, channels[], loyalty_goal }` |
| Agentes | email_marketing · crm · workflows (sin mint decorativo) |
| Playbook | `docs/agency-playbooks/SERVICE_RETENTION.md` |
| Entregables | Secuencia retención · reglas churn · informe cohort |
| QA | ≥85 |
| Pack | `retention-pack` |
| Base | SaaS loyalty UI existe · **no** pack OS |
| Estado hoy | **BETA** (código) · E2E pendiente |

### Flujo
brief → segmentación → secuencia email/CRM → QA≥85 → portal → métricas churn/retention_rate

---

## Criterio de cierre (igual que growth packs)

1. Mapper producción dedicado  
2. Playbook  
3. Unit + E2E mesh staging ALL_PASS (`completed`, auto-approve)  
4. Portal invite + deliverables sin `mock://`  
5. Tenant isolation  
6. Rollback documentado  
7. Actualizar `OS_UNIVERSAL_SERVICE_CATALOG.md` → `IMPLEMENTED_VERIFIED`

Hasta entonces: **BETA** en catálogo (no `available` / no IMPLEMENTED_VERIFIED).

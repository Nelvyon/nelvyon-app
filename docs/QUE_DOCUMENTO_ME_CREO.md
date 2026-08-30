# Qué documento me creo

Lo escribe `scripts/que-documento-me-creo.mjs`. **No se edita a mano.**

`docs/` tiene documentos de hoy y diarios de fases que terminaron hace meses, y
desde fuera se parecen: mismo sitio, mismo formato, mismo título en mayúsculas.
Un documento obsoleto que parece vigente no molesta — se cita en una decisión.

| Cajón | Cuántos | Qué quiere decir |
|---|---|---|
| `GENERADO` | 8 | lo reescribe un script o una prueba en cada ejecución. Es el único que no puede quedarse obsoleto |
| `VIGENTE` | 45 | a mano, tocado en los últimos 30 días |
| `HISTORICO` | 125 | a mano, sin tocar desde hace más. Memoria del proyecto, no estado actual |
| `DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN` | 5 | declara ser automático y no se encuentra quién lo escribe. Promete frescura sin tenerla |

**Nada se borra.** Un documento viejo guarda el porqué de decisiones que siguen
en pie; tirarlo pierde el motivo y deja la decisión. Lo que hacía falta no era
borrarlos, era que se supiera cuál es cuál.

## GENERADO — 8

| Documento | Lo escribe | Días desde el último cambio |
|---|---|---|
| [CAMBIO_EN_PRODUCCION.md](CAMBIO_EN_PRODUCCION.md) — Qué cambiaría en producción | `scripts/que-cambiaria-en-produccion.mjs` | 0 |
| [CONTRATO_DE_SERVICIO.md](CONTRATO_DE_SERVICIO.md) — El contrato de cada servicio | `scripts/contrato-de-servicio.mjs` | 0 |
| [INVENTARIO_DE_CONECTORES.md](INVENTARIO_DE_CONECTORES.md) — Qué se puede conectar hoy | `apps/web/src/lib/os-core/__tests__/elInventarioDeConectoresNoPromete.test.ts` | 0 |
| [LO_QUE_SE_PUEDE_AFIRMAR.md](LO_QUE_SE_PUEDE_AFIRMAR.md) — Lo que se puede afirmar de NELVYON, y lo que no | `scripts/lo-que-se-puede-afirmar.mjs` | 1 |
| [MATRIZ_DE_SERVICIOS.md](MATRIZ_DE_SERVICIOS.md) — Matriz de servicios | `scripts/matriz-de-servicios.mjs` | 0 |
| [QUE_DOCUMENTO_ME_CREO.md](QUE_DOCUMENTO_ME_CREO.md) — Qué documento me creo | `scripts/que-documento-me-creo.mjs` | 0 |
| [QUE_ES_NELVYON_AI.md](QUE_ES_NELVYON_AI.md) — Que es NELVYON AI, tecnicamente | `scripts/que-es-nelvyon-ai.mjs` | 0 |
| [REVISION_DE_SERVICIOS.md](REVISION_DE_SERVICIOS.md) — Revisión de los servicios | `scripts/revision-de-servicios.mjs` | 0 |

## DICE_SER_GENERADO_Y_NO_SE_VE_QUIEN — 5

| Documento | Días desde el último cambio | Líneas |
|---|---|---|
| [BLOQUE_5_ESTADO.md](BLOQUE_5_ESTADO.md) — BLOQUE 5 — estado por categoría de producto | 4 | 239 |
| [BLOQUE_6_ESTADO.md](BLOQUE_6_ESTADO.md) — BLOQUE 6 — estado por categoría operacional | 4 | 85 |
| [BLOQUE_3_ESTADO.md](BLOQUE_3_ESTADO.md) — BLOQUE 3 — estado vivo | 5 | 80 |
| [BLOQUE_4_ESTADO.md](BLOQUE_4_ESTADO.md) — BLOQUE 4 — estado vivo | 5 | 40 |
| [BLOQUE_2_ESTADO.md](BLOQUE_2_ESTADO.md) — BLOQUE 2 — estado vivo | 7 | 60 |

## VIGENTE — 45

| Documento | Días desde el último cambio | Líneas |
|---|---|---|
| [AUDITORIA_DE_COSTE.md](AUDITORIA_DE_COSTE.md) — Auditoría de coste — qué se puede tocar sin que suba la factura | 0 | 138 |
| [CERTIFICACION_LOCAL.md](CERTIFICACION_LOCAL.md) — Certificación local | 0 | 372 |
| [PREFLIGHT_DEL_DESPLIEGUE.md](PREFLIGHT_DEL_DESPLIEGUE.md) — Preflight del despliegue | 0 | 131 |
| [SI_FALLA_UNA_MIGRACION.md](SI_FALLA_UNA_MIGRACION.md) — Si falla una migración a mitad | 0 | 99 |
| [LEDGER_CONSTRUCCION.md](LEDGER_CONSTRUCCION.md) — Ledger de construcción | 1 | 224 |
| [LO_QUE_TIENE_QUE_HACER_EL_FUNDADOR.md](LO_QUE_TIENE_QUE_HACER_EL_FUNDADOR.md) — Lo que solo puedes hacer tú | 2 | 244 |
| [BLOQUE_10_CIERRE.md](BLOQUE_10_CIERRE.md) — BLOQUE 10 — CERTIFICACIÓN INTEGRAL FINAL | 3 | 210 |
| [BLOQUE_8_CIERRE.md](BLOQUE_8_CIERRE.md) — BLOQUE 8 — RENDIMIENTO, CARGA, CONCURRENCIA Y ESCALABILIDAD | 3 | 257 |
| [BLOQUE_8_ESTADO.md](BLOQUE_8_ESTADO.md) — BLOQUE 8 — ESTADO POR CLASE DE PUNTO DE ESCALADO | 3 | 103 |
| [BLOQUE_9_CIERRE.md](BLOQUE_9_CIERRE.md) — BLOQUE 9 — OPERACIÓN, OBSERVABILIDAD, BACKUP/RESTORE Y RECUPERACIÓN | 3 | 217 |
| [BLOQUE_9_ESTADO.md](BLOQUE_9_ESTADO.md) — BLOQUE 9 — ESTADO POR FAMILIA DE CAPACIDAD DE OPERACIÓN | 3 | 115 |
| [CIERRE_DE_PENDIENTES.md](CIERRE_DE_PENDIENTES.md) — Cierre de pendientes post-certificación | 3 | 192 |
| [COMO_EJECUTAR_LAS_PUERTAS.md](COMO_EJECUTAR_LAS_PUERTAS.md) — Cómo se ejecutan las puertas de certificación | 3 | 165 |
| [DECISION_WORKSPACE_ID.md](DECISION_WORKSPACE_ID.md) — Decisión pendiente · el workspace derivado del inquilino | 3 | 140 |
| [ESTADO_DE_LANZAMIENTO.md](ESTADO_DE_LANZAMIENTO.md) — Estado de lanzamiento de NELVYON | 3 | 107 |
| [INFORME_NOCTURNO_BLOQUES_8_9_10.md](INFORME_NOCTURNO_BLOQUES_8_9_10.md) — Informe de la ejecución nocturna · Bloques 8, 9 y 10 | 3 | 159 |
| [NEXT_SESSION_START_HERE.md](NEXT_SESSION_START_HERE.md) — EMPIEZA AQUÍ | 3 | 345 |
| [BLOQUE_5_CIERRE.md](BLOQUE_5_CIERRE.md) — BLOQUE 5 — cierre | 4 | 292 |
| [BLOQUE_6_CIERRE.md](BLOQUE_6_CIERRE.md) — BLOQUE 6 — cierre | 4 | 309 |
| [BLOQUE_7_CIERRE.md](BLOQUE_7_CIERRE.md) — BLOQUE 7 — SEGURIDAD OFENSIVA Y ABUSO DE EXTREMO A EXTREMO | 4 | 393 |
| [BLOQUE_7_ESTADO.md](BLOQUE_7_ESTADO.md) — BLOQUE 7 — ESTADO POR CATEGORÍA DE SUPERFICIE ATACABLE | 4 | 198 |
| [BLOQUE_3_CIERRE.md](BLOQUE_3_CIERRE.md) — BLOQUE 3 — cierre | 5 | 301 |
| [BLOQUE_4_CIERRE.md](BLOQUE_4_CIERRE.md) — BLOQUE 4 — cierre | 5 | 175 |
| [SKILLS_Y_MCP.md](SKILLS_Y_MCP.md) — Skills y MCP de NELVYON — inventario auditado | 5 | 212 |
| [BLOQUE_1_CIERRE.md](BLOQUE_1_CIERRE.md) — Bloque 1 — clasificación de cierre | 7 | 328 |
| [BLOQUE_2_CIERRE.md](BLOQUE_2_CIERRE.md) — BLOQUE 2 — cierre | 7 | 287 |
| [BLOQUE_2_LINEA_BASE.md](BLOQUE_2_LINEA_BASE.md) — Bloque 2 — línea base medida | 7 | 64 |
| [BLOQUE_3_LINEA_BASE.md](BLOQUE_3_LINEA_BASE.md) — BLOQUE 3 — línea base | 7 | 56 |
| [FICHAS_ALCANCE_DE_PRODUCTO.md](FICHAS_ALCANCE_DE_PRODUCTO.md) — Las 8 funciones con deriva esquema↔código — fichas para decidir alcance | 7 | 160 |
| [HANDOFF_AISLAMIENTO.md](HANDOFF_AISLAMIENTO.md) — Handoff — cierre del aislamiento multiinquilino | 7 | 1335 |
| [PLAN_LIMPIEZA_FIXTURES.md](PLAN_LIMPIEZA_FIXTURES.md) — Plan de limpieza de datos de certificación | 7 | 97 |
| [NELVYON_CLOSURE_STATE.md](NELVYON_CLOSURE_STATE.md) — NELVYON — ESTADO OPERATIVO DE CIERRE | 16 | 472 |
| [NELVYON_RELEASE_CANDIDATE_REPORT.md](NELVYON_RELEASE_CANDIDATE_REPORT.md) — NELVYON — Informe de Release Candidate | 16 | 179 |
| [TODO.md](TODO.md) — TODO | 17 | 704 |
| [ARCHITECTURE_LOCAL_AI_RUNTIME.md](ARCHITECTURE_LOCAL_AI_RUNTIME.md) — ARCHITECTURE — Local AI runtime for agents (cost = 0) | 22 | 193 |
| [ELITE_QUALITY_FINALIZATION.md](ELITE_QUALITY_FINALIZATION.md) — ELITE_QUALITY_FINALIZATION | 22 | 61 |
| [CHANGELOG.md](CHANGELOG.md) — CHANGELOG — Documentación y cambios registrados | 23 | 539 |
| [DEPLOYMENTS.md](DEPLOYMENTS.md) — DEPLOYMENTS — Historial | 23 | 1041 |
| [HANDOVER.md](HANDOVER.md) — HANDOVER — NELVYON | 23 | 47 |
| [AUDITORIA_TECNICA_ABSOLUTA.md](AUDITORIA_TECNICA_ABSOLUTA.md) — AUDITORÍA TÉCNICA ABSOLUTA — NELVYON | 29 | 20 |
| [CTO_FINAL_VERIFY.md](CTO_FINAL_VERIFY.md) — CTO Final Verify — 2026-07-31 (certificación final SaaS) | 29 | 25 |
| [DECISIONS.md](DECISIONS.md) — DECISIONS — Decisiones técnicas (ADR) | 29 | 977 |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — KNOWN_ISSUES — Errores conocidos | 29 | 824 |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) — PROJECT_STATUS | 29 | 16 |
| [ROADMAP.md](ROADMAP.md) — ROADMAP — NELVYON | 29 | 135 |

## HISTORICO — 125

| Documento | Días desde el último cambio | Líneas |
|---|---|---|
| [DEPLOY_FINAL.md](DEPLOY_FINAL.md) — DEPLOY FINAL — Nelvyon Production Checklist | 31 | 366 |
| [INTEGRATIONS.md](INTEGRATIONS.md) — INTEGRATIONS — Estado de integraciones | 31 | 147 |
| [OPS_SES_PROD.md](OPS_SES_PROD.md) — OPS — SES producción (checklist humana mínima) | 31 | 37 |
| [OPS_STRIPE_PROD.md](OPS_STRIPE_PROD.md) — OPS — Stripe producción (checklist humana mínima) | 31 | 38 |
| [DATABASE.md](DATABASE.md) — DATABASE — PostgreSQL / Supabase | 32 | 178 |
| [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md) — DEVELOPER ONBOARDING — NELVYON | 32 | 116 |
| [ENVIRONMENTS.md](ENVIRONMENTS.md) — ENVIRONMENTS — Entornos | 32 | 108 |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) — INFRASTRUCTURE — Infraestructura NELVYON | 32 | 146 |
| [LAUNCH_CHECKLIST_DEFINITIVE.md](LAUNCH_CHECKLIST_DEFINITIVE.md) — LAUNCH CHECKLIST DEFINITIVE — NELVYON | 32 | 161 |
| [LAUNCH_OPS_CHECKLIST.md](LAUNCH_OPS_CHECKLIST.md) — LAUNCH_OPS_CHECKLIST — Nelvyon producción | 32 | 147 |
| [LAUNCH_READY.md](LAUNCH_READY.md) — LAUNCH_READY — Nelvyon producción | 32 | 355 |
| [NELVYON_MASTER_CONTEXT.md](NELVYON_MASTER_CONTEXT.md) — NELVYON — MASTER CONTEXT (Biblia oficial) | 32 | 1821 |
| [NELVYON_OBSERVABILITY_REALITY.md](NELVYON_OBSERVABILITY_REALITY.md) — NELVYON — Observabilidad: qué está **demostrado en este repo** vs qué queda **fuera** | 32 | 54 |
| [OPS.md](OPS.md) — OPS — Operación enterprise NELVYON | 32 | 145 |
| [RAILWAY_DEPLOY_CHECKLIST.md](RAILWAY_DEPLOY_CHECKLIST.md) — Railway Deploy Checklist — Nelvyon SaaS | 32 | 205 |
| [README.md](README.md) — NELVYON — Documentación | 32 | 64 |
| [OS_CATALOG_V1.md](OS_CATALOG_V1.md) — NELVYON OS Catalog v1 | 36 | 51 |
| [OS_ELITE_STATE_MATRIX.md](OS_ELITE_STATE_MATRIX.md) — OS Elite — Matriz canónica (ADR-057 Blocks 11–25) | 36 | 60 |
| [FREE_TOOLS_EVALUATION.md](FREE_TOOLS_EVALUATION.md) — Free Tools Evaluation — NELVYON | 37 | 99 |
| [OS_NEW_SERVICES_CONTRACTS.md](OS_NEW_SERVICES_CONTRACTS.md) — OS New Services — Strategy · Funnel · Retention | 37 | 87 |
| [OS_UNIVERSAL_SERVICE_CATALOG.md](OS_UNIVERSAL_SERVICE_CATALOG.md) — OS Universal Service Catalog — NELVYON | 37 | 47 |
| [COMPLIANCE_COMPANY_DB_CHECKLIST.md](COMPLIANCE_COMPANY_DB_CHECKLIST.md) — Checklist — Base de empresas / marketing (software only) | 38 | 36 |
| [CTO_STRATEGIC_GAPS_MATRIX.md](CTO_STRATEGIC_GAPS_MATRIX.md) — CTO — Matriz de gaps estratégicos (honesta) | 38 | 24 |
| [CTO_FINAL_CLOSURE_AUDIT.md](CTO_FINAL_CLOSURE_AUDIT.md) — CTO Final Closure Audit — 2026-07-22 | 39 | 27 |
| [OPS_QUALITY_AUDIT.md](OPS_QUALITY_AUDIT.md) — OPS QUALITY AUDIT — 2026-07-22 (refresh cierre) | 39 | 21 |
| [OS_AGENT_TEAM_AUDIT.md](OS_AGENT_TEAM_AUDIT.md) — OS Agent Team Audit — NELVYON | 39 | 133 |
| [OS_AUTONOMOUS_OPERATIONS.md](OS_AUTONOMOUS_OPERATIONS.md) — OS Autonomous Operations Runbook — NELVYON | 39 | 59 |
| [OS_FLOW_AUDIT.md](OS_FLOW_AUDIT.md) — OS Production Flows Audit — 2026-07-22 | 39 | 54 |
| [PROPOSAL_QUALITY_ROUTING_LOCAL.md](PROPOSAL_QUALITY_ROUTING_LOCAL.md) — PROPOSAL — Quality routing local (3b vs 8b) | 39 | 48 |
| [AI_CONTEXT.md](AI_CONTEXT.md) — AI_CONTEXT — Contexto técnico completo NELVYON | 40 | 219 |
| [CONSTITUTION_NELVYON_AI.md](CONSTITUTION_NELVYON_AI.md) — CONSTITUCIÓN NELVYON — IA Privada Especializada | 40 | 112 |
| [NELVYON_BRAIN_KNOWLEDGE.md](NELVYON_BRAIN_KNOWLEDGE.md) — NELVYON BRAIN — Cobertura de conocimiento (evidencia) | 40 | 55 |
| [OPS_SHARED_MEMORY_514.md](OPS_SHARED_MEMORY_514.md) — OPS — Shared Memory migration 514 (+ RLS 515) | 40 | 62 |
| [CIERRE_FINAL_PRIORITARIO.md](CIERRE_FINAL_PRIORITARIO.md) — CIERRE FINAL PRIORITARIO - Informe (2026-07-20) | 41 | 139 |
| [SPRINT_FINAL_ABSOLUTO.md](SPRINT_FINAL_ABSOLUTO.md) — SPRINT FINAL ABSOLUTO — Estado | 41 | 51 |
| [TEST_SKIPS.md](TEST_SKIPS.md) — Vitest skipped tests — criterios de activación (SSOT) | 41 | 15 |
| [AGENT_CAPABILITY_MATRIX.md](AGENT_CAPABILITY_MATRIX.md) — AGENT CAPABILITY MATRIX | 42 | 44 |
| [AGENT_EVALUATION_FRAMEWORK.md](AGENT_EVALUATION_FRAMEWORK.md) — AGENT EVALUATION FRAMEWORK | 42 | 65 |
| [AGENT_TOOL_PERMISSION_MATRIX.md](AGENT_TOOL_PERMISSION_MATRIX.md) — AGENT TOOL PERMISSION MATRIX | 42 | 68 |
| [AGENT_WORKFLOW_CATALOG.md](AGENT_WORKFLOW_CATALOG.md) — AGENT WORKFLOW CATALOG | 42 | 47 |
| [AGENT_WORKFORCE_INVENTORY.md](AGENT_WORKFORCE_INVENTORY.md) — AGENT WORKFORCE INVENTORY — NELVYON | 42 | 142 |
| [AGENT_WORKFORCE_ORGANIZATION.md](AGENT_WORKFORCE_ORGANIZATION.md) — AGENT WORKFORCE ORGANIZATION | 42 | 83 |
| [AUTONOMOUS_RUNTIME.md](AUTONOMOUS_RUNTIME.md) — AUTONOMOUS RUNTIME — Orchestrator Daemon (Bloque C) | 42 | 125 |
| [AUTONOMOUS_WORKFORCE_CERT.md](AUTONOMOUS_WORKFORCE_CERT.md) — AUTONOMOUS WORKFORCE CERT — Gate final | 42 | 67 |
| [CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md](CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md) — CURSOR / OPEN SOURCE INTEGRATION AUDIT | 42 | 54 |
| [FINAL_ELITE_CLOSURE.md](FINAL_ELITE_CLOSURE.md) — FINAL ELITE CLOSURE — Informe de cierre técnico del repositorio | 42 | 95 |
| [MASTER_OPEN_SOURCE_LICENSES.md](MASTER_OPEN_SOURCE_LICENSES.md) — MASTER — Licencias Open Source NELVYON | 42 | 179 |
| [MASTER_OPEN_SOURCE_SECURITY.md](MASTER_OPEN_SOURCE_SECURITY.md) — MASTER — Seguridad Open Source NELVYON | 42 | 95 |
| [NELVYON_LABS.md](NELVYON_LABS.md) — NELVYON-LABS — Laboratorio tecnológico | 42 | 107 |
| [NELVYON_LABS_ARCHITECTURE.md](NELVYON_LABS_ARCHITECTURE.md) — NELVYON-LABS — Arquitectura de aprovechamiento | 42 | 41 |
| [NELVYON_LABS_LICENSE_FINAL.md](NELVYON_LABS_LICENSE_FINAL.md) — NELVYON-LABS — Licencias (decisión final) | 42 | 123 |
| [NELVYON_LABS_MASTER_CLOSURE.md](NELVYON_LABS_MASTER_CLOSURE.md) — NELVYON-LABS — BLOQUE MAESTRO CERRADO | 42 | 75 |
| [NELVYON_LABS_SECURITY_FINAL.md](NELVYON_LABS_SECURITY_FINAL.md) — NELVYON-LABS — Seguridad (gates de preparación) | 42 | 38 |
| [NELVYON_LABS_SUMMARY.md](NELVYON_LABS_SUMMARY.md) — NELVYON-LABS — Resumen oficial | 42 | 103 |
| [OS_SAAS_FUNCTIONAL_INVENTORY.md](OS_SAAS_FUNCTIONAL_INVENTORY.md) — OS + SaaS — Inventario funcional | 42 | 107 |
| [OS_SAAS_SECURITY_AUDIT.md](OS_SAAS_SECURITY_AUDIT.md) — OS + SaaS — Auditoría de seguridad (funcional) | 42 | 49 |
| [PHASE2_AGENTS.md](PHASE2_AGENTS.md) — PHASE2 — Agentes especialistas (diseño) | 42 | 16 |
| [PHASE2_AI_PANEL.md](PHASE2_AI_PANEL.md) — PHASE2 — Panel IA (diseño) | 42 | 25 |
| [PHASE2_ARCHITECTURE.md](PHASE2_ARCHITECTURE.md) — PHASE2_ARCHITECTURE — SSOT IA (nota workforce) | 42 | 37 |
| [PHASE2_AUTOMATIONS.md](PHASE2_AUTOMATIONS.md) — PHASE2 — Automatizaciones (diseño) | 42 | 23 |
| [PHASE2_MCP.md](PHASE2_MCP.md) — PHASE2 — MCP Productivo | 42 | 42 |
| [PHASE2_MCP_ARCHITECTURE.md](PHASE2_MCP_ARCHITECTURE.md) — PHASE2 — MCP Architecture | 42 | 46 |
| [PHASE2_MCP_BENCHMARK.md](PHASE2_MCP_BENCHMARK.md) — PHASE2 — MCP Benchmark | 42 | 31 |
| [PHASE2_MCP_SECURITY.md](PHASE2_MCP_SECURITY.md) — PHASE2 — MCP Security | 42 | 36 |
| [PHASE2_MCP_TOOLS.md](PHASE2_MCP_TOOLS.md) — PHASE2 — MCP Tools | 42 | 37 |
| [PHASE2_MODEL_ROUTER.md](PHASE2_MODEL_ROUTER.md) — Fase 2 — Model Router NELVYON | 42 | 149 |
| [PHASE2_OPENCLAW.md](PHASE2_OPENCLAW.md) — PHASE2 — OpenClaw | 42 | 31 |
| [PHASE2_RAG_UNIFIED.md](PHASE2_RAG_UNIFIED.md) — PHASE2 — RAG unificado (KI-005) | 42 | 37 |
| [PHASE2_ROUTER_ARCHITECTURE.md](PHASE2_ROUTER_ARCHITECTURE.md) — Arquitectura — Model Router NELVYON | 42 | 56 |
| [PHASE2_ROUTER_BENCHMARK.md](PHASE2_ROUTER_BENCHMARK.md) — Benchmark — Model Router | 42 | 80 |
| [PHASE2_ROUTER_SAAS_WIRING.md](PHASE2_ROUTER_SAAS_WIRING.md) — PHASE2 — Router → SaaS PrivateAI (cerrado) | 42 | 63 |
| [PHASE2_ROUTER_SECURITY.md](PHASE2_ROUTER_SECURITY.md) — Seguridad — Model Router | 42 | 48 |
| [PHASE2_SECURITY_MODEL.md](PHASE2_SECURITY_MODEL.md) — PHASE 2 — Modelo de seguridad IA local | 42 | 93 |
| [PHASE2_SHARED_MEMORY.md](PHASE2_SHARED_MEMORY.md) — PHASE2 — Shared Memory (runtime — ADR-024) | 42 | 51 |
| [PHASE2_SPECIALIZATION_CERTIFICATION.md](PHASE2_SPECIALIZATION_CERTIFICATION.md) — Fase 2 — Certificación especialización NELVYON | 42 | 367 |
| [PRIVATE_AI_PHASE2.md](PRIVATE_AI_PHASE2.md) — Fase 2 — IA privada Nelvyon | 42 | 25 |
| [PRODUCTION_CERTIFICATION_REPORT.md](PRODUCTION_CERTIFICATION_REPORT.md) — NELVYON — Informe de certificación final de producción (2026-07-17) | 42 | 147 |
| [PRODUCTION_SECRETS.md](PRODUCTION_SECRETS.md) — Producción — Secretos y variables (Fuente de verdad) | 42 | 196 |
| [QUALITY_STANDARD.md](QUALITY_STANDARD.md) — Estándar definitivo de calidad — NELVYON | 42 | 45 |
| [PHASE2_ELITE_CERT.md](PHASE2_ELITE_CERT.md) — PHASE 2 ELITE CERT — estado honesto | 44 | 63 |
| [PHASE2_ORCHESTRATOR.md](PHASE2_ORCHESTRATOR.md) — PHASE2 — Orquestador | 44 | 25 |
| [PHASE2_THREAT_MODEL_ELITE.md](PHASE2_THREAT_MODEL_ELITE.md) — PHASE2 — Threat model (Elite Real) | 44 | 23 |
| [PHASE2_SPECIALIZATION.md](PHASE2_SPECIALIZATION.md) — PHASE 2 — Especialización NELVYON IA Privada | 49 | 194 |
| [PHASE2_AI_ARCHITECTURE.md](PHASE2_AI_ARCHITECTURE.md) — PHASE 2 — Arquitectura IA Local NELVYON | 50 | 104 |
| [PHASE2_BENCHMARK_RESULTS.md](PHASE2_BENCHMARK_RESULTS.md) — PHASE 2 — Benchmark Results (Ollama) | 50 | 89 |
| [PRIVATE_AI_ARCHITECTURE.md](PRIVATE_AI_ARCHITECTURE.md) — Nelvyon Private AI — Technical Architecture (Prep Phase) | 50 | 199 |
| [SES_PRODUCTION_ACCESS_APPEAL.md](SES_PRODUCTION_ACCESS_APPEAL.md) — Amazon SES — Apelación Production Access (Case 178372013800016) | 50 | 353 |
| [SES_PRODUCTION_SETUP.md](SES_PRODUCTION_SETUP.md) — Amazon SES — Producción (Fase 1) | 50 | 135 |
| [ARCHITECTURE.md](ARCHITECTURE.md) — ARCHITECTURE — Arquitectura real NELVYON | 52 | 163 |
| [SMOKE_GATES.md](SMOKE_GATES.md) — Smoke & CI Gates — Nelvyon | 57 | 47 |
| [STRIPE_BILLING_P0.md](STRIPE_BILLING_P0.md) — Stripe Billing P0 — Checkout + Webhook E2E | 57 | 167 |
| [MANUAL_OPS_ONLY.md](MANUAL_OPS_ONLY.md) — Manual ops only — Nelvyon producción | 60 | 64 |
| [NELVYON_QUALITY_SCORE.md](NELVYON_QUALITY_SCORE.md) — NELVYON — Puntuación de calidad real (0–10) | 60 | 45 |
| [PARITY_GHL_HUBSPOT.md](PARITY_GHL_HUBSPOT.md) — Paridad Nelvyon SaaS vs GoHighLevel + HubSpot | 60 | 63 |
| [OS_AGENT_AUDIT_TRAIL.md](OS_AGENT_AUDIT_TRAIL.md) — OS Agent Audit Trail (O28) | 64 | 46 |
| [OS_AGENT_DATA.md](OS_AGENT_DATA.md) — OS Agent Data — Semrush / DataForSEO in production (O21) | 64 | 62 |
| [OS_BRIEF_DIFF_RERUN.md](OS_BRIEF_DIFF_RERUN.md) — OS Brief Diff & Re-run (O29) | 64 | 45 |
| [OS_COMPETITOR_GAP.md](OS_COMPETITOR_GAP.md) — OS Competitor Gap Pack (O24) | 64 | 57 |
| [OS_DELIVERY_CERTIFICATE.md](OS_DELIVERY_CERTIFICATE.md) — OS Delivery Certificate (O23) | 64 | 57 |
| [OS_GATE_RUNBOOK.md](OS_GATE_RUNBOOK.md) — OS Pack Gate — Runbook (O22) | 64 | 61 |
| [OS_LEARNING.md](OS_LEARNING.md) — OS Learning Loop — GA4 → Seed Selector Weights | 64 | 92 |
| [OS_REGULATED_SECTOR_SHIELD.md](OS_REGULATED_SECTOR_SHIELD.md) — OS Regulated Sector Shield (O27) | 64 | 65 |
| [OS_RETAINER_AUTOPILOT.md](OS_RETAINER_AUTOPILOT.md) — OS Retainer Autopilot v2 (O25) | 64 | 52 |
| [OS_TEMPLATE_DNA.md](OS_TEMPLATE_DNA.md) — OS Template DNA (O26) | 64 | 45 |
| [OS_TRUTH_GUARD.md](OS_TRUTH_GUARD.md) — OS Truth Guard (O30) | 64 | 41 |
| [OS_AUTONOMOUS_PROD.md](OS_AUTONOMOUS_PROD.md) — OS Autonomous Production — Runbook | 66 | 79 |
| [OS_QA.md](OS_QA.md) — OS QA Engine — Visual + Legal Pre-Portal | 66 | 78 |
| [OS_RECURRING.md](OS_RECURRING.md) — OS Recurring Services — Servicios Continuos Mensuales | 66 | 99 |
| [OS_SEEDS.md](OS_SEEDS.md) — OS Seeds — 20 Sector Agents | 67 | 127 |
| [STAGING_P0_SMOKES.md](STAGING_P0_SMOKES.md) — Staging P0 smokes — quality gate | 67 | 107 |
| [PARTNERS_HQ_COMMISSION_ONBOARDING_FLOW.md](PARTNERS_HQ_COMMISSION_ONBOARDING_FLOW.md) — Partner HQ — Flujo “Cómo cobro y qué hago” (diseño UX) | 76 | 162 |
| [PARTNERS_P2_REBILLING_PORTAL_WL.md](PARTNERS_P2_REBILLING_PORTAL_WL.md) — P2 — Rebilling Stripe Connect + White-label Portal | 76 | 303 |
| [PARTNERS_WHITELABEL_PROGRAM.md](PARTNERS_WHITELABEL_PROGRAM.md) — Programa Partners / White-Label SaaS & Agencia — Diseño v1 | 76 | 258 |
| [PRODUCTION_READINESS_FINAL.md](PRODUCTION_READINESS_FINAL.md) — NELVYON — Production Readiness Final | 83 | 325 |
| [AUTONOMOUS_SERVICES_MODE.md](AUTONOMOUS_SERVICES_MODE.md) — NELVYON — Autonomous Services Mode | 84 | 689 |
| [OS_PRODUCTION_GO_LIVE_CHECKLIST.md](OS_PRODUCTION_GO_LIVE_CHECKLIST.md) — OS Production Go-Live Checklist — Lunes | 84 | 325 |
| [OS_RLS_AUDIT.md](OS_RLS_AUDIT.md) — OS RLS Audit — NELVYON OS (322_os_rls.sql) | 84 | 90 |
| [SERVICES_MASTER_PLAN.md](SERVICES_MASTER_PLAN.md) — NELVYON SERVICES — Master Plan (Fase diseño operativo) | 84 | 917 |
| [OS_PRODUCTION_MIGRATIONS.md](OS_PRODUCTION_MIGRATIONS.md) — Migraciones OS en producción (281 + 282) | 85 | 113 |
| [NELVYON_SCALABILITY_REVIEW.md](NELVYON_SCALABILITY_REVIEW.md) — NELVYON — Revisión de escalabilidad | 86 | 60 |
| [NELVYON_UNIVERSAL_PLATFORM.md](NELVYON_UNIVERSAL_PLATFORM.md) — NELVYON — Plataforma universal (arquitectura) | 86 | 77 |
| [SAAS_TECHNICAL_AUDIT.md](SAAS_TECHNICAL_AUDIT.md) — NELVYON SaaS — Auditoría técnica completa | 86 | 279 |
| [NELVYON_MUTATING_ROUTERS_CHECKLIST.md](NELVYON_MUTATING_ROUTERS_CHECKLIST.md) — NELVYON — Checklist heurístico de routers mutantes | 104 | 118 |
| [NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md](NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md) — Routers con patrón WS-read / OP-write **verificado por tests HTTP** | 104 | 40 |
| [NELVYON_WRITE_PATH_MATRIX.md](NELVYON_WRITE_PATH_MATRIX.md) — NELVYON_WRITE_PATH_MATRIX | 104 | 206 |

## Lo que este índice NO dice

- **Que un `HISTORICO` esté equivocado.** Dice que nadie lo ha tocado en un mes.
  Muchos siguen siendo correctos; el problema es que no hay forma de saber cuáles
  sin leerlos, y por eso conviene tratarlos como memoria y no como estado.
- **Que un `VIGENTE` sea cierto.** Dice que es reciente. Reciente y escrito a mano
  sigue siendo escrito a mano.
- **Que un `GENERADO` sea la verdad.** Dice que refleja el árbol de la última vez
  que se ejecutó su generador. Si el generador lee mal, el documento miente con
  puntualidad — que es exactamente lo que le pasó dos veces a la matriz de
  servicios y por eso ahora comprueban sus propios denominadores.

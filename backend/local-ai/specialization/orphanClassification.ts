/**
 * Explicit classification of top-level docs orphans.
 * Every docs/*.md must be: indexed (manifest), archived (docs/archive/), or already in coreDocs.
 * claimComplete stays false until ingest live is verified separately.
 */

import type { KnowledgeDomainId } from "./ontology";

export type OrphanDisposition = "index" | "archive";

export type OrphanClassEntry = {
  path: string;
  disposition: OrphanDisposition;
  domain?: KnowledgeDomainId | KnowledgeDomainId[];
  priority?: 0 | 1 | 2 | 3;
  title?: string;
  sourceType?: "official_doc" | "code" | "sop" | "runbook" | "knowledge_pack" | "constitution" | "playbook" | "case_study";
  reason: string;
};

/**
 * Classification table — active knowledge vs historical archive.
 * Paths are repo-relative under docs/ (before archive move).
 */
export const ORPHAN_CLASSIFICATION: readonly OrphanClassEntry[] = [
  // —— Active: index ——
  { path: "docs/NELVYON_BRAIN_KNOWLEDGE.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Brain Knowledge Coverage", reason: "SSOT cobertura cerebro" },
  { path: "docs/OPS.md", disposition: "index", domain: ["development_tech", "finance_operations"], priority: 0, title: "Ops Manual", sourceType: "runbook", reason: "Ops SSOT" },
  { path: "docs/LAUNCH_READY.md", disposition: "index", domain: "development_tech", priority: 1, title: "Launch Ready Checklist", reason: "Checklist prod" },
  { path: "docs/LAUNCH_OPS_CHECKLIST.md", disposition: "index", domain: "development_tech", priority: 1, title: "Launch Ops Checklist", reason: "Ops launch" },
  { path: "docs/DEPLOY_FINAL.md", disposition: "index", domain: "development_tech", priority: 1, title: "Deploy Final", reason: "Deploy procedure" },
  { path: "docs/MANUAL_OPS_ONLY.md", disposition: "index", domain: "finance_operations", priority: 1, title: "Manual Ops Only", reason: "Human-only ops" },
  { path: "docs/OS_GATE_RUNBOOK.md", disposition: "index", domain: "nelvyon", priority: 0, title: "OS Gate Runbook", sourceType: "runbook", reason: "CI gate live" },
  { path: "docs/OS_AUTONOMOUS_PROD.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Autonomous Prod", reason: "OS prod mode" },
  { path: "docs/OS_QA.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS QA", reason: "OS quality" },
  { path: "docs/OS_DELIVERY_CERTIFICATE.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Delivery Certificate", reason: "Delivery cert" },
  { path: "docs/OS_PRODUCTION_GO_LIVE_CHECKLIST.md", disposition: "index", domain: "development_tech", priority: 1, title: "OS Go-Live Checklist", reason: "Go-live" },
  { path: "docs/OS_PRODUCTION_MIGRATIONS.md", disposition: "index", domain: "development_tech", priority: 1, title: "OS Production Migrations", reason: "Migrations ops" },
  { path: "docs/OS_AGENT_AUDIT_TRAIL.md", disposition: "index", domain: "security_privacy", priority: 1, title: "OS Agent Audit Trail", reason: "Audit trail" },
  { path: "docs/OS_AGENT_DATA.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Agent Data", reason: "Agent data model" },
  { path: "docs/OS_BRIEF_DIFF_RERUN.md", disposition: "index", domain: "nelvyon", priority: 2, title: "OS Brief Diff Rerun", reason: "Rerun procedure" },
  { path: "docs/OS_COMPETITOR_GAP.md", disposition: "index", domain: "business_strategy", priority: 2, title: "OS Competitor Gap", reason: "Competitive intel" },
  { path: "docs/NELVYON_OBSERVABILITY_REALITY.md", disposition: "index", domain: "development_tech", priority: 1, title: "Observability Reality", reason: "Observability SSOT" },
  { path: "docs/NELVYON_WRITE_PATH_MATRIX.md", disposition: "index", domain: ["development_tech", "security_privacy"], priority: 1, title: "Write Path Matrix", reason: "Mutating routes matrix" },
  { path: "docs/NELVYON_MUTATING_ROUTERS_CHECKLIST.md", disposition: "index", domain: "security_privacy", priority: 1, title: "Mutating Routers Checklist", reason: "Security checklist" },
  { path: "docs/NELVYON_ROUTERS_WS_OP_VERIFIED_BY_TESTS.md", disposition: "index", domain: "development_tech", priority: 2, title: "Routers WS Verified", reason: "Test evidence" },
  { path: "docs/NELVYON_SCALABILITY_REVIEW.md", disposition: "index", domain: "development_tech", priority: 2, title: "Scalability Review", reason: "Scale review" },
  { path: "docs/NELVYON_UNIVERSAL_PLATFORM.md", disposition: "index", domain: "nelvyon", priority: 1, title: "Universal Platform", reason: "Platform vision" },
  { path: "docs/NELVYON_QUALITY_SCORE.md", disposition: "index", domain: "planning_strategy", priority: 2, title: "Quality Score", reason: "Quality metrics" },
  { path: "docs/NELVYON_LABS.md", disposition: "index", domain: "development_tech", priority: 1, title: "Nelvyon Labs Index", reason: "Labs index" },
  { path: "docs/NELVYON_LABS_ARCHITECTURE.md", disposition: "index", domain: "development_tech", priority: 1, title: "Labs Architecture", reason: "Labs arch" },
  { path: "docs/NELVYON_LABS_MASTER_CLOSURE.md", disposition: "index", domain: "development_tech", priority: 1, title: "Labs Master Closure", reason: "Labs closure SSOT" },
  { path: "docs/NELVYON_LABS_SECURITY_FINAL.md", disposition: "index", domain: "security_privacy", priority: 1, title: "Labs Security Final", reason: "Labs security" },
  { path: "docs/NELVYON_LABS_LICENSE_FINAL.md", disposition: "index", domain: "development_tech", priority: 2, title: "Labs License Final", reason: "License decisions" },
  { path: "docs/NELVYON_LABS_SUMMARY.md", disposition: "index", domain: "development_tech", priority: 2, title: "Labs Summary", reason: "Labs summary" },
  { path: "docs/MASTER_OPEN_SOURCE_SECURITY.md", disposition: "index", domain: "security_privacy", priority: 2, title: "OSS Security Research", reason: "Security research" },
  { path: "docs/MASTER_OPEN_SOURCE_LICENSES.md", disposition: "index", domain: "development_tech", priority: 2, title: "OSS Licenses", reason: "License matrix" },
  { path: "docs/CIERRE_FINAL_PRIORITARIO.md", disposition: "index", domain: ["nelvyon", "development_tech"], priority: 1, title: "Cierre Final Prioritario", reason: "Priority closure report" },
  { path: "docs/ELITE_QUALITY_FINALIZATION.md", disposition: "index", domain: ["nelvyon", "development_tech"], priority: 1, title: "Elite Quality Finalization", reason: "Elite quality pass report" },
  { path: "docs/OPS_SES_PROD.md", disposition: "index", domain: ["finance_operations", "development_tech"], priority: 0, title: "OPS SES Production Checklist", sourceType: "runbook", reason: "SES prod ops" },
  { path: "docs/OPS_SHARED_MEMORY_514.md", disposition: "index", domain: ["development_tech", "security_privacy"], priority: 0, title: "OPS Shared Memory 514 Checklist", sourceType: "runbook", reason: "Shared memory migrate verify" },
  { path: "docs/OPS_STRIPE_PROD.md", disposition: "index", domain: "finance_operations", priority: 0, title: "OPS Stripe Production Checklist", sourceType: "runbook", reason: "Stripe prod ops" },
  { path: "docs/SPRINT_FINAL_ABSOLUTO.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Sprint Final Absoluto", reason: "CONDITIONAL_READY status" },

  // —— Archive: historical / superseded / research dumps ——
  { path: "docs/BETA_LAUNCH_AUDIT.md", disposition: "archive", reason: "Pre-beta historical audit" },
  { path: "docs/BETA_LAUNCH_RUNBOOK.md", disposition: "archive", reason: "Pre-beta runbook superseded" },
  { path: "docs/CEO_FINAL_ACTIONS.md", disposition: "archive", reason: "Dated external checklist 2026-07-10" },
  { path: "docs/CLAUDE_SPRINT_ELITE.md", disposition: "archive", reason: "Sprint prompt historical" },
  { path: "docs/CURSOR_NELVYON_MASTER_EXECUTION.md", disposition: "archive", reason: "Execution prompt historical" },
  { path: "docs/EXCELLENCE_PROGRAM.md", disposition: "archive", reason: "Program draft superseded by elite closure" },
  { path: "docs/FRONTEND_LEGACY.md", disposition: "archive", reason: "Legacy frontend policy note" },
  { path: "docs/INVENTARIO_FRENTES.md", disposition: "archive", reason: "Inventory snapshot" },
  { path: "docs/MASTER_AUDIT_2026-07-16.md", disposition: "archive", reason: "Dated audit snapshot" },
  { path: "docs/MASTER_AUDIT_ELITE_2026-07-16.md", disposition: "archive", reason: "Dated elite audit" },
  { path: "docs/MASTER_OPEN_SOURCE_COMPARISON.md", disposition: "archive", reason: "Research dump" },
  { path: "docs/MASTER_OPEN_SOURCE_LIST.md", disposition: "archive", reason: "Research dump 480 projects" },
  { path: "docs/MASTER_OPEN_SOURCE_ROADMAP.md", disposition: "archive", reason: "Research roadmap dump" },
  { path: "docs/NELVYON_BACKEND_V1_CIERRE_FINAL.md", disposition: "archive", reason: "V1 closure historical" },
  { path: "docs/NELVYON_FINAL_STATE_AUDIT.md", disposition: "archive", reason: "State audit snapshot" },
  { path: "docs/NELVYON_GLOBAL_CERTIFICATION_FINAL.md", disposition: "archive", reason: "Cert snapshot historical" },
  { path: "docs/NELVYON_LABS_BLOCK1_SECURITY.md", disposition: "archive", reason: "Intermediate labs report" },
  { path: "docs/NELVYON_LABS_BLOCK2_OBSERVABILITY.md", disposition: "archive", reason: "Intermediate labs report" },
  { path: "docs/NELVYON_LABS_BY_CATEGORY.md", disposition: "archive", reason: "Intermediate labs report" },
  { path: "docs/NELVYON_LABS_CAPABILITY_MATRIX.md", disposition: "archive", reason: "Superseded by master closure" },
  { path: "docs/NELVYON_LABS_FINAL_COVERAGE.md", disposition: "archive", reason: "Intermediate coverage" },
  { path: "docs/NELVYON_LABS_INTEGRATED.md", disposition: "archive", reason: "Intermediate integration" },
  { path: "docs/NELVYON_LABS_INTEGRATION_FINAL.md", disposition: "archive", reason: "Intermediate integration" },
  { path: "docs/NELVYON_LABS_INTEGRATION_QUEUE.md", disposition: "archive", reason: "Queue historical" },
  { path: "docs/NELVYON_LABS_INTEGRATION_REPORT.md", disposition: "archive", reason: "Integration report historical" },
  { path: "docs/NELVYON_LABS_MASTER_TABLE.md", disposition: "archive", reason: "Table dump" },
  { path: "docs/NELVYON_LABS_REJECTED_FINAL.md", disposition: "archive", reason: "Rejected candidates list" },
  { path: "docs/NELVYON_LABS_WINNERS.md", disposition: "archive", reason: "Winners list intermediate" },
  { path: "docs/OS_LEGACY_DEPRECATION_PLAN.md", disposition: "archive", reason: "Deprecation plan historical" },
  { path: "docs/OS_PRODUCTION_READINESS.md", disposition: "archive", reason: "Snapshot 2026-06-07" },
  { path: "docs/OS_PHASE1_API_CLIENTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_API_PROJECTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_BACKFILL_CLIENTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_BACKFILL_PROJECTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_DELIVERABLES.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_DELIVERABLE_DOWNLOAD.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_DELIVERABLE_UPLOAD.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_DELIVERABLE_VERSIONING.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_EMAIL_NOTIFICATIONS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_OS_DELIVERABLES_UI.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_PLAN.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_PORTAL_APPROVALS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_PORTAL_CLIENTE.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_PORTAL_UI.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_PROJECTS_SCHEMA.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_TASKS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_UI_CLIENTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_UI_PROJECTS.md", disposition: "archive", reason: "OS Phase1 historical" },
  { path: "docs/OS_PHASE1_UI_TASKS.md", disposition: "archive", reason: "OS Phase1 historical" },

  // —— Wave 2: remaining top-level orphans (2026-07-19) ——
  // Active index
  { path: "docs/README.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Docs README Index", reason: "Docs index" },
  { path: "docs/QUALITY_STANDARD.md", disposition: "index", domain: "planning_strategy", priority: 1, title: "Quality Standard", reason: "Quality SSOT" },
  { path: "docs/SMOKE_GATES.md", disposition: "index", domain: "development_tech", priority: 1, title: "Smoke Gates", sourceType: "runbook", reason: "CI smoke gates" },
  { path: "docs/STAGING_P0_SMOKES.md", disposition: "index", domain: "development_tech", priority: 1, title: "Staging P0 Smokes", sourceType: "runbook", reason: "Staging smokes" },
  { path: "docs/SES_PRODUCTION_SETUP.md", disposition: "index", domain: "development_tech", priority: 1, title: "SES Production Setup", reason: "Email ops" },
  { path: "docs/SES_PRODUCTION_ACCESS_APPEAL.md", disposition: "index", domain: "development_tech", priority: 2, title: "SES Access Appeal", reason: "SES blocker ops" },
  { path: "docs/STRIPE_BILLING_P0.md", disposition: "index", domain: ["saas", "finance_operations"], priority: 1, title: "Stripe Billing P0", reason: "Billing SSOT" },
  { path: "docs/PRODUCTION_SECRETS.md", disposition: "index", domain: "security_privacy", priority: 1, title: "Production Secrets Policy", reason: "Secrets policy (no values)" },
  { path: "docs/PRODUCTION_READINESS_FINAL.md", disposition: "index", domain: "development_tech", priority: 1, title: "Production Readiness Final", reason: "Readiness checklist" },
  { path: "docs/PRODUCTION_CERTIFICATION_REPORT.md", disposition: "index", domain: "nelvyon", priority: 1, title: "Production Certification Report", reason: "Prod cert evidence" },
  { path: "docs/SAAS_TECHNICAL_AUDIT.md", disposition: "index", domain: "saas", priority: 1, title: "SaaS Technical Audit", reason: "SaaS audit" },
  { path: "docs/PRIVATE_AI_PHASE2.md", disposition: "index", domain: ["nelvyon", "security_privacy"], priority: 0, title: "Private AI Phase2", reason: "Private AI SSOT" },
  { path: "docs/PHASE2_AGENTS.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Phase2 Agents", reason: "Agents SSOT" },
  { path: "docs/PHASE2_AI_PANEL.md", disposition: "index", domain: "nelvyon", priority: 1, title: "Phase2 AI Panel", reason: "AI panel" },
  { path: "docs/PHASE2_AUTOMATIONS.md", disposition: "index", domain: "automation", priority: 1, title: "Phase2 Automations", reason: "Automations SSOT" },
  { path: "docs/PHASE2_MCP.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Phase2 MCP", reason: "MCP SSOT" },
  { path: "docs/PHASE2_MCP_ARCHITECTURE.md", disposition: "index", domain: "development_tech", priority: 0, title: "MCP Architecture", reason: "MCP arch" },
  { path: "docs/PHASE2_MCP_BENCHMARK.md", disposition: "index", domain: "nelvyon", priority: 1, title: "MCP Benchmark", reason: "MCP benchmarks" },
  { path: "docs/PHASE2_MCP_SECURITY.md", disposition: "index", domain: "security_privacy", priority: 0, title: "MCP Security", reason: "MCP security" },
  { path: "docs/PHASE2_MCP_TOOLS.md", disposition: "index", domain: "development_tech", priority: 1, title: "MCP Tools", reason: "MCP tools" },
  { path: "docs/PHASE2_MODEL_ROUTER.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Model Router", reason: "Router SSOT" },
  { path: "docs/PHASE2_OPENCLAW.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OpenClaw", reason: "OpenClaw bridge" },
  { path: "docs/PHASE2_ORCHESTRATOR.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Phase2 Orchestrator", reason: "Orchestrator SSOT" },
  { path: "docs/PHASE2_ROUTER_ARCHITECTURE.md", disposition: "index", domain: "development_tech", priority: 0, title: "Router Architecture", reason: "Router arch" },
  { path: "docs/PHASE2_ROUTER_BENCHMARK.md", disposition: "index", domain: "nelvyon", priority: 1, title: "Router Benchmark", reason: "Router benchmarks" },
  { path: "docs/PHASE2_ROUTER_SAAS_WIRING.md", disposition: "index", domain: "saas", priority: 1, title: "Router SaaS Wiring", reason: "Router SaaS" },
  { path: "docs/PHASE2_ROUTER_SECURITY.md", disposition: "index", domain: "security_privacy", priority: 0, title: "Router Security", reason: "Router security" },
  { path: "docs/PHASE2_SHARED_MEMORY.md", disposition: "index", domain: ["nelvyon", "security_privacy"], priority: 0, title: "Shared Memory", reason: "Memory SSOT" },
  { path: "docs/PHASE2_SPECIALIZATION.md", disposition: "index", domain: "nelvyon", priority: 0, title: "Specialization", reason: "Specialization SSOT" },
  { path: "docs/PHASE2_SPECIALIZATION_CERTIFICATION.md", disposition: "index", domain: "nelvyon", priority: 1, title: "Specialization Certification", reason: "Spec cert" },
  { path: "docs/PHASE2_THREAT_MODEL_ELITE.md", disposition: "index", domain: "security_privacy", priority: 0, title: "Threat Model Elite", reason: "Threat model" },
  { path: "docs/PARTNERS_WHITELABEL_PROGRAM.md", disposition: "index", domain: ["saas", "finance_operations"], priority: 1, title: "Partners Whitelabel", reason: "Partner program" },
  { path: "docs/PARTNERS_HQ_COMMISSION_ONBOARDING_FLOW.md", disposition: "index", domain: "finance_operations", priority: 1, title: "Partners Commission Flow", reason: "Partner onboarding" },
  { path: "docs/PARTNERS_P2_REBILLING_PORTAL_WL.md", disposition: "index", domain: "finance_operations", priority: 2, title: "Partners Rebilling", reason: "Partner rebilling" },
  { path: "docs/OS_RECURRING.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Recurring", reason: "OS recurring" },
  { path: "docs/OS_RETAINER_AUTOPILOT.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Retainer Autopilot", reason: "Retainer mode" },
  { path: "docs/OS_REGULATED_SECTOR_SHIELD.md", disposition: "index", domain: "security_privacy", priority: 1, title: "Regulated Sector Shield", reason: "Compliance shield" },
  { path: "docs/OS_RLS_AUDIT.md", disposition: "index", domain: "security_privacy", priority: 1, title: "OS RLS Audit", reason: "RLS audit" },
  { path: "docs/OS_SAAS_SECURITY_AUDIT.md", disposition: "index", domain: "security_privacy", priority: 1, title: "OS SaaS Security Audit", reason: "Security audit" },
  { path: "docs/OS_SAAS_FUNCTIONAL_INVENTORY.md", disposition: "index", domain: "saas", priority: 1, title: "OS SaaS Functional Inventory", reason: "Functional inventory" },
  { path: "docs/OS_TRUTH_GUARD.md", disposition: "index", domain: "nelvyon", priority: 1, title: "OS Truth Guard", reason: "Truth guard" },
  { path: "docs/OS_SEEDS.md", disposition: "index", domain: "development_tech", priority: 2, title: "OS Seeds", reason: "Seed data" },

  // Archive — historical phase notes / intermediate audits
  { path: "docs/OS_SAAS_API_AUDIT.md", disposition: "archive", reason: "Dated API audit snapshot" },
  { path: "docs/OS_SAAS_E2E_MATRIX.md", disposition: "archive", reason: "E2E matrix snapshot" },
  { path: "docs/OS_SAAS_FINAL_CERTIFICATION.md", disposition: "archive", reason: "Cert snapshot historical" },
  { path: "docs/OS_SAAS_PERFORMANCE_AUDIT.md", disposition: "archive", reason: "Perf audit snapshot" },
  { path: "docs/OS_SAAS_PRODUCTION_READINESS.md", disposition: "archive", reason: "Readiness snapshot" },
  { path: "docs/OS_SAAS_ROUTE_AUDIT.md", disposition: "archive", reason: "Route audit snapshot" },
  { path: "docs/OS_SAAS_UX_A11Y_AUDIT.md", disposition: "archive", reason: "UX a11y snapshot" },
  { path: "docs/OS_SMOKE_TEST_FINAL.md", disposition: "archive", reason: "Smoke snapshot" },
  { path: "docs/OS_V1_COMMERCIAL_AUDIT.md", disposition: "archive", reason: "V1 commercial audit" },
  { path: "docs/OS_V1_FINAL_AUDIT.md", disposition: "archive", reason: "V1 final audit" },
  { path: "docs/PHASE1_CLOSURE_AUDIT.md", disposition: "archive", reason: "Phase1 closure historical" },
  { path: "docs/PHASE2_HARDWARE_AUDIT.md", disposition: "archive", reason: "Hardware audit snapshot" },
  { path: "docs/PHASE2_PREP_AUDIT.md", disposition: "archive", reason: "Prep audit historical" },
  { path: "docs/PHASE2_PREP_INDEX.md", disposition: "archive", reason: "Prep index historical" },
  { path: "docs/PHASE2_SPECIALIZATION_AUDIT.md", disposition: "archive", reason: "Intermediate specialization audit" },
  { path: "docs/PHASE2_SPECIALIZATION_DEFINITIVE.md", disposition: "archive", reason: "Superseded by PHASE2_SPECIALIZATION" },
  { path: "docs/PHASE2_SPECIALIZATION_ENTERPRISE_AUDIT.md", disposition: "archive", reason: "Enterprise audit intermediate" },
  { path: "docs/PHASE2_SPECIALIZATION_FINAL.md", disposition: "archive", reason: "Intermediate final draft" },
  { path: "docs/PHASE_1A_CRM_TRANSITION.md", disposition: "archive", reason: "Phase 1A historical" },
  { path: "docs/PHASE_1A_LEGACY_INVENTORY.md", disposition: "archive", reason: "Phase 1A historical" },
  { path: "docs/PHASE_1A_TENANT_BRIDGE.md", disposition: "archive", reason: "Phase 1A historical" },
  { path: "docs/PHASE_1B_CRM_ETL.md", disposition: "archive", reason: "Phase 1B historical" },
  { path: "docs/PHASE_1B_QUOTAS.md", disposition: "archive", reason: "Phase 1B historical" },
  { path: "docs/PHASE_1C_LEGACY_DASHBOARDS.md", disposition: "archive", reason: "Phase 1C historical" },
  { path: "docs/PHASE_1C_QUOTAS.md", disposition: "archive", reason: "Phase 1C historical" },
  { path: "docs/PHASE_1C_SAAS_DEALS_PLAN.md", disposition: "archive", reason: "Phase 1C historical" },
  { path: "docs/PHASE_1C_SUMMARY.md", disposition: "archive", reason: "Phase 1C historical" },
  { path: "docs/PHASE_2A_OS_SHELL.md", disposition: "archive", reason: "Phase 2A historical" },
  { path: "docs/PHASE_2B_OS_CLIENTS_PROJECTS.md", disposition: "archive", reason: "Phase 2B historical" },
  { path: "docs/PHASE_2C_OS_PIPELINE_TASKS.md", disposition: "archive", reason: "Phase 2C historical" },
  { path: "docs/PHASE_2D_OS_DOCUMENTS_LIBRARY.md", disposition: "archive", reason: "Phase 2D historical" },
  { path: "docs/PHASE_2E_OS_FINANZAS.md", disposition: "archive", reason: "Phase 2E historical" },
  { path: "docs/PHASE_2F_READY_FOR_SAAS.md", disposition: "archive", reason: "Phase 2F historical" },
  { path: "docs/PHASE_3A_SAAS_DEALS_PIPELINE.md", disposition: "archive", reason: "Phase 3A historical" },
  { path: "docs/PHASE_3B_PIPELINE_STAGE_SYNC.md", disposition: "archive", reason: "Phase 3B historical" },
  { path: "docs/PHASE_3B_SAAS_DEALS_UI.md", disposition: "archive", reason: "Phase 3B historical" },
  { path: "docs/PHASE_3B_SAAS_LEGACY_CLEANUP.md", disposition: "archive", reason: "Phase 3B historical" },
  { path: "docs/PHASE_3C_SAAS_RBAC_BILLING.md", disposition: "archive", reason: "Phase 3C historical" },
  { path: "docs/PHASE_3D_SAAS_RBAC_UI.md", disposition: "archive", reason: "Phase 3D historical" },
  { path: "docs/PHASE_3E_SAAS_DEALS_AUTOMATION.md", disposition: "archive", reason: "Phase 3E historical" },
  { path: "docs/PHASE_A_RAG_CORPUS_REPORT.md", disposition: "archive", reason: "RAG corpus snapshot" },
  { path: "docs/S45_POLISH_CHECKLIST.md", disposition: "archive", reason: "Sprint polish checklist historical" },
  { path: "docs/STRATEGY_COHERENCE_ROOT_CAUSE.md", disposition: "archive", reason: "Root-cause note historical" },
  { path: "docs/YELLOW_ELIMINATION_QUEUE.md", disposition: "archive", reason: "Yellow queue historical" },
];

export function indexClassifications(): OrphanClassEntry[] {
  return ORPHAN_CLASSIFICATION.filter((c) => c.disposition === "index");
}

export function archiveClassifications(): OrphanClassEntry[] {
  return ORPHAN_CLASSIFICATION.filter((c) => c.disposition === "archive");
}

export function classifiedPaths(): Set<string> {
  return new Set(ORPHAN_CLASSIFICATION.map((c) => c.path.replace(/\\/g, "/")));
}

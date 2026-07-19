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

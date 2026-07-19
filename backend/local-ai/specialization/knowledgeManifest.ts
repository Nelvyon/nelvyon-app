import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

import { allDomainIds, type KnowledgeDomainId } from "./ontology";
import { indexClassifications } from "./orphanClassification";

export type KnowledgeSourceEntry = {
  path: string;
  domain: KnowledgeDomainId;
  priority: 0 | 1 | 2 | 3;
  license: "nelvyon_internal" | "mit" | "apache2" | "public_standard";
  sourceType: "official_doc" | "code" | "sop" | "runbook" | "knowledge_pack" | "constitution" | "playbook" | "case_study";
  title: string;
};

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function abs(rel: string): string {
  return path.join(REPO, rel);
}

function entry(
  rel: string,
  domain: KnowledgeDomainId,
  priority: 0 | 1 | 2 | 3,
  title: string,
  sourceType: KnowledgeSourceEntry["sourceType"] = "official_doc",
): KnowledgeSourceEntry | null {
  const p = abs(rel);
  if (!fs.existsSync(p)) return null;
  return {
    path: p,
    domain,
    priority,
    license: "nelvyon_internal",
    sourceType,
    title,
  };
}

function entries(
  rel: string,
  domains: KnowledgeDomainId[],
  priority: 0 | 1 | 2 | 3,
  title: string,
  sourceType: KnowledgeSourceEntry["sourceType"] = "official_doc",
): KnowledgeSourceEntry[] {
  return domains
    .map((domain) => entry(rel, domain, priority, title, sourceType))
    .filter((e): e is KnowledgeSourceEntry => e !== null);
}

/** Per-file domain map — services SOPs (no folder-level glob). */
const SERVICE_SOP_DOMAINS: Record<string, { domain: KnowledgeDomainId | KnowledgeDomainId[]; title: string }> = {
  "GOOGLE_ADS_SOP.md": { domain: "paid_ads", title: "Google Ads SOP" },
  "META_ADS_SOP.md": { domain: "paid_ads", title: "Meta Ads SOP" },
  "TIKTOK_ADS_SOP.md": { domain: "paid_ads", title: "TikTok Ads SOP" },
  "SEO_SOP.md": { domain: "seo", title: "SEO SOP" },
  "LANDING_SOP.md": { domain: ["content", "digital_marketing"], title: "Landing / CRO SOP" },
  "ECOMMERCE_SOP.md": { domain: "digital_marketing", title: "Ecommerce SOP" },
  "BRANDING_SOP.md": { domain: "design", title: "Branding SOP" },
  "LOGO_SOP.md": { domain: "design", title: "Logo SOP" },
  "WEB_SOP.md": { domain: "development_tech", title: "Web Development SOP" },
  "CHATBOT_SOP.md": { domain: "customer_support", title: "Chatbot SOP" },
  "AUTOMATION_SOP.md": { domain: "automation", title: "Automation SOP" },
  "SERVICES_QA_MASTER.md": { domain: ["nelvyon", "planning_strategy"], title: "Services QA Master" },
  "NELVYON_SERVICE_TIERS.md": { domain: "nelvyon", title: "NELVYON Service Tiers" },
  "FREELANCER_SCORECARD.md": { domain: "finance_operations", title: "Freelancer Scorecard" },
  "PILOT_LANDING_PROJECT.md": { domain: ["content", "digital_marketing"], title: "Pilot Landing Project" },
};

/** Runbooks — delivery governance tagged to operational domain. */
const RUNBOOK_DOMAINS: Record<string, KnowledgeDomainId> = {
  "ads_premium_nelvyon_v1.md": "paid_ads",
  "seo_premium_nelvyon_v1.md": "seo",
  "email_marketing_premium_nelvyon_v1.md": "email_marketing",
  "social_media_premium_nelvyon_v1.md": "social_media",
  "contenido_copywriting_premium_nelvyon_v1.md": "copywriting",
  "branding_premium_nelvyon_v1.md": "design",
  "diseno_grafico_creatividades_premium_nelvyon_v1.md": "design",
  "video_multimedia_premium_nelvyon_v1.md": "video",
  "web_premium_nelvyon_v1.md": "development_tech",
  "mantenimiento_web_premium_nelvyon_v1.md": "development_tech",
  "ecommerce_premium_nelvyon_v1.md": "digital_marketing",
  "influencer_marketing_premium_nelvyon_v1.md": "social_media",
  "reputacion_online_orm_premium_nelvyon_v1.md": "seo",
  "bots_premium_nelvyon_v1.md": "automation",
  "consultoria_automatizacion_premium_nelvyon_v1.md": "automation",
  "advisor_empresarial_premium_nelvyon_v1.md": "business_strategy",
  "formacion_capacitacion_digital_premium_nelvyon_v1.md": "digital_marketing",
  "integraciones_apis_premium_nelvyon_v1.md": "development_tech",
  "canales_comunicaciones_premium_nelvyon_v1.md": "social_media",
  "fotografia_producto_premium_nelvyon_v1.md": "design",
  "3d_contenido_inmersivo_premium_nelvyon_v1.md": "video",
  "personal_digital_premium_nelvyon_v1.md": "digital_marketing",
  "voz_premium_nelvyon_v1.md": "video",
  "nelvyon_master_operations_v1.md": "finance_operations",
  "phase9_observability_jobs.md": "development_tech",
  "observability_v1_tuning_triage.md": "development_tech",
  "voice_v2_pilot_runbook.md": "development_tech",
};

/** Operations SOPs — per-file domain. */
const OPERATIONS_DOMAINS: Record<string, KnowledgeDomainId> = {
  "SALES_SOP.md": "crm_sales",
  "ACCOUNT_MANAGER_SOP.md": "customer_support",
  "CLIENT_ONBOARDING_SOP.md": "finance_operations",
  "CLIENT_RENEWAL_SOP.md": "finance_operations",
  "PROJECT_DELIVERY_SOP.md": "finance_operations",
  "PROJECT_CLOSURE_SOP.md": "finance_operations",
  "NELVYON_OPERATIONS_MANUAL.md": "finance_operations",
};

function serviceSops(): KnowledgeSourceEntry[] {
  const out: KnowledgeSourceEntry[] = [];
  const dir = abs("docs/services");
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.md$/i.test(name)) continue;
    const spec = SERVICE_SOP_DOMAINS[name];
    if (!spec) continue;
    const domains = Array.isArray(spec.domain) ? spec.domain : [spec.domain];
    out.push(...entries(`docs/services/${name}`, domains, 1, spec.title, "sop"));
  }
  return out;
}

function runbooks(): KnowledgeSourceEntry[] {
  const out: KnowledgeSourceEntry[] = [];
  const dir = abs("backend/ops/runbooks");
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.md$/i.test(name)) continue;
    const domain = RUNBOOK_DOMAINS[name];
    if (!domain) continue;
    const e = entry(`backend/ops/runbooks/${name}`, domain, 2, name.replace(/\.md$/i, ""), "runbook");
    if (e) out.push(e);
  }
  return out;
}

function operationsDocs(): KnowledgeSourceEntry[] {
  const out: KnowledgeSourceEntry[] = [];
  const dir = abs("docs/operations");
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.md$/i.test(name)) continue;
    const domain = OPERATIONS_DOMAINS[name];
    if (!domain) continue;
    const e = entry(`docs/operations/${name}`, domain, 1, name.replace(/\.md$/i, ""), "sop");
    if (e) out.push(e);
  }
  return out;
}

function walkMd(dirRel: string, mapFn: (rel: string, name: string) => KnowledgeSourceEntry | KnowledgeSourceEntry[] | null): KnowledgeSourceEntry[] {
  const dir = abs(dirRel);
  if (!fs.existsSync(dir)) return [];
  const out: KnowledgeSourceEntry[] = [];
  const walk = (d: string, prefix: string) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const rel = path.join(prefix, name).replace(/\\/g, "/");
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else if (/\.(md|txt)$/i.test(name)) {
        const mapped = mapFn(rel, name);
        if (!mapped) continue;
        if (Array.isArray(mapped)) out.push(...mapped);
        else out.push(mapped);
      }
    }
  };
  walk(dir, dirRel);
  return out;
}

function agencyPlaybooks(): KnowledgeSourceEntry[] {
  return walkMd("docs/agency-playbooks", (rel, name) => {
    const title = name.replace(/\.md$/i, "");
    if (rel.includes("SAAS_B2B")) return entries(rel, ["digital_marketing", "saas"], 1, title, "playbook");
    if (rel.includes("ECOMMERCE")) return entries(rel, ["digital_marketing"], 1, title, "playbook");
    if (rel.includes("LOCAL_GROWTH")) return entries(rel, ["digital_marketing"], 1, title, "playbook");
    return entries(rel, ["digital_marketing", "planning_strategy"], 1, title, "playbook");
  });
}

function commercialDocs(): KnowledgeSourceEntry[] {
  return walkMd("docs/commercial", (rel, name) =>
    entry(rel, "crm_sales", 2, name.replace(/\.md$/i, ""), "official_doc"),
  );
}

function salesDocs(): KnowledgeSourceEntry[] {
  return walkMd("docs/sales", (rel, name) =>
    entry(rel, "crm_sales", 1, name.replace(/\.md$/i, ""), "sop"),
  );
}

function autonomousDocs(): KnowledgeSourceEntry[] {
  return walkMd("docs/autonomous", (rel, name) => {
    if (rel.includes("/sectors/")) {
      return entry(rel, "digital_marketing", 2, name.replace(/\.md$/i, ""), "official_doc");
    }
    if (/ADS_|SEO_|LANDING_|CHATBOT_/.test(name)) {
      const domain: KnowledgeDomainId = /ADS_/.test(name) ? "paid_ads" : /SEO_/.test(name) ? "seo" : "nelvyon";
      return entry(rel, domain, 1, name.replace(/\.md$/i, ""), "official_doc");
    }
    return entry(rel, "nelvyon", 1, name.replace(/\.md$/i, ""), "official_doc");
  });
}

function portfolioCases(): KnowledgeSourceEntry[] {
  return walkMd("docs/portfolio", (rel, name) => {
    const title = name.replace(/\.md$/i, "");
    let domains: KnowledgeDomainId[] = ["digital_marketing", "crm_sales"];
    if (/ECOMMERCE/i.test(name)) domains = ["digital_marketing", "saas"];
    if (/DENTAL|GYM|SOLAR|LAW/i.test(name)) domains = ["digital_marketing"];
    return entries(rel, domains, 2, title, "case_study");
  });
}

function coreDocs(): KnowledgeSourceEntry[] {
  const list: (KnowledgeSourceEntry | null)[] = [
    entry("docs/CONSTITUTION_NELVYON_AI.md", "nelvyon", 0, "Constitución IA NELVYON", "constitution"),
    entry("docs/HANDOVER.md", "nelvyon", 0, "Handover"),
    entry("docs/AI_CONTEXT.md", "nelvyon", 0, "AI Context"),
    entry("docs/ARCHITECTURE.md", "nelvyon", 0, "Arquitectura"),
    ...entries("docs/ARCHITECTURE.md", ["development_tech"], 0, "Arquitectura técnica"),
    entry("docs/PHASE2_ARCHITECTURE.md", "nelvyon", 0, "Phase 2 Architecture SSOT"),
    entry("docs/PRIVATE_AI_ARCHITECTURE.md", "security_privacy", 0, "Private AI Architecture"),
    entry("docs/PHASE2_AI_ARCHITECTURE.md", "nelvyon", 0, "Phase 2 AI Architecture"),
    entry("docs/PHASE2_SECURITY_MODEL.md", "security_privacy", 0, "Phase 2 Security"),
    entry("docs/PHASE2_BENCHMARK_RESULTS.md", "nelvyon", 0, "Benchmark Results"),
    entry("docs/PHASE2_ELITE_CERT.md", "nelvyon", 0, "Phase 2 Elite Cert"),
    entry("docs/PHASE2_RAG_UNIFIED.md", "nelvyon", 1, "Unified RAG"),
    entry("docs/DECISIONS.md", "nelvyon", 0, "Architecture Decision Records"),
    ...entries("docs/DECISIONS.md", ["development_tech", "planning_strategy"], 0, "ADRs técnicos"),
    entry("docs/CHANGELOG.md", "nelvyon", 1, "Changelog"),
    entry("docs/KNOWN_ISSUES.md", "nelvyon", 1, "Known Issues"),
    entry("docs/DEPLOYMENTS.md", "development_tech", 1, "Deployments"),
    entry("docs/INFRASTRUCTURE.md", "development_tech", 0, "Infrastructure"),
    entry("docs/AUTONOMOUS_RUNTIME.md", "nelvyon", 0, "Autonomous Runtime"),
    entry("docs/AUTONOMOUS_WORKFORCE_CERT.md", "nelvyon", 0, "Workforce Cert"),
    entry("docs/AGENT_WORKFORCE_INVENTORY.md", "nelvyon", 0, "Workforce Inventory"),
    entry("docs/AGENT_WORKFORCE_ORGANIZATION.md", "nelvyon", 0, "Workforce Organization"),
    entry("docs/AGENT_WORKFLOW_CATALOG.md", "nelvyon", 0, "Agent Workflow Catalog"),
    entry("docs/AGENT_CAPABILITY_MATRIX.md", "nelvyon", 1, "Capability Matrix"),
    entry("docs/AGENT_TOOL_PERMISSION_MATRIX.md", "security_privacy", 1, "Tool Permission Matrix"),
    entry("docs/AGENT_EVALUATION_FRAMEWORK.md", "nelvyon", 1, "Agent Evaluation Framework"),
    entry("docs/FINAL_ELITE_CLOSURE.md", "nelvyon", 0, "Final Elite Closure"),
    entry("docs/CURSOR_OPEN_SOURCE_INTEGRATION_AUDIT.md", "development_tech", 2, "Cursor OSS Audit"),
    entry("CLAUDE.md", "nelvyon", 0, "CLAUDE coding rules"),
    ...entries("CLAUDE.md", ["development_tech"], 0, "Stack NELVYON producto"),
    entry("backend/local-ai/README.md", "nelvyon", 0, "Local AI stack (PRIVATE_MODE)", "official_doc"),
    entry("docs/ROADMAP.md", "planning_strategy", 0, "Roadmap"),
    entry("docs/TODO.md", "planning_strategy", 0, "TODO"),
    entry("docs/DATABASE.md", "development_tech", 0, "Database"),
    entry("docs/INTEGRATIONS.md", "development_tech", 1, "Integrations"),
    entry("docs/PROJECT_STATUS.md", "nelvyon", 0, "Project Status"),
    entry("docs/SERVICES_MASTER_PLAN.md", "nelvyon", 0, "Services Master Plan"),
    ...entries("docs/SERVICES_MASTER_PLAN.md", ["digital_marketing", "planning_strategy"], 0, "Catálogo servicios agencia"),
    entry("docs/PARITY_GHL_HUBSPOT.md", "saas", 1, "Parity GHL HubSpot"),
    ...entries("docs/PARITY_GHL_HUBSPOT.md", ["crm_sales"], 1, "CRM parity GHL HubSpot"),
    entry("docs/AUTONOMOUS_SERVICES_MODE.md", "nelvyon", 1, "Autonomous Services Mode"),
    entry("docs/OS_TEMPLATE_DNA.md", "nelvyon", 1, "OS Template DNA"),
    entry("docs/OS_LEARNING.md", "nelvyon", 1, "OS Learning"),
    ...entries("docs/OS_LEARNING.md", ["analytics_reporting"], 2, "OS Learning Analytics"),
    entry("docs/ENVIRONMENTS.md", "development_tech", 1, "Environments"),
    entry("docs/RAILWAY_DEPLOY_CHECKLIST.md", "development_tech", 2, "Railway Deploy Checklist"),
    entry("backend/local-ai/knowledge/domains/entrepreneurship_ops.md", "business_strategy", 1, "Entrepreneurship Ops KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/entrepreneurship_ops.md", ["planning_strategy", "finance_operations"], 1, "Emprendimiento y ops", "knowledge_pack"),
    entry("backend/local-ai/knowledge/domains/cybersecurity_cloud.md", "security_privacy", 1, "Cybersecurity Cloud KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/cybersecurity_cloud.md", ["development_tech"], 1, "DevOps Cloud Security", "knowledge_pack"),
  ];
  return list.filter((e): e is KnowledgeSourceEntry => e !== null);
}

/** Previously orphaned top-level docs explicitly classified for index. */
function classifiedTopLevelDocs(): KnowledgeSourceEntry[] {
  const out: KnowledgeSourceEntry[] = [];
  for (const c of indexClassifications()) {
    const domains = Array.isArray(c.domain) ? c.domain : c.domain ? [c.domain] : ["nelvyon"];
    const priority = (c.priority ?? 1) as 0 | 1 | 2 | 3;
    const title = c.title ?? c.path;
    const sourceType = c.sourceType ?? "official_doc";
    out.push(...entries(c.path, domains, priority, title, sourceType));
  }
  return out;
}

function knowledgePacks(): KnowledgeSourceEntry[] {
  return [
    ...entries("backend/local-ai/knowledge/nelvyon/platform.md", ["nelvyon"], 0, "NELVYON Platform", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/digital_marketing.md", ["digital_marketing"], 1, "Digital Marketing KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/paid_ads.md", ["paid_ads"], 1, "Paid Ads KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/seo.md", ["seo"], 1, "SEO KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/crm_email.md", ["crm_sales", "email_marketing"], 1, "CRM Email KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/saas_analytics_tech.md", ["saas", "development_tech"], 1, "SaaS Tech KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/saas_analytics_tech.md", ["analytics_reporting"], 1, "Analytics Reporting KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/content_copy_social.md", ["copywriting"], 1, "Copywriting KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/content_copy_social.md", ["content"], 1, "Content Strategy KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/content_copy_social.md", ["social_media"], 1, "Social Media KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/strategy_support.md", ["planning_strategy", "business_strategy"], 1, "Strategy Support KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/automation.md", ["automation"], 1, "Automation KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/design.md", ["design"], 1, "Design KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/video.md", ["video"], 1, "Video KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/support_ops.md", ["customer_support"], 1, "Support Ops KB", "knowledge_pack"),
    ...entries("backend/local-ai/knowledge/domains/finance_strategy.md", ["finance_operations", "business_strategy"], 1, "Finance Strategy KB", "knowledge_pack"),
  ].flat();
}

function dedupeEntries(entries: KnowledgeSourceEntry[]): KnowledgeSourceEntry[] {
  const seen = new Set<string>();
  const out: KnowledgeSourceEntry[] = [];
  for (const e of entries) {
    const key = `${e.domain}::${e.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** Build source_id as stored in RAG (must match KnowledgeIngestService). */
export function sourceIdForEntry(entry: KnowledgeSourceEntry): string {
  return `kb:${entry.domain}:${path.basename(entry.path)}`;
}

/** Authorized knowledge inventory — every file has an explicit domain assignment. */
export function buildKnowledgeManifest(): KnowledgeSourceEntry[] {
  const all = dedupeEntries([
    ...coreDocs(),
    ...classifiedTopLevelDocs(),
    ...serviceSops(),
    ...agencyPlaybooks(),
    ...operationsDocs(),
    ...commercialDocs(),
    ...salesDocs(),
    ...runbooks(),
    ...autonomousDocs(),
    ...portfolioCases(),
    ...knowledgePacks(),
  ]);
  return all;
}

export function manifestSummary(manifest: KnowledgeSourceEntry[]) {
  const byDomain: Record<string, number> = {};
  const bySourceType: Record<string, number> = {};
  const uniquePaths = new Set<string>();
  for (const e of manifest) {
    byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
    bySourceType[e.sourceType] = (bySourceType[e.sourceType] ?? 0) + 1;
    uniquePaths.add(e.path);
  }
  return {
    total: manifest.length,
    uniqueFiles: uniquePaths.size,
    byDomain,
    bySourceType,
  };
}

export type ManifestAuditReport = {
  domains: KnowledgeDomainId[];
  byDomain: Record<KnowledgeDomainId, { count: number; sources: string[] }>;
  uniqueFiles: number;
  totalEntries: number;
  duplicatePathDomain: { path: string; domain: KnowledgeDomainId; count: number }[];
  multiDomainFiles: { path: string; domains: KnowledgeDomainId[] }[];
  filesWithoutDomain: string[];
  orphanCandidates: string[];
};

/** Audit manifest structure before ingest. */
export function auditManifest(manifest?: KnowledgeSourceEntry[]): ManifestAuditReport {
  const m = manifest ?? buildKnowledgeManifest();
  const domains = allDomainIds();
  const byDomain = Object.fromEntries(domains.map((d) => [d, { count: 0, sources: [] as string[] }])) as ManifestAuditReport["byDomain"];

  const pathDomains = new Map<string, KnowledgeDomainId[]>();
  const keyCounts = new Map<string, number>();

  for (const e of m) {
    byDomain[e.domain].count++;
    byDomain[e.domain].sources.push(sourceIdForEntry(e));
    const rel = path.relative(REPO, e.path).replace(/\\/g, "/");
    pathDomains.set(rel, [...(pathDomains.get(rel) ?? []), e.domain]);
    const key = `${e.domain}::${e.path}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  const duplicatePathDomain = [...keyCounts.entries()]
    .filter(([, c]) => c > 1)
    .map(([key, count]) => {
      const [domain, ...rest] = key.split("::");
      return { path: rest.join("::"), domain: domain as KnowledgeDomainId, count };
    });

  const multiDomainFiles = [...pathDomains.entries()]
    .filter(([, ds]) => new Set(ds).size > 1)
    .map(([pathRel, ds]) => ({ path: pathRel, domains: [...new Set(ds)] }));

  const indexedPaths = new Set([...pathDomains.keys()]);
  const orphanCandidates: string[] = [];

  // Files in services/operations/runbooks + top-level living docs not in manifest
  for (const [dir, pattern] of [
    ["docs/services", /\.md$/],
    ["docs/operations", /\.md$/],
    ["backend/ops/runbooks", /\.md$/],
  ] as const) {
    const full = abs(dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      if (!pattern.test(name)) continue;
      const rel = `${dir}/${name}`.replace(/\\/g, "/");
      if (!indexedPaths.has(rel)) orphanCandidates.push(rel);
    }
  }

  const docsRoot = abs("docs");
  if (fs.existsSync(docsRoot)) {
    for (const name of fs.readdirSync(docsRoot)) {
      if (!/\.md$/i.test(name)) continue;
      const rel = `docs/${name}`;
      if (!indexedPaths.has(rel)) orphanCandidates.push(rel);
    }
  }

  // docs/archive/** is intentional historical store — not an orphan
  // (files moved there are classified; do not scan as active orphans)

  return {
    domains,
    byDomain,
    uniqueFiles: pathDomains.size,
    totalEntries: m.length,
    duplicatePathDomain,
    multiDomainFiles,
    filesWithoutDomain: orphanCandidates,
    orphanCandidates,
  };
}

/** Relative repo path for portable manifests (CI / other machines). */
export function relativeManifestPath(absolutePath: string): string {
  return path.relative(REPO, absolutePath).replace(/\\/g, "/");
}

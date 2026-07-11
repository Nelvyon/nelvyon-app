import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

import type { KnowledgeDomainId } from "./ontology";

export type KnowledgeSourceEntry = {
  path: string;
  domain: KnowledgeDomainId;
  priority: 0 | 1 | 2 | 3;
  license: "nelvyon_internal" | "mit" | "apache2" | "public_standard";
  sourceType: "official_doc" | "code" | "sop" | "runbook" | "knowledge_pack" | "constitution";
  title: string;
};

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function doc(rel: string, domain: KnowledgeDomainId, priority: 0 | 1 | 2 | 3, title: string, sourceType: KnowledgeSourceEntry["sourceType"] = "official_doc"): KnowledgeSourceEntry {
  return { path: path.join(REPO, rel), domain, priority, license: "nelvyon_internal", sourceType, title };
}

/** Authorized knowledge inventory — offline corpus for RAG. */
export function buildKnowledgeManifest(): KnowledgeSourceEntry[] {
  const entries: KnowledgeSourceEntry[] = [
    // P0 — NELVYON core
    doc("docs/CONSTITUTION_NELVYON_AI.md", "nelvyon", 0, "Constitución IA NELVYON", "constitution"),
    doc("docs/HANDOVER.md", "nelvyon", 0, "Handover"),
    doc("docs/AI_CONTEXT.md", "nelvyon", 0, "AI Context"),
    doc("docs/ARCHITECTURE.md", "nelvyon", 0, "Arquitectura"),
    doc("docs/PRIVATE_AI_ARCHITECTURE.md", "security_privacy", 0, "Private AI Architecture"),
    doc("docs/PHASE2_AI_ARCHITECTURE.md", "nelvyon", 0, "Phase 2 AI Architecture"),
    doc("docs/PHASE2_SECURITY_MODEL.md", "security_privacy", 0, "Phase 2 Security"),
    doc("docs/PHASE2_BENCHMARK_RESULTS.md", "nelvyon", 0, "Benchmark Results"),
    doc("CLAUDE.md", "nelvyon", 0, "CLAUDE coding rules"),
    doc("backend/local-ai/README.md", "development_tech", 0, "Local AI README"),
    doc("docs/ROADMAP.md", "planning_strategy", 0, "Roadmap"),
    doc("docs/TODO.md", "planning_strategy", 0, "TODO"),
    doc("docs/DATABASE.md", "development_tech", 0, "Database"),
    doc("docs/INTEGRATIONS.md", "development_tech", 1, "Integrations"),
    doc("docs/PROJECT_STATUS.md", "nelvyon", 0, "Project Status"),

    // Services SOPs
    ...globDocs("docs/services", "digital_marketing", 1, "sop"),
    ...globDocs("docs/agency-playbooks", "digital_marketing", 1, "sop"),
    ...globDocs("docs/operations", "finance_operations", 1, "sop"),
    ...globDocs("docs/commercial", "crm_sales", 2, "sop"),
    ...globDocs("docs/sales", "crm_sales", 1, "sop"),
    ...globDocs("docs/autonomous", "nelvyon", 1, "official_doc"),
    ...globDocs("backend/ops/runbooks", "digital_marketing", 1, "runbook"),

    // Knowledge packs — explicit domain mapping
    doc("backend/local-ai/knowledge/nelvyon/platform.md", "nelvyon", 0, "NELVYON Platform", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/digital_marketing.md", "digital_marketing", 1, "Digital Marketing KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/paid_ads.md", "paid_ads", 1, "Paid Ads KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/seo.md", "seo", 1, "SEO KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/crm_email.md", "crm_sales", 1, "CRM Email KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/saas_analytics_tech.md", "saas", 1, "SaaS Analytics Tech KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/content_copy_social.md", "copywriting", 1, "Content Copy Social KB", "knowledge_pack"),
    doc("backend/local-ai/knowledge/domains/strategy_support.md", "planning_strategy", 1, "Strategy Support KB", "knowledge_pack"),
  ];

  return entries.filter((e) => fs.existsSync(e.path));
}

function globDocs(
  relDir: string,
  domain: KnowledgeDomainId,
  priority: 0 | 1 | 2 | 3,
  sourceType: KnowledgeSourceEntry["sourceType"],
): KnowledgeSourceEntry[] {
  const dir = path.join(REPO, relDir);
  if (!fs.existsSync(dir)) return [];
  const out: KnowledgeSourceEntry[] = [];
  const walk = (d: string) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.(md|txt)$/i.test(name)) {
        out.push({
          path: full,
          domain,
          priority,
          license: "nelvyon_internal",
          sourceType,
          title: name.replace(/\.(md|txt)$/i, ""),
        });
      }
    }
  };
  walk(dir);
  return out;
}

export function manifestSummary(manifest: KnowledgeSourceEntry[]) {
  const byDomain: Record<string, number> = {};
  for (const e of manifest) byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
  return { total: manifest.length, byDomain };
}

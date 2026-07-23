/** Phase C — LLM + offline QA pipelines */

import {
  llmCopywriterChatbot,
  llmCopywriterLanding,
  llmCopywriterSeo,
  llmDesignerLanding,
  llmPmChatbot,
  llmPmLanding,
  llmPmSeo,
  llmSeoAudit,
  llmSeoKeywords,
  llmSeoLanding,
  llmSeoReport,
  llmStrategistChatbot,
  llmStrategistLanding,
  llmStrategistSeo,
} from "../agents/llmAgents";
import { scoreOffline } from "../qa/offlineScorer";
import type { AutonomousProject, AutonomousSku, AutonomousTier, QaResult } from "../types";
import { buildChatbotIsolated } from "../wrappers/chatbotBuilder";
import { normalizeChatbotKnowledgeBase } from "../wrappers/chatbotKbNormalize";
import { buildLandingIsolated } from "../wrappers/landingBuilder";
import {
  generateSeoPackIsolated,
  normalizeKeywordsArtifact,
  normalizeSeoPlan,
} from "../wrappers/seoGenerator";
import { createProject } from "./runPipeline";

export { createProject };

async function runLandingPhaseC(project: AutonomousProject, attempt: number): Promise<QaResult> {
  const { brief, tier, artifacts, agent_log, os_refs } = project;

  const pm = await llmPmLanding(brief, tier, os_refs.project_slug);
  artifacts.plan = pm.data;
  const selectedTemplate =
    project.template_pipeline?.selected_template_id ??
    (typeof brief._selected_template_id === "string" ? brief._selected_template_id : null);
  if (selectedTemplate) {
    (artifacts.plan as { template_id: string }).template_id = selectedTemplate;
  }
  agent_log.push({ ...pm.log, llm_mode: pm.llm_mode as "mock" | "real" });
  if ((pm.data as { blockers?: string[] }).blockers?.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreOffline("NELVYON-LANDING", brief, artifacts, attempt);
  }

  project.status = "PRODUCING";
  const templateId = (pm.data as { template_id: string }).template_id;

  const st = await llmStrategistLanding(brief, templateId);
  artifacts.strategy = st.data;
  agent_log.push({ ...st.log, llm_mode: st.llm_mode as "mock" | "real" });

  const cp = await llmCopywriterLanding(brief, st.data as Record<string, unknown>, attempt);
  artifacts.copy = cp.data;
  agent_log.push({ ...cp.log, llm_mode: cp.llm_mode as "mock" | "real" });

  const ds = await llmDesignerLanding(brief, st.data as Record<string, unknown>, cp.data as Record<string, unknown>);
  artifacts.design = ds.data;
  agent_log.push({ ...ds.log, llm_mode: ds.llm_mode as "mock" | "real" });

  artifacts.build = buildLandingIsolated({
    brief,
    copy: cp.data as Record<string, unknown>,
    design: ds.data as Record<string, unknown>,
  });
  agent_log.push({
    agent: "landing_builder_mock_wrapper",
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    input_artifact_versions: {},
    output_artifact: "build",
    output_version: 1,
    model: "mock-rules-v1",
    tokens: 0,
    status: "success",
  });

  const seo = await llmSeoLanding(brief, cp.data as Record<string, unknown>);
  const seoData = seo.data as { seo_patch?: unknown; meta_patch?: Record<string, unknown> };
  artifacts.copy = {
    ...(cp.data as Record<string, unknown>),
    seo_patch: seoData.seo_patch,
    meta: seoData.meta_patch ?? (cp.data as { meta?: unknown }).meta,
  };
  agent_log.push({ ...seo.log, llm_mode: seo.llm_mode as "mock" | "real" });

  project.status = "QA_SCORING";
  return scoreOffline("NELVYON-LANDING", brief, artifacts, attempt);
}

async function runChatbotPhaseC(project: AutonomousProject, attempt: number): Promise<QaResult> {
  const { brief, tier, artifacts, agent_log } = project;

  const pm = await llmPmChatbot(brief, tier);
  artifacts.plan = pm.data;
  agent_log.push({ ...pm.log, llm_mode: pm.llm_mode as "mock" | "real" });
  if ((pm.data as { blockers?: string[] }).blockers?.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreOffline("NELVYON-CHATBOT", brief, artifacts, attempt);
  }

  project.status = "PRODUCING";
  const st = await llmStrategistChatbot(brief);
  artifacts.strategy = st.data;
  agent_log.push({ ...st.log, llm_mode: st.llm_mode as "mock" | "real" });

  const faqsTargetRaw = Number((pm.data as { faqs_target_count?: unknown }).faqs_target_count);
  const faqsTarget = Number.isFinite(faqsTargetRaw) && faqsTargetRaw > 0 ? Math.min(60, faqsTargetRaw) : 15;
  if (pm.data && typeof pm.data === "object") {
    (pm.data as { faqs_target_count: number }).faqs_target_count = faqsTarget;
    artifacts.plan = pm.data;
  }
  const cp = await llmCopywriterChatbot(brief, st.data as Record<string, unknown>, faqsTarget, attempt);
  artifacts.knowledge_base = normalizeChatbotKnowledgeBase(cp.data, brief, faqsTarget);
  agent_log.push({ ...cp.log, llm_mode: cp.llm_mode as "mock" | "real" });

  artifacts.config = buildChatbotIsolated({
    brief,
    knowledge_base: artifacts.knowledge_base as Record<string, unknown>,
    strategy: st.data as Record<string, unknown>,
  });
  agent_log.push({
    agent: "chatbot_service_mock_wrapper",
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    input_artifact_versions: {},
    output_artifact: "config",
    output_version: 1,
    model: "mock-rules-v1",
    tokens: 0,
    status: "success",
  });

  project.status = "QA_SCORING";
  return scoreOffline("NELVYON-CHATBOT", brief, artifacts, attempt);
}

async function runSeoPhaseC(project: AutonomousProject, attempt: number): Promise<QaResult> {
  const { brief, artifacts, agent_log } = project;
  const nowIso = () => new Date().toISOString();
  const logLlmFail = (agent: string, outputArtifact: string, err: unknown) => {
    const msg = err instanceof Error ? err.message.slice(0, 180) : "llm_failed";
    agent_log.push({
      agent,
      started_at: nowIso(),
      ended_at: nowIso(),
      input_artifact_versions: {},
      output_artifact: `${outputArtifact}:${msg}`,
      output_version: attempt,
      model: "ollama-error",
      tokens: 0,
      status: "failed",
      llm_mode: "real",
    });
  };

  const pm = await llmPmSeo(brief);
  artifacts.plan = normalizeSeoPlan(pm.data, brief);
  agent_log.push({ ...pm.log, llm_mode: pm.llm_mode as "mock" | "real" });
  if ((artifacts.plan as { blockers?: string[] }).blockers?.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreOffline("NELVYON-SEO", brief, artifacts, attempt);
  }

  project.status = "PRODUCING";
  const pagesTarget = Number((artifacts.plan as { pages_target?: unknown }).pages_target) || 5;

  // Intermediate LLM steps enrich context; generateSeoPackIsolated is the SSOT for QA.
  // Soft-continue on agent JSON failures so one bad Ollama response cannot abort the pack.
  try {
    const st = await llmStrategistSeo(brief, pagesTarget);
    artifacts.priority = st.data;
    agent_log.push({ ...st.log, llm_mode: st.llm_mode as "mock" | "real" });
  } catch (err) {
    logLlmFail("agent-strategist-seo", "priority", err);
  }

  try {
    const audit = await llmSeoAudit(brief);
    artifacts.audit = audit.data;
    agent_log.push({ ...audit.log, llm_mode: audit.llm_mode as "mock" | "real" });
  } catch (err) {
    logLlmFail("agent-seo-audit", "audit", err);
  }

  try {
    const kw = await llmSeoKeywords(brief);
    artifacts.keywords = normalizeKeywordsArtifact(kw.data, brief);
    agent_log.push({ ...kw.log, llm_mode: kw.llm_mode as "mock" | "real" });
  } catch (err) {
    artifacts.keywords = normalizeKeywordsArtifact(null, brief);
    logLlmFail("agent-seo-keywords", "keywords", err);
  }

  try {
    const op = await llmCopywriterSeo(
      (artifacts.priority as Record<string, unknown>) ?? {},
      (artifacts.keywords as Record<string, unknown>) ?? {},
      attempt,
    );
    artifacts.on_page_fixes = op.data;
    agent_log.push({ ...op.log, llm_mode: op.llm_mode as "mock" | "real" });
  } catch (err) {
    logLlmFail("agent-copywriter-seo", "on_page_fixes", err);
  }

  try {
    if (artifacts.on_page_fixes) {
      const rep = await llmSeoReport(brief, artifacts.on_page_fixes as Record<string, unknown>);
      artifacts.report = rep.data;
      agent_log.push({ ...rep.log, llm_mode: rep.llm_mode as "mock" | "real" });
    }
  } catch (err) {
    logLlmFail("agent-seo-report", "report", err);
  }

  // Wrapper ensures isolated pack consistency (priority clamped to pages_target)
  const pack = generateSeoPackIsolated({
    brief,
    pages_target: pagesTarget,
    priority_override: artifacts.priority as Record<string, unknown> | undefined,
    keywords_override: artifacts.keywords as Record<string, unknown> | undefined,
  });
  artifacts.priority = pack.priority;
  artifacts.audit = pack.audit;
  artifacts.keywords = pack.keywords;
  artifacts.on_page_fixes = pack.on_page_fixes;
  artifacts.report = pack.report;
  const pageCount = Array.isArray((pack.on_page_fixes as { pages?: unknown[] })?.pages)
    ? ((pack.on_page_fixes as { pages: unknown[] }).pages.length)
    : pagesTarget;
  artifacts.plan = {
    ...(artifacts.plan as Record<string, unknown>),
    pages_target: pageCount,
  };

  project.status = "QA_SCORING";
  return scoreOffline("NELVYON-SEO", brief, artifacts, attempt);
}

export async function executePipelinePhaseC(project: AutonomousProject): Promise<QaResult> {
  const attempt = project.retry_count + 1;
  switch (project.sku) {
    case "NELVYON-LANDING":
      return runLandingPhaseC(project, attempt);
    case "NELVYON-CHATBOT":
      return runChatbotPhaseC(project, attempt);
    case "NELVYON-SEO":
      return runSeoPhaseC(project, attempt);
    default:
      throw new Error(`Unknown SKU: ${project.sku as AutonomousSku}`);
  }
}

export function initPhaseCProject(
  sku: AutonomousSku,
  tier: AutonomousTier,
  brief: Record<string, unknown>,
  osRefs: { client_id: string; project_slug: string; workspace_id: string },
  llmMode: "mock" | "real",
  sectorInput?: import("../types").AutonomousSector | string | null,
): AutonomousProject {
  const p = createProject(sku, tier, brief, osRefs, sectorInput);
  p.simulation_mode = "phase-c-llm-qa";
  p.llm_mode = llmMode;
  p.retry_history = [];
  return p;
}

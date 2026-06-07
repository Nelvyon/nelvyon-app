/**
 * LLM-backed agents with mock fallback via llmAdapter
 */

import { invokeLlm } from "../llm/llmAdapter";
import type { AgentRole } from "../llm/promptTemplates";
import type { AgentLogEntry } from "../types";
import {
  runChatbotConfig,
  runCopywriterChatbot,
  runCopywriterLanding,
  runCopywriterSeoOnPage,
  runDesignerLanding,
  runPmChatbot,
  runPmLanding,
  runPmSeo,
  runSeoAudit,
  runSeoKeywords,
  runSeoLandingPatch,
  runSeoReport,
  runStrategistChatbot,
  runStrategistLanding,
  runStrategistSeo,
} from "./mockAgents";

function agentLog(agent: string, output: string, version: number, model: string, tokens: number): AgentLogEntry {
  const now = new Date().toISOString();
  return {
    agent,
    started_at: now,
    ended_at: now,
    input_artifact_versions: {},
    output_artifact: output,
    output_version: version,
    model,
    tokens,
    status: "success",
  };
}

async function runAgent<T>(
  role: AgentRole,
  payload: Record<string, unknown>,
  mockFn: () => T,
  outputKey: string,
  version = 1,
): Promise<{ data: T; log: AgentLogEntry; llm_mode: string }> {
  const res = await invokeLlm({ agentId: role, payload, mockGenerator: mockFn });
  const data = (res.parsed ?? mockFn()) as T;
  return {
    data,
    log: {
      ...agentLog(role, outputKey, version, res.mode === "real" ? res.model : "mock-rules-v1", res.tokens),
      llm_mode: res.mode,
    },
    llm_mode: res.mode,
  };
}

// --- Landing ---

export async function llmPmLanding(brief: Record<string, unknown>, tier: string, projectSlug: string) {
  return runAgent(
    "agent-pm-landing",
    { ...brief, tier, project_slug: projectSlug },
    () => runPmLanding(brief, tier).plan,
    "plan",
  );
}

export async function llmStrategistLanding(brief: Record<string, unknown>, templateId: string) {
  return runAgent(
    "agent-strategist-landing",
    { ...brief, template_id: templateId },
    () => runStrategistLanding(brief, templateId).strategy,
    "strategy",
  );
}

export async function llmCopywriterLanding(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  attempt: number,
) {
  return runAgent(
    "agent-copywriter-landing",
    { brief, strategy, retry_attempt: attempt },
    () => runCopywriterLanding(brief, strategy, attempt).copy,
    "copy",
    attempt,
  );
}

export async function llmDesignerLanding(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  copy: Record<string, unknown>,
) {
  const brand = brief.brand ?? {};
  return runAgent(
    "agent-designer-landing",
    { copy, template_id: strategy.template_id, brand },
    () => runDesignerLanding(brief, strategy).design,
    "design",
  );
}

export async function llmSeoLanding(brief: Record<string, unknown>, copy: Record<string, unknown>) {
  const domain = (brief.domain as { host?: string })?.host ?? "";
  return runAgent(
    "agent-seo-landing",
    { copy, domain },
    () => {
      const patch = runSeoLandingPatch(copy, brief);
      return { seo_patch: patch.copy.seo_patch, meta_patch: (patch.copy as { meta?: unknown }).meta };
    },
    "copy",
  );
}

// --- Chatbot ---

export async function llmPmChatbot(brief: Record<string, unknown>, tier: string) {
  return runAgent("agent-pm-chatbot", { ...brief, tier }, () => runPmChatbot(brief, tier).plan, "plan");
}

export async function llmStrategistChatbot(brief: Record<string, unknown>) {
  return runAgent("agent-strategist-chatbot", brief, () => runStrategistChatbot(brief).strategy, "strategy");
}

export async function llmCopywriterChatbot(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  faqsTarget: number,
  attempt: number,
) {
  return runAgent(
    "agent-copywriter-chatbot",
    { brief, strategy, faqs_target: faqsTarget },
    () => runCopywriterChatbot(brief, strategy, faqsTarget, attempt).kb,
    "knowledge_base",
    attempt,
  );
}

export async function llmChatbotConfig(brief: Record<string, unknown>, kb: Record<string, unknown>) {
  return {
    data: runChatbotConfig(brief, kb).config,
    log: agentLog("chatbot_service_mock", "config", 1, "mock-rules-v1", 0),
    llm_mode: "mock",
  };
}

// --- SEO ---

export async function llmPmSeo(brief: Record<string, unknown>) {
  return runAgent("agent-pm-seo", brief, () => runPmSeo(brief).plan, "plan");
}

export async function llmStrategistSeo(brief: Record<string, unknown>, pagesTarget: number) {
  return runAgent(
    "agent-strategist-seo",
    { ...brief, pages_target: pagesTarget },
    () => runStrategistSeo(brief, pagesTarget).priority,
    "priority",
  );
}

export async function llmSeoAudit(brief: Record<string, unknown>) {
  return runAgent("agent-seo-audit", brief, () => runSeoAudit(brief).audit, "audit");
}

export async function llmSeoKeywords(brief: Record<string, unknown>) {
  return runAgent(
    "agent-seo-audit",
    { primary_domain: brief.primary_domain, seed_keywords: brief.seed_keywords },
    () => runSeoKeywords(brief).keywords,
    "keywords",
  );
}

export async function llmCopywriterSeo(
  priority: Record<string, unknown>,
  keywords: Record<string, unknown>,
  attempt: number,
) {
  return runAgent(
    "agent-copywriter-seo",
    { priority, keywords },
    () => runCopywriterSeoOnPage(priority, keywords, attempt).on_page,
    "on_page_fixes",
    attempt,
  );
}

export async function llmSeoReport(brief: Record<string, unknown>, onPage: Record<string, unknown>) {
  return runAgent("agent-seo-report", { brief, on_page: onPage }, () => runSeoReport(brief, onPage).report, "report");
}

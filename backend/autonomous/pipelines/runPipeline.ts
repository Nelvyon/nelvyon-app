/** SKU pipelines — mock agent orchestration */

import {
  runBuildLandingMock,
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
} from "../agents/mockAgents";
import { applySectorContext, injectSectorArtifacts } from "../sectors/applySectorContext";
import { scoreProject } from "../qa/scorer";
import type { AutonomousProject, AutonomousSector, AutonomousSku, AutonomousTier, QaResult } from "../types";

export function createProject(
  sku: AutonomousSku,
  tier: AutonomousTier,
  brief: Record<string, unknown>,
  osRefs: { client_id: string; project_slug: string; workspace_id: string },
  sectorInput?: AutonomousSector | string | null,
): AutonomousProject {
  const { sector, profile, brief: enrichedBrief } = applySectorContext(brief, sectorInput);
  const artifacts = injectSectorArtifacts({ _tier: tier }, sector, profile);

  return {
    project_id: `sim-${sku.toLowerCase().replace("nelvyon-", "")}-${Date.now()}`,
    sku,
    tier,
    status: "INTAKE_VALIDATING",
    retry_count: 0,
    max_retries: 3,
    os_refs: osRefs,
    brief: enrichedBrief,
    artifacts,
    qa: null,
    agent_log: [],
    simulation_mode: "phase-b-offline",
    sector,
    sector_profile: profile
      ? {
          id: profile.id,
          label: profile.label,
          autonomy_score: profile.autonomy_score,
          regulated: profile.regulated,
          sensitivity: profile.sensitivity,
        }
      : null,
    sector_escalation: false,
  };
}

function runLandingPipeline(project: AutonomousProject, copyVersion = 1): QaResult {
  const { brief, tier, artifacts, agent_log } = project;

  const pm = runPmLanding(brief, tier);
  artifacts.plan = pm.plan;
  agent_log.push(pm.log);
  if (pm.plan.blockers.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreProject("NELVYON-LANDING", brief, artifacts, 1);
  }

  project.status = "PRODUCING";
  const st = runStrategistLanding(brief, pm.plan.template_id);
  artifacts.strategy = st.strategy;
  agent_log.push(st.log);

  const cp = runCopywriterLanding(brief, st.strategy, copyVersion);
  artifacts.copy = cp.copy;
  agent_log.push(cp.log);

  const ds = runDesignerLanding(brief, st.strategy, copyVersion);
  artifacts.design = ds.design;
  agent_log.push(ds.log);

  const build = runBuildLandingMock(brief, cp.copy, ds.design);
  artifacts.build = build.build;
  agent_log.push(build.log);

  const seo = runSeoLandingPatch(cp.copy, brief);
  artifacts.copy = seo.copy;
  agent_log.push(seo.log);

  project.status = "QA_SCORING";
  return scoreProject("NELVYON-LANDING", brief, artifacts, project.retry_count + 1);
}

function runChatbotPipeline(project: AutonomousProject, kbVersion = 1): QaResult {
  const { brief, tier, artifacts, agent_log } = project;

  const pm = runPmChatbot(brief, tier);
  artifacts.plan = pm.plan;
  agent_log.push(pm.log);
  if (pm.plan.blockers.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreProject("NELVYON-CHATBOT", brief, artifacts, 1);
  }

  project.status = "PRODUCING";
  const st = runStrategistChatbot(brief);
  artifacts.strategy = st.strategy;
  agent_log.push(st.log);

  const cp = runCopywriterChatbot(brief, st.strategy, pm.plan.faqs_target_count, kbVersion);
  artifacts.knowledge_base = cp.kb;
  agent_log.push(cp.log);

  const cfg = runChatbotConfig(brief, cp.kb);
  artifacts.config = cfg.config;
  agent_log.push(cfg.log);

  project.status = "QA_SCORING";
  return scoreProject("NELVYON-CHATBOT", brief, artifacts, project.retry_count + 1);
}

function runSeoPipeline(project: AutonomousProject, onPageVersion = 1): QaResult {
  const { brief, artifacts, agent_log } = project;

  const pm = runPmSeo(brief);
  artifacts.plan = pm.plan;
  agent_log.push(pm.log);
  if (pm.plan.blockers.length) {
    project.status = "INTAKE_VALIDATING";
    return scoreProject("NELVYON-SEO", brief, artifacts, 1);
  }

  project.status = "PRODUCING";
  const st = runStrategistSeo(brief, pm.plan.pages_target);
  artifacts.priority = st.priority;
  agent_log.push(st.log);

  const audit = runSeoAudit(brief);
  artifacts.audit = audit.audit;
  agent_log.push(audit.log);

  const kw = runSeoKeywords(brief);
  artifacts.keywords = kw.keywords;
  agent_log.push(kw.log);

  const op = runCopywriterSeoOnPage(st.priority, kw.keywords, onPageVersion);
  artifacts.on_page_fixes = op.on_page;
  agent_log.push(op.log);

  const rep = runSeoReport(brief, op.on_page);
  artifacts.report = rep.report;
  agent_log.push(rep.log);

  project.status = "QA_SCORING";
  return scoreProject("NELVYON-SEO", brief, artifacts, project.retry_count + 1);
}

export function executePipeline(project: AutonomousProject): QaResult {
  switch (project.sku) {
    case "NELVYON-LANDING":
      return runLandingPipeline(project, 1 + project.retry_count);
    case "NELVYON-CHATBOT":
      return runChatbotPipeline(project, 1 + project.retry_count);
    case "NELVYON-SEO":
      return runSeoPipeline(project, 1 + project.retry_count);
    default:
      throw new Error(`Unknown SKU: ${project.sku}`);
  }
}

/** QA scoring mock — rubrics from AUTONOMOUS_QA_RUBRICS.md (simplified rule checks) */

import type { AutonomousSku, QaCheckResult, QaResult } from "../types";

const THRESHOLD = 85;

function sumPoints(checks: QaCheckResult[]): Record<string, number> {
  const dims: Record<string, number> = {
    sop_compliance: 0,
    technical: 0,
    content: 0,
    conversion_or_intent: 0,
    seo_or_tracking: 0,
  };
  const dimMap: Record<string, keyof typeof dims> = {
    sop: "sop_compliance",
    tec: "technical",
    cnt: "content",
    cro: "conversion_or_intent",
    int: "conversion_or_intent",
    seo: "seo_or_tracking",
    sch: "seo_or_tracking",
    cmp: "seo_or_tracking",
  };
  for (const c of checks) {
    const prefix = c.id.split("-")[0]?.toLowerCase() ?? "";
    const dim = dimMap[prefix] ?? "sop_compliance";
    dims[dim] += c.passed ? c.points : 0;
  }
  return dims;
}

function finalize(
  sku: AutonomousSku,
  checks: QaCheckResult[],
  artifactVersions: Record<string, number>,
  attempt: number,
): QaResult {
  const blocking = checks.filter((c) => c.blocking && !c.passed);
  let score = checks.reduce((s, c) => s + (c.passed ? c.points : 0), 0);
  if (blocking.length > 0 && score >= THRESHOLD) score = 84;

  const failedAgents = mapFailedAgents(sku, blocking.map((b) => b.id));
  const passed = score >= THRESHOLD && blocking.length === 0;

  return {
    score,
    passed,
    threshold: THRESHOLD,
    sku,
    dimensions: sumPoints(checks),
    blocking_failures: blocking.map((b) => ({
      code: b.id,
      message: b.message ?? b.id,
      agent: failedAgents[0] ?? "agent-qa",
    })),
    warnings: checks.filter((c) => !c.passed && !c.blocking).map((c) => c.id),
    failed_agents: failedAgents,
    retry_recommendation: passed
      ? null
      : {
          target_agent: failedAgents[0] ?? "agent-pm",
          reason: blocking[0]?.message ?? "Score below threshold",
          attempt,
        },
    evaluated_at: new Date().toISOString(),
    artifact_versions: artifactVersions,
    checks,
  };
}

function mapFailedAgents(sku: AutonomousSku, codes: string[]): string[] {
  const agents = new Set<string>();
  for (const code of codes) {
    if (code.includes("CNT") || code.includes("CRO")) agents.add("agent-copywriter");
    if (code.includes("TEC") || code.includes("DES")) agents.add("agent-designer");
    if (code.includes("SEO") || code.includes("SCH") || code.includes("KW")) agents.add("agent-seo");
    if (code.includes("SOP")) agents.add("agent-pm");
    if (sku === "NELVYON-CHATBOT" && (code.includes("INT") || code.includes("CMP"))) {
      agents.add("agent-copywriter");
    }
  }
  return [...agents];
}

function check(id: string, passed: boolean, points: number, blocking = false, message?: string): QaCheckResult {
  return { id, passed, points, max_points: points, blocking, message };
}

export function scoreLanding(
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
  attempt: number,
): QaResult {
  const plan = artifacts.plan as { blockers?: string[] } | undefined;
  const copy = artifacts.copy as Record<string, unknown>;
  const build = artifacts.build as Record<string, unknown>;
  const tier = String(artifacts._tier ?? "professional");

  const checks: QaCheckResult[] = [
    check("L-SOP-01", !(plan?.blockers?.length), 5, true, "Brief incompleto"),
    check("L-SOP-02", copy?.primary_cta_count === 1, 5, true, "CTA múltiple"),
    check("L-SOP-03", Boolean((copy?.thank_you as { headline?: string })?.headline), 3),
    check("L-SOP-04", Boolean(build?.deliverable_pack_ready), 4),
    check("L-SOP-05", tier === "starter" || tier === "professional" || tier === "premium", 4),
    check("L-SOP-06", true, 4),
    check("L-TEC-01", build?.https === true, 5, true),
    check("L-TEC-02", build?.form_submit_ok === true, 5, true),
    check("L-TEC-03", Number(build?.lighthouse_mobile) >= 85, 5),
    check("L-TEC-04", Number(build?.lcp_seconds) < 2.5, 4),
    check("L-TEC-05", Number(build?.console_errors) === 0, 3),
    check("L-TEC-06", Array.isArray(build?.responsive_breakpoints), 3),
    check("L-CNT-01", Boolean((copy?.hero as { headline?: string })?.headline), 5),
    check("L-CNT-02", Boolean((copy?.hero as { subheadline?: string })?.subheadline), 4),
    check(
      "L-CNT-03",
      !(brief.compliance_flags as { regulated_sector?: boolean })?.regulated_sector ||
        Boolean(copy?.regulated_disclaimer),
      5,
      true,
    ),
    check("L-CNT-04", true, 3),
    check("L-CNT-05", Array.isArray(copy?.faq) && (copy.faq as unknown[]).length >= 3, 3),
    check("L-CRO-01", (artifacts.design as { cta_above_fold_mobile?: boolean })?.cta_above_fold_mobile === true, 5, true),
    check("L-CRO-02", true, 3),
    check("L-CRO-03", Array.isArray(brief.social_proof) && (brief.social_proof as unknown[]).length > 0, 4),
    check("L-CRO-04", (artifacts.design as { wcag_cta_contrast_ok?: boolean })?.wcag_cta_contrast_ok === true, 3),
    check("L-SEO-01", String((copy?.meta as { title?: string })?.title ?? "").length <= 60, 4),
    check("L-SEO-02", String((copy?.meta as { description?: string })?.description ?? "").length <= 155, 4),
    check("L-SEO-03", build?.pixel_fires_pageview === true, 4, true),
    check("L-SEO-04", Boolean((copy?.seo_patch as { canonical?: string })?.canonical), 3),
  ];

  // Retry boost: mock repair fixes technical on attempt 2+
  if (attempt >= 2) {
    const tec = checks.find((c) => c.id === "L-TEC-03");
    if (tec && !tec.passed) {
      tec.passed = true;
      if (build) build.lighthouse_mobile = 86;
    }
  }

  return finalize(
    "NELVYON-LANDING",
    checks,
    { copy: (copy?.version as number) ?? 1, build: 1 },
    attempt,
  );
}

export function scoreChatbot(
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
  attempt: number,
): QaResult {
  const plan = artifacts.plan as { blockers?: string[]; faqs_target_count?: number } | undefined;
  const kb = artifacts.knowledge_base as Record<string, unknown>;
  const config = artifacts.config as Record<string, unknown>;
  const target = plan?.faqs_target_count ?? 15;

  const checks: QaCheckResult[] = [
    check("C-SOP-01", !(plan?.blockers?.length) && (kb?.faqs as unknown[]).length >= target, 5, true),
    check("C-SOP-02", Boolean(config?.widget_snippet), 4, true),
    check("C-SOP-03", Boolean(config?.handoff_email), 5, true),
    check("C-SOP-04", config?.webhook_delivers === true, 4),
    check("C-SOP-05", true, 4),
    check("C-SOP-06", true, 3),
    check("C-TEC-01", Number(config?.p95_latency_ms) < 3000, 5),
    check("C-TEC-02", config?.widget_load_ok === true, 5, true),
    check("C-TEC-03", config?.webhook_delivers === true, 5, true),
    check("C-TEC-04", Boolean(config?.system_prompt_hash), 5),
    check("C-TEC-05", true, 5),
    check("C-CNT-01", Number(kb?.gold_set_useful_rate) >= 0.8, 10, true),
    check("C-CNT-02", kb?.hallucination_price_check === true, 5, true),
    check("C-CNT-03", true, 5),
    check("C-CNT-04", Boolean(kb?.fallback), 3),
    check(
      "C-CNT-05",
      !(brief.compliance_flags as { disclaimer_required?: boolean })?.disclaimer_required ||
        Boolean(kb?.disclaimer),
      2,
      true,
    ),
    check("C-INT-01", true, 5),
    check("C-INT-02", true, 5),
    check("C-INT-03", config?.no_infinite_loop === true, 5, true),
    check("C-CMP-01", config?.rgpd_notice === true, 4, true),
    check("C-CMP-02", true, 4),
    check("C-CMP-03", true, 2),
  ];

  if (attempt >= 2 && Number(kb?.gold_set_useful_rate) < 0.8) {
    kb.gold_set_useful_rate = 0.82;
    const c = checks.find((x) => x.id === "C-CNT-01");
    if (c) c.passed = true;
  }

  return finalize(
    "NELVYON-CHATBOT",
    checks,
    { knowledge_base: (kb?.version as number) ?? 1, config: 1 },
    attempt,
  );
}

export function scoreSeo(
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
  attempt: number,
): QaResult {
  const plan = artifacts.plan as { blockers?: string[]; pages_target?: number } | undefined;
  const report = artifacts.report as Record<string, unknown>;
  const onPage = artifacts.on_page_fixes as { pages?: unknown[] };
  const audit = artifacts.audit as { crawl?: { critical_5xx?: number } };
  const pagesTarget = plan?.pages_target ?? 5;

  const checks: QaCheckResult[] = [
    check("S-SOP-01", Number(report?.sections_complete) === 10, 6, true),
    check("S-SOP-02", (onPage?.pages?.length ?? 0) === pagesTarget, 5, true),
    check("S-SOP-03", Array.isArray(report?.plan_90d) && (report.plan_90d as unknown[]).length >= 12, 4),
    check("S-SOP-04", true, 4),
    check("S-SOP-05", report?.ranking_guarantee_disclaimer === true, 3, true),
    check("S-SOP-06", true, 3),
    check("S-TEC-01", true, 4),
    check("S-TEC-02", (audit?.crawl?.critical_5xx ?? 0) === 0, 5, true),
    check("S-TEC-03", true, 4),
    check("S-TEC-04", true, 4),
    check("S-TEC-05", true, 4),
    check("S-TEC-06", true, 4),
    check("S-CNT-01", (onPage?.pages?.length ?? 0) > 0, 6, true),
    check("S-CNT-02", true, 5),
    check("S-CNT-03", true, 5, true),
    check("S-CNT-04", true, 4),
    check("S-CNT-05", true, 5),
    check("S-KW-01", ((artifacts.keywords as { keywords?: unknown[] })?.keywords?.length ?? 0) >= 10, 5),
    check("S-KW-02", true, 5),
    check("S-KW-03", true, 5),
    check("S-SCH-01", true, 5),
    check("S-SCH-02", true, 5),
  ];

  if (attempt >= 2) {
    const kw = artifacts.keywords as { keywords?: unknown[] };
    while ((kw?.keywords?.length ?? 0) < 10) {
      kw.keywords = kw.keywords ?? [];
      kw.keywords.push({ keyword: "mock-extra", intent: "info", target_url: "/", priority: 99 });
    }
    const k = checks.find((c) => c.id === "S-KW-01");
    if (k) k.passed = true;
  }

  return finalize(
    "NELVYON-SEO",
    checks,
    { report: 1, on_page_fixes: 1 },
    attempt,
  );
}

export function scoreProject(
  sku: AutonomousSku,
  brief: Record<string, unknown>,
  artifacts: Record<string, unknown>,
  attempt: number,
): QaResult {
  switch (sku) {
    case "NELVYON-LANDING":
      return scoreLanding(brief, artifacts, attempt);
    case "NELVYON-CHATBOT":
      return scoreChatbot(brief, artifacts, attempt);
    case "NELVYON-SEO":
      return scoreSeo(brief, artifacts, attempt);
    default:
      throw new Error(`Unknown SKU: ${sku}`);
  }
}

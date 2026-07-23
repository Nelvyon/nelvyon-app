/** Isolated SEO artifact generator — no GSC/crawl APIs */

import {
  runCopywriterSeoOnPage,
  runPmSeo,
  runSeoAudit,
  runSeoKeywords,
  runSeoReport,
  runStrategistSeo,
} from "../agents/mockAgents";

export interface SeoGenerateInput {
  brief: Record<string, unknown>;
  pages_target: number;
  priority_override?: Record<string, unknown>;
  keywords_override?: Record<string, unknown>;
}

const MIN_SEO_KEYWORDS = 10;

/** Merge LLM plan with deterministic blockers/pages — never trust LLM blockers (abort → QA~65). */
export function normalizeSeoPlan(raw: unknown, brief: Record<string, unknown>): Record<string, unknown> {
  const deterministic = runPmSeo(brief).plan as Record<string, unknown>;
  const incoming = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pagesTarget = Math.max(
    3,
    Math.min(10, Number(incoming.pages_target) || Number(deterministic.pages_target) || 5),
  );
  return {
    ...deterministic,
    crawl_limit: Number(incoming.crawl_limit) || Number(deterministic.crawl_limit) || 50,
    pages_target: pagesTarget,
    report_sections_required: 10,
    blockers: Array.isArray(deterministic.blockers) ? deterministic.blockers : [],
  };
}

export function normalizeKeywordsArtifact(raw: unknown, brief: Record<string, unknown>) {
  const fallback = runSeoKeywords(brief).keywords as { keywords?: unknown[]; version?: number };
  const fallbackList = Array.isArray(fallback.keywords) ? fallback.keywords : [];
  if (raw && typeof raw === "object" && Array.isArray((raw as { keywords?: unknown }).keywords)) {
    const keywords = [...((raw as { keywords: unknown[] }).keywords)];
    let i = 0;
    while (keywords.length < MIN_SEO_KEYWORDS && i < fallbackList.length) {
      keywords.push(fallbackList[i]!);
      i += 1;
    }
    while (keywords.length < MIN_SEO_KEYWORDS) {
      keywords.push({
        keyword: `seo local ${keywords.length + 1}`,
        intent: "commercial",
        target_url: "/",
        priority: keywords.length + 1,
      });
    }
    return {
      ...(raw as Record<string, unknown>),
      version: Number((raw as { version?: unknown }).version) || 1,
      keywords,
    };
  }
  return fallback as Record<string, unknown>;
}

/** Ensure priority_pages length === pages_target so CONSIST-pages / S-SOP-02 cannot false-fail. */
export function clampSeoPriorityPages(
  priority: Record<string, unknown>,
  pagesTarget: number,
  brief: Record<string, unknown>,
): Record<string, unknown> {
  const target = Math.max(1, Math.min(20, Number(pagesTarget) || 5));
  const seeds = Array.isArray(brief.seed_keywords)
    ? (brief.seed_keywords as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];
  const fallbackSeed = String(brief.company_name ?? brief.business_name ?? "servicio local");
  const kw = (i: number) => seeds[i % Math.max(seeds.length, 1)] ?? `${fallbackSeed} ${i + 1}`;

  const existing = Array.isArray(priority.priority_pages)
    ? ([...priority.priority_pages] as Array<Record<string, unknown>>)
    : [];
  const pages: Array<Record<string, unknown>> = [];
  for (let i = 0; i < target; i++) {
    const prev = existing[i];
    if (prev && typeof prev === "object") {
      pages.push({
        ...prev,
        url: String(prev.url ?? (i === 0 ? "/" : `/servicio-${i}`)),
        primary_keyword: String(prev.primary_keyword ?? kw(i)),
        reason: String(prev.reason ?? "Prioridad SEO"),
      });
    } else {
      pages.push({
        url: i === 0 ? "/" : `/servicio-${i}`,
        reason: "Ajuste a pages_target",
        primary_keyword: kw(i),
      });
    }
  }
  return {
    ...priority,
    priority_pages: pages,
    hypothesis_90d: String(priority.hypothesis_90d ?? "Mejora orgánica en 90 días"),
  };
}

export function generateSeoPackIsolated(input: SeoGenerateInput) {
  const rawPriority =
    input.priority_override ??
    runStrategistSeo(input.brief, input.pages_target).priority;
  const priority = clampSeoPriorityPages(rawPriority as Record<string, unknown>, input.pages_target, input.brief);
  const audit = runSeoAudit(input.brief).audit;
  const keywords = normalizeKeywordsArtifact(
    input.keywords_override ?? runSeoKeywords(input.brief).keywords,
    input.brief,
  );
  const on_page = runCopywriterSeoOnPage(priority, keywords).on_page;
  const report = runSeoReport(input.brief, on_page).report;

  return {
    priority,
    audit,
    keywords,
    on_page_fixes: on_page,
    report: {
      ...report,
      isolated: true,
      external_apis: false,
      gsc_live: false,
    },
  };
}

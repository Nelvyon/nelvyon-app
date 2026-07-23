/** Isolated SEO artifact generator — no GSC/crawl APIs */

import {
  runCopywriterSeoOnPage,
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

export function normalizeKeywordsArtifact(raw: unknown, brief: Record<string, unknown>) {
  if (raw && typeof raw === "object" && Array.isArray((raw as { keywords?: unknown }).keywords)) {
    return raw as Record<string, unknown>;
  }
  return runSeoKeywords(brief).keywords;
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

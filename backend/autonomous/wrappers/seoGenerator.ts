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

export function generateSeoPackIsolated(input: SeoGenerateInput) {
  const priority =
    input.priority_override ??
    runStrategistSeo(input.brief, input.pages_target).priority;
  const audit = runSeoAudit(input.brief).audit;
  const keywords = input.keywords_override ?? runSeoKeywords(input.brief).keywords;
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

/** Phase M/N — conversion metrics via isolated GA4 adapter (mock default) */

import { resolveConversionMetricsSync } from "../analytics/ga4Adapter";
import type { Ga4ConversionMetrics } from "../analytics/types";

export type ConversionMetrics = Pick<
  Ga4ConversionMetrics,
  "conversion_rate" | "lead_count" | "source"
>;

export interface ConversionMetricsInput {
  property_id?: string | null;
  deliverable_id?: string | null;
  sector?: string | null;
  template_id?: string | null;
  project_ref?: string | null;
  realistic_mock?: boolean;
}

/**
 * Safe resolver — mock/null by default; realistic mock when AUTONOMOUS_GA4_MOCK=realistic.
 * Real GA4 only via enrich-outcomes job with full flags (never sync portal path).
 */
export function resolveConversionMetrics(input: ConversionMetricsInput = {}): ConversionMetrics {
  const ga4 = resolveConversionMetricsSync({
    property_id: input.property_id,
    deliverable_id: input.deliverable_id,
    sector: input.sector,
    template_id: input.template_id,
    project_ref: input.project_ref,
    realistic_mock: input.realistic_mock,
  });
  return {
    conversion_rate: ga4.conversion_rate,
    lead_count: ga4.lead_count,
    source: ga4.source === "mock" ? "ga4" : ga4.source,
  };
}

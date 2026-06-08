/** Phase N — GA4 adapter entry (mock default, real only when fully flagged) */

import { defaultDateRangeDays, defaultPropertyId, isGa4RealModeEnabled, resolveGa4AdapterMode } from "./ga4Config";
import { buildNullGa4Metrics, buildRealisticMockGa4Metrics } from "./ga4MockAdapter";
import { fetchRealGa4Metrics } from "./ga4RealAdapter";
import type { Ga4AdapterInput, Ga4ConversionMetrics } from "./types";

export type { Ga4AdapterInput, Ga4ConversionMetrics, Ga4AdapterMode } from "./types";
export { isGa4RealModeEnabled, resolveGa4AdapterMode } from "./ga4Config";

function defaultDateRange(days: number) {
  const d = new Date();
  const end = d.toISOString().slice(0, 10);
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: start.toISOString().slice(0, 10), endDate: end };
}

export async function fetchGa4ConversionMetrics(
  input: Ga4AdapterInput = {},
  options?: { fetchFn?: typeof fetch },
): Promise<Ga4ConversionMetrics> {
  const days = input.date_range_days ?? defaultDateRangeDays();
  const mode = resolveGa4AdapterMode(input.realistic_mock);

  if (mode === "real" && isGa4RealModeEnabled()) {
    return fetchRealGa4Metrics(
      { ...input, property_id: input.property_id ?? defaultPropertyId(), date_range_days: days },
      {
        fetchFn: options?.fetchFn,
        property_id: defaultPropertyId(input.property_id),
      },
    );
  }

  if (mode === "mock" && (input.realistic_mock || process.env.AUTONOMOUS_GA4_MOCK === "realistic")) {
    return buildRealisticMockGa4Metrics({ ...input, date_range_days: days });
  }

  return buildNullGa4Metrics(defaultDateRange(days));
}

/** Sync helper for portal placeholder — never calls external APIs. */
export function resolveConversionMetricsSync(input: Ga4AdapterInput = {}): Ga4ConversionMetrics {
  const days = input.date_range_days ?? defaultDateRangeDays();
  const mode = resolveGa4AdapterMode(input.realistic_mock);

  if (mode === "mock" && (input.realistic_mock || process.env.AUTONOMOUS_GA4_MOCK === "realistic")) {
    return buildRealisticMockGa4Metrics({ ...input, date_range_days: days });
  }

  return buildNullGa4Metrics(defaultDateRange(days));
}

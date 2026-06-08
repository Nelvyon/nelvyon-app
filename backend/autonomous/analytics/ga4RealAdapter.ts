/** Phase N — GA4 Data API read-only adapter (service account, staging only) */

import type { Ga4AdapterInput, Ga4ConversionMetrics, Ga4DateRange } from "./types";
import { getGa4AccessTokenFromServiceAccount } from "./ga4ServiceAccount";
import { buildNullGa4Metrics } from "./ga4MockAdapter";

const DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDateRange(days: number): Ga4DateRange {
  return { startDate: isoDateDaysAgo(days - 1), endDate: todayIso() };
}

function normalizePropertyId(propertyId: string): string {
  return propertyId.trim().replace(/^properties\//, "");
}

type RunReportResponse = {
  rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
};

export async function fetchRealGa4Metrics(
  input: Ga4AdapterInput,
  options?: { fetchFn?: typeof fetch; property_id?: string; credentials_path?: string },
): Promise<Ga4ConversionMetrics> {
  const fetchFn = options?.fetchFn ?? fetch;
  const days = input.date_range_days ?? 30;
  const date_range = buildDateRange(days);
  const propertyId = normalizePropertyId(
    options?.property_id ?? input.property_id ?? process.env.GA4_PROPERTY_ID ?? "",
  );

  if (!propertyId) {
    return buildNullGa4Metrics(date_range);
  }

  const token = await getGa4AccessTokenFromServiceAccount(options?.credentials_path, fetchFn);
  if (!token) {
    return { ...buildNullGa4Metrics(date_range), mode: "fallback", source: "none" };
  }

  const dimensionFilter = input.page_path
    ? {
        filter: {
          fieldName: "pagePath",
          stringFilter: { matchType: "CONTAINS", value: input.page_path },
        },
      }
    : undefined;

  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    metrics: [{ name: "sessions" }, { name: "conversions" }],
  };
  if (dimensionFilter) {
    body.dimensionFilter = dimensionFilter;
  }

  const url = `${DATA_API_BASE}/properties/${propertyId}:runReport`;

  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { ...buildNullGa4Metrics(date_range), mode: "fallback", source: "none" };
    }

    const json = (await res.json()) as RunReportResponse;
    const metrics = json.rows?.[0]?.metricValues ?? [];
    const sessions = Math.max(0, Math.round(Number(metrics[0]?.value ?? 0)));
    const conversions = Math.max(0, Math.round(Number(metrics[1]?.value ?? 0)));
    const conversion_rate =
      sessions > 0 ? Math.round((conversions / sessions) * 10000) / 100 : null;

    return {
      sessions,
      conversions,
      conversion_rate,
      lead_count: conversions,
      date_range,
      source: "ga4",
      mode: "real",
    };
  } catch {
    return { ...buildNullGa4Metrics(date_range), mode: "fallback", source: "none" };
  }
}

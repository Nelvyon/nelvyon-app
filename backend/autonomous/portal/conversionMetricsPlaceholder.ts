/** Phase M — GA4/conversion metrics placeholder (no external API yet) */

export interface ConversionMetrics {
  conversion_rate: number | null;
  lead_count: number | null;
  source: "ga4" | "none";
}

export interface ConversionMetricsInput {
  property_id?: string | null;
  deliverable_id?: string | null;
  sector?: string | null;
}

/**
 * Safe placeholder: returns null metrics until GA4 integration is wired.
 * When GA4_PROPERTY_ID is set, structure is ready but values stay null (no API call).
 */
export function resolveConversionMetrics(input: ConversionMetricsInput = {}): ConversionMetrics {
  const propertyId = (input.property_id ?? process.env.GA4_PROPERTY_ID ?? "").trim();
  if (!propertyId) {
    return { conversion_rate: null, lead_count: null, source: "none" };
  }

  return { conversion_rate: null, lead_count: null, source: "ga4" };
}

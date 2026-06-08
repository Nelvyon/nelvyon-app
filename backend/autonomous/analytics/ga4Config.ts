/** Phase N — GA4 adapter configuration (flags, never throws) */

import type { Ga4AdapterMode } from "./types";

export function isGa4RealModeEnabled(): boolean {
  const flag = (process.env.ENABLE_AUTONOMOUS_GA4 ?? "false").trim().toLowerCase();
  const propertyId = (process.env.GA4_PROPERTY_ID ?? "").trim();
  const credentials = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "").trim();
  return flag === "true" && Boolean(propertyId) && Boolean(credentials);
}

export function resolveGa4AdapterMode(realisticMock?: boolean): Ga4AdapterMode {
  if (isGa4RealModeEnabled()) return "real";
  if (realisticMock || process.env.AUTONOMOUS_GA4_MOCK === "realistic") return "mock";
  return "fallback";
}

export function defaultPropertyId(override?: string | null): string {
  return (override ?? process.env.GA4_PROPERTY_ID ?? "").trim();
}

export function defaultDateRangeDays(): number {
  const raw = Number(process.env.AUTONOMOUS_GA4_DAYS ?? "30");
  return Number.isFinite(raw) && raw > 0 ? Math.min(90, Math.round(raw)) : 30;
}

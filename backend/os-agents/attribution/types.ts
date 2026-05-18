export type AttributionChannel =
  | "google_ads"
  | "meta_ads"
  | "email"
  | "organic"
  | "direct"
  | "social"
  | "referral"
  | "other";

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay" | "position_based";

export interface Touchpoint {
  id: string;
  userId: string;
  contactId: string | null;
  channel: AttributionChannel | string;
  campaign: string | null;
  source: string | null;
  medium: string | null;
  content: string | null;
  converted: boolean;
  revenue: number;
  occurredAt: string;
  createdAt: string;
}

export interface AttributionChannelResult {
  channel: string;
  credit: number;
  conversions: number;
  revenue: number;
}

export interface AttributionReport {
  id: string;
  userId: string;
  model: AttributionModel | string;
  periodStart: string | null;
  periodEnd: string | null;
  results: AttributionChannelResult[];
  createdAt: string;
}

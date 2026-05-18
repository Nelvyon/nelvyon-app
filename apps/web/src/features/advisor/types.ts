export type AdvisorTier = "basic" | "growth" | "executive";

export type AdvisorOutputProfile = "focus" | "growth_plan" | "executive_review";

export interface AdvisorEntitlements {
  plan_id: string;
  tier: AdvisorTier;
  sessions_per_month: number;
  modules: string[];
  output_profile: AdvisorOutputProfile;
  month_key: string;
  used_sessions_this_month: number;
  remaining_sessions_this_month: number;
  limit_reached: boolean;
}

export interface AdvisorSessionConsumeResponse {
  consumed: boolean;
  month_key: string;
  used_sessions_this_month: number;
  remaining_sessions_this_month: number;
  limit_reached: boolean;
}

export interface BrandingPolicyFieldState {
  field: "slug" | "logo_url" | "accent_color";
  state: "enabled" | "blocked" | "inherited";
  reason: string;
  source: "global" | "plan" | "override";
}

export interface TenantBrandingPolicy {
  workspace_id: number;
  workspace_name: string;
  plan: string;
  status: string;
  branding_v2_advanced_enabled: boolean;
  global_hq_lock: boolean;
  fields: BrandingPolicyFieldState[];
  notes: string[];
}

export interface TenantBrandingActivationPayload {
  enabled: boolean;
  note?: string;
}

export interface TenantBrandingActivationLogItem {
  id: number;
  workspace_id: number;
  actor_user_id: string;
  actor_email?: string | null;
  from_enabled: boolean;
  to_enabled: boolean;
  note?: string | null;
  created_at?: string | null;
}

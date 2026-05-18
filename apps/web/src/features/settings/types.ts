export interface TenantSettings {
  workspace_id: number;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  domain?: string | null;
  plan?: string | null;
  status?: string | null;
  timezone: string;
  locale: string;
  industry: string;
  billing_email?: string | null;
  max_users: number;
  enabled_modules: string[];
  features_json?: string | null;
  created_at?: string | null;
}

export interface TenantSettingsUpdateInput {
  name?: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
  domain?: string;
  timezone?: string;
  locale?: string;
  industry?: string;
  billing_email?: string;
  max_users?: number;
  enabled_modules?: string[];
}

export interface WorkspaceMember {
  id: number;
  user_id: string;
  email?: string | null;
  role: string;
  status: string;
  joined_at?: string | null;
}

export interface MemberInviteInput {
  email: string;
  role: string;
}

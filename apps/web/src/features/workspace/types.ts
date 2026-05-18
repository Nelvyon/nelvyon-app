export interface WorkspaceRow {
  id: number;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  domain?: string | null;
  plan?: string | null;
  status?: string | null;
  role: string;
  members_count?: number;
  created_at?: string | null;
}

export interface WorkspaceCreateBody {
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
}

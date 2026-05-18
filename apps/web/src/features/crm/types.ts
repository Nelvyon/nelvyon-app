export interface Client {
  id: number;
  user_id: string;
  workspace_id: number | null;
  business_name: string;
  sector: string;
  country?: string | null;
  city?: string | null;
  website_url?: string | null;
  value_proposition?: string | null;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  skip: number;
  limit: number;
}

export interface ClientCreateInput {
  business_name: string;
  sector: string;
  country?: string;
  city?: string;
  website_url?: string;
}

export interface ClientUpdateInput {
  business_name?: string;
  sector?: string;
  country?: string;
  city?: string;
  website_url?: string;
}

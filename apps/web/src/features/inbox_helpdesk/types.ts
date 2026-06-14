export interface Ticket {
  id: number;
  user_id: string;
  workspace_id: number | null;
  subject: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  assigned_to?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  channel?: string | null;
  client_id?: number | null;
  first_response_minutes?: number | null;
  satisfaction_score?: number | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

export interface HelpdeskStats {
  open_count: number;
  pending_count: number;
  closed_count: number;
  total_count: number;
  at_risk_count: number;
  sla_first_response_breaches: number;
  sla_resolution_breaches: number;
  sla_compliance_rate: number;
  avg_first_response_minutes: number | null;
  oldest_open_hours: number;
  by_priority: { priority: string; count: number }[];
  by_status: { status: string; count: number }[];
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  skip: number;
  limit: number;
}

export interface TicketCreateInput {
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  channel?: string;
}

export interface TicketUpdateInput {
  status?: string;
  priority?: string;
}

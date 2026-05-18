export interface Ticket {
  id: number;
  user_id: string;
  workspace_id: number | null;
  subject: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  created_at?: string | null;
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

export interface SecurityEvent {
  id: number;
  user_id: string;
  event_type: string;
  severity?: string | null;
  source?: string | null;
  description?: string | null;
  status?: string | null;
  details_json?: string | null;
  created_at?: string | null;
}

export interface SecurityEventListResponse {
  items: SecurityEvent[];
  total: number;
  skip: number;
  limit: number;
}

export interface SecurityEventsQuery {
  skip?: number;
  limit?: number;
  severity?: string;
  status?: string;
  eventType?: string;
  sort?: string;
}

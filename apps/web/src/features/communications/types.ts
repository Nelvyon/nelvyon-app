export interface CommunicationsEmailStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  sendgrid_configured: boolean;
  sdk_available: boolean;
}

export interface CommunicationsRecentEmailEvent {
  id: number;
  to_email: string;
  subject: string;
  status: string;
  email_type: string | null;
  created_at: string | null;
}

export interface CommunicationsSummary {
  period_utc_date: string;
  tickets_created_today: number;
  projects_created_today: number;
  email: CommunicationsEmailStats;
  recent_email_events: CommunicationsRecentEmailEvent[];
  scope_note: string;
}

export interface SignupConfirmationResult {
  email_id: number | null;
  status: string;
  to: string;
  message: string;
}

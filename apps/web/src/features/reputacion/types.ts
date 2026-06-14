export type Review = {
  id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  created_at: string;
  location?: string;
};

export type UnifiedReputacionReporting = {
  reviews: { items: Review[]; mock?: boolean };
  connection: {
    platform: string;
    connected: boolean;
    mock?: boolean;
    oauth_configured?: boolean;
    profile_name?: string | null;
    last_sync_at?: string | null;
  };
  alerts: { items: Array<{ id: string; review_id: string; severity: string; message: string; created_at: string }>; active_count: number };
  unified: {
    total_reviews: number;
    avg_rating: number;
    positive_percent: number;
    negative_percent: number;
    neutral_percent: number;
    active_alerts: number;
    google_connected: boolean;
    mock: boolean;
  };
};

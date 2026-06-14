export type UnifiedSocialReporting = {
  scheduler: {
    connected_accounts: number;
    accounts: unknown[];
    legacy_posts: { total?: number; published?: number; scheduled?: number; failed?: number };
  };
  monitoring: {
    mentions_24h: number;
    positive_percent: number;
    negative_percent: number;
    avg_sentiment_score: number;
    active_alerts: number;
    alerts: unknown[];
    recent_mentions: unknown[];
    top_keywords: Array<{ keyword: string; count: number }>;
    sentiment_by_day: unknown[];
  };
  auto_publish: {
    client_id?: string;
    by_platform: Record<string, { reach: number; likes: number; comments: number }>;
    mock?: boolean;
  };
  unified: {
    connected_accounts: number;
    posts_scheduled: number;
    posts_published: number;
    mentions_24h: number;
    total_reach: number;
    total_engagement: number;
    sentiment_net: number;
    active_alerts: number;
    mock: boolean;
  };
};

export type SocialMonitoringDashboard = UnifiedSocialReporting["monitoring"];

export type SocialModuleAnalytics = {
  module: string;
  period: string;
  kpis?: Record<string, number | string>;
  charts?: Record<string, unknown>;
};

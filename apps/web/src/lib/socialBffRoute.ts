import { bffDegraded, BFF_DEGRADED_NO_DATA, BFF_DEGRADED_UPSTREAM } from "@/lib/bffDegraded";
import { adsBffGet } from "@/lib/adsBffRoute";

export { adsBffGet as socialBffGet };

export const EMPTY_SOCIAL_SCHEDULER = bffDegraded(
  {
    connected_accounts: 0,
    accounts: [] as unknown[],
    legacy_posts: { total: 0, published: 0, scheduled: 0, failed: 0 },
    mentions: [] as unknown[],
  },
  BFF_DEGRADED_NO_DATA,
);

export const EMPTY_SOCIAL_MONITORING = bffDegraded(
  {
    mentions_24h: 0,
    positive_percent: 0,
    negative_percent: 0,
    avg_sentiment_score: 0,
    active_alerts: 0,
    alerts: [] as unknown[],
    recent_mentions: [] as unknown[],
    top_keywords: [] as unknown[],
    sentiment_by_day: [] as unknown[],
  },
  BFF_DEGRADED_NO_DATA,
);

export const EMPTY_SOCIAL_PUBLISH = bffDegraded(
  {
    client_id: "",
    by_platform: {} as Record<string, { reach: number; likes: number; comments: number }>,
  },
  BFF_DEGRADED_NO_DATA,
);

export const EMPTY_UNIFIED_SOCIAL = bffDegraded(
  {
    scheduler: EMPTY_SOCIAL_SCHEDULER,
    monitoring: EMPTY_SOCIAL_MONITORING,
    auto_publish: EMPTY_SOCIAL_PUBLISH,
    unified: {
      connected_accounts: 0,
      posts_scheduled: 0,
      posts_published: 0,
      mentions_24h: 0,
      total_reach: 0,
      total_engagement: 0,
      sentiment_net: 0,
      active_alerts: 0,
      degraded: true as const,
    },
  },
  BFF_DEGRADED_NO_DATA,
);

export function mergeUnifiedSocial(
  scheduler: typeof EMPTY_SOCIAL_SCHEDULER,
  monitoring: typeof EMPTY_SOCIAL_MONITORING,
  autoPublish: typeof EMPTY_SOCIAL_PUBLISH,
) {
  const legacy = scheduler.legacy_posts ?? { scheduled: 0, published: 0 };
  const scheduled = Number(legacy.scheduled ?? 0);
  const published = Number(legacy.published ?? 0);
  const byPlatform = autoPublish.by_platform ?? {};
  let totalReach = 0;
  let totalEngagement = 0;
  for (const stats of Object.values(byPlatform)) {
    totalReach += Number(stats.reach ?? 0);
    totalEngagement += Number(stats.likes ?? 0) + Number(stats.comments ?? 0);
  }
  const sentimentNet =
    Number(monitoring.positive_percent ?? 0) - Number(monitoring.negative_percent ?? 0);
  const degraded = Boolean(
    scheduler.degraded || monitoring.degraded || autoPublish.degraded,
  );
  const degradedReason =
    autoPublish.degraded_reason ??
    monitoring.degraded_reason ??
    scheduler.degraded_reason ??
    BFF_DEGRADED_NO_DATA;
  return {
    scheduler,
    monitoring,
    auto_publish: autoPublish,
    ...(degraded ? { degraded: true as const, degraded_reason: degradedReason } : {}),
    unified: {
      connected_accounts: Number(scheduler.connected_accounts ?? 0),
      posts_scheduled: scheduled,
      posts_published: published,
      mentions_24h: Number(monitoring.mentions_24h ?? 0),
      total_reach: totalReach,
      total_engagement: totalEngagement,
      sentiment_net: Math.round(sentimentNet * 10) / 10,
      active_alerts: Number(monitoring.active_alerts ?? 0),
      ...(degraded ? { degraded: true as const } : {}),
    },
  };
}

export function emptyUnifiedSocial(reason = BFF_DEGRADED_NO_DATA) {
  return bffDegraded(
    mergeUnifiedSocial(EMPTY_SOCIAL_SCHEDULER, EMPTY_SOCIAL_MONITORING, EMPTY_SOCIAL_PUBLISH),
    reason,
  );
}

export const EMPTY_UNIFIED_SOCIAL_DEGRADED = emptyUnifiedSocial(BFF_DEGRADED_UPSTREAM);

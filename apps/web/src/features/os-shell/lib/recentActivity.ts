export interface ActivityItem {
  kind: string;
  label: string;
  detail: string;
  at?: string;
  href?: string;
}

function ts(iso?: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export function mergeRecentActivity(items: ActivityItem[], limit = 12): ActivityItem[] {
  return [...items]
    .sort((a, b) => ts(b.at) - ts(a.at))
    .slice(0, limit);
}

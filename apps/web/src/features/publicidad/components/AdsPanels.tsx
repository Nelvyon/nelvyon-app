"use client";

import type { AdsCampaignRow } from "@/features/publicidad/types";

export function AdsMetricCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "…" : value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function AdsMiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const bars = values.length ? values : [1, 2, 3];
  return (
    <div className="flex h-24 items-end gap-1">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v > 0 ? 4 : 0 }}
        />
      ))}
    </div>
  );
}

export function AdsCampaignList({
  campaigns,
  platform,
}: {
  campaigns: AdsCampaignRow[];
  platform: "google" | "meta";
}) {
  if (!campaigns.length) {
    return <p className="text-sm text-muted-foreground">Sin campañas activas en este periodo.</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-border">
      {campaigns.slice(0, 8).map((c) => (
        <li className="flex items-center justify-between py-2 text-sm" key={c.campaign_id ?? c.campaign_name}>
          <span className="font-medium">{c.campaign_name ?? c.campaign_id}</span>
          <span className="text-muted-foreground tabular-nums">
            {platform === "google"
              ? `${(c.cost ?? 0).toFixed(2)} €`
              : `ROAS ${(c.roas ?? 0).toFixed(2)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdsMockBadge({ mock }: { mock?: boolean }) {
  if (!mock) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      Datos demo
    </span>
  );
}

export function AdsAlertsBanner({
  alerts,
}: {
  alerts: Array<{ platform: string; message: string; severity: string }>;
}) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={`${a.platform}-${a.message}`}
          className={`rounded-lg border px-4 py-3 text-sm ${
            a.severity === "critical"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          <strong className="uppercase">{a.platform}</strong> — {a.message}
        </div>
      ))}
    </div>
  );
}

"use client";

export function SocialMetricCard({
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

export function SocialMockBadge({ mock }: { mock?: boolean }) {
  if (!mock) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
      Datos demo
    </span>
  );
}

export function SentimentBar({
  positive,
  negative,
}: {
  positive: number;
  negative: number;
}) {
  const neutral = Math.max(0, 100 - positive - negative);
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
      <div className="bg-emerald-500" style={{ width: `${positive}%` }} title={`Positivo ${positive}%`} />
      <div className="bg-muted-foreground/30" style={{ width: `${neutral}%` }} title="Neutro" />
      <div className="bg-red-500" style={{ width: `${negative}%` }} title={`Negativo ${negative}%`} />
    </div>
  );
}

"use client";

const SENTIMENT_COLOR = {
  positive: "text-green-600",
  neutral: "text-muted-foreground",
  negative: "text-red-600",
} as const;

export function ReputacionMetricCard({
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

export function ReviewList({
  items,
}: {
  items: Array<{
    id: string;
    author: string;
    rating: number;
    text: string;
    sentiment: keyof typeof SENTIMENT_COLOR;
    created_at: string;
    location?: string;
  }>;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Sin reseñas en este filtro.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li className="py-3" key={r.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{r.author}</p>
            <p className="text-sm tabular-nums">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
          </div>
          <p className="mt-1 text-sm">{r.text}</p>
          <p className={`mt-1 text-xs ${SENTIMENT_COLOR[r.sentiment]}`}>
            {r.sentiment} · {r.location ?? "Google"} · {new Date(r.created_at).toLocaleDateString("es-ES")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full">
      <div className="bg-green-500" style={{ width: `${positive}%` }} title={`Positivo ${positive}%`} />
      <div className="bg-muted" style={{ width: `${neutral}%` }} title={`Neutro ${neutral}%`} />
      <div className="bg-red-500" style={{ width: `${negative}%` }} title={`Negativo ${negative}%`} />
    </div>
  );
}

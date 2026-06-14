"use client";

export function AutomatizacionMetricCard({
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

export function FlowEventsChart({
  items,
}: {
  items: Array<{ name: string; runs: number }>;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Sin ejecuciones registradas aún.</p>;
  }
  const max = Math.max(...items.map((i) => i.runs), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {items.map((item) => (
        <div className="flex flex-1 flex-col items-center gap-1" key={item.name}>
          <div
            className="w-full rounded-t bg-primary/80"
            style={{ height: `${(item.runs / max) * 100}%`, minHeight: item.runs ? 4 : 0 }}
            title={`${item.runs} eventos`}
          />
          <span className="max-w-full truncate text-[10px] text-muted-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

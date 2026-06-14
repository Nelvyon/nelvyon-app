"use client";

type Scalar = string | number | boolean | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("es-ES") : "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} elementos`;
  return JSON.stringify(value);
}

function metricCandidates(data: Record<string, unknown>): { label: string; value: string }[] {
  const preferred = [
    "total",
    "total_count",
    "count",
    "open_count",
    "closed_count",
    "deals_count",
    "contacts_count",
    "pipeline_value",
    "weighted_value",
    "revenue",
    "conversion_rate",
    "sla_compliance_rate",
  ];
  const metrics: { label: string; value: string }[] = [];
  for (const key of preferred) {
    if (key in data && (typeof data[key] === "number" || typeof data[key] === "string")) {
      metrics.push({ label: key.replace(/_/g, " "), value: formatValue(data[key]) });
    }
  }
  if (metrics.length >= 2) return metrics.slice(0, 6);

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "number" || typeof value === "string") {
      metrics.push({ label: key.replace(/_/g, " "), value: formatValue(value) });
    }
    if (metrics.length >= 4) break;
  }
  return metrics;
}

function tableFromArray(rows: Record<string, unknown>[]): { headers: string[]; body: Scalar[][] } | null {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0] ?? {});
  if (!headers.length) return null;
  const body = rows.slice(0, 50).map((row) => headers.map((h) => {
    const v = row[h];
    if (v == null) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return v as Scalar;
  }));
  return { headers, body };
}

export function ReportVisualView({ data, moduleLabel }: { data: unknown; moduleLabel: string }) {
  if (data && isPlainObject(data) && "error" in data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {String(data.error)}
      </div>
    );
  }

  if (Array.isArray(data)) {
    const rows = data.filter(isPlainObject) as Record<string, unknown>[];
    const table = tableFromArray(rows);
    if (!table) {
      return (
        <p className="text-sm text-muted-foreground">Sin datos para {moduleLabel} en el rango seleccionado.</p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} registro{rows.length === 1 ? "" : "s"} · vista tabular
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {table.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium capitalize text-foreground">
                    {h.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.body.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-muted-foreground">
                      {formatValue(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isPlainObject(data)) {
    const metrics = metricCandidates(data);
    const arrayEntries = Object.entries(data).filter(([, v]) => Array.isArray(v)) as [string, unknown[]][];
    const nestedTable = arrayEntries.length
      ? tableFromArray(arrayEntries[0][1].filter(isPlainObject) as Record<string, unknown>[])
      : null;

    return (
      <div className="space-y-5">
        {metrics.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {nestedTable ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold capitalize text-foreground">
              {arrayEntries[0][0].replace(/_/g, " ")}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {nestedTable.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium capitalize text-foreground">
                        {h.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nestedTable.body.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-muted-foreground">
                          {formatValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!metrics.length && !nestedTable ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border px-3 py-2">
                <dt className="text-xs uppercase text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">{formatValue(data)}</p>;
}

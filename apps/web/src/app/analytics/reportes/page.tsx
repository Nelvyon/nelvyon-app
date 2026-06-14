"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { downloadCsvFile, rowsToCsv } from "@/core/utils/csv";
import { dashboardReportsApi } from "@/features/dashboard/api";
import { ReportVisualView } from "@/features/reporting/components/ReportVisualView";
import { ReportingSubNav } from "@/features/reporting/components/ReportingSubNav";

const MODULES = [
  { id: "crm", label: "CRM", fetch: dashboardReportsApi.crm },
  { id: "campaigns", label: "Campañas", fetch: dashboardReportsApi.campaigns },
  { id: "seo", label: "SEO", fetch: dashboardReportsApi.seo },
  { id: "helpdesk", label: "Helpdesk", fetch: dashboardReportsApi.helpdesk },
  { id: "store", label: "Tienda", fetch: dashboardReportsApi.store },
] as const;

type ModuleId = (typeof MODULES)[number]["id"];

function flattenForCsv(data: unknown): (string | number | null)[][] {
  if (Array.isArray(data)) {
    if (!data.length) return [["Sin datos"]];
    const keys = Object.keys(data[0] as object);
    return [keys, ...data.map((row) => keys.map((k) => (row as Record<string, unknown>)[k] as string | number | null))];
  }
  if (data && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return [["Campo", "Valor"], ...entries.map(([k, v]) => [k, v == null ? null : typeof v === "object" ? JSON.stringify(v) : v as string | number])];
  }
  return [["resultado", String(data)]];
}

export default function AnalyticsReportesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [module, setModule] = useState<ModuleId>("crm");
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<unknown>(null);

  const moduleLabel = MODULES.find((m) => m.id === module)?.label ?? module;

  async function fetchReport() {
    setLoading(true);
    setReport(null);
    try {
      const mod = MODULES.find((m) => m.id === module)!;
      const data = await mod.fetch(startDate, endDate);
      setReport(data);
    } catch {
      setReport({ error: "Error al generar el informe" });
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!report) return;
    const rows = flattenForCsv(report);
    const csv = rowsToCsv(rows);
    downloadCsvFile(`reporte-${module}-${startDate}-${endDate}.csv`, csv);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <ReportingSubNav />

        <div>
          <h1 className="text-2xl font-bold">Reportes del workspace</h1>
          <p className="text-sm text-muted-foreground">
            Informes visuales por módulo con exportación CSV. Para SLA y tickets en detalle, usa{" "}
            <Link className="text-link underline" href="/analytics/tickets">
              Analytics Helpdesk
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Módulo</label>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setModule(e.target.value as ModuleId)}
              value={module}
            >
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              onChange={(e) => setEndDate(e.target.value)}
              type="date"
              value={endDate}
            />
          </div>
          <Button disabled={loading} onClick={fetchReport}>
            {loading ? "Generando…" : "Generar informe"}
          </Button>
          {report ? (
            <Button onClick={downloadCsv} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Descargar CSV
            </Button>
          ) : null}
        </div>

        {report ? (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">Informe — {moduleLabel}</h2>
            <ReportVisualView data={report} moduleLabel={moduleLabel} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Selecciona módulo y rango de fechas, luego genera el informe.
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}

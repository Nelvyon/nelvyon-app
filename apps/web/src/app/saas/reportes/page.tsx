"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Report {
  id: string; name: string; type: string; status: "ready" | "generating" | "failed";
  createdAt: string; downloadUrl: string | null; sizeBytes: number | null;
}

const REPORT_TYPES = [
  { id: "executive_summary", label: "Resumen ejecutivo", icon: "📊", desc: "KPIs generales del mes: contactos, campañas, workflows" },
  { id: "email_marketing", label: "Email Marketing", icon: "📧", desc: "Tasas de apertura, clics, conversiones por campaña" },
  { id: "crm_pipeline", label: "CRM & Pipeline", icon: "🎯", desc: "Estado del embudo, deals cerrados, nuevos contactos" },
  { id: "seo_ranking", label: "SEO & Posicionamiento", icon: "🔍", desc: "Evolución de keywords, posiciones, tráfico orgánico" },
  { id: "social_engagement", label: "Redes Sociales", icon: "📱", desc: "Engagement, alcance y publicaciones por plataforma" },
  { id: "ad_performance", label: "Publicidad Digital", icon: "💰", desc: "ROAS, CPC, impresiones y gasto por plataforma" },
];

export default function SaasReportesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/reports");
      const data = (await res.json().catch(() => ({ reports: [] }))) as { reports: Report[] };
      setReports(data.reports ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function generateReport(type: string) {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch("/api/saas/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json().catch(() => ({}))) as { downloadUrl?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Error generando reporte");
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando reporte");
    } finally {
      setGenerating(null);
    }
  }

  function fmtSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <DashboardLayout sidebar={<SaasSidebar activeId="dashboard" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader title="Reportes" subtitle="Genera y descarga informes ejecutivos de todos tus módulos en PDF" />

        {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

        {/* Generate new report */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Generar nuevo reporte</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map(rt => (
              <NelvyonDsCard key={rt.id} className="flex flex-col gap-3 p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rt.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{rt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rt.desc}</p>
                  </div>
                </div>
                <NelvyonDsButton
                  size="sm"
                  onClick={() => void generateReport(rt.id)}
                  disabled={generating === rt.id}
                  className="w-full"
                >
                  {generating === rt.id ? "Generando…" : "⬇ Generar PDF"}
                </NelvyonDsButton>
              </NelvyonDsCard>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Historial de reportes</p>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />)}</div>
          ) : reports.length === 0 ? (
            <NelvyonDsCard className="p-10 text-center">
              <p className="text-muted-foreground text-sm">Aún no has generado ningún reporte</p>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <NelvyonDsCard key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("es-ES")} {fmtSize(r.sizeBytes) && `· ${fmtSize(r.sizeBytes)}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <NelvyonDsBadge tone={r.status === "ready" ? "success" : r.status === "failed" ? "danger" : "primary"} size="sm">
                      {r.status === "ready" ? "Listo" : r.status === "failed" ? "Error" : "Generando…"}
                    </NelvyonDsBadge>
                    {r.status === "ready" && r.downloadUrl && (
                      <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <NelvyonDsButton size="sm" variant="ghost">⬇ Descargar</NelvyonDsButton>
                      </a>
                    )}
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

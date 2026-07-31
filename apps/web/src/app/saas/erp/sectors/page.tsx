"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type Sector = {
  id: string;
  title: string;
  status: string;
  mappedModules: string[];
  playbookPaths: string[];
  note: string;
  regulatedNote?: string;
};

function statusTone(s: string): "success" | "warning" | "danger" | "neutral" | "primary" {
  if (s.includes("READY") || s.includes("LIVE")) return "success";
  if (s.includes("BLOCKED")) return "danger";
  if (s.includes("PREPARED") || s.includes("OFF")) return "warning";
  return "neutral";
}

export default function ErpSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/sectors");
      const data = (await res.json()) as { sectors?: Sector[]; note?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setSectors(data.sectors ?? []);
      setNote(data.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const blocked = sectors.filter((s) => s.status.includes("BLOCKED")).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-sectors" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Taxonomía de sectores"
          subtitle={note || "Inventario canónico honesto"}
        />

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {error}{" "}
            <NelvyonDsButton size="sm" variant="ghost" onClick={() => void load()}>
              Reintentar
            </NelvyonDsButton>
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiTile icon="🗂️" label="Sectores" value={sectors.length} />
          <KpiTile icon="🚫" label="Bloqueados" value={blocked} />
          <KpiTile icon="📌" label="Activos catálogo" value={sectors.length - blocked} accent />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground" role="status">
            Cargando…
          </p>
        ) : sectors.length === 0 ? (
          <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
            Sin sectores en el catálogo.
          </NelvyonDsCard>
        ) : (
          <div className="flex flex-col gap-3">
            {sectors.map((s) => (
              <NelvyonDsCard key={s.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-medium text-foreground">{s.title}</h2>
                  <NelvyonDsBadge tone={statusTone(s.status)}>{s.status}</NelvyonDsBadge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
                {s.regulatedNote && (
                  <p className="mt-1 text-xs text-warning">{s.regulatedNote}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Modules: {s.mappedModules.join(", ") || "—"} · Playbooks:{" "}
                  {s.playbookPaths.join(", ") || "—"}
                </p>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}

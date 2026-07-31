"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type App = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
};

export default function MarketplacePage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/marketplace");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json()) as { apps?: App[] };
      setApps(d.apps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar marketplace");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (app: App) => {
    setToggling(app.id);
    setError(null);
    try {
      const res = await fetch("/api/saas/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, action: app.installed ? "uninstall" : "install" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar instalación");
    } finally {
      setToggling(null);
    }
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="marketplace" />}>
      <NelvyonDsSectionHeader
        title="Integration Marketplace"
        subtitle="Instala conectores y automatizaciones para tu tenant"
      />

      {error && (
        <NelvyonDsCard className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
        </NelvyonDsCard>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/30" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-lg font-semibold text-foreground">Sin apps en el catálogo</p>
          <p className="mt-2 text-sm text-muted-foreground">Cuando haya integraciones disponibles aparecerán aquí.</p>
        </NelvyonDsCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => (
            <NelvyonDsCard key={app.id} className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{app.category}</p>
              <h2 className="text-lg font-semibold text-foreground">{app.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{app.description}</p>
              {["make", "n8n", "zapier"].includes(app.slug) && app.installed && (
                <a
                  href={`/api/saas/marketplace/blueprints?slug=${app.slug}`}
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar blueprint →
                </a>
              )}
              <NelvyonDsButton
                className="mt-4"
                disabled={toggling === app.id}
                onClick={() => void toggle(app)}
              >
                {toggling === app.id ? "…" : app.installed ? "Desinstalar" : "Instalar"}
              </NelvyonDsButton>
            </NelvyonDsCard>
          ))}
        </div>
      )}
    </SaasShellLayout>
  );
}

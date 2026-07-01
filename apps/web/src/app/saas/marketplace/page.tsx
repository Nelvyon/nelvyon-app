"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    const res = await fetch("/api/saas/marketplace");
    if (res.ok) {
      const d = (await res.json()) as { apps: App[] };
      setApps(d.apps);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (app: App) => {
    await fetch("/api/saas/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: app.id, action: app.installed ? "uninstall" : "install" }),
    });
    void load();
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="integraciones" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold text-white">Integration Marketplace</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => (
            <article key={app.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/40">{app.category}</p>
              <h2 className="text-lg font-semibold text-white">{app.name}</h2>
              <p className="mt-2 text-sm text-white/60">{app.description}</p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-[#0084ff] px-3 py-1.5 text-sm text-white"
                onClick={() => void toggle(app)}
              >
                {app.installed ? "Desinstalar" : "Instalar"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </SaasShellLayout>
  );
}

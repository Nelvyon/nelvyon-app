"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Sector = {
  id: string;
  title: string;
  status: string;
  mappedModules: string[];
  playbookPaths: string[];
  note: string;
  regulatedNote?: string;
};

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

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-sectors" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Taxonomía de sectores</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">{note || "Inventario canónico honesto"}</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#64748b]">Cargando…</p>
        ) : (
          <ul className="space-y-3">
            {sectors.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-medium text-white">{s.title}</h2>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-[#94a3b8]">
                    {s.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#94a3b8]">{s.note}</p>
                {s.regulatedNote && (
                  <p className="mt-1 text-xs text-amber-300/90">{s.regulatedNote}</p>
                )}
                <p className="mt-2 text-xs text-[#64748b]">
                  Modules: {s.mappedModules.join(", ") || "—"} · Playbooks:{" "}
                  {s.playbookPaths.join(", ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SaasShellLayout>
  );
}

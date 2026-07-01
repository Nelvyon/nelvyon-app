"use client";

import { useEffect, useState } from "react";

import type { PackRunRecord } from "@/lib/packs/types";

function parseWorkspaceId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("nelvyon_workspace_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function OsPackRunsPage() {
  const [runs, setRuns] = useState<PackRunRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const workspaceId = parseWorkspaceId();
      if (!workspaceId) {
        if (!cancelled) {
          setError("Configura nelvyon_workspace_id en localStorage para listar pack runs.");
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch("/api/platform/pack-runs?limit=50", {
          headers: { "X-Workspace-Id": String(workspaceId) },
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setError(`HTTP ${res.status}`);
          return;
        }
        const body = (await res.json()) as { runs?: PackRunRecord[] };
        if (!cancelled) setRuns(body.runs ?? []);
      } catch {
        if (!cancelled) setError("No se pudo cargar pack runs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Pack runs — observabilidad</h1>
      <p className="mt-1 text-sm text-white/50">Últimas ejecuciones OS por workspace (CEO / operaciones).</p>

      {loading && <p className="mt-6 text-sm text-white/40">Cargando…</p>}
      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {!loading && !error && runs.length === 0 && (
        <p className="mt-6 text-sm text-white/40">Sin pack runs todavía.</p>
      )}

      <ul className="mt-6 space-y-3">
        {runs.map((r) => (
          <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#0084ff]">{r.pack_id}</span>
              <span className="text-xs uppercase tracking-wide text-white/50">{r.status}</span>
            </div>
            <p className="mt-1 text-sm text-white/70">{r.intake?.business_name ?? "—"}</p>
            <p className="mt-1 font-mono text-[10px] text-white/30">{r.id}</p>
            <p className="text-[10px] text-white/30">{r.created_at}</p>
            {r.error_message ? <p className="mt-2 text-xs text-red-400">{r.error_message}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

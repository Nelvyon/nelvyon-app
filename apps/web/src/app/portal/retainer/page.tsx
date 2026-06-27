"use client";

import { useEffect, useState } from "react";
import { PortalPageShell } from "@/features/client_portal_v1/components/PortalPageShell";
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingState,
} from "@/features/client_portal_v1/components/PortalUiStates";

type ServiceStatus = "delivered" | "pending" | "failed";
type ServiceView = { type: string; label: string; status: ServiceStatus; portalUrl?: string | null };
type RetainerView = {
  periodKey: string;
  status: string;
  active: boolean;
  services: ServiceView[];
  history: Array<{ periodKey: string; status: string }>;
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  delivered: "✅ Entregado",
  pending: "⏳ Pendiente",
  failed: "❌ Fallido",
};

const STATUS_COLOR: Record<ServiceStatus, string> = {
  delivered: "#22c55e",
  pending: "#f59e0b",
  failed: "#ef4444",
};

export default function PortalRetainerPage() {
  const [view, setView] = useState<RetainerView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/portal/retainer", { credentials: "same-origin" });
      if (!res.ok) { setError(`No pudimos cargar tu retainer (${res.status})`); return; }
      setView((await res.json()) as RetainerView);
    } catch {
      setError("Error de red al cargar tu retainer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <PortalPageShell
      title="Retainer mensual"
      description="Lo que tu equipo de Nelvyon entrega cada mes, en tiempo real."
      backHref="/portal"
    >
      {loading ? <PortalLoadingState message="Cargando tu retainer…" /> : null}
      {!loading && error ? <PortalErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && view && !view.active ? (
        <PortalEmptyState title="Retainer no activo" description="Cuando tu equipo active el piloto automático, verás aquí los entregables de cada mes." />
      ) : null}

      {!loading && !error && view && view.active ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Mes {view.periodKey}</h2>
              <span className="text-xs uppercase tracking-wide text-white/60">{view.status}</span>
            </div>
            <ul className="space-y-2">
              {view.services.map((s) => (
                <li key={s.type} className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3">
                  <span className="text-white/80 text-sm">{s.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status]}</span>
                    {s.portalUrl && (
                      <a href={s.portalUrl} className="text-[#0084ff] text-xs hover:underline">Ver →</a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {view.history.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-white/70 text-xs uppercase tracking-wide mb-3">Historial</h3>
              <div className="flex flex-wrap gap-2">
                {view.history.map((h) => (
                  <span key={h.periodKey} className="rounded-md bg-black/20 px-3 py-1.5 text-xs text-white/70">
                    {h.periodKey} · {h.status}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </PortalPageShell>
  );
}

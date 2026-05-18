"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface StatusData {
  status: "operational" | "degraded" | "down" | "unknown";
  services: Record<
    string,
    {
      status: "up" | "down" | "degraded";
      latencyMs: number;
      checkedAt: string;
    }
  >;
  incidents: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
    resolved: boolean;
    created_at: string;
  }>;
  updatedAt: string;
}

const SERVICE_LABELS: Record<string, string> = {
  api: "API Principal",
  database: "Base de datos",
  agents: "Agentes IA",
  payments: "Pagos (Paddle)",
  email: "Email (SES)",
};

const STATUS_CONFIG = {
  operational: { label: "Todos los sistemas operativos", color: "text-emerald-400", dot: "bg-emerald-400" },
  degraded: { label: "Degradación parcial del servicio", color: "text-yellow-400", dot: "bg-yellow-400" },
  down: { label: "Interrupción del servicio", color: "text-red-400", dot: "bg-red-400" },
  unknown: { label: "Estado desconocido", color: "text-zinc-400", dot: "bg-zinc-400" },
};

const SERVICE_STATUS_CONFIG = {
  up: { label: "Operativo", color: "text-emerald-400", dot: "bg-emerald-400" },
  degraded: { label: "Degradado", color: "text-yellow-400", dot: "bg-yellow-400" },
  down: { label: "Caído", color: "text-red-400", dot: "bg-red-400" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function load() {
      fetch("/api/status")
        .then((r) => r.json())
        .then((d: StatusData) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }

    load();
    const id = setInterval(() => {
      fetch("/api/status")
        .then((r) => r.json())
        .then((d: StatusData) => setData(d))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const overall = data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.unknown;

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-16 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <Link href="/" className="text-xl font-black tracking-tight text-indigo-500">
            NELVYON
          </Link>
          <h1 className="mb-3 mt-6 text-3xl font-black">Estado del sistema</h1>
          {loading ? (
            <div className="mx-auto h-6 w-48 animate-pulse rounded-full bg-zinc-800" />
          ) : (
            <div className={`flex items-center justify-center gap-2 ${overall.color}`}>
              <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${overall.dot}`} />
              <span className="font-semibold">{overall.label}</span>
            </div>
          )}
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse border-b border-zinc-800 bg-zinc-900/50" />
              ))
            : Object.entries(data?.services ?? {}).map(([key, svc], i, arr) => {
                const cfg = SERVICE_STATUS_CONFIG[svc.status];
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i < arr.length - 1 ? "border-b border-zinc-800" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-zinc-200">{SERVICE_LABELS[key] ?? key}</span>
                    <div className={`flex items-center gap-2 text-sm ${cfg.color}`}>
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span>{cfg.label}</span>
                      {svc.latencyMs > 0 ? (
                        <span className="text-xs text-zinc-600">{svc.latencyMs}ms</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
        </div>

        {(data?.incidents ?? []).length > 0 ? (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold">Incidentes recientes</h2>
            <div className="space-y-3">
              {data!.incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-zinc-800 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold">{inc.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        inc.resolved ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                      }`}
                    >
                      {inc.resolved ? "Resuelto" : "Activo"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{inc.message}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data?.updatedAt ? (
          <p className="text-center text-xs text-zinc-600">
            Actualizado: {new Date(data.updatedAt).toLocaleString("es-ES")}
          </p>
        ) : null}
      </div>
    </main>
  );
}

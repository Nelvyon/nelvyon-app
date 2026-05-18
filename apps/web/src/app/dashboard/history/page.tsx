"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";

interface HistoryItem {
  id: string;
  agent_id: string;
  sector: string;
  created_at: string;
}

interface HistoryResponse {
  items: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const SECTOR_LABELS: Record<string, string> = {
  seo: "SEO",
  ads: "Ads",
  email: "Email Marketing",
  branding: "Branding",
  socialvideo: "Video & Reels",
  pwa: "PWA",
  neuromarketing: "Neuromarketing",
  firstparty: "Datos First-Party",
  partnership: "Partnerships",
  copywriting: "Copywriting",
  ecommerceconv: "eCommerce",
  podcast: "Podcast",
  web3d: "Webs 3D",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function agentLabel(agentId: string): string {
  const parts = agentId.split("-");
  const label = parts.slice(1).join(" ");
  if (!label) return agentId;
  return label.replace(/^\w/, (c) => c.toUpperCase());
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (sector) params.set("sector", sector);
    fetch(`/api/user/history?${params}`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HistoryResponse | null) => {
        setData(d);
        setSelected((prev) => {
          if (!prev || !d?.items.some((i) => i.id === prev.id)) return null;
          return d.items.find((i) => i.id === prev.id) ?? null;
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, sector]);

  const sectors = Object.keys(SECTOR_LABELS);

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-4xl px-4 py-8 pb-20 md:px-6 lg:px-8 lg:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black">Historial de resultados</h1>
          <select
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setPage(1);
              setSelected(null);
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Todos los servicios</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {SECTOR_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-900" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="py-24 text-center text-zinc-500">
            <p className="mb-2 text-lg">Todavía no hay ejecuciones</p>
            <p className="text-sm">
              Usa los agentes desde{" "}
              <Link href="/os/execution" className="text-indigo-400 underline">
                Agentes IA
              </Link>{" "}
              para ver resultados aquí.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-2">
              {data.items.map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/30"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        {SECTOR_LABELS[item.sector] ?? item.sector}
                      </span>
                      <span className="truncate text-sm text-zinc-300">{agentLabel(item.agent_id)}</span>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">{formatDate(item.created_at)}</span>
                  </button>
                );
              })}
            </div>

            {selected ? (
              <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
                <h2 className="mb-4 text-lg font-bold text-zinc-100">Detalle del resultado</h2>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Servicio</dt>
                    <dd className="font-medium text-zinc-200">
                      {SECTOR_LABELS[selected.sector] ?? selected.sector}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Agente</dt>
                    <dd className="font-medium text-zinc-200">{agentLabel(selected.agent_id)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-zinc-500">Fecha</dt>
                    <dd className="font-medium text-zinc-200">{formatDate(selected.created_at)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-zinc-400">
                  Este entregable forma parte de tu historial de agentes IA. Para lanzar una nueva ejecución, ve a{" "}
                  <Link href="/os/execution" className="text-indigo-400 underline">
                    Agentes IA
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {data.pagination.totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm transition-colors hover:bg-zinc-700 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-zinc-500">
                  {page} / {data.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm transition-colors hover:bg-zinc-700 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            ) : null}
            <p className="mt-4 text-center text-xs text-zinc-600">{data.pagination.total} ejecuciones en total</p>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}

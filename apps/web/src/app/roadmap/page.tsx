"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RoadmapStatus = "planned" | "in_progress" | "done";
type RoadmapCategory = "core" | "integrations" | "ai" | "billing" | "ux";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  category: RoadmapCategory;
  votes: number;
  eta: string | null;
}

const STATUS_COLUMNS: { id: RoadmapStatus; label: string }[] = [
  { id: "planned", label: "Planificado" },
  { id: "in_progress", label: "En progreso" },
  { id: "done", label: "Completado" },
];

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  core: "Core",
  integrations: "Integraciones",
  ai: "IA",
  billing: "Facturación",
  ux: "UX",
};

function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">{item.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
          {CATEGORY_LABELS[item.category]}
        </span>
        {item.eta ? <span className="text-slate-500">ETA: {item.eta}</span> : null}
        <span className="text-slate-400">{item.votes} votos</span>
      </div>
    </article>
  );
}

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RoadmapStatus>("planned");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/roadmap", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar el roadmap");
        const data = (await res.json()) as { items: RoadmapItem[] };
        setItems(data.items ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<RoadmapStatus, RoadmapItem[]> = {
      planned: [],
      in_progress: [],
      done: [],
    };
    for (const item of items) {
      if (map[item.status]) map[item.status].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="min-h-screen bg-[#F7F6F2] font-sans text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <header className="mb-10 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-[#01696F]">NELVYON</span>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-[#01696F]">
            ← Volver
          </Link>
        </header>

        <h1 className="text-4xl font-bold tracking-tight">Roadmap</h1>
        <p className="mt-2 text-lg text-slate-600">Lo que estamos construyendo para ti.</p>

        {loading ? <p className="mt-12 text-slate-500">Cargando…</p> : null}
        {error ? <p className="mt-12 text-red-600">{error}</p> : null}

        {!loading && !error ? (
          <>
            <div className="mt-8 flex gap-2 md:hidden">
              {STATUS_COLUMNS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setActiveTab(col.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    activeTab === col.id ? "bg-[#01696F] text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>

            <div className="mt-8 hidden gap-6 md:grid md:grid-cols-3">
              {STATUS_COLUMNS.map((col) => (
                <section key={col.id}>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {col.label}
                  </h2>
                  <div className="space-y-4">
                    {byStatus[col.id].length === 0 ? (
                      <p className="text-sm text-slate-400">Sin elementos aún.</p>
                    ) : (
                      byStatus[col.id].map((item) => <RoadmapCard key={item.id} item={item} />)
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 space-y-4 md:hidden">
              {byStatus[activeTab].length === 0 ? (
                <p className="text-sm text-slate-400">Sin elementos aún.</p>
              ) : (
                byStatus[activeTab].map((item) => <RoadmapCard key={item.id} item={item} />)
              )}
            </div>

            <p className="mt-12 text-center text-sm text-slate-500">
              ¿Tienes una sugerencia? Usa el botón de feedback en tu dashboard.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChangelogType = "feature" | "improvement" | "fix" | "security";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  body: string;
  type: ChangelogType;
  publishedAt: string;
}

const TYPE_STYLES: Record<ChangelogType, { badge: string; dot: string; label: string }> = {
  feature: { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", label: "Feature" },
  improvement: { badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500", label: "Mejora" },
  fix: { badge: "bg-amber-100 text-amber-900", dot: "bg-amber-500", label: "Fix" },
  security: { badge: "bg-red-100 text-red-800", dot: "bg-red-500", label: "Seguridad" },
};

function formatDateEs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/changelog", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar el changelog");
        const data = (await res.json()) as { entries: ChangelogEntry[] };
        setEntries(data.entries ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F6F2] font-sans text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <header className="mb-10 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-[#01696F]">NELVYON</span>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-[#01696F]">
            ← Volver
          </Link>
        </header>

        <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
        <p className="mt-2 text-lg text-slate-600">Todas las actualizaciones de NELVYON, en tiempo real.</p>

        {loading ? <p className="mt-12 text-slate-500">Cargando…</p> : null}
        {error ? <p className="mt-12 text-red-600">{error}</p> : null}

        {!loading && !error ? (
          <ol className="relative mt-12 space-y-10 border-l-2 border-slate-200 pl-8">
            {entries.map((entry) => {
              const style = TYPE_STYLES[entry.type] ?? TYPE_STYLES.feature;
              return (
                <li key={entry.id} className="relative">
                  <span
                    className={`absolute -left-[2.125rem] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-[#F7F6F2] ${style.dot}`}
                    aria-hidden
                  />
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                      {style.label}
                    </span>
                    <span className="font-mono text-sm text-slate-500">v{entry.version}</span>
                    <time className="text-sm text-slate-500" dateTime={entry.publishedAt}>
                      {formatDateEs(entry.publishedAt)}
                    </time>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{entry.title}</h2>
                  <p className="mt-2 leading-relaxed text-slate-700">{entry.body}</p>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

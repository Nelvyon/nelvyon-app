"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { ApiError } from "@/core/api/types";
import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { osPlatformApi } from "@/features/os-shell/api";

export function OsEntityPreviewPage({
  title,
  description,
  load,
}: {
  title: string;
  description: string;
  load: () => Promise<{ total: number; items: { id: number; label: string; meta?: string }[] }>;
}) {
  const [total, setTotal] = useState<number | null>(null);
  const [items, setItems] = useState<{ id: number; label: string; meta?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await load();
        if (!cancelled) {
          setTotal(res.total);
          setItems(res.items.slice(0, 8));
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof ApiError
              ? `Error ${e.status}: ${e.message}`
              : e instanceof Error
                ? e.message
                : "No se pudo cargar",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <OsShellLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-white/55">{description}</p>
          <p className="mt-2 text-xs text-white/40">
            Vista previa (solo lectura). CRUD completo en fase 2B.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
            Consultando API real…
          </div>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {!loading && !error ? (
          <>
            <p className="text-lg font-medium text-white">
              {total === 0 ? "Sin datos todavía" : `${total} registros en el workspace`}
            </p>
            {items.length > 0 ? (
              <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#0b1428]">
                {items.map((row) => (
                  <li key={row.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <span className="text-white">{row.label}</span>
                    {row.meta ? <span className="text-white/45">{row.meta}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </OsShellLayout>
  );
}

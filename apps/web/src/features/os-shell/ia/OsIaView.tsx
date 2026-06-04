"use client";

import Link from "next/link";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { OsShellLayout } from "@/features/os-shell/components/OsShellLayout";
import { OsEmptyState, OsPageHeader } from "@/features/os-shell/components/ui/OsUi";

import { useOsIaInsights } from "./useOsIaInsights";

export function OsIaView() {
  const { insights, loading, error, reload } = useOsIaInsights();

  return (
    <OsShellLayout onRefresh={() => void reload()} refreshing={loading}>
      <OsPageHeader
        title="IA operativa"
        description="Resúmenes y alertas generados a partir de clientes, proyectos, entregas, pipeline y tareas reales del workspace. No es un chat genérico."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" />
          Analizando operación…
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && insights && !insights.hasData ? (
        <OsEmptyState
          title="Sin datos todavía"
          description="Crea clientes, proyectos o tareas en OS para obtener resúmenes y sugerencias."
        />
      ) : null}

      {!loading && insights?.hasData ? (
        <div className="space-y-8">
          {insights.blockers.length > 0 ? (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                Bloqueos detectados
              </h2>
              <ul className="mt-3 space-y-2">
                {insights.blockers.map((b, i) => (
                  <li key={`${b.label}-${i}`} className="text-sm text-white/85">
                    <span className="font-medium text-amber-200">[{b.severity}]</span> {b.label}:{" "}
                    {b.detail}
                    {b.href ? (
                      <>
                        {" "}
                        <Link href={b.href} className="text-[#0084FF] hover:underline">
                          Ver →
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-white/45">No hay bloqueos críticos detectados en los datos actuales.</p>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              <Sparkles className="h-4 w-4 text-[#0084FF]" />
              Tareas sugeridas
            </h2>
            {insights.suggestedTasks.length === 0 ? (
              <p className="text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <ul className="space-y-2">
                {insights.suggestedTasks.map((t, i) => (
                  <li
                    key={`${t.title}-${i}`}
                    className="rounded-lg border border-white/10 bg-[#0b1428] px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-white">{t.title}</p>
                    <p className="mt-1 text-xs text-white/50">{t.reason}</p>
                    <Link
                      href={
                        t.projectId
                          ? `/os/tareas/nuevo?project_id=${t.projectId}`
                          : t.clientId
                            ? `/os/tareas/nuevo?client_id=${t.clientId}`
                            : "/os/tareas/nuevo"
                      }
                      className="mt-2 inline-block text-xs text-[#0084FF] hover:underline"
                    >
                      Crear tarea →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
              <h2 className="text-sm font-semibold text-white">Resumen clientes</h2>
              {insights.clientSummaries.length === 0 ? (
                <p className="mt-3 text-sm text-white/40">Sin datos todavía</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {insights.clientSummaries.map((c) => (
                    <li key={c.clientId}>
                      <Link
                        href={`/os/clientes/${c.clientId}`}
                        className="font-medium text-[#0084FF] hover:underline"
                      >
                        {c.businessName}
                      </Link>
                      <p className="mt-1 text-xs text-white/55">{c.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
              <h2 className="text-sm font-semibold text-white">Resumen proyectos</h2>
              {insights.projectSummaries.length === 0 ? (
                <p className="mt-3 text-sm text-white/40">Sin datos todavía</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {insights.projectSummaries.map((p) => (
                    <li key={p.projectId}>
                      <Link
                        href={`/os/proyectos/${p.projectId}`}
                        className="font-medium text-[#0084FF] hover:underline"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-white/40">{p.clientName}</p>
                      <p className="mt-1 text-xs text-white/55">{p.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0b1428] p-5">
            <h2 className="text-sm font-semibold text-white">Resumen entregas recientes</h2>
            {insights.deliverySummaries.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">Sin datos todavía</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {insights.deliverySummaries.map((d) => (
                  <li key={d.outputId} className="text-sm">
                    <span className="text-white">{d.title}</span>
                    <span className="ml-2 text-white/40">({d.qaStatus})</span>
                    <p className="text-xs text-white/50">{d.summary}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/os/documentos" className="mt-4 inline-block text-xs text-[#0084FF] hover:underline">
              Biblioteca documentos →
            </Link>
          </section>

          <p className="text-xs text-white/35">
            Agentes sectoriales avanzados:{" "}
            <Link href="/os/agents" className="text-[#0084FF] hover:underline">
              /os/agents
            </Link>
          </p>
        </div>
      ) : null}
    </OsShellLayout>
  );
}

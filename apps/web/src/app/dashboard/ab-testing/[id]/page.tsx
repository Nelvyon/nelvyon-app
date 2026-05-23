"use client";

import { ArrowLeft, Pause, Play, Square, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { SimpleModal } from "@/features/builders/components/DashboardUi";
import { dashboardAbTestingApi } from "@/features/dashboard/api";

type Tab = "results" | "variants" | "config";

function str(v: unknown, fb = ""): string {
  if (v == null || v === "") return fb;
  return String(v);
}

export default function AbExperimentDetailPage() {
  const params = useParams();
  const id = str(params?.id);
  const [tab, setTab] = useState<Tab>("results");
  const [experiment, setExperiment] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [winnerModal, setWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState("");
  const [aiRec, setAiRec] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const [exp, res] = await Promise.all([dashboardAbTestingApi.get(id), dashboardAbTestingApi.results(id)]);
    setExperiment(exp);
    setResults(res);
    if (res.ai_recommendation) setAiRec(str(res.ai_recommendation));
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const variants = (results.variants as Record<string, unknown>[]) ?? (experiment.variants as Record<string, unknown>[]) ?? [];
  const winnerId = str(results.winner_variant_id || experiment.winner_variant_id);
  const status = str(experiment.status, "draft");
  const daily = (results.conversion_by_day as Record<string, unknown>[]) ?? [];

  const chartDays = useMemo(() => {
    const names: Record<string, string> = {};
    variants.forEach((v) => {
      names[str(v.variant_id || v.id)] = str(v.name);
    });
    return daily.map((d) => ({
      day: str(d.day),
      rows: Object.entries((d.variants as Record<string, Record<string, unknown>>) ?? {}).map(([vid, data]) => ({
        name: names[vid] ?? vid.slice(0, 8),
        rate: Number(data.conversion_rate ?? 0),
      })),
    }));
  }, [daily, variants]);

  async function start() {
    await dashboardAbTestingApi.start(id);
    toastSuccess("Experimento iniciado");
    load();
  }

  async function pause() {
    await dashboardAbTestingApi.pause(id);
    toastSuccess("Experimento pausado");
    load();
  }

  async function end() {
    await dashboardAbTestingApi.end(id);
    toastSuccess("Experimento finalizado");
    load();
  }

  async function declareWinner() {
    if (!selectedWinner) return;
    const res = await dashboardAbTestingApi.declareWinner(id, selectedWinner);
    setAiRec(str(res.ai_recommendation));
    setWinnerModal(false);
    toastSuccess("Ganador declarado");
    load();
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/ab-testing">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{str(experiment.name, "Experimento")}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{status}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {status === "draft" || status === "paused" ? (
              <Button size="sm" onClick={start}>
                <Play className="mr-1 h-4 w-4" /> Iniciar
              </Button>
            ) : null}
            {status === "running" ? (
              <Button size="sm" variant="outline" onClick={pause}>
                <Pause className="mr-1 h-4 w-4" /> Pausar
              </Button>
            ) : null}
            {status !== "ended" ? (
              <Button size="sm" variant="outline" onClick={end}>
                <Square className="mr-1 h-4 w-4" /> Finalizar
              </Button>
            ) : null}
            {!winnerId && variants.length > 0 ? (
              <Button size="sm" onClick={() => setWinnerModal(true)}>
                <Trophy className="mr-1 h-4 w-4" /> Declarar ganador
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {(["results", "variants", "config"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm capitalize",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(t)}
            >
              {t === "results" ? "Resultados" : t === "variants" ? "Variantes" : "Configuración"}
            </button>
          ))}
        </div>

        {tab === "results" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Chi-cuadrado</p>
                <p className="text-xl font-bold">{str(results.chi_square, "0")}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Confianza estadística</p>
                <p className="text-xl font-bold">{str(results.confidence_percent, "0")}%</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Significativo (p &lt; 0.05)</p>
                <p className="text-xl font-bold">{results.statistically_significant ? "Sí" : "No"}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Variante</th>
                    <th className="px-4 py-3 text-right">Impresiones</th>
                    <th className="px-4 py-3 text-right">Conversiones</th>
                    <th className="px-4 py-3 text-right">Tasa</th>
                    <th className="px-4 py-3 text-right">Ingresos</th>
                    <th className="px-4 py-3 text-left">Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const vid = str(v.variant_id || v.id);
                    const isWinner = winnerId && winnerId === vid;
                    const rate = Number(v.conversion_rate ?? 0);
                    const conf = Number(results.confidence_percent ?? 0);
                    return (
                      <tr key={vid} className={cn("border-t", isWinner && "bg-green-50 dark:bg-green-950/20")}>
                        <td className="px-4 py-3 font-medium">
                          {str(v.name)}
                          {v.is_control ? " (control)" : ""}
                          {isWinner ? <span className="ml-2 text-xs text-green-600">Ganador</span> : null}
                        </td>
                        <td className="px-4 py-3 text-right">{str(v.impressions, "0")}</td>
                        <td className="px-4 py-3 text-right">{str(v.conversions, "0")}</td>
                        <td className="px-4 py-3 text-right">{rate}%</td>
                        <td className="px-4 py-3 text-right">{Number(v.revenue ?? 0).toFixed(2)}€</td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-full max-w-[120px] rounded bg-muted">
                            <div
                              className="h-2 rounded bg-primary"
                              style={{ width: `${Math.min(conf, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {chartDays.length > 0 ? (
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-medium">Conversión por día</h3>
                <div className="space-y-2 text-xs">
                  {chartDays.map((d) => (
                    <div key={d.day} className="flex flex-wrap items-center gap-3">
                      <span className="w-24 text-muted-foreground">{d.day}</span>
                      {d.rows.map((r) => (
                        <span key={r.name} className="rounded bg-muted px-2 py-1">
                          {r.name}: {r.rate}%
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {aiRec ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950/30">
                <p className="mb-1 font-medium text-green-800 dark:text-green-400">Recomendación IA</p>
                <p className="whitespace-pre-wrap text-green-900 dark:text-green-200">{aiRec}</p>
              </div>
            ) : null}
          </div>
        )}

        {tab === "variants" && (
          <div className="grid gap-4 md:grid-cols-2">
            {(experiment.variants as Record<string, unknown>[])?.map((v) => (
              <div key={str(v.id)} className="rounded-lg border p-4">
                <h3 className="font-medium">
                  {str(v.name)}
                  {v.is_control ? " (control)" : ""}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{str(v.description, "Sin descripción")}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(v.changes ?? {}, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {tab === "config" && (
          <div className="max-w-lg space-y-3 rounded-lg border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Hipótesis:</span> {str(experiment.hypothesis, "—")}
            </p>
            <p>
              <span className="text-muted-foreground">Métrica:</span> {str(experiment.metric_goal)}
            </p>
            <p>
              <span className="text-muted-foreground">Reparto tráfico:</span>{" "}
              {JSON.stringify(experiment.traffic_split ?? {})}
            </p>
            <p>
              <span className="text-muted-foreground">Inicio:</span> {str(experiment.started_at, "—")}
            </p>
            <p>
              <span className="text-muted-foreground">Fin:</span> {str(experiment.ended_at, "—")}
            </p>
          </div>
        )}

        <SimpleModal open={winnerModal} onClose={() => setWinnerModal(false)} title="Declarar ganador">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecciona la variante ganadora. Se generará una recomendación con IA.</p>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
            >
              <option value="">— Elegir variante —</option>
              {variants.map((v) => {
                const vid = str(v.variant_id || v.id);
                return (
                  <option key={vid} value={vid}>
                    {str(v.name)} ({str(v.conversion_rate, "0")}%)
                  </option>
                );
              })}
            </select>
            <Button onClick={declareWinner} disabled={!selectedWinner}>
              Confirmar ganador
            </Button>
          </div>
        </SimpleModal>
      </div>
    </ProtectedLayout>
  );
}

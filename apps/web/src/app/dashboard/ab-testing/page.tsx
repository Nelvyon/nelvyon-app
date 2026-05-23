"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { dashboardAbTestingApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  running: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ended: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

type VariantForm = { name: string; description: string; changes: string; is_control: boolean };

export default function AbTestingPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    hypothesis: "",
    metric_goal: "conversion",
    traffic_split: "50/50",
  });
  const [variants, setVariants] = useState<VariantForm[]>([
    { name: "Control", description: "Versión original sin cambios", changes: "{}", is_control: true },
    { name: "Variante A", description: "", changes: "{}", is_control: false },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardAbTestingApi.list();
    setItems(res.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  function resetWizard() {
    setStep(1);
    setForm({ name: "", hypothesis: "", metric_goal: "conversion", traffic_split: "50/50" });
    setVariants([
      { name: "Control", description: "Versión original", changes: "{}", is_control: true },
      { name: "Variante A", description: "", changes: "{}", is_control: false },
    ]);
  }

  async function createExperiment(launch = false) {
    const splitParts = form.traffic_split.split("/").map((s) => parseInt(s.trim(), 10));
    const traffic_split: Record<string, number> = {};
    variants.forEach((_, i) => {
      traffic_split[String(i)] = splitParts[i] ?? Math.floor(100 / variants.length);
    });
    const payload = {
      name: form.name,
      hypothesis: form.hypothesis,
      metric_goal: form.metric_goal,
      traffic_split,
      variants: variants.map((v) => ({
        name: v.name,
        description: v.description,
        is_control: v.is_control,
        changes: (() => {
          try {
            return JSON.parse(v.changes || "{}");
          } catch {
            return {};
          }
        })(),
      })),
    };
    const created = await dashboardAbTestingApi.create(payload);
    if (launch && created.id) {
      await dashboardAbTestingApi.start(String(created.id));
    }
    setModal(false);
    resetWizard();
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este experimento?")) return;
    await dashboardAbTestingApi.delete(id);
    load();
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { name: `Variante ${String.fromCharCode(65 + prev.length - 1)}`, description: "", changes: "{}", is_control: false },
    ]);
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GitBranch className="h-7 w-7 text-primary" aria-hidden />
              A/B Testing
            </h1>
            <p className="text-sm text-muted-foreground">Experimentos visuales con significancia estadística</p>
          </div>
          <Button
            onClick={() => {
              resetWizard();
              setModal(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo experimento
          </Button>
        </div>

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nuevo experimento"
          emptyDescription="Crea tu primer experimento para optimizar conversiones."
          emptyTitle="Sin experimentos A/B"
          loading={loading}
          onEmptyAction={() => {
            setStep(1);
            setModal(true);
          }}
          skeleton={<SkeletonTable />}
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Variantes</th>
                  <th className="px-4 py-3 text-left font-medium">Métrica</th>
                  <th className="px-4 py-3 text-left font-medium">Conversión</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((exp) => {
                  const id = str(exp.id);
                  const status = str(exp.status, "draft");
                  return (
                    <tr key={id} className="border-t transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/ab-testing/${id}`} className="font-medium hover:underline">
                          {str(exp.name)}
                        </Link>
                        {exp.winner_variant_id ? (
                          <span className="ml-2 text-xs text-green-600">Ganador declarado</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", STATUS_COLORS[status] ?? STATUS_COLORS.draft)}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{str(exp.variant_count, "0")}</td>
                      <td className="px-4 py-3 capitalize">{str(exp.metric_goal)}</td>
                      <td className="px-4 py-3">{str(exp.conversion_rate, "0")}%</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline" className="mr-2">
                          <Link href={`/dashboard/ab-testing/${id}`}>Ver</Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => remove(id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal open={modal} onClose={() => setModal(false)} title="Nuevo experimento A/B">
          <div className="space-y-4">
            <div className="flex gap-2 text-xs">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={cn("rounded-full px-2 py-1", step === s ? "bg-primary text-primary-foreground" : "bg-muted")}
                >
                  Paso {s}
                </span>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-sm">
                  Nombre
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Hipótesis
                  <textarea
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    rows={3}
                    value={form.hypothesis}
                    onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Métrica objetivo
                  <select
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    value={form.metric_goal}
                    onChange={(e) => setForm({ ...form, metric_goal: e.target.value })}
                  >
                    <option value="conversion">Conversión</option>
                    <option value="clicks">Clicks</option>
                    <option value="revenue">Ingresos</option>
                  </select>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div key={i} className="rounded border p-3 space-y-2">
                    <input
                      className="w-full rounded border px-2 py-1 text-sm font-medium"
                      value={v.name}
                      onChange={(e) => {
                        const next = [...variants];
                        next[i] = { ...v, name: e.target.value };
                        setVariants(next);
                      }}
                    />
                    <textarea
                      className="w-full rounded border px-2 py-1 text-sm"
                      placeholder="Descripción de cambios (texto, color, CTA…)"
                      rows={2}
                      value={v.description}
                      onChange={(e) => {
                        const next = [...variants];
                        next[i] = { ...v, description: e.target.value };
                        setVariants(next);
                      }}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-1 h-3 w-3" /> Añadir variante
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <label className="block text-sm">
                  Reparto de tráfico (ej: 50/50 o 33/33/34)
                  <input
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    value={form.traffic_split}
                    onChange={(e) => setForm({ ...form, traffic_split: e.target.value })}
                  />
                </label>
                <div className="rounded bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{form.name || "Experimento"}</p>
                  <p className="text-muted-foreground">{form.hypothesis || "Sin hipótesis"}</p>
                  <p className="mt-2">{variants.length} variantes · Métrica: {form.metric_goal}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  Anterior
                </Button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <Button type="button" onClick={() => setStep(step + 1)} disabled={step === 1 && !form.name.trim()}>
                  Siguiente
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => createExperiment(false)}>
                    Guardar borrador
                  </Button>
                  <Button type="button" onClick={() => createExperiment(true)}>
                    Lanzar experimento
                  </Button>
                </div>
              )}
            </div>
          </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

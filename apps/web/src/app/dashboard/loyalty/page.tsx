"use client";

import { Plus, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { dashboardLoyaltyApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

const DEFAULT_RULES = [
  { trigger: "purchase", points: 0, description: "Puntos por euro gastado" },
  { trigger: "referral", points: 100, description: "Referir un amigo" },
  { trigger: "review", points: 50, description: "Dejar una reseña" },
  { trigger: "birthday", points: 200, description: "Bonus cumpleaños" },
];

export default function LoyaltyDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [leaderboard, setLeaderboard] = useState<Row[]>([]);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [program, setProgram] = useState<Record<string, unknown> | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "Programa de fidelización", points_per_euro: 1 });
  const [config, setConfig] = useState({ points_per_euro: 1, reward_rules: DEFAULT_RULES });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const data = await dashboardLoyaltyApi.summary();
    setSummary(data);
    const prog = (data.program as Record<string, unknown>) ?? null;
    setProgram(prog);
    if (prog?.id) {
      const pid = str(prog.id);
      const [lb, stats] = await Promise.all([
        dashboardLoyaltyApi.leaderboard(pid),
        dashboardLoyaltyApi.stats(pid),
      ]);
      setLeaderboard(lb.items ?? []);
      setTransactions((stats.recent_transactions as Row[]) ?? []);
      const rules = prog.reward_rules;
      setConfig({
        points_per_euro: Number(prog.points_per_euro ?? 1),
        reward_rules: Array.isArray(rules) ? (rules as typeof DEFAULT_RULES) : DEFAULT_RULES,
      });
    } else {
      setLeaderboard([]);
      setTransactions([]);
    }
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function createProgram() {
    await dashboardLoyaltyApi.create({
      name: form.name,
      points_per_euro: Number(form.points_per_euro),
      reward_rules: DEFAULT_RULES,
    });
    setModal(false);
    toastSuccess("Programa creado");
    load();
  }

  async function saveConfig() {
    if (!program?.id) return;
    await dashboardLoyaltyApi.update(str(program.id), {
      points_per_euro: config.points_per_euro,
      reward_rules: config.reward_rules,
    });
    toastSuccess("Configuración guardada");
    load();
  }

  const metrics = [
    { label: "Puntos emitidos", value: str(summary.points_issued, "0") },
    { label: "Puntos canjeados", value: str(summary.points_redeemed, "0") },
    { label: "Clientes activos", value: str(summary.active_customers, "0") },
    { label: "Coste estimado", value: `${str(summary.estimated_cost_euros, "0")}€` },
  ];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Star className="h-7 w-7 text-primary" aria-hidden />
              Loyalty / Puntos
            </h1>
            <p className="text-sm text-muted-foreground">Programa de fidelización con tiers y recompensas</p>
          </div>
          {!program ? (
            <Button onClick={() => setModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Crear programa
            </Button>
          ) : null}
        </div>

        <MetricGrid items={metrics} loading={loading} />

        {program ? (
          <>
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 font-semibold">Configuración — {str(program.name)}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  Puntos por euro
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    value={config.points_per_euro}
                    onChange={(e) => setConfig({ ...config, points_per_euro: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Reglas de recompensa</p>
                {config.reward_rules.map((rule, i) => (
                  <div key={rule.trigger} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
                    <span className="w-24 capitalize">{rule.trigger}</span>
                    <input
                      type="number"
                      className="w-20 rounded border px-2 py-1"
                      value={rule.points}
                      onChange={(e) => {
                        const next = [...config.reward_rules];
                        next[i] = { ...rule, points: Number(e.target.value) };
                        setConfig({ ...config, reward_rules: next });
                      }}
                    />
                    <span className="text-muted-foreground">pts</span>
                    <span className="flex-1">{rule.description}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4" onClick={saveConfig}>
                Guardar configuración
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h2 className="mb-3 font-semibold">Leaderboard — Top 10</h2>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin clientes con puntos aún.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">#</th>
                        <th className="py-2">Cliente</th>
                        <th className="py-2">Tier</th>
                        <th className="py-2 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((c, i) => (
                        <tr key={str(c.customer_email)} className="border-b">
                          <td className="py-2">{i + 1}</td>
                          <td className="py-2">{str(c.customer_email)}</td>
                          <td className="py-2">{str(c.tier, "Bronze")}</td>
                          <td className="py-2 text-right font-medium">{str(c.points_balance, "0")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h2 className="mb-3 font-semibold">Transacciones recientes</h2>
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2">Cliente</th>
                          <th className="py-2">Tipo</th>
                          <th className="py-2 text-right">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={str(t.id)} className="border-b">
                            <td className="py-2">{str(t.customer_email)}</td>
                            <td className="py-2 capitalize">{str(t.type)}</td>
                            <td className="py-2 text-right">{str(t.points)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <DashboardListShell
            empty
            emptyActionLabel="Crear programa"
            emptyDescription="Crea un programa de fidelización para empezar a otorgar puntos a tus clientes."
            emptyTitle="Sin programa de loyalty"
            loading={loading}
            onEmptyAction={() => setModal(true)}
            skeleton={<SkeletonList />}
          >
            <span className="sr-only">placeholder</span>
          </DashboardListShell>
        )}

        <EliteModal open={modal} onClose={() => setModal(false)} title="Nuevo programa loyalty">
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
              Puntos por euro
              <input
                type="number"
                min={0}
                step={0.1}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.points_per_euro}
                onChange={(e) => setForm({ ...form, points_per_euro: Number(e.target.value) })}
              />
            </label>
            <Button onClick={createProgram}>Crear programa</Button>
          </div>
        </EliteModal>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}

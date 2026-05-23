"use client";

import { Database, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { SimpleModal } from "@/features/builders/components/DashboardUi";
import { MetricGrid } from "@/features/dashboard/components/DashboardTabs";
import { dashboardCdpApi } from "@/features/dashboard/api";

type Tab = "profiles" | "segments" | "events";
type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

type Condition = { field: string; operator: string; value: string };

export default function CdpDashboardPage() {
  const [tab, setTab] = useState<Tab>("profiles");
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [segments, setSegments] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Record<string, unknown> | null>(null);
  const [modal, setModal] = useState(false);
  const [segName, setSegName] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "total_purchases", operator: "gt", value: "0" },
  ]);

  const load = useCallback(async () => {
    const [st, prof, seg, ev] = await Promise.all([
      dashboardCdpApi.stats(),
      dashboardCdpApi.profiles(),
      dashboardCdpApi.segments(),
      dashboardCdpApi.events(),
    ]);
    setStats(st);
    setProfiles(prof.items ?? []);
    setSegments(seg.items ?? []);
    setEvents(ev.items ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    const t = setInterval(() => {
      if (tab === "events") {
        dashboardCdpApi.events().then((r) => setEvents(r.items ?? [])).catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [load, tab]);

  async function openProfile(userId: string) {
    const p = await dashboardCdpApi.profile(userId);
    setSelectedProfile(p);
  }

  async function createSegment() {
    await dashboardCdpApi.createSegment({ name: segName, conditions });
    setModal(false);
    setSegName("");
    toastSuccess("Segmento creado");
    load();
  }

  async function evaluate(id: string) {
    const res = await dashboardCdpApi.evaluateSegment(id);
    toastSuccess(`${str(res.count, "0")} usuarios en el segmento`);
    load();
  }

  async function syncCrm(id: string) {
    const res = await dashboardCdpApi.syncSegment(id);
    toastSuccess(`Sincronizados ${str(res.synced_contacts, "0")} contactos`);
  }

  const metrics = [
    { label: "Perfiles unificados", value: str(stats.unified_profiles, "0") },
    { label: "Eventos (24h)", value: str(stats.events_last_24h, "0") },
    { label: "Segmentos activos", value: str(stats.active_segments, "0") },
  ];

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Database className="h-7 w-7 text-primary" aria-hidden />
            CDP — Customer Data Platform
          </h1>
          <p className="text-sm text-muted-foreground">Perfiles unificados, segmentos dinámicos y sync CRM</p>
        </div>

        <MetricGrid items={metrics} />

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {(["profiles", "segments", "events"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm capitalize",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setTab(t)}
            >
              {t === "profiles" ? "Perfiles" : t === "segments" ? "Segmentos" : "Eventos"}
            </button>
          ))}
        </div>

        {tab === "profiles" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Fuentes</th>
                    <th className="px-4 py-3 text-left">Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr
                      key={str(p.user_id)}
                      className="cursor-pointer border-t hover:bg-muted/30"
                      onClick={() => openProfile(str(p.user_id))}
                    >
                      <td className="px-4 py-3">{str(p.email, str(p.user_id))}</td>
                      <td className="px-4 py-3">{Array.isArray(p.sources) ? (p.sources as string[]).join(", ") : "—"}</td>
                      <td className="px-4 py-3">{str(p.last_seen, "—").slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedProfile ? (
              <div className="rounded-lg border p-4 text-sm">
                <h3 className="mb-2 font-semibold">Perfil — {str(selectedProfile.user_id)}</h3>
                <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(selectedProfile.profile ?? selectedProfile, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un perfil para ver detalle.</p>
            )}
          </div>
        )}

        {tab === "segments" && (
          <div className="space-y-4">
            <Button onClick={() => setModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo segmento
            </Button>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Usuarios</th>
                    <th className="px-4 py-3 text-left">Evaluado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s) => {
                    const id = str(s.id);
                    const conds = s.conditions;
                    return (
                      <tr key={id} className="border-t">
                        <td className="px-4 py-3 font-medium">{str(s.name)}</td>
                        <td className="px-4 py-3">{str(s.user_count, "0")}</td>
                        <td className="px-4 py-3">{str(s.last_evaluated_at, "—").slice(0, 16)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => evaluate(id)}>
                            Evaluar
                          </Button>
                          <Button size="sm" onClick={() => syncCrm(id)}>
                            Sync CRM
                          </Button>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {Array.isArray(conds) ? `${(conds as unknown[]).length} condiciones (AND)` : ""}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "events" && (
          <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-lg border p-3">
            {events.map((ev) => (
              <div key={str(ev.id)} className="flex flex-wrap gap-2 rounded border p-2 text-xs">
                <span className="rounded bg-primary/10 px-2 py-0.5 capitalize">{str(ev.source)}</span>
                <span className="font-medium">{str(ev.event_type)}</span>
                <span className="text-muted-foreground">{str(ev.user_id || ev.anonymous_id, "anon")}</span>
                <span className="ml-auto text-muted-foreground">{str(ev.created_at).slice(0, 19)}</span>
              </div>
            ))}
          </div>
        )}

        <SimpleModal open={modal} onClose={() => setModal(false)} title="Nuevo segmento">
          <div className="space-y-3">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Nombre del segmento"
              value={segName}
              onChange={(e) => setSegName(e.target.value)}
            />
            <p className="text-sm font-medium">Condiciones (AND)</p>
            {conditions.map((c, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input
                  className="w-32 rounded border px-2 py-1 text-sm"
                  value={c.field}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[i] = { ...c, field: e.target.value };
                    setConditions(next);
                  }}
                />
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={c.operator}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[i] = { ...c, operator: e.target.value };
                    setConditions(next);
                  }}
                >
                  <option value="gt">gt</option>
                  <option value="lt">lt</option>
                  <option value="eq">eq</option>
                  <option value="contains">contains</option>
                </select>
                <input
                  className="flex-1 rounded border px-2 py-1 text-sm"
                  value={c.value}
                  onChange={(e) => {
                    const next = [...conditions];
                    next[i] = { ...c, value: e.target.value };
                    setConditions(next);
                  }}
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setConditions([...conditions, { field: "last_seen", operator: "lt", value: "30d" }])}>
              + Condición
            </Button>
            <Button onClick={createSegment} disabled={!segName.trim()}>
              Crear segmento
            </Button>
          </div>
        </SimpleModal>
      </div>
    </ProtectedLayout>
  );
}

"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardCrmApi } from "@/features/dashboard/api";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

type Row = Record<string, unknown>;

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const TABS = [
  { id: "contactos", label: "Contactos" },
  { id: "deals", label: "Deals" },
  { id: "pipeline", label: "Pipeline" },
  { id: "actividades", label: "Actividades" },
  { id: "analytics", label: "Analytics" },
];

export default function CrmDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("contactos");
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Row[]>([]);
  const [deals, setDeals] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [pipeline, setPipeline] = useState<Row | null>(null);
  const [stats, setStats] = useState<Row | null>(null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", company: "" });

  const loadContacts = useCallback(async (q?: string) => {
    const res = await dashboardCrmApi.contacts(q);
    setContacts(res.items ?? []);
  }, []);

  const loadDeals = useCallback(async () => {
    const res = await dashboardCrmApi.deals();
    setDeals(res.items ?? []);
  }, []);

  const loadActivities = useCallback(async () => {
    const res = await dashboardCrmApi.activities();
    setActivities(res.items ?? []);
  }, []);

  const loadPipeline = useCallback(async () => {
    const res = await dashboardCrmApi.pipeline();
    setPipeline(res);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await dashboardCrmApi.stats();
    setStats(res);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadContacts().catch(() => setContacts([])),
      loadDeals().catch(() => setDeals([])),
      loadActivities().catch(() => setActivities([])),
      loadPipeline().catch(() => setPipeline(null)),
      loadStats().catch(() => setStats(null)),
    ]).finally(() => setLoading(false));
  }, [loadContacts, loadDeals, loadActivities, loadPipeline, loadStats]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadContacts(search.trim() || undefined).catch(() => setContacts([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search, loadContacts]);

  const columns = useMemo(() => {
    const cols = (pipeline?.columns as Row[] | undefined) ?? [];
    return cols.length > 0
      ? cols
      : ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"].map((stage) => ({
          stage,
          deals: [],
          deal_count: 0,
          total_value: 0,
        }));
  }, [pipeline]);

  async function onDropStage(stage: string) {
    if (!dragDealId) return;
    await dashboardCrmApi.moveDeal(dragDealId, stage);
    setDragDealId(null);
    loadPipeline();
    loadDeals();
  }

  async function createContact() {
    await dashboardCrmApi.createContact(contactForm);
    setContactModal(false);
    setContactForm({ name: "", email: "", company: "" });
    loadContacts();
    loadStats();
  }

  const metricItems = stats
    ? [
        { label: "Contactos", value: num(stats.contacts) },
        { label: "Deals totales", value: num(stats.total_deals) },
        { label: "Pipeline (€)", value: num(stats.pipeline_value).toLocaleString("es-ES") },
        { label: "Win rate", value: `${num(stats.win_rate_percent)}%` },
      ]
    : [];

  return (
    <ProtectedLayout module="crm">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">CRM</h1>
            <p className="text-sm text-muted-foreground">Contactos, pipeline y actividades comerciales</p>
          </div>
          <Button onClick={() => setContactModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo contacto
          </Button>
        </div>

        <MetricGrid items={metricItems} loading={loading} />

        <DashboardTabs active={tab} onChange={setTab} tabs={TABS} />

        {tab === "contactos" ? (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contactos…"
                value={search}
              />
            </div>
            <DashboardListShell
          empty={!loading && contacts.length === 0}
          emptyDescription="Añade tu primer contacto al CRM."
          emptyTitle="Sin contactos"
          emptyActionLabel="Nuevo contacto"
          onEmptyAction={() => setContactModal(true)}
          loading={loading}
          skeleton={<SkeletonTable />}
        >
        <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr className="border-b last:border-0 transition-colors hover:bg-muted/50" key={str(c.id)}>
                      <td className="px-4 py-3 font-medium">{str(c.name)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{str(c.email)}</td>
                      <td className="px-4 py-3">{str(c.company)}</td>
                      <td className="px-4 py-3">{num(c.score)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={str(c.status, "active")} />
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/crm/contactos/${c.id}`}>Ver</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </DashboardListShell>
          </div>
        ) : null}

        {tab === "deals" ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-4 py-3 font-medium">Probabilidad</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr className="border-b last:border-0 transition-colors hover:bg-muted/50" key={str(d.id)}>
                    <td className="px-4 py-3 font-medium">{str(d.title)}</td>
                    <td className="px-4 py-3">
                      {num(d.value).toLocaleString("es-ES")} {str(d.currency, "EUR")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={str(d.stage, "lead")} />
                    </td>
                    <td className="px-4 py-3">{num(d.probability)}%</td>
                  </tr>
                ))}
                {deals.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>
                      No hay deals
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "pipeline" ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((col) => {
              const stage = str(col.stage);
              const stageDeals = (col.deals as Row[] | undefined) ?? [];
              return (
                <div
                  className="min-w-[220px] flex-1 rounded-xl border bg-muted/20 p-3"
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropStage(stage)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize">{stage.replace("_", " ")}</h3>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map((deal) => (
                      <div
                        className="cursor-grab rounded-lg border bg-card p-3 shadow-card active:cursor-grabbing"
                        draggable
                        key={str(deal.id)}
                        onDragStart={() => setDragDealId(str(deal.id))}
                      >
                        <p className="text-sm font-medium">{str(deal.title)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {num(deal.value).toLocaleString("es-ES")} {str(deal.currency, "EUR")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {tab === "actividades" ? (
          <div className="space-y-3">
            {activities.map((a) => (
              <article className="rounded-xl border bg-card p-4 shadow-card" key={str(a.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">{str(a.type)}</span>
                  <span className="text-xs text-muted-foreground">{str(a.created_at)}</span>
                </div>
                <p className="mt-2 text-sm">{str(a.description)}</p>
                {a.outcome ? <p className="mt-1 text-xs text-muted-foreground">Resultado: {str(a.outcome)}</p> : null}
              </article>
            ))}
            {activities.length === 0 ? (
              <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No hay actividades</p>
            ) : null}
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="space-y-6">
            <MetricGrid
              items={[
                { label: "Contactos", value: num(stats?.contacts) },
                { label: "Deals ganados", value: num(stats?.deals_won) },
                { label: "Deals perdidos", value: num(stats?.deals_lost) },
                { label: "Ticket medio", value: `${num(stats?.avg_deal_size).toLocaleString("es-ES")} €` },
                { label: "Pipeline abierto", value: `${num(stats?.open_deal_value_sum).toLocaleString("es-ES")} €` },
                { label: "Pipeline ponderado", value: `${num(stats?.weighted_pipeline_value).toLocaleString("es-ES")} €` },
                { label: "Win rate", value: `${num(stats?.win_rate_percent)}%` },
                { label: "Total deals", value: num(stats?.total_deals) },
              ]}
            />
          </div>
        ) : null}
      </DashboardPageTransition>

      <EliteModal onClose={() => setContactModal(false)} open={contactModal} title="Nuevo contacto">
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            placeholder="Nombre"
            value={contactForm.name}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            placeholder="Email"
            type="email"
            value={contactForm.email}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
            placeholder="Empresa"
            value={contactForm.company}
          />
          <Button disabled={!contactForm.name.trim()} onClick={createContact}>
            Crear contacto
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

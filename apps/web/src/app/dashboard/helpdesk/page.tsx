"use client";

import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardHelpdeskApi } from "@/features/dashboard/api";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

type Row = Record<string, unknown>;

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

export default function HelpdeskDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filters, setFilters] = useState({ status: "", priority: "", channel: "" });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    channel: "web",
    subject: "",
    first_message: "",
    priority: "medium",
    client_name: "",
    client_email: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.channel) params.set("channel", filters.channel);
    const qs = params.toString();
    const [tickets, stats] = await Promise.all([
      dashboardHelpdeskApi.tickets(qs || undefined),
      dashboardHelpdeskApi.stats(),
    ]);
    setItems(tickets.items ?? []);
    setOpenCount(Number(stats.open_count ?? 0));
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load().catch(() => {
      setItems([]);
      setOpenCount(0);
    });
  }, [load]);

  async function createTicket() {
    await dashboardHelpdeskApi.create({
      channel: form.channel,
      subject: form.subject,
      first_message: form.first_message,
      priority: form.priority,
      contact: {
        client_name: form.client_name || undefined,
        client_email: form.client_email || undefined,
      },
    });
    setModal(false);
    setForm({
      channel: "web",
      subject: "",
      first_message: "",
      priority: "medium",
      client_name: "",
      client_email: "",
    });
    load();
  }

  return (
    <ProtectedLayout module="inbox">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Helpdesk</h1>
            <p className="text-sm text-muted-foreground">Tickets multicanal — email, web y WhatsApp</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo ticket
          </Button>
        </div>

        <MetricGrid items={[{ label: "Tickets abiertos", value: openCount }]} loading={loading} />

        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            value={filters.status}
          >
            <option value="">Todos los estados</option>
            <option value="open">Abierto</option>
            <option value="pending">Pendiente</option>
            <option value="resolved">Resuelto</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            value={filters.priority}
          >
            <option value="">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            value={filters.channel}
          >
            <option value="">Todos los canales</option>
            <option value="email">Email</option>
            <option value="web">Web</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nuevo ticket"
          emptyDescription="Crea un ticket o espera nuevas conversaciones de soporte."
          emptyTitle="Sin tickets"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonTable />}
        >
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Asunto</th>
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr className="border-b last:border-0 transition-colors hover:bg-muted/50" key={str(t.id)}>
                    <td className="px-4 py-3 text-muted-foreground">{str(t.id)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{str(t.subject)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{str(t.channel)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={str(t.priority, "medium")} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={str(t.status, "open")} />
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/helpdesk/${t.id}`}>Abrir</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nuevo ticket">
        <div className="grid gap-3">
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
            value={form.channel}
          >
            <option value="web">Web</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            value={form.priority}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Asunto"
            value={form.subject}
          />
          <textarea
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, first_message: e.target.value })}
            placeholder="Primer mensaje"
            rows={4}
            value={form.first_message}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Nombre del cliente (opcional)"
            value={form.client_name}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            placeholder="Email del cliente (opcional)"
            type="email"
            value={form.client_email}
          />
          <Button
            disabled={!form.subject.trim() || !form.first_message.trim()}
            onClick={createTicket}
          >
            Crear ticket
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

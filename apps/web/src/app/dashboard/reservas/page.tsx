"use client";

import { CalendarCheck, Copy, Link2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { dashboardBookingsApi } from "@/features/dashboard/api";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";

interface BookingRow {
  id: number;
  client_name?: string;
  client_email?: string;
  service_name?: string;
  start_at?: string;
  status?: string;
}

export default function ReservasDashboardPage() {
  const { workspaceId } = useWorkspace();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    service_name: "",
    start_at: "",
    duration_minutes: 30,
  });

  const publicLink = useMemo(() => {
    if (typeof window === "undefined" || !workspaceId) return "";
    return `${window.location.origin}/reservas/${workspaceId}`;
  }, [workspaceId]);

  const load = useCallback(async () => {
    const res = await dashboardBookingsApi.list();
    setItems((res.items as unknown as BookingRow[]) ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function create() {
    await dashboardBookingsApi.create({
      client: { client_name: form.client_name, client_email: form.client_email },
      service_name: form.service_name,
      start_at: form.start_at,
      duration_minutes: form.duration_minutes,
    });
    setModal(false);
    setForm({ client_name: "", client_email: "", service_name: "", start_at: "", duration_minutes: 30 });
    load();
  }

  async function copyLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Reservas</h1>
            <p className="text-sm text-muted-foreground">Gestión de citas y reservas online</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva reserva
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Enlace público de reservas</p>
                <p className="text-xs text-muted-foreground break-all">{publicLink || "Selecciona un workspace"}</p>
              </div>
            </div>
            <Button disabled={!publicLink} onClick={copyLink} size="sm" variant="outline">
              <Copy className="mr-2 h-4 w-4" /> {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-3">Cliente</th>
                <th className="p-3">Servicio</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr className="border-b" key={b.id}>
                  <td className="p-3">
                    <p className="font-medium">{b.client_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{b.client_email ?? ""}</p>
                  </td>
                  <td className="p-3">{b.service_name ?? "—"}</td>
                  <td className="p-3">
                    {b.start_at ? new Date(b.start_at).toLocaleString("es-ES") : "—"}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={b.status ?? "pending"} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {b.status !== "confirmed" ? (
                        <Button onClick={() => dashboardBookingsApi.confirm(b.id).then(load)} size="sm" variant="outline">
                          Confirmar
                        </Button>
                      ) : null}
                      {b.status !== "cancelled" ? (
                        <Button onClick={() => dashboardBookingsApi.cancel(b.id).then(load)} size="sm" variant="outline">
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    <CalendarCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No hay reservas todavía
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <SimpleModal onClose={() => setModal(false)} open={modal} title="Nueva reserva" wide>
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Nombre del cliente"
            value={form.client_name}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            placeholder="Email"
            type="email"
            value={form.client_email}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            placeholder="Servicio"
            value={form.service_name}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, start_at: e.target.value })}
            type="datetime-local"
            value={form.start_at}
          />
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            value={form.duration_minutes}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
          <Button disabled={!form.client_name || !form.client_email || !form.service_name || !form.start_at} onClick={create}>
            Crear reserva
          </Button>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}

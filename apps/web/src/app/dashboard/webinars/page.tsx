"use client";

import { Bell, Play, Plus, Rocket, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { DashboardTabs, MetricGrid, DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";
import { dashboardWebinarsApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function formatPrice(cents: unknown): string {
  const n = Number(cents ?? 0);
  if (n <= 0) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n / 100);
}

export default function WebinarsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 60,
    host_name: "",
    thumbnail_url: "",
    is_free: true,
    price_eur: 0,
    max_attendees: "",
    idioma: "es",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardWebinarsApi.list();
    setItems(res.items ?? []);
    setSummary(res.summary ?? {});
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      setItems([]);
      setSummary({});
    });
  }, [load]);

  async function createWebinar() {
    await dashboardWebinarsApi.create({
      title: form.title,
      description: form.description,
      scheduled_at: form.scheduled_at || new Date().toISOString(),
      duration_minutes: Number(form.duration_minutes),
      host_name: form.host_name,
      thumbnail_url: form.thumbnail_url || undefined,
      is_free: form.is_free,
      price_cents: form.is_free ? 0 : Math.round(Number(form.price_eur) * 100),
      max_attendees: form.max_attendees ? Number(form.max_attendees) : undefined,
      idioma: form.idioma,
    });
    setModal(false);
    toastSuccess("Webinar creado");
    load();
  }

  async function publish(id: string) {
    await dashboardWebinarsApi.publish(id);
    toastSuccess("Webinar publicado");
    load();
  }

  async function start(id: string) {
    await dashboardWebinarsApi.start(id);
    toastSuccess("Webinar en vivo");
    load();
  }

  async function reminder(id: string) {
    const res = await dashboardWebinarsApi.reminder(id);
    toastSuccess(`Recordatorios enviados: ${str(res.reminders_sent, "0")}`);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar webinar?")) return;
    await dashboardWebinarsApi.delete(id);
    load();
  }

  const next = summary.next_webinar as Record<string, unknown> | undefined;
  const metrics = [
    { label: "Webinars activos", value: str(summary.active_webinars, "0") },
    { label: "Registrados totales", value: str(summary.total_registrations, "0") },
    { label: "Próximo webinar", value: next ? str(next.title) : "—" },
    { label: "Ingresos", value: formatPrice(summary.revenue_cents) },
  ];

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Video className="h-7 w-7 text-primary" aria-hidden />
              Webinars
            </h1>
            <p className="text-sm text-muted-foreground">Eventos en vivo con registro, Zoom y recordatorios</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo webinar
          </Button>
        </div>

        <MetricGrid items={metrics} loading={loading} />

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nuevo webinar"
          emptyDescription="Crea tu primer webinar para empezar a captar registrados."
          emptyTitle="Sin webinars"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonTable />}
        >
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Título</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Registrados</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => {
                  const id = str(w.id);
                  const status = str(w.status, "draft");
                  return (
                    <tr key={id} className="border-t transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{str(w.title)}</td>
                      <td className="px-4 py-3">{str(w.scheduled_at, "—").slice(0, 16)}</td>
                      <td className="px-4 py-3">{str(w.registrations_count, "0")}</td>
                      <td className="px-4 py-3 capitalize">{status}</td>
                      <td className="px-4 py-3 text-right">
                        {status === "draft" ? (
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => publish(id)}>
                            <Rocket className="mr-1 h-3 w-3" /> Publicar
                          </Button>
                        ) : null}
                        {status === "published" ? (
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => start(id)}>
                            <Play className="mr-1 h-3 w-3" /> Iniciar
                          </Button>
                        ) : null}
                        {status !== "draft" ? (
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => reminder(id)}>
                            <Bell className="mr-1 h-3 w-3" /> Recordatorio
                          </Button>
                        ) : null}
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

      <EliteModal open={modal} onClose={() => setModal(false)} title="Nuevo webinar">
          <div className="space-y-3">
            <label className="block text-sm">
              Título
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block text-sm">
              Descripción
              <textarea className="mt-1 w-full rounded border px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="block text-sm">
              Fecha y hora
              <input type="datetime-local" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </label>
            <label className="block text-sm">
              Host
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} />
            </label>
            <label className="block text-sm">
              Duración (min)
              <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
              Gratis
            </label>
            {!form.is_free ? (
              <label className="block text-sm">
                Precio (€)
                <input type="number" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.price_eur} onChange={(e) => setForm({ ...form, price_eur: Number(e.target.value) })} />
              </label>
            ) : null}
            <Button onClick={createWebinar} disabled={!form.title.trim()}>
              Crear webinar
            </Button>
          </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

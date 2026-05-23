"use client";

import { AlertTriangle, MessageSquare, Plus, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardCrmApi, dashboardSmsApi } from "@/features/dashboard/api";
import { MetricGrid } from "@/features/dashboard/components/DashboardTabs";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";

interface SmsCampaign {
  id: string;
  name?: string;
  message?: string;
  status?: string;
  sent_count?: number;
  delivered_count?: number;
  scheduled_at?: string;
  created_at?: string;
}

export default function SmsDashboardPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [contacts, setContacts] = useState<{ id: string; name?: string; phone?: string }[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", scheduled_at: "", contact_ids: [] as string[] });

  const load = useCallback(async () => {
    const [cRes, sRes, crmRes] = await Promise.all([
      dashboardSmsApi.listCampaigns(),
      dashboardSmsApi.stats(),
      dashboardCrmApi.contacts(),
    ]);
    setCampaigns((cRes.items as unknown as SmsCampaign[]) ?? []);
    setStats(sRes);
    const items = (crmRes.items ?? []) as Record<string, unknown>[];
    setContacts(
      items
        .filter((c) => c.phone)
        .map((c) => ({ id: String(c.id), name: String(c.name ?? ""), phone: String(c.phone ?? "") })),
    );
  }, []);

  useEffect(() => {
    load().catch(() => {
      setCampaigns([]);
      setStats({});
    });
  }, [load]);

  const twilioOk = Boolean(stats.twilio_configured);
  const charCount = form.message.length;
  const segments = Math.ceil(charCount / 160) || 0;

  async function createCampaign() {
    await dashboardSmsApi.createCampaign({
      name: form.name,
      message: form.message,
      scheduled_at: form.scheduled_at || undefined,
    });
    setModal(false);
    setForm({ name: "", message: "", scheduled_at: "", contact_ids: [] });
    load();
  }

  async function sendNow(campaign: SmsCampaign) {
    const ids = form.contact_ids.length ? form.contact_ids : contacts.slice(0, 50).map((c) => c.id);
    await dashboardSmsApi.sendCampaign(campaign.id, ids);
    load();
  }

  const metrics = [
    { label: "SMS este mes", value: String(stats.sent_this_month ?? 0) },
    { label: "Tasa entrega", value: `${stats.delivery_rate ?? 0}%` },
    { label: "Entregados", value: String(stats.delivered_this_month ?? 0) },
    { label: "Opt-outs", value: String(stats.opt_outs ?? 0) },
  ];

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">SMS Marketing</h1>
            <p className="text-sm text-muted-foreground">Campañas SMS con Twilio</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva campaña
          </Button>
        </div>

        {!twilioOk ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Twilio no está configurado</p>
              <p className="mt-1 text-amber-800 dark:text-amber-200">
                Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER en el backend, o revisa{" "}
                <Link className="underline" href="/dashboard/settings">
                  Configuración
                </Link>
                .
              </p>
            </div>
          </div>
        ) : null}

        <MetricGrid items={metrics} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{c.name}</h2>
                </div>
                <StatusBadge status={c.status ?? "draft"} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Enviados: {c.sent_count ?? 0} · Entregados: {c.delivered_count ?? 0}
              </p>
              {c.scheduled_at ? (
                <p className="text-xs text-muted-foreground">
                  Programado: {new Date(c.scheduled_at).toLocaleString("es-ES")}
                </p>
              ) : null}
              <Button
                className="mt-4 w-full"
                disabled={!twilioOk || c.status === "pending_auth"}
                onClick={() => sendNow(c)}
                size="sm"
              >
                <Send className="mr-2 h-4 w-4" /> Enviar ahora
              </Button>
            </article>
          ))}
        </div>
      </div>

      <SimpleModal onClose={() => setModal(false)} open={modal} title="Nueva campaña SMS" wide>
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre de la campaña"
            value={form.name}
          />
          <div>
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              maxLength={1600}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Mensaje SMS"
              rows={4}
              value={form.message}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {charCount} caracteres · ~{segments} segmento(s)
            </p>
          </div>
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            type="datetime-local"
            value={form.scheduled_at}
          />
          <div>
            <p className="mb-2 text-sm font-medium">Contactos (con teléfono)</p>
            <div className="max-h-40 overflow-y-auto rounded border p-2">
              {contacts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay contactos con teléfono en CRM.</p>
              ) : (
                contacts.map((c) => (
                  <label className="flex items-center gap-2 py-1 text-sm" key={c.id}>
                    <input
                      checked={form.contact_ids.includes(c.id)}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          contact_ids: e.target.checked
                            ? [...f.contact_ids, c.id]
                            : f.contact_ids.filter((x) => x !== c.id),
                        }));
                      }}
                      type="checkbox"
                    />
                    {c.name || c.phone} ({c.phone})
                  </label>
                ))
              )}
            </div>
          </div>
          <Button disabled={!form.name || !form.message} onClick={createCampaign}>
            Crear campaña
          </Button>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}

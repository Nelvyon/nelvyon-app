"use client";

import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardCampaignsApi } from "@/features/dashboard/api";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";

type Row = Record<string, unknown>;

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

export default function CampanasDashboardPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    platform: "email",
    campaign_type: "newsletter",
    project_id: 1,
    target_audience: "",
    content: "",
  });

  const load = useCallback(async () => {
    const res = await dashboardCampaignsApi.list();
    setItems(res.items ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  function resetWizard() {
    setStep(0);
    setForm({
      name: "",
      platform: "email",
      campaign_type: "newsletter",
      project_id: 1,
      target_audience: "",
      content: "",
    });
  }

  async function createCampaign() {
    await dashboardCampaignsApi.create({
      ...form,
      status: "draft",
      content: form.content || "[]",
    });
    setModal(false);
    resetWizard();
    load();
  }

  return (
    <ProtectedLayout module="campaigns">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Campañas</h1>
            <p className="text-sm text-muted-foreground">Email marketing y campañas multicanal</p>
          </div>
          <Button
            onClick={() => {
              resetWizard();
              setModal(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nueva campaña
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={str(c.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{str(c.name, "Sin nombre")}</h2>
                </div>
                <StatusBadge status={str(c.status, "draft")} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {str(c.platform)} · {str(c.campaign_type)}
              </p>
              {c.target_audience ? (
                <p className="mt-1 text-xs text-muted-foreground">Audiencia: {str(c.target_audience)}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/campanas/${c.id}`}>Editor</Link>
                </Button>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <p className="col-span-full rounded-xl border p-8 text-center text-sm text-muted-foreground">
              No hay campañas. Crea la primera.
            </p>
          ) : null}
        </div>
      </div>

      <SimpleModal
        onClose={() => {
          setModal(false);
          resetWizard();
        }}
        open={modal}
        title={`Nueva campaña — paso ${step + 1}/3`}
        wide
      >
        {step === 0 ? (
          <div className="grid gap-3">
            <input
              className="rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre de la campaña"
              value={form.name}
            />
            <select
              className="rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              value={form.platform}
            >
              <option value="email">Email</option>
              <option value="social">Social</option>
              <option value="ads">Ads</option>
            </select>
            <select
              className="rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
              value={form.campaign_type}
            >
              <option value="newsletter">Newsletter</option>
              <option value="promo">Promoción</option>
              <option value="nurture">Nurture</option>
              <option value="announcement">Anuncio</option>
            </select>
            <Button disabled={!form.name.trim()} onClick={() => setStep(1)}>
              Siguiente
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3">
            <input
              className="rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              placeholder="Audiencia objetivo"
              value={form.target_audience}
            />
            <textarea
              className="rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Contenido inicial (opcional, editable en el editor)"
              rows={4}
              value={form.content}
            />
            <div className="flex gap-2">
              <Button onClick={() => setStep(0)} variant="outline">
                Atrás
              </Button>
              <Button onClick={() => setStep(2)}>Siguiente</Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p>
                <strong>{form.name}</strong>
              </p>
              <p className="mt-1 text-muted-foreground">
                {form.platform} · {form.campaign_type}
              </p>
              {form.target_audience ? (
                <p className="mt-1 text-muted-foreground">Audiencia: {form.target_audience}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline">
                Atrás
              </Button>
              <Button onClick={createCampaign}>Crear campaña</Button>
            </div>
          </div>
        ) : null}
      </SimpleModal>
    </ProtectedLayout>
  );
}

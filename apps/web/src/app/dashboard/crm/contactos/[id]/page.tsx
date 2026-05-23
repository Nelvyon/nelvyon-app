"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { dashboardCrmApi } from "@/features/dashboard/api";
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

export default function ContactDetailPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [contact, setContact] = useState<Row | null>(null);
  const [deals, setDeals] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "call", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    if (!id) return;
    const [c, d, a] = await Promise.all([
      dashboardCrmApi.contact(id),
      dashboardCrmApi.deals(),
      dashboardCrmApi.activities(),
    ]);
    setContact(c);
    setDeals((d.items ?? []).filter((row) => String(row.contact_id) === id));
    setActivities((a.items ?? []).filter((row) => String(row.contact_id) === id));
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => {
      setContact(null);
      setDeals([]);
      setActivities([]);
    });
  }, [load]);

  const notes = useMemo(() => {
    const meta = contact?.metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const m = meta as Record<string, unknown>;
      if (typeof m.notes === "string") return m.notes;
    }
    return typeof contact?.notes === "string" ? contact.notes : "";
  }, [contact]);

  async function createActivity() {
    if (!id || !activityForm.description.trim()) return;
    await dashboardCrmApi.createActivity({
      contact_id: id,
      type: activityForm.type,
      description: activityForm.description,
    });
    setActivityModal(false);
    setActivityForm({ type: "call", description: "" });
    load();
  }

  return (
    <ProtectedLayout module="crm">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/crm">← CRM</Link>
          </Button>
          <h1 className="text-2xl font-bold">{str(contact?.name, "Contacto")}</h1>
          {contact?.status ? <StatusBadge status={str(contact.status)} /> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 shadow-card md:col-span-1">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Información</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{str(contact?.email)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>{str(contact?.phone)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Empresa</dt>
                <dd>{str(contact?.company)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Score</dt>
                <dd>{num(contact?.score)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4 md:col-span-2">
            <section className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Actividades</h2>
                <Button onClick={() => setActivityModal(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Nueva actividad
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {activities.map((a) => (
                  <div className="rounded-lg border p-3" key={str(a.id)}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium uppercase">{str(a.type)}</span>
                      <span>{str(a.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm">{str(a.description)}</p>
                  </div>
                ))}
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividades registradas</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 shadow-card">
              <h2 className="font-semibold">Deals</h2>
              <div className="mt-4 space-y-2">
                {deals.map((d) => (
                  <div className="flex items-center justify-between rounded-lg border p-3 text-sm" key={str(d.id)}>
                    <span className="font-medium">{str(d.title)}</span>
                    <div className="flex items-center gap-2">
                      <span>{num(d.value).toLocaleString("es-ES")} €</span>
                      <StatusBadge status={str(d.stage, "lead")} />
                    </div>
                  </div>
                ))}
                {deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin deals asociados</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border bg-card p-5 shadow-card">
              <h2 className="font-semibold">Notas</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {notes || "Sin notas"}
              </p>
            </section>
          </div>
        </div>
      </DashboardPageTransition>

      <EliteModal onClose={() => setActivityModal(false)} open={activityModal} title="Nueva actividad">
        <div className="grid gap-3">
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
            value={activityForm.type}
          >
            <option value="call">Llamada</option>
            <option value="email">Email</option>
            <option value="meeting">Reunión</option>
            <option value="task">Tarea</option>
          </select>
          <textarea
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
            placeholder="Descripción"
            rows={4}
            value={activityForm.description}
          />
          <Button disabled={!activityForm.description.trim()} onClick={createActivity}>
            Guardar actividad
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

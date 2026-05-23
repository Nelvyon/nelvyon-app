"use client";

import Link from "next/link";
import { Plus, Workflow } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { dashboardWorkflowsApi } from "@/features/dashboard/api";
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

export default function AutomatizacionDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_type: "contact_created",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardWorkflowsApi.list();
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

  async function createWorkflow() {
    await dashboardWorkflowsApi.create({
      ...form,
      status: "draft",
      nodes_json: JSON.stringify([
        { id: "trigger_1", type: "trigger", label: form.trigger_type, config: {} },
        { id: "action_1", type: "action", label: "send_email", config: {} },
      ]),
    });
    setModal(false);
    setForm({ name: "", description: "", trigger_type: "contact_created" });
    load();
  }

  return (
    <ProtectedLayout module="automations">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Automatización</h1>
            <p className="text-sm text-muted-foreground">Workflows y reglas de negocio</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo workflow
          </Button>
        </div>

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nuevo workflow"
          emptyDescription="Automatiza tareas repetitivas con flujos visuales."
          emptyTitle="Sin workflows"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={str(w.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{str(w.name)}</h2>
                </div>
                <StatusBadge status={str(w.status, "draft")} />
              </div>
              {w.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{str(w.description)}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Trigger: {str(w.trigger_type)} · Ejecuciones: {num(w.runs_count)}
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/automatizacion/${w.id}`}>Editor</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nuevo workflow">
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre"
            value={form.name}
          />
          <textarea
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción"
            rows={2}
            value={form.description}
          />
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
            value={form.trigger_type}
          >
            <option value="contact_created">Contacto creado</option>
            <option value="deal_stage_changed">Cambio de etapa deal</option>
            <option value="ticket_created">Ticket creado</option>
            <option value="form_submitted">Formulario enviado</option>
          </select>
          <Button disabled={!form.name.trim()} onClick={createWorkflow}>
            Crear workflow
          </Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}

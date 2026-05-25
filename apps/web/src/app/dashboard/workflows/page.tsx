"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { DashboardListShell, DashboardPageTransition, SkeletonList } from "@/features/dashboard/components/DashboardTabs";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import { workflowsApi, type Workflow } from "@/features/workflows/api";

function str(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

export default function WorkflowsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Workflow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workflowsApi.list();
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function createNew() {
    try {
      const wf = await workflowsApi.create({
        name: "Nuevo workflow",
        description: "",
        nodes: [
          {
            id: "trigger_1",
            nodeType: "contact_created",
            category: "trigger",
            label: "Contact Created",
            config: {},
            position: { x: 80, y: 120 },
          },
          {
            id: "end_1",
            nodeType: "end",
            category: "end",
            label: "End",
            config: {},
            position: { x: 400, y: 120 },
          },
        ],
        edges: [{ id: "e1", source: "trigger_1", target: "end_1" }],
      });
      router.push(`/dashboard/workflows/editor?id=${wf.id}`);
    } catch {
      /* preserved */
    }
  }

  return (
    <ProtectedLayout module="automations">
      <DashboardPageTransition>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-sm text-muted-foreground">Editor visual de automatizaciones avanzadas</p>
          </div>
          <Button onClick={createNew}>
            <Plus className="mr-2 h-4 w-4" /> Crear workflow
          </Button>
        </div>

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Crear workflow"
          emptyDescription="Automatizaciones visuales con drag & drop."
          emptyTitle="Sin workflows"
          loading={loading}
          onEmptyAction={createNew}
          skeleton={<SkeletonList />}
        >
          <WorkflowGrid items={items} />
        </DashboardListShell>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}

function WorkflowGrid({ items }: { items: Workflow[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((w) => (
        <article className="rounded-xl border bg-card p-5 shadow-card" key={w.id}>
          <WorkflowCard workflow={w} />
        </article>
      ))}
    </div>
  );
}

function WorkflowCard({ workflow: w }: { workflow: Workflow }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{w.name}</h2>
        </div>
        <StatusBadge status={w.is_active ? "active" : str(w.status, "draft")} />
      </div>
      {w.description ? <p className="mt-2 text-sm text-muted-foreground">{w.description}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Trigger: {str(w.trigger_type)} · Ejecuciones: {w.runs_count ?? 0}
      </p>
      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/workflows/editor?id=${w.id}`}>Abrir editor</Link>
        </Button>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { dashboardWorkflowsApi } from "@/features/dashboard/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

type WorkflowNode = {
  id: string;
  type: "trigger" | "condition" | "action";
  label: string;
  config: Record<string, unknown>;
};

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function parseNodes(raw: unknown): WorkflowNode[] {
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? (p as WorkflowNode[]) : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as WorkflowNode[];
  return [];
}

const NODE_COLORS: Record<WorkflowNode["type"], string> = {
  trigger: "border-blue-300 bg-blue-50",
  condition: "border-amber-300 bg-amber-50",
  action: "border-green-300 bg-green-50",
};

export default function WorkflowEditorPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    dashboardWorkflowsApi.get(id).then((w) => {
      setWorkflow(w);
      const parsed = parseNodes(w.nodes_json);
      setNodes(
        parsed.length > 0
          ? parsed
          : [
              { id: "trigger_1", type: "trigger", label: str(w.trigger_type, "trigger"), config: {} },
              { id: "condition_1", type: "condition", label: "if_score_gt_50", config: { field: "score", op: "gt", value: 50 } },
              { id: "action_1", type: "action", label: "send_email", config: { template: "welcome" } },
            ],
      );
    });
  }, [id]);

  function addNode(type: WorkflowNode["type"]) {
    const node: WorkflowNode = {
      id: `${type}_${Date.now()}`,
      type,
      label: type === "trigger" ? "new_trigger" : type === "condition" ? "new_condition" : "new_action",
      config: {},
    };
    setNodes([...nodes, node]);
    setSelected(node.id);
  }

  function updateNodeLabel(nodeId: string, label: string) {
    setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)));
  }

  function removeNode(nodeId: string) {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    if (selected === nodeId) setSelected(null);
  }

  async function save() {
    if (!Number.isFinite(id)) return;
    setSaving(true);
    try {
      await dashboardWorkflowsApi.update(id, { nodes_json: JSON.stringify(nodes) });
      const w = await dashboardWorkflowsApi.get(id);
      setWorkflow(w);
    } finally {
      setSaving(false);
    }
  }

  const sel = nodes.find((n) => n.id === selected);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <ProtectedLayout module="automations">
        <p className="text-sm text-destructive">ID de workflow inválido</p>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link className="text-sm text-muted-foreground" href="/dashboard/automatizacion">
            ← Automatización
          </Link>
          <h1 className="text-xl font-bold">{str(workflow?.name, "Workflow")}</h1>
          {workflow?.status ? <StatusBadge status={str(workflow.status)} /> : null}
          <div className="ml-auto flex gap-2">
            <Button onClick={() => addNode("condition")} size="sm" variant="outline">
              + Condición
            </Button>
            <Button onClick={() => addNode("action")} size="sm" variant="outline">
              + Acción
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="min-h-[420px] rounded-xl border bg-muted/20 p-6">
              <div className="flex flex-col items-center gap-4">
                {nodes.map((node, i) => (
                  <div className="flex w-full max-w-md flex-col items-center" key={node.id}>
                    <button
                      className={`w-full rounded-xl border-2 p-4 text-left shadow-card transition ${NODE_COLORS[node.type]} ${selected === node.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelected(node.id)}
                      type="button"
                    >
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{node.type}</span>
                      <p className="mt-1 font-medium">{node.label}</p>
                    </button>
                    {i < nodes.length - 1 ? (
                      <div className="my-1 h-8 w-px bg-border" aria-hidden />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-xl border p-4 lg:col-span-4">
            <h2 className="text-sm font-semibold">Propiedades del nodo</h2>
            {sel ? (
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <p className="text-sm capitalize">{sel.type}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Etiqueta</label>
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    onChange={(e) => updateNodeLabel(sel.id, e.target.value)}
                    value={sel.label}
                  />
                </div>
                {sel.type !== "trigger" ? (
                  <Button onClick={() => removeNode(sel.id)} size="sm" variant="outline">
                    Eliminar nodo
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Selecciona un nodo para editarlo</p>
            )}
          </aside>
        </div>
      </div>
    </ProtectedLayout>
  );
}

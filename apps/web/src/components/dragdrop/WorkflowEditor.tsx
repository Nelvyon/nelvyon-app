"use client";

import { useEffect, useMemo, useState } from "react";

type WorkflowNodeType = "trigger" | "agent" | "condition" | "delay" | "notification";

type CanvasNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};

type CanvasEdge = {
  id: string;
  source: string;
  target: string;
};

type WorkflowDto = {
  id: string;
  name: string;
  description: string | null;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

const BLOCKS: Array<{ type: WorkflowNodeType; label: string; defaults?: Record<string, unknown> }> = [
  { type: "trigger", label: "Trigger", defaults: { trigger: "manual" } },
  { type: "agent", label: "Agent", defaults: { serviceId: "seo_premium" } },
  { type: "condition", label: "Condition", defaults: { expression: "score > 70" } },
  { type: "delay", label: "Delay", defaults: { minutes: 15 } },
  { type: "notification", label: "Notification", defaults: { channel: "email" } },
];

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function WorkflowEditor() {
  const [workflows, setWorkflows] = useState<WorkflowDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Nuevo workflow");
  const [description, setDescription] = useState("");
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const selectedWorkflow = useMemo(() => workflows.find((w) => w.id === selectedId) ?? null, [workflows, selectedId]);

  async function fetchWorkflows(): Promise<void> {
    const res = await fetch("/api/saas/workflows");
    if (!res.ok) throw new Error("No se pudieron cargar workflows");
    const data = (await res.json()) as { workflows: WorkflowDto[] };
    setWorkflows(data.workflows ?? []);
  }

  useEffect(() => {
    fetchWorkflows().catch(() => setStatus("Error cargando workflows"));
  }, []);

  useEffect(() => {
    if (!selectedWorkflow) return;
    setName(selectedWorkflow.name);
    setDescription(selectedWorkflow.description ?? "");
    setNodes(selectedWorkflow.nodes ?? []);
    setEdges(selectedWorkflow.edges ?? []);
  }, [selectedWorkflow]);

  function onDragStart(type: WorkflowNodeType, label: string, defaults: Record<string, unknown> | undefined): (ev: React.DragEvent) => void {
    return (ev) => {
      ev.dataTransfer.setData("application/workflow-node", JSON.stringify({ type, label, defaults: defaults ?? {} }));
      ev.dataTransfer.effectAllowed = "copy";
    };
  }

  function onDropCanvas(ev: React.DragEvent<HTMLDivElement>): void {
    ev.preventDefault();
    const raw = ev.dataTransfer.getData("application/workflow-node");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { type: WorkflowNodeType; label: string; defaults: Record<string, unknown> };
      const rect = ev.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.round(ev.clientX - rect.left));
      const y = Math.max(0, Math.round(ev.clientY - rect.top));
      setNodes((prev) => [
        ...prev,
        { id: uid(), type: parsed.type, label: parsed.label, data: parsed.defaults ?? {}, position: { x, y } },
      ]);
      setStatus("");
    } catch {
      setStatus("No se pudo agregar el bloque");
    }
  }

  async function saveWorkflow(): Promise<void> {
    if (!name.trim()) {
      setStatus("El nombre es requerido");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const payload = { name: name.trim(), description: description.trim() || null, nodes, edges };
      if (selectedId) {
        const res = await fetch(`/api/saas/workflows/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("update_failed");
      } else {
        const res = await fetch("/api/saas/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("create_failed");
        const json = (await res.json()) as { workflow?: WorkflowDto };
        if (json.workflow?.id) setSelectedId(json.workflow.id);
      }
      await fetchWorkflows();
      setStatus("Workflow guardado");
    } catch {
      setStatus("Error guardando workflow");
    } finally {
      setLoading(false);
    }
  }

  async function executeWorkflow(): Promise<void> {
    if (!selectedId) {
      setStatus("Guarda el workflow antes de ejecutar");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`/api/saas/workflows/${selectedId}/execute`, { method: "POST" });
      if (!res.ok) throw new Error("execute_failed");
      const data = (await res.json()) as { jobIds?: string[] };
      setStatus(`Ejecutado: ${data.jobIds?.length ?? 0} jobs`);
    } catch {
      setStatus("Error ejecutando workflow");
    } finally {
      setLoading(false);
    }
  }

  function clearCanvas(): void {
    setNodes([]);
    setEdges([]);
    setStatus("Canvas limpiado");
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Workflow Editor</h2>
        <div className="flex gap-2">
          <button className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700" disabled={loading} onClick={saveWorkflow} type="button">
            Guardar
          </button>
          <button className="rounded bg-indigo-700 px-3 py-1 text-sm hover:bg-indigo-600" disabled={loading} onClick={executeWorkflow} type="button">
            Ejecutar
          </button>
          <button className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700" onClick={clearCanvas} type="button">
            Limpiar
          </button>
        </div>
      </header>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre workflow"
          value={name}
        />
        <input
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 sm:col-span-2"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          value={description}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded border border-zinc-800 bg-zinc-900 p-3">
          <h3 className="mb-2 text-sm font-medium">Bloques</h3>
          <div className="space-y-2">
            {BLOCKS.map((block) => (
              <div
                className="cursor-grab rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm hover:bg-zinc-700"
                draggable
                key={block.type}
                onDragStart={onDragStart(block.type, block.label, block.defaults)}
              >
                {block.label}
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-4 text-sm font-medium">Workflows</h3>
          <div className="space-y-1">
            {workflows.map((w) => (
              <button
                className={`block w-full rounded px-2 py-1 text-left text-xs ${
                  w.id === selectedId ? "bg-indigo-700 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                type="button"
              >
                {w.name}
              </button>
            ))}
          </div>
        </aside>

        <div
          className="relative min-h-[520px] rounded border border-dashed border-zinc-700 bg-zinc-900"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropCanvas}
        >
          {nodes.map((node) => (
            <div
              className="absolute w-44 rounded border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs shadow-lg"
              key={node.id}
              style={{ left: node.position.x, top: node.position.y }}
            >
              <div className="font-semibold text-zinc-100">{node.label}</div>
              <div className="text-zinc-400">{node.type}</div>
            </div>
          ))}
          {nodes.length === 0 ? (
            <p className="absolute left-4 top-4 text-sm text-zinc-500">Arrastra bloques aquí para construir tu secuencia.</p>
          ) : null}
        </div>
      </div>

      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}

export default WorkflowEditor;

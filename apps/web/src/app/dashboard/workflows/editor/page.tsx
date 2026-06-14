"use client";

import "@xyflow/react/dist/style.css";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ArrowLeft, Play, Save, Zap } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { workflowsApi, type WorkflowEdge, type WorkflowNode } from "@/features/workflows/api";
import { NODE_PALETTE, findNodeDef, type NodeDef } from "@/features/workflows/nodeConfig";

type FlowNodeData = {
  label: string;
  nodeType: string;
  category: string;
  color: string;
  config: Record<string, unknown>;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function WorkflowFlowNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const isTrigger = data.category === "trigger";
  const isEnd = data.category === "end";
  const isIf = data.nodeType === "if_condition";

  return (
    <div
      className={cn(
        "min-w-[160px] rounded-lg border-2 bg-card px-3 py-2 shadow-md",
        selected ? "border-primary ring-2 ring-primary/30            " : "border-border",
      )}
      style={{ borderLeftColor: data.color, borderLeftWidth: 4 }}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-primary" />
      )}
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{data.category}</p>
      <p className="text-sm font-semibold">{data.label}</p>
      {!isEnd && (
        <Handle type="source" position={Position.Right} id="default" className="!h-3 !w-3 !bg-primary" />
      )}
      {isIf && (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: "30%" }} className="!bg-emerald-500" />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: "70%" }} className="!bg-red-500" />
        </>
      )}
    </div>
  );
}

const nodeTypes = { workflow: WorkflowFlowNode };

function toFlowNodes(nodes: WorkflowNode[]): Node<FlowNodeData>[] {
  return nodes.map((n) => {
    const def = findNodeDef(n.nodeType);
    return {
      id: n.id,
      type: "workflow",
      position: n.position ?? { x: 0, y: 0 },
      data: {
        label: n.label || def?.label || n.nodeType,
        nodeType: n.nodeType,
        category: n.category,
        color: def?.color ?? "#64748b",
        config: n.config ?? {},
      },
    };
  });
}

function toFlowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
  }));
}

function fromFlowNodes(nodes: Node<FlowNodeData>[]): WorkflowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    nodeType: n.data.nodeType,
    category: n.data.category as WorkflowNode["category"],
    label: n.data.label,
    config: n.data.config,
    position: n.position,
  }));
}

function fromFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));
}

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const workflowId = Number(params?.get("id") || 0);

  const [name, setName] = useState("Workflow");
  const [description, setDescription] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const selectedDef = useMemo(
    () => (selectedNode ? findNodeDef(selectedNode.data.nodeType) : undefined),
    [selectedNode],
  );

  useEffect(() => {
    if (!workflowId) {
      router.replace("/automatizacion/flujos");
      return;
    }
    workflowsApi
      .getById(workflowId)
      .then((wf) => {
        setName(wf.name);
        setDescription(wf.description ?? "");
        setIsActive(Boolean(wf.is_active));
        setNodes(toFlowNodes(wf.nodes ?? []));
        setEdges(toFlowEdges(wf.edges ?? []));
      })
      .catch(() => setStatus("Error cargando workflow"))
      .finally(() => setLoading(false));
  }, [workflowId, router, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      const raw = ev.dataTransfer.getData("application/reactflow");
      if (!raw) return;
      try {
        const def = JSON.parse(raw) as NodeDef;
        const bounds = (ev.currentTarget as HTMLElement).getBoundingClientRect();
        const id = uid();
        const newNode: Node<FlowNodeData> = {
          id,
          type: "workflow",
          position: { x: ev.clientX - bounds.left - 80, y: ev.clientY - bounds.top - 40 },
          data: {
            label: def.label,
            nodeType: def.nodeType,
            category: def.category,
            color: def.color,
            config: {},
          },
        };
        setNodes((nds) => nds.concat(newNode));
      } catch {
        setStatus("No se pudo añadir el nodo");
      }
    },
    [setNodes],
  );

  const onDragStart = (ev: React.DragEvent, def: NodeDef) => {
    ev.dataTransfer.setData("application/reactflow", JSON.stringify(def));
    ev.dataTransfer.effectAllowed = "move";
  };

  const updateSelectedConfig = (key: string, value: unknown) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n,
      ),
    );
  };

  async function save() {
    setStatus("Guardando…");
    try {
      await workflowsApi.update(workflowId, {
        name,
        description,
        nodes: fromFlowNodes(nodes),
        edges: fromFlowEdges(edges),
      });
      setStatus("Guardado");
    } catch {
      setStatus("Error al guardar");
    }
  }

  async function activate() {
    await save();
    try {
      await workflowsApi.activate(workflowId);
      setIsActive(true);
      setStatus("Workflow activado");
    } catch {
      setStatus("Error al activar");
    }
  }

  async function testRun() {
    try {
      const result = await workflowsApi.trigger(workflowId, { test: true });
      setStatus(`Test: ${result.status} (${result.steps?.length ?? 0} pasos)`);
    } catch {
      setStatus("Error en test");
    }
  }

  if (loading) {
    return <p className="p-8 text-muted-foreground">Cargando editor…</p>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/automatizacion/flujos">
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver
          </Link>
        </Button>
        <input
          className="min-w-[200px] flex-1 rounded-md border bg-background px-3 py-1.5 text-sm font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {isActive ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">Activo</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Borrador</span>
        )}
        <Button size="sm" variant="outline" onClick={save}>
          <Save className="mr-1 h-4 w-4" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={activate}>
          <Zap className="mr-1 h-4 w-4" /> Activate
        </Button>
        <Button size="sm" onClick={testRun}>
          <Play className="mr-1 h-4 w-4" /> Test
        </Button>
        {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r bg-muted/30 p-3">
          {Object.entries(NODE_PALETTE).map(([group, defs]) => (
            <div className="mb-4" key={group}>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group}</p>
              <div className="space-y-1">
                {defs.map((def) => (
                  <div
                    key={def.nodeType}
                    draggable
                    onDragStart={(ev) => onDragStart(ev, def)}
                    className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs shadow-sm active:cursor-grabbing"
                    style={{ borderLeft: `3px solid ${def.color}` }}
                  >
                    <def.icon className="h-3.5 w-3.5 shrink-0" />
                    {def.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <aside className="w-72 shrink-0 overflow-y-auto border-l bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Configuración del nodo</h3>
          {!selectedNode || !selectedDef ? (
            <p className="text-sm text-muted-foreground">Selecciona un nodo en el canvas.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {selectedDef.label} ({selectedNode.data.nodeType})
              </p>
              {selectedDef.fields.map((field) => (
                <label className="block text-xs" key={field.key}>
                  <span className="mb-1 block font-medium">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                      rows={3}
                      value={String(selectedNode.data.config[field.key] ?? "")}
                      onChange={(e) => updateSelectedConfig(field.key, e.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                      value={String(selectedNode.data.config[field.key] ?? field.options?.[0] ?? "")}
                      onChange={(e) => updateSelectedConfig(field.key, e.target.value)}
                    >
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      className="w-full rounded border bg-background px-2 py-1 text-sm"
                      value={String(selectedNode.data.config[field.key] ?? "")}
                      onChange={(e) =>
                        updateSelectedConfig(
                          field.key,
                          field.type === "number" ? Number(e.target.value) : e.target.value,
                        )
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function WorkflowEditorPage() {
  return (
    <ProtectedLayout module="automations">
      <Suspense fallback={<p className="p-8">Cargando…</p>}>
        <ReactFlowProvider>
          <EditorInner />
        </ReactFlowProvider>
      </Suspense>
    </ProtectedLayout>
  );
}

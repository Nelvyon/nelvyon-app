"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Type catalogs ────────────────────────────────────────────────────────────
// Triggers: all 16 pass straight through to SaasWorkflow.triggerType (no silent
// remap on publish) — see DragDropWorkflowService.publishAsSaasWorkflow.
const TRIGGER_TYPES = [
  "manual", "contact_created", "contact_updated", "stage_changed", "deal_stage_changed",
  "job_completed", "scheduled", "form_submitted", "tag_added", "email_opened",
  "email_clicked", "webhook_in", "date_reached", "sequence_enrolled", "review_received", "score_threshold",
] as const;
const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual", contact_created: "Contacto creado", contact_updated: "Contacto actualizado",
  stage_changed: "Cambio etapa contacto", deal_stage_changed: "Cambio etapa oportunidad",
  job_completed: "Pack OS completado", scheduled: "Programado", form_submitted: "Formulario enviado",
  tag_added: "Etiqueta añadida", email_opened: "Email abierto", email_clicked: "Clic en email",
  webhook_in: "Webhook entrante", date_reached: "Fecha alcanzada", sequence_enrolled: "Secuencia iniciada",
  review_received: "Reseña recibida", score_threshold: "Umbral de scoring",
};

// Actions: SOLO los 4 tipos que DragDropWorkflowService.publishAsSaasWorkflow
// mapea de forma explícita. Cualquier otro tipo degradaría en silencio a
// "notify" al publicar — no se ofrecen en el editor visual para no mentir
// sobre lo que realmente se publicará.
const ACTION_TYPES = ["send_email", "notify", "add_tag", "webhook_out"] as const;
const ACTION_LABELS: Record<string, string> = {
  send_email: "Enviar email", notify: "Notificación interna", add_tag: "Añadir etiqueta", webhook_out: "Webhook saliente",
};

type VisualNodeData = { label: string; kind: "trigger" | "action"; nodeType: string };
type VisualFlow = {
  id: string;
  name: string;
  description: string | null;
  nodes: Array<{ id: string; type?: string; label?: string; data?: Record<string, unknown>; position?: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string }>;
  updatedAt: string;
};

function initialGraph(): { nodes: Node<VisualNodeData>[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t1", type: "input", position: { x: 80, y: 140 }, data: { label: `⚡ ${TRIGGER_LABELS.manual}`, kind: "trigger", nodeType: "manual" } },
    ],
    edges: [],
  };
}

function nodeLabel(kind: "trigger" | "action", nodeType: string): string {
  const icon = kind === "trigger" ? "⚡" : "🎬";
  const label = kind === "trigger" ? TRIGGER_LABELS[nodeType] : ACTION_LABELS[nodeType];
  return `${icon} ${label ?? nodeType}`;
}

let nodeSeq = 0;
function nextNodeId(prefix: string): string {
  nodeSeq += 1;
  return `${prefix}-${Date.now()}-${nodeSeq}`;
}

export default function WorkflowVisualEditorPage() {
  const initial = useMemo(() => initialGraph(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<VisualNodeData>>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [name, setName] = useState("Flujo visual");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [flows, setFlows] = useState<VisualFlow[]>([]);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [flowsOpen, setFlowsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setFlowsLoading(true);
    try {
      const res = await fetch("/api/saas/workflows/visual");
      if (res.ok) {
        const d = (await res.json()) as { workflows?: VisualFlow[] };
        setFlows(d.workflows ?? []);
      }
    } finally {
      setFlowsLoading(false);
    }
  }, []);

  useEffect(() => { void loadFlows(); }, [loadFlows]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  function newFlow() {
    const g = initialGraph();
    setNodes(g.nodes);
    setEdges(g.edges);
    setName("Flujo visual");
    setSavedId(null);
    setSelectedNodeId(null);
    setStatus("");
  }

  function loadFlow(flow: VisualFlow) {
    const restored: Node<VisualNodeData>[] = flow.nodes.map((n, i) => {
      const kind: "trigger" | "action" = n.type === "trigger" || n.id.startsWith("t") ? "trigger" : "action";
      const nodeType = String((n.data?.triggerType ?? n.data?.actionType) ?? (kind === "trigger" ? "manual" : "notify"));
      return {
        id: n.id,
        type: kind === "trigger" ? "input" : undefined,
        position: n.position ?? { x: 80 + i * 220, y: 140 },
        data: { label: n.label ?? nodeLabel(kind, nodeType), kind, nodeType },
      };
    });
    setNodes(restored);
    setEdges(flow.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));
    setName(flow.name);
    setSavedId(flow.id);
    setSelectedNodeId(null);
    setStatus("");
    setFlowsOpen(false);
  }

  async function deleteFlow(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/saas/workflows/visual/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (savedId === id) newFlow();
        await loadFlows();
      }
    } finally {
      setDeletingId(null);
    }
  }

  function addNode(kind: "trigger" | "action") {
    const nodeType = kind === "trigger" ? "manual" : "notify";
    const id = nextNodeId(kind === "trigger" ? "t" : "a");
    const offsetY = 100 + nodes.length * 90;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: kind === "trigger" ? "input" : undefined,
        position: { x: kind === "trigger" ? 80 : 360, y: offsetY },
        data: { label: nodeLabel(kind, nodeType), kind, nodeType },
      },
    ]);
    setSelectedNodeId(id);
  }

  function updateSelectedNodeType(nodeType: string) {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, nodeType, label: nodeLabel(n.data.kind, nodeType) } } : n,
      ),
    );
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const save = async () => {
    setSaving(true);
    setStatus("Guardando…");
    const payload = {
      name,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.kind,
        label: n.data.label,
        data: {
          triggerType: n.data.kind === "trigger" ? n.data.nodeType : undefined,
          actionType: n.data.kind === "action" ? n.data.nodeType : undefined,
        },
        position: n.position,
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    try {
      const res = await fetch("/api/saas/workflows/visual", {
        method: savedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedId ? { ...payload, id: savedId } : payload),
      });
      if (!res.ok) {
        setStatus("Error al guardar");
        return;
      }
      const d = (await res.json()) as { workflow: { id: string } };
      setSavedId(d.workflow.id);
      setStatus("Guardado");
      await loadFlows();
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!savedId) await save();
    const id = savedId;
    if (!id) return;
    setStatus("Publicando a SaaS…");
    const res = await fetch("/api/saas/workflows/visual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish-saas", visualWorkflowId: id, name }),
    });
    if (res.ok) {
      const d = (await res.json()) as { saasWorkflowId: string };
      setStatus(`Publicado como borrador en Workflows → activarlo en /saas/workflows (id ${d.saasWorkflowId.slice(0, 8)})`);
    } else {
      setStatus("Error al publicar");
    }
  };

  const inputCls =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="workflows" />}>
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <NelvyonDsSectionHeader
            title="Editor visual de workflows"
            subtitle="Construye trigger → acciones arrastrando nodos y publícalo como workflow real."
          />
          <a href="/saas/workflows" className="text-sm text-muted-foreground hover:text-foreground">
            ← Volver a Workflows
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          <NelvyonDsButton variant="ghost" size="sm" onClick={newFlow}>+ Nuevo flujo</NelvyonDsButton>
          <NelvyonDsButton variant="secondary" size="sm" onClick={() => void addNode("trigger")}>+ Nodo trigger</NelvyonDsButton>
          <NelvyonDsButton variant="secondary" size="sm" onClick={() => void addNode("action")}>+ Nodo acción</NelvyonDsButton>
          <NelvyonDsButton size="sm" disabled={saving} onClick={() => void save()}>{saving ? "Guardando…" : "Guardar"}</NelvyonDsButton>
          <NelvyonDsButton size="sm" disabled={saving} onClick={() => void publish()}>Publicar en SaaS</NelvyonDsButton>
          {status && <span className="text-sm text-muted-foreground">{status}</span>}
        </div>

        <div className="flex flex-1 gap-3 overflow-hidden">
          {/* Mis flujos visuales */}
          <div className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all ${flowsOpen ? "w-64" : "w-10"}`}>
            <button
              type="button"
              onClick={() => setFlowsOpen((v) => !v)}
              className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {flowsOpen && <span>Mis flujos ({flows.length})</span>}
              <span>{flowsOpen ? "«" : "»"}</span>
            </button>
            {flowsOpen && (
              <div className="flex-1 overflow-y-auto p-2">
                {flowsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/30" />)}
                  </div>
                ) : flows.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">Sin flujos guardados aún. Crea uno y pulsa &quot;Guardar&quot;.</p>
                ) : (
                  <div className="space-y-1.5">
                    {flows.map((f) => (
                      <div
                        key={f.id}
                        className={`group rounded-lg border p-2 text-xs transition-colors ${savedId === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        <button type="button" className="block w-full text-left" onClick={() => loadFlow(f)}>
                          <p className="truncate font-medium text-foreground">{f.name}</p>
                          <p className="mt-0.5 text-muted-foreground">{new Date(f.updatedAt).toLocaleDateString("es-ES")} · {f.nodes.length} nodos</p>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === f.id}
                          onClick={() => void deleteFlow(f.id)}
                          className="mt-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                        >
                          {deletingId === f.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 rounded-xl border border-border bg-muted/5">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedNodeId(n.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              colorMode="dark"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          {/* Node config panel */}
          {selectedNode && (
            <div className="w-64 shrink-0 rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <NelvyonDsBadge tone={selectedNode.data.kind === "trigger" ? "primary" : "neutral"}>
                  {selectedNode.data.kind === "trigger" ? "Trigger" : "Acción"}
                </NelvyonDsBadge>
                <button onClick={deleteSelectedNode} className="text-xs text-destructive hover:underline">Eliminar nodo</button>
              </div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                className={`${inputCls} w-full`}
                value={selectedNode.data.nodeType}
                onChange={(e) => updateSelectedNodeType(e.target.value)}
              >
                {(selectedNode.data.kind === "trigger" ? TRIGGER_TYPES : ACTION_TYPES).map((t) => (
                  <option key={t} value={t}>
                    {selectedNode.data.kind === "trigger" ? TRIGGER_LABELS[t] : ACTION_LABELS[t]}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs text-muted-foreground">
                Conecta este nodo arrastrando desde su borde hacia otro nodo del lienzo.
              </p>
            </div>
          )}
        </div>
      </div>
    </SaasShellLayout>
  );
}

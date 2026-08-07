"use client";

/**
 * /saas/workflows/editor sobre W3CRM, con las piezas ya portadas.
 * Mapeo: barra de acciones, lista de flujos y panel de nodo -> `W3crmContentBox`;
 * el lienzo va en su propia caja con altura explícita. Sin componentes nuevos.
 *
 * EL MOTOR NO SE TOCA. `ReactFlow` recibe exactamente las mismas props y los
 * mismos manejadores: `useNodesState`/`useEdgesState`, `addEdge` en `onConnect`,
 * `onNodesChange`/`onEdgesChange`, `onNodeClick`/`onPaneClick`, `fitView`, y los
 * hijos `Background`, `Controls` y `MiniMap`. Drag & drop, zoom, conexiones,
 * minimapa y controles son los de XYFlow, sin envolver ni reimplementar.
 *
 * AUDITORÍA DE CSS (antes de migrar):
 *   - `.react-flow*` no aparece NI UNA vez en `style.css` ni en `comman.css` de
 *     W3CRM, así que no hay colisión de nombres con Bootstrap.
 *   - El CSS de XYFlow se importa por ESM, no por `<link>`, de modo que entra en
 *     el bundle y Next lo sirve en `<head>`: no comparte la ventana sin estilos
 *     del shell.
 *   - XYFlow no usa portales; `Background`, `Controls` y `MiniMap` son hijos
 *     inline del lienzo, así que nada queda fuera de `.w3crm-scope`.
 *   - `svg { vertical-align: middle }` y `button { border-radius: 0 }` de
 *     Bootstrap alcanzan al minimapa y a los controles, pero solo son cosméticos.
 *   - Único choque real: `button:focus { outline: 0; box-shadow: none }` dejaba
 *     los botones de zoom SIN indicador de foco por teclado. Corregido con una
 *     única regla acotada en `w3crmScope.css`, sin tocar W3CRM ni XYFlow.
 *
 * Cambio de capa visual: `colorMode` pasa de "dark" a "light" porque el shell ya
 * no es oscuro; es tema del lienzo, no comportamiento.
 *
 * Lógica de NELVYON intacta: `GET/POST/PUT /api/saas/workflows/visual`,
 * `DELETE /api/saas/workflows/visual/{id}`, la acción `publish-saas`, los 16
 * triggers que pasan tal cual a `SaasWorkflow.triggerType` y las 4 acciones que
 * `publishAsSaasWorkflow` mapea de forma explícita —no se ofrece ninguna más
 * para no mentir sobre lo que se publicará—.
 */
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

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

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

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
/** Una fecha corrupta imprimía "Invalid Date" en la lista de flujos. */
function fecha(v: unknown): string {
  if (typeof v !== "string" || !v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setFlowsLoading(true);
    try {
      const res = await fetch("/api/saas/workflows/visual");
      if (res.ok) {
        const d = (await res.json()) as { workflows?: VisualFlow[] };
        // `workflows` podía no ser array y reventaba `.map`.
        setFlows(Array.isArray(d.workflows) ? d.workflows : []);
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
    const lista = Array.isArray(flow.nodes) ? flow.nodes : [];
    const conexiones = Array.isArray(flow.edges) ? flow.edges : [];
    const restored: Node<VisualNodeData>[] = lista.map((n, i) => {
      const kind: "trigger" | "action" = n.type === "trigger" || txt(n.id).startsWith("t") ? "trigger" : "action";
      const nodeType = String((n.data?.triggerType ?? n.data?.actionType) ?? (kind === "trigger" ? "manual" : "notify"));
      return {
        id: n.id,
        type: kind === "trigger" ? "input" : undefined,
        position: n.position ?? { x: 80 + i * 220, y: 140 },
        data: { label: n.label ?? nodeLabel(kind, nodeType), kind, nodeType },
      };
    });
    setNodes(restored);
    setEdges(conexiones.map((e) => ({ id: e.id, source: e.source, target: e.target })));
    setName(txt(flow.name) || "Flujo visual");
    setSavedId(flow.id);
    setSelectedNodeId(null);
    setStatus("");
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
      const d = (await res.json().catch(() => null)) as { workflow?: { id?: string } } | null;
      if (d?.workflow?.id) setSavedId(d.workflow.id);
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
      const d = (await res.json().catch(() => null)) as { saasWorkflowId?: string } | null;
      const corto = txt(d?.saasWorkflowId).slice(0, 8);
      setStatus(`Publicado como borrador en Workflows → activarlo en /saas/workflows${corto ? ` (id ${corto})` : ""}`);
    } else {
      setStatus("Error al publicar");
    }
  };

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Editor visual de workflows" parentTitle="Automatización" pageTitle="Editor" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <p className="fs-14 text-muted mb-0">
                Construye trigger → acciones arrastrando nodos y publícalo como workflow real.
              </p>
              <a href="/saas/workflows" className="btn btn-primary light btn-sm">← Volver a Workflows</a>
            </div>

            <W3crmContentBox titulo="Flujo actual" icono="fa-solid fa-diagram-project">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <label htmlFor="wf-nombre" className="visually-hidden">Nombre del flujo</label>
                <input id="wf-nombre" className="form-control" style={{ maxWidth: 260 }}
                  value={name} onChange={(e) => setName(e.target.value)} />
                <button type="button" className="btn btn-primary light btn-sm" onClick={newFlow}>+ Nuevo flujo</button>
                <button type="button" className="btn btn-primary light btn-sm" onClick={() => addNode("trigger")}>+ Nodo trigger</button>
                <button type="button" className="btn btn-primary light btn-sm" onClick={() => addNode("action")}>+ Nodo acción</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void save()}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void publish()}>
                  Publicar en SaaS
                </button>
                {status && <span className="text-muted fs-12">{status}</span>}
              </div>
            </W3crmContentBox>
          </div>

          <div className="col-xl-3 col-lg-4">
            <W3crmContentBox titulo={`Mis flujos (${flows.length})`} icono="fa-solid fa-folder-open">
              {flowsLoading ? (
                <W3crmCargando texto="Cargando flujos…" />
              ) : flows.length === 0 ? (
                <W3crmEmptyState
                  title="Sin flujos guardados aún"
                  description={'Crea uno y pulsa "Guardar".'}
                />
              ) : (
                <ul className="list-group list-group-flush" style={{ maxHeight: 420, overflowY: "auto" }}>
                  {flows.map((f) => (
                    <li key={f.id} className={`list-group-item px-0 ${savedId === f.id ? "bg-light" : ""}`}>
                      <button type="button"
                        className="btn btn-link p-0 text-start text-decoration-none d-block w-100"
                        aria-pressed={savedId === f.id}
                        onClick={() => loadFlow(f)}>
                        <span className="fw-bold d-block">{txt(f.name) || "—"}</span>
                        <span className="d-block text-muted fs-12">
                          {fecha(f.updatedAt)} · {Array.isArray(f.nodes) ? f.nodes.length : 0} nodos
                        </span>
                      </button>
                      <button type="button" className="btn btn-danger light btn-sm mt-1"
                        disabled={deletingId === f.id}
                        aria-label={`Eliminar flujo ${f.name}`}
                        onClick={() => void deleteFlow(f.id)}>
                        {deletingId === f.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </W3crmContentBox>
          </div>

          <div className={selectedNode ? "col-xl-6 col-lg-8" : "col-xl-9 col-lg-8"}>
            {/* El lienzo necesita altura explícita: `card-body p-0` para que
                XYFlow ocupe la caja entera sin recortes. */}
            <W3crmContentBox titulo="Lienzo" icono="fa-solid fa-vector-square" bodyClassName="card-body p-0">
              <div style={{ height: "70vh", minHeight: 420 }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={(_, n) => setSelectedNodeId(n.id)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  fitView
                  colorMode="light"
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            </W3crmContentBox>
          </div>

          {selectedNode && (
            <div className="col-xl-3 col-lg-12">
              <W3crmContentBox titulo="Nodo seleccionado" icono="fa-solid fa-sliders">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className={`badge ${selectedNode.data.kind === "trigger" ? "badge-primary" : "badge-secondary"}`}>
                    {selectedNode.data.kind === "trigger" ? "Trigger" : "Acción"}
                  </span>
                  <button type="button" className="btn btn-danger light btn-sm" onClick={deleteSelectedNode}>
                    Eliminar nodo
                  </button>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="wf-tipo" className="text-black font-w600">Tipo</label>
                  <select id="wf-tipo" className="form-control"
                    value={selectedNode.data.nodeType}
                    onChange={(e) => updateSelectedNodeType(e.target.value)}>
                    {(selectedNode.data.kind === "trigger" ? TRIGGER_TYPES : ACTION_TYPES).map((t) => (
                      <option key={t} value={t}>
                        {selectedNode.data.kind === "trigger" ? TRIGGER_LABELS[t] : ACTION_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="fs-12 text-muted mb-0">
                  Conecta este nodo arrastrando desde su borde hacia otro nodo del lienzo.
                </p>
              </W3crmContentBox>
            </div>
          )}
        </div>
      </div>
    </SaasW3crmShell>
  );
}

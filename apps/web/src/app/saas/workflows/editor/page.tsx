"use client";

import { useCallback, useState } from "react";
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
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

const initialNodes: Node[] = [
  { id: "t1", type: "input", position: { x: 80, y: 120 }, data: { label: "Trigger: contact_created" } },
  { id: "a1", position: { x: 320, y: 120 }, data: { label: "Action: send_email" } },
];

export default function WorkflowVisualEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("Flujo visual");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  const save = async () => {
    setStatus("Guardando…");
    const payload = {
      name,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.id.startsWith("t") ? "trigger" : "action",
        label: String(n.data?.label ?? n.id),
        data: {
          triggerType: n.id.startsWith("t") ? "contact_created" : undefined,
          actionType: n.id.startsWith("a") ? "send_email" : undefined,
        },
        position: n.position,
      })),
      edges,
    };
    const res = await fetch(savedId ? "/api/saas/workflows/visual" : "/api/saas/workflows/visual", {
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
  };

  const publish = async () => {
    if (!savedId) {
      await save();
    }
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
      setStatus(`Publicado → ${d.saasWorkflowId}`);
    } else {
      setStatus("Error al publicar");
    }
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="workflows" />}>
      <div className="flex h-[calc(100vh-4rem)] flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white" onClick={() => void save()}>
            Guardar
          </button>
          <button type="button" className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm text-white" onClick={() => void publish()}>
            Publicar en SaaS
          </button>
          <span className="text-sm text-white/50">{status}</span>
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-[#0a0f1a]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </SaasShellLayout>
  );
}

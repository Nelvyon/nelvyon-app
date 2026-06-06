import { OS_DEAL_OPEN_STATUSES, OS_TASK_ACTIVE_STATUSES, TERMINAL_PROJECT_STATUSES } from "@/features/os-shell/constants";
import { isTaskOverdue } from "@/features/os-shell/tareas/taskStatus";
import type { OsClientPickerRow } from "@/features/os-shell/clients/types";
import type { OsProject } from "@/features/os-shell/projects/types";
import type { NelvyonOutputRow } from "@/features/os-shell/types";

import type {
  OsIaBlocker,
  OsIaClientSummary,
  OsIaDeliverySummary,
  OsIaInsights,
  OsIaProjectSummary,
  OsIaSuggestedTask,
} from "./types";

const PENDING_QA = new Set(["pending", "qa_review", "generating", "draft", "failed"]);

export interface OsIaSourceData {
  clients: OsClientPickerRow[];
  projects: OsProject[];
  deals: { id?: number; title?: string; status?: string; client_id?: number | null }[];
  tasks: {
    id?: number;
    title?: string;
    status?: string;
    due_date?: string | null;
    client_id?: number | null;
    project_id?: number | null;
  }[];
  outputs: NelvyonOutputRow[];
}

export function buildOsIaInsights(src: OsIaSourceData): OsIaInsights {
  const projectsByClient = new Map<number, OsProject[]>();
  for (const p of src.projects) {
    const list = projectsByClient.get(p.client_id) ?? [];
    list.push(p);
    projectsByClient.set(p.client_id, list);
  }

  const dealsByClient = new Map<number, number>();
  for (const d of src.deals) {
    if (!OS_DEAL_OPEN_STATUSES.has(d.status ?? "nuevo")) continue;
    const cid = d.client_id;
    if (cid == null) continue;
    dealsByClient.set(cid, (dealsByClient.get(cid) ?? 0) + 1);
  }

  const tasksByClient = new Map<number, number>();
  const tasksByProject = new Map<number, number>();
  for (const t of src.tasks) {
    if (!OS_TASK_ACTIVE_STATUSES.has(t.status ?? "pendiente")) continue;
    if (t.client_id != null) tasksByClient.set(t.client_id, (tasksByClient.get(t.client_id) ?? 0) + 1);
    if (t.project_id != null)
      tasksByProject.set(t.project_id, (tasksByProject.get(t.project_id) ?? 0) + 1);
  }

  const clientSummaries: OsIaClientSummary[] = src.clients.slice(0, 12).map((c) => {
    const projs = projectsByClient.get(c.id) ?? [];
    const activeProjs = projs.filter(
      (p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()),
    );
    const openDeals = dealsByClient.get(c.id) ?? 0;
    const pendingTasks = tasksByClient.get(c.id) ?? 0;
    const parts: string[] = [];
    if (activeProjs.length > 0) parts.push(`${activeProjs.length} proyecto(s) activo(s)`);
    if (openDeals > 0) parts.push(`${openDeals} oportunidad(es) abierta(s)`);
    if (pendingTasks > 0) parts.push(`${pendingTasks} tarea(s) pendiente(s)`);
    const summary =
      parts.length > 0
        ? parts.join(" · ")
        : "Sin actividad operativa reciente vinculada.";
    return {
      clientId: c.id,
      businessName: c.business_name,
      projectCount: projs.length,
      openDeals,
      pendingTasks,
      summary,
    };
  });

  const clientNames = new Map(src.clients.map((c) => [c.id, c.business_name]));

  const projectSummaries: OsIaProjectSummary[] = src.projects
    .filter((p) => !TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase()))
    .slice(0, 12)
    .map((p) => {
      const outs = src.outputs.filter((o) => o.project_id === p.id);
      const pendingOutputs = outs.filter((o) =>
        PENDING_QA.has((o.qa_status ?? "pending").toLowerCase()),
      ).length;
      const pendingTasks = tasksByProject.get(p.id) ?? 0;
      const parts: string[] = [`Estado: ${p.status}`];
      if (outs.length > 0) parts.push(`${outs.length} entrega(s)`);
      if (pendingOutputs > 0) parts.push(`${pendingOutputs} pendiente(s) de QA`);
      if (pendingTasks > 0) parts.push(`${pendingTasks} tarea(s) activa(s)`);
      return {
        projectId: p.id,
        name: p.name,
        clientName: clientNames.get(p.client_id) ?? "—",
        status: p.status ?? "—",
        outputCount: outs.length,
        pendingOutputs,
        summary: parts.join(" · "),
      };
    });

  const deliverySummaries: OsIaDeliverySummary[] = src.outputs.slice(0, 10).map((o) => {
    const qa = (o.qa_status ?? "pending").toLowerCase();
    let summary = `Tipo ${o.output_type}`;
    if (qa === "failed") summary = "QA fallido — revisar antes de entregar al cliente.";
    else if (PENDING_QA.has(qa)) summary = "Pendiente de revisión o generación.";
    else if (qa === "passed") summary = "QA aprobado.";
    return {
      outputId: o.id,
      title: o.title || o.output_type || `Output #${o.id}`,
      qaStatus: o.qa_status ?? "pending",
      summary,
    };
  });

  const suggestedTasks: OsIaSuggestedTask[] = [];
  const blockers: OsIaBlocker[] = [];

  for (const t of src.tasks) {
    if (t.status === "completada") continue;
    if (isTaskOverdue(t.due_date ?? undefined)) {
      blockers.push({
        severity: "alta",
        label: "Tarea vencida",
        detail: t.title ?? `Tarea #${t.id}`,
        href: t.id != null ? `/os/tareas/${t.id}` : "/os/tareas",
      });
      suggestedTasks.push({
        title: `Completar: ${t.title ?? "tarea vencida"}`,
        reason: "Fecha límite superada",
        clientId: t.client_id ?? undefined,
        projectId: t.project_id ?? undefined,
        priority: "alta",
      });
    }
  }

  for (const o of src.outputs) {
    if ((o.qa_status ?? "").toLowerCase() === "failed") {
      blockers.push({
        severity: "alta",
        label: "Entrega con QA fallido",
        detail: o.title || o.output_type || `#${o.id}`,
        href: `/os/documentos/output/${o.id}`,
      });
    }
  }

  for (const p of src.projects) {
    if (TERMINAL_PROJECT_STATUSES.has((p.status ?? "").toLowerCase())) continue;
    const outs = src.outputs.filter((x) => x.project_id === p.id);
    if (outs.length === 0) {
      suggestedTasks.push({
        title: `Planificar primera entrega: ${p.name}`,
        reason: "Proyecto activo sin outputs registrados",
        clientId: p.client_id,
        projectId: p.id,
        priority: "media",
      });
    }
  }

  for (const d of src.deals) {
    if ((d.status ?? "").toLowerCase() === "propuesta" && d.client_id) {
      suggestedTasks.push({
        title: `Seguimiento oportunidad: ${d.title ?? "deal"}`,
        reason: "Oportunidad en negociación",
        clientId: d.client_id ?? undefined,
        priority: "media",
      });
    }
  }

  const hasData =
    src.clients.length > 0 ||
    src.projects.length > 0 ||
    src.outputs.length > 0 ||
    src.tasks.length > 0 ||
    src.deals.length > 0;

  return {
    clientSummaries,
    projectSummaries,
    deliverySummaries,
    suggestedTasks: suggestedTasks.slice(0, 8),
    blockers: blockers.slice(0, 10),
    hasData,
  };
}

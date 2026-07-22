import crypto from "node:crypto";

import type { QueuedTaskRecord, RouterTaskInput, TaskStatus } from "./types";

const TERMINAL: TaskStatus[] = ["completed", "failed", "cancelled", "blocked"];

type InternalTask = QueuedTaskRecord & {
  input: RouterTaskInput;
  abort?: AbortController;
  result?: unknown;
};

const MAX_QUEUE_DEFAULT = 32;

function maxQueueSize(): number {
  return Number(process.env.ROUTER_MAX_QUEUE ?? MAX_QUEUE_DEFAULT);
}

export class RouterQueue {
  private tasks = new Map<string, InternalTask>();
  private order: string[] = [];

  enqueue(input: RouterTaskInput, requestId?: string): QueuedTaskRecord {
    if (this.depth() >= maxQueueSize()) throw new Error("router_queue_saturated");

    const taskId = crypto.randomUUID();
    const rec: InternalTask = {
      taskId,
      requestId: requestId ?? taskId,
      tenantId: input.tenantId,
      agentId: input.agentId,
      status: "queued",
      priority: input.priority ?? 5,
      createdAt: new Date().toISOString(),
      input,
      abort: new AbortController(),
    };
    this.tasks.set(taskId, rec);
    this.order.push(taskId);
    this.order.sort((a, b) => (this.tasks.get(b)!.priority - this.tasks.get(a)!.priority));
    return this.publicView(rec);
  }

  get(taskId: string): QueuedTaskRecord | null {
    const t = this.tasks.get(taskId);
    return t ? this.publicView(t) : null;
  }

  setStatus(taskId: string, status: TaskStatus, extra?: Partial<QueuedTaskRecord>): void {
    const t = this.tasks.get(taskId);
    if (!t) return;
    t.status = status;
    if (status === "running") t.startedAt = new Date().toISOString();
    if (status === "completed" || status === "failed" || status === "cancelled" || status === "blocked") {
      t.completedAt = new Date().toISOString();
      if (t.startedAt) t.durationMs = Date.parse(t.completedAt) - Date.parse(t.startedAt);
    }
    Object.assign(t, extra);
    if (TERMINAL.includes(status)) this.pruneTask(taskId);
  }

  private pruneTask(taskId: string): void {
    const idx = this.order.indexOf(taskId);
    if (idx >= 0) this.order.splice(idx, 1);
    this.tasks.delete(taskId);
  }

  isCancelled(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    return t?.status === "cancelled" || Boolean(t?.abort?.signal.aborted);
  }

  cancel(taskId: string): boolean {
    const t = this.tasks.get(taskId);
    if (!t || t.status === "completed" || t.status === "failed" || t.status === "cancelled") return false;
    t.abort?.abort();
    t.status = "cancelled";
    t.completedAt = new Date().toISOString();
    this.pruneTask(taskId);
    return true;
  }

  depth(): number {
    return this.order.filter((id) => {
      const s = this.tasks.get(id)?.status;
      return s === "queued" || s === "running";
    }).length;
  }

  runningCount(): number {
    return [...this.tasks.values()].filter((t) => t.status === "running").length;
  }

  getAbortSignal(taskId: string): AbortSignal | undefined {
    return this.tasks.get(taskId)?.abort?.signal;
  }

  /** Restore queue state after restart — only metadata, tasks re-queued as failed. */
  recoverFromRestart(): number {
    let n = 0;
    for (const [id, t] of [...this.tasks.entries()]) {
      if (t.status === "queued" || t.status === "running") {
        this.setStatus(id, "failed", { error: "router_restart_recovery" });
        n++;
      }
    }
    return n;
  }

  list(limit = 50): QueuedTaskRecord[] {
    return this.order.slice(0, limit).map((id) => this.publicView(this.tasks.get(id)!));
  }

  private publicView(t: InternalTask): QueuedTaskRecord {
    return {
      taskId: t.taskId,
      requestId: t.requestId,
      tenantId: t.tenantId,
      agentId: t.agentId,
      status: t.status,
      priority: t.priority,
      taskType: t.taskType,
      model: t.model,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      durationMs: t.durationMs,
      error: t.error,
    };
  }
}

let _queue: RouterQueue | undefined;
export function getRouterQueue(): RouterQueue {
  _queue ??= new RouterQueue();
  return _queue;
}

export function resetRouterQueueForTests(): void {
  _queue = undefined;
}

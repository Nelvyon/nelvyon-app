import { OS_PREMIUM_SERVICE_IDS, type OsPremiumServiceId } from "./constants";
import type { StoredClientIntake } from "./intakeSchemas";

export type { OsPremiumServiceId } from "./constants";

export type OsJobStatus = "queued" | "running" | "completed" | "failed";

export type OsJobStepRuntimeStatus = "pending" | "running" | "completed" | "failed";

export interface OsJobStepState {
  name: string;
  description: string;
  status: OsJobStepRuntimeStatus;
  log?: string;
}

export interface OsStepResultRecord {
  name: string;
  data: Record<string, unknown>;
}

export interface OsJobResult {
  serviceId: string;
  steps: OsStepResultRecord[];
}

/** Normalized job input from API / dashboard (extensible per premium service). */
export interface OsJobPayload {
  brief?: string;
  clientName?: string;
  industry?: string;
  budget?: string;
  deadline?: string;
  [key: string]: unknown;
}

export interface OsJob {
  jobId: string;
  serviceId: string;
  clientId: string;
  status: OsJobStatus;
  progress: number;
  steps: OsJobStepState[];
  /** Dispatch input persisted for queue recovery (defaults to `{}`). */
  payload: OsJobPayload;
  /** Elite client intake (optional); mirrored from Stripe + form pipeline. */
  intake?: StoredClientIntake;
  createdAt: string;
  updatedAt: string;
  result?: OsJobResult;
  error?: { message: string; step?: string };
}

/** Item serialized in OS queue (memory or Redis list `os:queue`). */
export interface OsQueueItem {
  jobId: string;
  serviceId: string;
  clientId: string;
  payload: OsJobPayload;
  enqueuedAt: string;
  /** End-user id (nelvyon_users) for usage metering; optional for cron/system jobs. */
  userId?: string;
}

export interface OsWorkerStatus {
  running: boolean;
  processed: number;
  failed: number;
  lastJobId: string | null;
}

export interface OsWorkerProcessedPayload {
  jobId: string;
  serviceId: string;
  clientId: string;
}

export interface OsWorkerFailedPayload {
  jobId: string;
  serviceId: string;
  clientId: string;
  error: string;
}

/** Persistence contract (Postgres + optional Redis) shared by OsJobStoreMemory and OsJobStorePersistent. */
export interface IOsJobStore {
  createJob(job: OsJob): Promise<void>;
  updateJobStatus(
    jobId: string,
    status: OsJobStatus,
    progress: number,
    steps: OsJobStepState[],
    result?: OsJobResult,
    errorText?: string | null,
    payload?: OsJobPayload,
    intake?: OsJob["intake"],
  ): Promise<void>;
  getJob(jobId: string): Promise<OsJob | null>;
  listJobs(clientId?: string): Promise<OsJob[]>;
}

export interface OsJobContext {
  jobId: string;
  clientId: string;
  serviceId: string;
  payload: OsJobPayload;
  /** Raw LLM / step text keyed by step name; filled by `BaseOsAgent` between steps. */
  stepResults: Record<string, string>;
  /** OsJobStore facade (memory or Postgres+Redis); store methods are async. */
  jobStore: import("./OsJobStore").OsJobStore;
  eventBus: import("./OsEventBus").OsEventBus;
}

export interface OsAgentStep {
  name: string;
  description: string;
  run: (payload: OsJobPayload, ctx: OsJobContext) => Promise<string>;
}

export interface OsDispatchInput {
  serviceId: string;
  clientId: string;
  payload: OsJobPayload;
  intake?: OsJob["intake"];
  /** When set, worker records usage against this user after successful agent execution. */
  userId?: string;
  /** Optional stable id (e.g. includes userId for async queue ownership). */
  jobId?: string;
}

export interface OsDispatchResult {
  jobId: string;
  status: OsJobStatus;
  message: string;
  result?: OsJobResult;
  /** When true, the worker must not count this dequeue toward processed/failed (e.g. duplicate queue item). */
  skipped?: boolean;
}

export interface OsJobCreatedPayload {
  jobId: string;
  serviceId: string;
  clientId: string;
}

export interface OsJobProgressPayload {
  jobId: string;
  progress: number;
  stepName: string;
}

export interface OsJobCompletedPayload {
  jobId: string;
  result: OsJobResult;
}

export interface OsJobFailedPayload {
  jobId: string;
  error: { message: string; step?: string };
}

export type OsNotifierEventType = "job:created" | "job:progress" | "job:completed" | "job:failed";

/** Normalized payload for WebSocket + email notifiers (OS v1). */
export interface OsNotifierEvent {
  type: OsNotifierEventType;
  jobId: string;
  serviceId: string;
  clientId: string;
  progress: number;
  status: OsJobStatus;
  result?: OsJobResult;
  error?: string;
  timestamp: string;
}

/** Subset of `ws.WebSocket` used by OS notifiers (avoids backend → node_modules resolution issues in tsc). */
export interface OsWsPeer {
  readonly readyState: number;
  send(data: string | Buffer, cb?: (err?: Error) => void): void;
  close(): void;
  on(event: "close", listener: () => void): this;
}

export interface IWsNotifier {
  registerClient(clientId: string, ws: OsWsPeer): void;
  unregisterClient(clientId: string): void;
  send(clientId: string, event: OsNotifierEvent): void;
}

export interface IEmailNotifier {
  send(clientId: string, event: OsNotifierEvent): Promise<void>;
}

export function isOsPremiumServiceId(id: string): id is OsPremiumServiceId {
  return (OS_PREMIUM_SERVICE_IDS as readonly string[]).includes(id);
}

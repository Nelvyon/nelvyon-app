import type { OsJobPayload } from "../os-agents/types";

export type { OsJobPayload };

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobStatus {
  status: QueueJobStatus;
  userId: string;
  serviceId?: string;
  clientId?: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OsQueueEnqueueInput {
  userId: string;
  clientId: string;
  serviceId: string;
  payload: OsJobPayload;
}

export interface OsQueueWorkItem {
  jobId: string;
  serviceId: string;
  clientId: string;
  payload: OsJobPayload;
  userId: string;
  enqueuedAt: string;
}

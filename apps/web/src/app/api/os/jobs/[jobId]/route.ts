import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError, osJobStore } from "@nelvyon/os-agents";

import { QueueClient, type JobStatus } from "../../../../../../../../backend/queue";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  let claims;
  try {
    claims = await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  const { jobId } = await context.params;
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const queueClient = QueueClient.getInstance();
  const queueStatus = await queueClient.getJobStatus(jobId);

  if (queueStatus) {
    if (queueStatus.userId !== claims.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(queueStatus satisfies JobStatus);
  }

  const job = await osJobStore.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.clientId !== claims.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mapped: JobStatus = {
    status:
      job.status === "queued"
        ? "pending"
        : job.status === "running"
          ? "processing"
          : job.status === "completed"
            ? "completed"
            : "failed",
    userId: claims.userId,
    serviceId: job.serviceId,
    clientId: job.clientId,
    result: job.result,
    error: job.error?.message,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  return NextResponse.json(mapped);
}

import { NextResponse } from "next/server";
import { ProjectsFsError } from "../../../../../../../../backend/agency/ProjectsFieldServiceCore";
import { ErpSnapshotConflictError } from "../../../../../../../../backend/agency/erp/ErpDomainSnapshotStore";
import { withProjectsFsPersistence } from "../../../../../../../../backend/agency/erp/ErpPersistentRuntime";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapProjectsError(e: ProjectsFsError): NextResponse {
  const status =
    e.code === "NOT_FOUND"
      ? 404
      : e.code === "TENANT_MISMATCH" || e.code === "TENANT_REQUIRED" || e.code === "BLOCKED_EXTERNAL"
        ? 403
        : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

function mapCaught(e: unknown): NextResponse {
  if (e instanceof ErpSnapshotConflictError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
  }
  if (e instanceof ProjectsFsError) return mapProjectsError(e);
  return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    const payload = await withProjectsFsPersistence(tenantId, (core) => ({
      projects: core.listProjects(tenantId),
      timesheets: core.listTimesheets(tenantId),
      note:
        "Postgres SSOT via erp_domain_snapshots (mig 520) when DATABASE_URL set · else in-memory · signature BLOCKED_EXTERNAL · margin NON-GL",
    }));
    return NextResponse.json(payload);
  } catch (e: unknown) {
    return mapCaught(e);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const action = typeof body.action === "string" ? body.action : "create_project";
    const tenantId = ctx.tenant.id;
    const actorId = ctx.claims.userId ?? "saas-user";

    if (action === "create_project") {
      const project = await withProjectsFsPersistence(tenantId, (core) =>
        core.createProject({
          tenantId,
          name: typeof body.name === "string" ? body.name : "",
          templateId: typeof body.templateId === "string" ? body.templateId : undefined,
        }),
      );
      return NextResponse.json({ project }, { status: 201 });
    }

    if (action === "create_timesheet") {
      const entry = await withProjectsFsPersistence(tenantId, (core) =>
        core.addTimesheetEntry({
          tenantId,
          projectId: typeof body.projectId === "string" ? body.projectId : "",
          taskId: typeof body.taskId === "string" ? body.taskId : undefined,
          assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : actorId,
          hours: typeof body.hours === "number" ? body.hours : Number(body.hours),
          date: typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10),
          rateInternalCents:
            typeof body.rateInternalCents === "number"
              ? body.rateInternalCents
              : Number(body.rateInternalCents ?? 0),
        }),
      );
      return NextResponse.json({ timesheet: entry }, { status: 201 });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        code: "INVALID_INPUT",
        allowed: ["create_project", "create_timesheet"],
      },
      { status: 400 },
    );
  } catch (e: unknown) {
    return mapCaught(e);
  }
}

import { NextResponse } from "next/server";
import {
  getSaasCrmService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeCSV(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const contacts = await getSaasCrmService().getContacts(ctx.tenant.id, {
      status: (url.searchParams.get("status") as "lead" | undefined) ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    });

    const headers = ["id", "name", "email", "phone", "company", "position", "status", "pipeline_stage", "value", "tags", "notes", "created_at"];
    const rows = contacts.map((c) => [
      c.id, c.name, c.email ?? "", c.phone ?? "", c.company ?? "", c.position ?? "",
      c.status, c.pipelineStage, c.value,
      (c.tags ?? []).join(";"), c.notes ?? "", c.createdAt,
    ].map(escapeCSV).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `contacts-${ctx.tenant.id.slice(0, 8)}-${Date.now()}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

import { NextResponse } from "next/server";
import {
  getSaasCrmService,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  SAAS_CONTACTS_HARD_MAX,
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
    // CSV dump is data-exfil sensitive — require write (viewers denied).
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    // Fetch hard-max+1 to detect overflow without loading unbounded tables.
    const contacts = await getSaasCrmService().getContacts(ctx.tenant.id, {
      status: (url.searchParams.get("status") as "lead" | undefined) ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: SAAS_CONTACTS_HARD_MAX + 1,
    });

    if (contacts.length > SAAS_CONTACTS_HARD_MAX) {
      return NextResponse.json(
        {
          error: `Export exceeds ${SAAS_CONTACTS_HARD_MAX} contacts — narrow filters or split export`,
          code: "EXPORT_TOO_LARGE",
        },
        { status: 413 },
      );
    }

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

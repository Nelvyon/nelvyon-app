import { NextResponse } from "next/server";

import {
  getSaasDealsEtlService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST body: { "mode": "dry-run" }
 * Solo dry-run acotado al tenant autenticado. apply global → CLI `pnpm saas:deals-etl`.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (b.mode === "apply") {
      return NextResponse.json(
        {
          error:
            "apply is not allowed via API; use pnpm saas:deals-etl -- --apply --i-understand-apply from ops",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const etl = getSaasDealsEtlService();
    const report = await etl.run("dry-run", { tenantId: ctx.tenant.id });
    return NextResponse.json({ report, tenantId: ctx.tenant.id, scope: "tenant" });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

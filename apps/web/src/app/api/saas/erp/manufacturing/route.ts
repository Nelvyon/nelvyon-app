import { NextResponse } from "next/server";
import { ManufacturingOpsError } from "../../../../../../../../backend/agency/ManufacturingOpsCore";
import { ErpSnapshotConflictError } from "../../../../../../../../backend/agency/erp/ErpDomainSnapshotStore";
import { withManufacturingPersistence } from "../../../../../../../../backend/agency/erp/ErpPersistentRuntime";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapMfgError(e: ManufacturingOpsError): NextResponse {
  const status =
    e.code === "NOT_FOUND"
      ? 404
      : e.code === "TENANT_MISMATCH" || e.code === "BLOCKED_EXTERNAL"
        ? 403
        : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

function mapCaught(e: unknown): NextResponse {
  if (e instanceof ErpSnapshotConflictError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
  }
  if (e instanceof ManufacturingOpsError) return mapMfgError(e);
  return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    const payload = await withManufacturingPersistence(tenantId, (core) => ({
      manufacturingOrders: core.listManufacturingOrders(tenantId),
      boms: core.listBoms(tenantId),
      note:
        "Postgres SSOT via erp_domain_snapshots (mig 520) when DATABASE_URL set · else in-memory · IoT BLOCKED_EXTERNAL",
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

    const action = typeof body.action === "string" ? body.action : "create_bom";
    const tenantId = ctx.tenant.id;

    if (action === "create_bom") {
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          componentSku: typeof l.componentSku === "string" ? l.componentSku : "",
          qty: typeof l.qty === "number" ? l.qty : Number(l.qty),
          uom: typeof l.uom === "string" ? l.uom : "u",
        }));
      const bom = await withManufacturingPersistence(tenantId, (core) =>
        core.createBom({
          tenantId,
          productSku: typeof body.productSku === "string" ? body.productSku : "",
          lines,
        }),
      );
      return NextResponse.json({ bom }, { status: 201 });
    }

    if (action === "approve_bom") {
      const bom = await withManufacturingPersistence(tenantId, (core) =>
        core.approveBom(tenantId, typeof body.bomId === "string" ? body.bomId : ""),
      );
      return NextResponse.json({ bom });
    }

    if (action === "create_mo") {
      const mo = await withManufacturingPersistence(tenantId, (core) =>
        core.createManufacturingOrder({
          tenantId,
          bomId: typeof body.bomId === "string" ? body.bomId : "",
          qty: typeof body.qty === "number" ? body.qty : Number(body.qty),
        }),
      );
      return NextResponse.json({ manufacturingOrder: mo }, { status: 201 });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        code: "INVALID_INPUT",
        allowed: ["create_bom", "approve_bom", "create_mo"],
      },
      { status: 400 },
    );
  } catch (e: unknown) {
    return mapCaught(e);
  }
}

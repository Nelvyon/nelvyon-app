import { NextResponse } from "next/server";
import {
  ManufacturingOpsError,
  getManufacturingOpsCore,
} from "../../../../../../../../backend/agency/ManufacturingOpsCore";
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

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const core = getManufacturingOpsCore();
    const tenantId = ctx.tenant.id;
    return NextResponse.json({
      manufacturingOrders: core.listManufacturingOrders(tenantId),
      boms: core.listBoms(tenantId),
      note: "In-memory SSOT · IoT BLOCKED_EXTERNAL · schema 519 reserved",
    });
  } catch (e: unknown) {
    if (e instanceof ManufacturingOpsError) return mapMfgError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
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
    const core = getManufacturingOpsCore();

    if (action === "create_bom") {
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          componentSku: typeof l.componentSku === "string" ? l.componentSku : "",
          qty: typeof l.qty === "number" ? l.qty : Number(l.qty),
          uom: typeof l.uom === "string" ? l.uom : "u",
        }));
      const bom = core.createBom({
        tenantId,
        productSku: typeof body.productSku === "string" ? body.productSku : "",
        lines,
      });
      return NextResponse.json({ bom }, { status: 201 });
    }

    if (action === "approve_bom") {
      const bom = core.approveBom(tenantId, typeof body.bomId === "string" ? body.bomId : "");
      return NextResponse.json({ bom });
    }

    if (action === "create_mo") {
      const mo = core.createManufacturingOrder({
        tenantId,
        bomId: typeof body.bomId === "string" ? body.bomId : "",
        qty: typeof body.qty === "number" ? body.qty : Number(body.qty),
      });
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
    if (e instanceof ManufacturingOpsError) return mapMfgError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

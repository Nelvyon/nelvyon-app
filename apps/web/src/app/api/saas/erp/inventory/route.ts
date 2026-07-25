import { NextResponse } from "next/server";
import {
  InventoryError,
  getInventoryWarehousesCore,
} from "../../../../../../../../backend/agency/InventoryWarehousesCore";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapInventoryError(e: InventoryError): NextResponse {
  const status =
    e.code === "NOT_FOUND"
      ? 404
      : e.code === "TENANT_MISMATCH"
        ? 403
        : e.code === "CONFLICT"
          ? 409
          : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const core = getInventoryWarehousesCore();
    const tenantId = ctx.tenant.id;
    return NextResponse.json({
      balances: core.listBalances(tenantId),
      products: core.listProducts(tenantId),
      warehouses: core.listWarehouses(tenantId),
      locations: core.listLocations(tenantId),
      note: "In-memory SSOT · no cost/GL · schema 519 reserved",
    });
  } catch (e: unknown) {
    if (e instanceof InventoryError) return mapInventoryError(e);
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

    const action = typeof body.action === "string" ? body.action : "receive";
    const tenantId = ctx.tenant.id;
    const actorId = ctx.claims.userId ?? "saas-user";
    const core = getInventoryWarehousesCore();

    if (action === "create_product") {
      const product = core.createProduct({
        tenantId,
        sku: typeof body.sku === "string" ? body.sku : "",
        name: typeof body.name === "string" ? body.name : "",
        uom: typeof body.uom === "string" ? body.uom : "u",
      });
      return NextResponse.json({ product }, { status: 201 });
    }

    if (action === "create_warehouse") {
      const warehouse = core.createWarehouse({
        tenantId,
        code: typeof body.code === "string" ? body.code : "",
        name: typeof body.name === "string" ? body.name : "",
      });
      return NextResponse.json({ warehouse }, { status: 201 });
    }

    if (action === "create_location") {
      const location = core.createLocation({
        tenantId,
        warehouseId: typeof body.warehouseId === "string" ? body.warehouseId : "",
        code: typeof body.code === "string" ? body.code : "",
      });
      return NextResponse.json({ location }, { status: 201 });
    }

    if (action === "receive") {
      const move = core.receive({
        tenantId,
        productSku: typeof body.productSku === "string" ? body.productSku : "",
        toLocId: typeof body.toLocId === "string" ? body.toLocId : "",
        qty: typeof body.qty === "number" ? body.qty : Number(body.qty),
        actorId,
        idempotencyKey:
          typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
            ? body.idempotencyKey
            : `recv-${Date.now()}`,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      });
      return NextResponse.json({ move, balances: core.listBalances(tenantId) }, { status: 201 });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        code: "INVALID_INPUT",
        allowed: ["receive", "create_product", "create_warehouse", "create_location"],
      },
      { status: 400 },
    );
  } catch (e: unknown) {
    if (e instanceof InventoryError) return mapInventoryError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

import { NextResponse } from "next/server";
import { InventoryError } from "../../../../../../../../backend/agency/InventoryWarehousesCore";
import { ErpSnapshotConflictError } from "../../../../../../../../backend/agency/erp/ErpDomainSnapshotStore";
import { withInventoryPersistence } from "../../../../../../../../backend/agency/erp/ErpPersistentRuntime";
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

function mapCaught(e: unknown): NextResponse {
  if (e instanceof ErpSnapshotConflictError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
  }
  if (e instanceof InventoryError) return mapInventoryError(e);
  return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    const payload = await withInventoryPersistence(tenantId, (core) => ({
      balances: core.listBalances(tenantId),
      products: core.listProducts(tenantId),
      warehouses: core.listWarehouses(tenantId),
      locations: core.listLocations(tenantId),
      note:
        "Postgres SSOT via erp_domain_snapshots (mig 520) when DATABASE_URL set · else in-memory · no cost/GL",
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

    const action = typeof body.action === "string" ? body.action : "receive";
    const tenantId = ctx.tenant.id;
    const actorId = ctx.claims.userId ?? "saas-user";

    if (action === "create_product") {
      const product = await withInventoryPersistence(tenantId, (core) =>
        core.createProduct({
          tenantId,
          sku: typeof body.sku === "string" ? body.sku : "",
          name: typeof body.name === "string" ? body.name : "",
          uom: typeof body.uom === "string" ? body.uom : "u",
        }),
      );
      return NextResponse.json({ product }, { status: 201 });
    }

    if (action === "create_warehouse") {
      const warehouse = await withInventoryPersistence(tenantId, (core) =>
        core.createWarehouse({
          tenantId,
          code: typeof body.code === "string" ? body.code : "",
          name: typeof body.name === "string" ? body.name : "",
        }),
      );
      return NextResponse.json({ warehouse }, { status: 201 });
    }

    if (action === "create_location") {
      const location = await withInventoryPersistence(tenantId, (core) =>
        core.createLocation({
          tenantId,
          warehouseId: typeof body.warehouseId === "string" ? body.warehouseId : "",
          code: typeof body.code === "string" ? body.code : "",
        }),
      );
      return NextResponse.json({ location }, { status: 201 });
    }

    if (action === "receive") {
      const result = await withInventoryPersistence(tenantId, (core) => {
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
        return { move, balances: core.listBalances(tenantId) };
      });
      return NextResponse.json(result, { status: 201 });
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
    return mapCaught(e);
  }
}

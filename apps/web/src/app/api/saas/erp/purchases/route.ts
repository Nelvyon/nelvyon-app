import { NextResponse } from "next/server";
import {
  PurchasesSuppliersError,
  getPurchasesSuppliersCore,
} from "../../../../../../../../backend/agency/PurchasesSuppliersCore";
import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapPurchasesError(e: PurchasesSuppliersError): NextResponse {
  const status =
    e.code === "NOT_FOUND"
      ? 404
      : e.code === "TENANT_MISMATCH" || e.code === "BLOCKED_SCOPE"
        ? 403
        : e.code === "IDEMPOTENCY_CONFLICT"
          ? 409
          : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const core = getPurchasesSuppliersCore();
    const tenantId = ctx.tenant.id;
    return NextResponse.json({
      suppliers: core.listSuppliers(tenantId),
      purchaseRequests: core.listPRs(tenantId),
      note: "In-memory SSOT · payments/accounting BLOCKED_SCOPE · schema 519 reserved",
    });
  } catch (e: unknown) {
    if (e instanceof PurchasesSuppliersError) return mapPurchasesError(e);
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

    const action = typeof body.action === "string" ? body.action : "create_supplier";
    const tenantId = ctx.tenant.id;
    const actorId = ctx.claims.userId ?? "saas-user";
    const core = getPurchasesSuppliersCore();

    if (action === "create_supplier") {
      const supplier = core.createSupplier({
        tenantId,
        actorId,
        name: typeof body.name === "string" ? body.name : "",
        category: typeof body.category === "string" ? body.category : "",
        paymentTermsNote: typeof body.paymentTermsNote === "string" ? body.paymentTermsNote : undefined,
      });
      return NextResponse.json({ supplier }, { status: 201 });
    }

    if (action === "create_pr") {
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          sku: typeof l.sku === "string" ? l.sku : "",
          qty: typeof l.qty === "number" ? l.qty : Number(l.qty),
          uom: typeof l.uom === "string" ? l.uom : "u",
        }));
      const pr = core.createPR({
        tenantId,
        actorId,
        requesterId: typeof body.requesterId === "string" ? body.requesterId : actorId,
        lines,
        approvalLimitCents:
          typeof body.approvalLimitCents === "number"
            ? body.approvalLimitCents
            : Number(body.approvalLimitCents ?? 0),
        idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
      });
      return NextResponse.json({ purchaseRequest: pr }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Unknown action", code: "INVALID_INPUT", allowed: ["create_supplier", "create_pr"] },
      { status: 400 },
    );
  } catch (e: unknown) {
    if (e instanceof PurchasesSuppliersError) return mapPurchasesError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

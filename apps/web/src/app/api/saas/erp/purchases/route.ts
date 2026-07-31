import { NextResponse } from "next/server";
import { PurchasesSuppliersError } from "../../../../../../../../backend/agency/PurchasesSuppliersCore";
import { ErpSnapshotConflictError } from "../../../../../../../../backend/agency/erp/ErpDomainSnapshotStore";
import { withPurchasesPersistence } from "../../../../../../../../backend/agency/erp/ErpPersistentRuntime";
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

function mapCaught(e: unknown): NextResponse {
  if (e instanceof ErpSnapshotConflictError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
  }
  if (e instanceof PurchasesSuppliersError) return mapPurchasesError(e);
  return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const tenantId = ctx.tenant.id;
    const payload = await withPurchasesPersistence(tenantId, (core) => ({
      suppliers: core.listSuppliers(tenantId),
      purchaseRequests: core.listPRs(tenantId),
      note:
        "Postgres SSOT via erp_domain_snapshots (mig 520) when DATABASE_URL set · else in-memory · payments/accounting BLOCKED_SCOPE",
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

    const action = typeof body.action === "string" ? body.action : "create_supplier";
    const tenantId = ctx.tenant.id;
    const actorId = ctx.claims.userId ?? "saas-user";

    if (action === "create_supplier") {
      const supplier = await withPurchasesPersistence(tenantId, (core) =>
        core.createSupplier({
          tenantId,
          actorId,
          name: typeof body.name === "string" ? body.name : "",
          category: typeof body.category === "string" ? body.category : "",
          paymentTermsNote:
            typeof body.paymentTermsNote === "string" ? body.paymentTermsNote : undefined,
        }),
      );
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
      const pr = await withPurchasesPersistence(tenantId, (core) =>
        core.createPR({
          tenantId,
          actorId,
          requesterId: typeof body.requesterId === "string" ? body.requesterId : actorId,
          lines,
          approvalLimitCents:
            typeof body.approvalLimitCents === "number"
              ? body.approvalLimitCents
              : Number(body.approvalLimitCents ?? 0),
          idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
        }),
      );
      return NextResponse.json({ purchaseRequest: pr }, { status: 201 });
    }

    if (action === "submit_pr") {
      const purchaseRequestId = typeof body.purchaseRequestId === "string" ? body.purchaseRequestId : "";
      if (!purchaseRequestId) {
        return NextResponse.json({ error: "purchaseRequestId requerido" }, { status: 400 });
      }
      const pr = await withPurchasesPersistence(tenantId, (core) =>
        core.submitPR({ tenantId, actorId, purchaseRequestId }),
      );
      return NextResponse.json({ purchaseRequest: pr });
    }

    if (action === "approve_pr") {
      const purchaseRequestId = typeof body.purchaseRequestId === "string" ? body.purchaseRequestId : "";
      if (!purchaseRequestId) {
        return NextResponse.json({ error: "purchaseRequestId requerido" }, { status: 400 });
      }
      const roleRaw = typeof body.role === "string" ? body.role : "admin";
      const role =
        roleRaw === "requester" || roleRaw === "manager" || roleRaw === "admin" ? roleRaw : "admin";
      const pr = await withPurchasesPersistence(tenantId, (core) =>
        core.approvePR({
          tenantId,
          actorId,
          purchaseRequestId,
          role,
          note: typeof body.note === "string" ? body.note : undefined,
        }),
      );
      return NextResponse.json({ purchaseRequest: pr });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        code: "INVALID_INPUT",
        allowed: ["create_supplier", "create_pr", "submit_pr", "approve_pr"],
      },
      { status: 400 },
    );
  } catch (e: unknown) {
    return mapCaught(e);
  }
}

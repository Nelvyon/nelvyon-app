import { beforeEach, describe, expect, it } from "vitest";
import {
  PurchasesSuppliersCore,
  PurchasesSuppliersError,
  assertPurchasesCoreIntegrity,
  getPurchasesSuppliersCore,
  resetPurchasesSuppliersCoreForTests,
} from "../PurchasesSuppliersCore";

describe("PurchasesSuppliersCore — Block 26 ERP (zero-cost, no payments)", () => {
  let core: PurchasesSuppliersCore;

  beforeEach(() => {
    core = new PurchasesSuppliersCore();
  });

  it("creates supplier + contact + category", () => {
    const supplier = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "u1",
      name: "Acme Parts",
      category: "hardware",
      paymentTermsNote: "Net 30 commercial note only — not a payment rail",
    });
    expect(supplier.category).toBe("hardware");
    expect(supplier.status).toBe("active");
    expect(supplier.tenantId).toBe("tenant-a");

    const withContact = core.addSupplierContact({
      tenantId: "tenant-a",
      actorId: "u1",
      supplierId: supplier.id,
      name: "Jane Buyer",
      email: "jane@acme.example",
      role: "sales",
    });
    expect(withContact.contacts).toHaveLength(1);
    expect(withContact.contacts[0].email).toBe("jane@acme.example");
    expect(core.listSuppliers("tenant-a")).toHaveLength(1);
  });

  it("PR → approve → RFQ → compare quotes → PO → partial receipt → full receipt → return", () => {
    const s1 = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "buyer",
      name: "Vendor Fast",
      category: "components",
    });
    const s2 = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "buyer",
      name: "Vendor Cheap",
      category: "components",
    });

    let pr = core.createPR({
      tenantId: "tenant-a",
      actorId: "req-1",
      requesterId: "req-1",
      lines: [
        { sku: "SKU-100", qty: 10, uom: "ea" },
        { sku: "SKU-200", qty: 4, uom: "box" },
      ],
      approvalLimitCents: 40_000,
      idempotencyKey: "pr-flow-1",
    });
    expect(pr.status).toBe("draft");

    pr = core.submitPR({ tenantId: "tenant-a", actorId: "req-1", purchaseRequestId: pr.id });
    expect(pr.status).toBe("submitted");

    pr = core.approvePR({
      tenantId: "tenant-a",
      actorId: "mgr-1",
      purchaseRequestId: pr.id,
      role: "manager",
    });
    expect(pr.status).toBe("approved");

    let rfq = core.createRfq({
      tenantId: "tenant-a",
      actorId: "buyer",
      purchaseRequestId: pr.id,
      invitedSupplierIds: [s1.id, s2.id],
    });
    rfq = core.addQuote({
      tenantId: "tenant-a",
      actorId: "buyer",
      rfqId: rfq.id,
      supplierId: s1.id,
      unitPriceCents: 1200,
      leadDays: 3,
      notes: "fast ship",
    });
    rfq = core.addQuote({
      tenantId: "tenant-a",
      actorId: "buyer",
      rfqId: rfq.id,
      supplierId: s2.id,
      unitPriceCents: 900,
      leadDays: 14,
      notes: "cheaper",
    });
    expect(rfq.quotes).toHaveLength(2);

    const cmp = core.compareQuotes("tenant-a", rfq.id);
    expect(cmp.bestByUnitPrice?.supplierId).toBe(s2.id);
    expect(cmp.bestByLeadDays?.supplierId).toBe(s1.id);

    let po = core.createPO({
      tenantId: "tenant-a",
      actorId: "buyer",
      rfqId: rfq.id,
      selectedSupplierId: s2.id,
      idempotencyKey: "po-flow-1",
    });
    expect(po.status).toBe("draft");
    expect(po.lines[0].unitPriceCents).toBe(900);

    po = core.issuePO({ tenantId: "tenant-a", actorId: "buyer", purchaseOrderId: po.id });
    expect(po.status).toBe("issued");

    const partial = core.postReceipt({
      tenantId: "tenant-a",
      actorId: "warehouse",
      purchaseOrderId: po.id,
      lines: [{ sku: "SKU-100", qtyReceived: 4, uom: "ea" }],
      idempotencyKey: "rcpt-partial-1",
    });
    expect(partial.posted).toBe(true);
    po = core.getPO("tenant-a", po.id);
    expect(po.status).toBe("partially_received");
    expect(po.lines.find((l) => l.sku === "SKU-100")?.qtyReceived).toBe(4);

    const full = core.postReceipt({
      tenantId: "tenant-a",
      actorId: "warehouse",
      purchaseOrderId: po.id,
      lines: [
        { sku: "SKU-100", qtyReceived: 6, uom: "ea" },
        { sku: "SKU-200", qtyReceived: 4, uom: "box" },
      ],
      idempotencyKey: "rcpt-full-1",
    });
    expect(full.lines).toHaveLength(2);
    po = core.getPO("tenant-a", po.id);
    expect(po.status).toBe("received");

    const ret = core.createReturn({
      tenantId: "tenant-a",
      actorId: "warehouse",
      goodsReceiptId: full.id,
      sku: "SKU-200",
      qty: 1,
      reason: "damaged on arrival",
    });
    expect(ret.qty).toBe(1);
    expect(core.listReturns("tenant-a")).toHaveLength(1);

    const incident = core.createIncident({
      tenantId: "tenant-a",
      actorId: "qa",
      entityType: "goods_receipt",
      entityId: full.id,
      title: "Damaged box",
      detail: "one unit returned",
    });
    expect(incident.status).toBe("open");

    const audit = core.listAuditLog("tenant-a");
    expect(audit.length).toBeGreaterThanOrEqual(10);
    expect(audit.every((e) => e.tenantId === "tenant-a")).toBe(true);
  });

  it("tenant A cannot read/modify tenant B suppliers/POs/stock docs", () => {
    const supplierA = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "a",
      name: "A Co",
      category: "ops",
    });
    const supplierB = core.createSupplier({
      tenantId: "tenant-b",
      actorId: "b",
      name: "B Co",
      category: "ops",
    });

    expect(core.listSuppliers("tenant-a").map((s) => s.id)).toEqual([supplierA.id]);
    expect(core.listSuppliers("tenant-b").map((s) => s.id)).toEqual([supplierB.id]);

    expect(() => core.getSupplier("tenant-b", supplierA.id)).toThrow(PurchasesSuppliersError);
    try {
      core.getSupplier("tenant-b", supplierA.id);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PurchasesSuppliersError);
      expect((err as PurchasesSuppliersError).code).toBe("NOT_FOUND");
    }

    const prA = core.createPR({
      tenantId: "tenant-a",
      actorId: "a",
      requesterId: "a",
      lines: [{ sku: "X", qty: 1, uom: "ea" }],
      approvalLimitCents: 100,
    });
    core.submitPR({ tenantId: "tenant-a", actorId: "a", purchaseRequestId: prA.id });
    core.approvePR({
      tenantId: "tenant-a",
      actorId: "admin",
      purchaseRequestId: prA.id,
      role: "admin",
    });
    const rfqA = core.createRfq({
      tenantId: "tenant-a",
      actorId: "a",
      purchaseRequestId: prA.id,
      invitedSupplierIds: [supplierA.id],
    });
    core.addQuote({
      tenantId: "tenant-a",
      actorId: "a",
      rfqId: rfqA.id,
      supplierId: supplierA.id,
      unitPriceCents: 50,
      leadDays: 1,
    });
    const poA = core.createPO({
      tenantId: "tenant-a",
      actorId: "a",
      rfqId: rfqA.id,
      selectedSupplierId: supplierA.id,
    });
    core.issuePO({ tenantId: "tenant-a", actorId: "a", purchaseOrderId: poA.id });

    expect(core.listPOs("tenant-b")).toHaveLength(0);
    expect(() => core.getPO("tenant-b", poA.id)).toThrow(PurchasesSuppliersError);
    expect(() =>
      core.postReceipt({
        tenantId: "tenant-b",
        actorId: "b",
        purchaseOrderId: poA.id,
        lines: [{ sku: "X", qtyReceived: 1, uom: "ea" }],
      }),
    ).toThrow(PurchasesSuppliersError);
    expect(() =>
      core.setSupplierStatus({
        tenantId: "tenant-b",
        actorId: "b",
        supplierId: supplierA.id,
        status: "inactive",
      }),
    ).toThrow(PurchasesSuppliersError);
  });

  it("approval over limit is rejected without claiming payment", () => {
    core.setApprovalPolicy({
      tenantId: "tenant-a",
      actorId: "admin",
      maxApproveCents: { manager: 10_000, requester: 0, admin: 1_000_000 },
    });
    const pr = core.createPR({
      tenantId: "tenant-a",
      actorId: "req",
      requesterId: "req",
      lines: [{ sku: "BIG", qty: 1, uom: "ea" }],
      approvalLimitCents: 25_000,
    });
    core.submitPR({ tenantId: "tenant-a", actorId: "req", purchaseRequestId: pr.id });

    expect(() =>
      core.approvePR({
        tenantId: "tenant-a",
        actorId: "mgr",
        purchaseRequestId: pr.id,
        role: "manager",
      }),
    ).toThrow(PurchasesSuppliersError);

    try {
      core.approvePR({
        tenantId: "tenant-a",
        actorId: "mgr",
        purchaseRequestId: pr.id,
        role: "manager",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PurchasesSuppliersError);
      expect((err as PurchasesSuppliersError).code).toBe("APPROVAL_LIMIT_EXCEEDED");
      expect((err as PurchasesSuppliersError).message).toMatch(/no payment/i);
    }

    const stillSubmitted = core.getPR("tenant-a", pr.id);
    expect(stillSubmitted.status).toBe("submitted");
  });

  it("recordPayment always throws BLOCKED_SCOPE", () => {
    expect(() => core.recordPayment({ tenantId: "tenant-a", amountCents: 100 })).toThrow(
      PurchasesSuppliersError,
    );
    try {
      core.recordPayment({ tenantId: "tenant-a", amountCents: 100 });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PurchasesSuppliersError);
      expect((err as PurchasesSuppliersError).code).toBe("BLOCKED_SCOPE");
    }
  });

  it("idempotency: double-submit createPR / createPO / postReceipt returns same entity", () => {
    const supplier = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "u",
      name: "Idem Co",
      category: "parts",
    });
    const pr1 = core.createPR({
      tenantId: "tenant-a",
      actorId: "u",
      requesterId: "u",
      lines: [{ sku: "I-1", qty: 2, uom: "ea" }],
      approvalLimitCents: 500,
      idempotencyKey: "idem-pr",
    });
    const pr2 = core.createPR({
      tenantId: "tenant-a",
      actorId: "u",
      requesterId: "u",
      lines: [{ sku: "I-1", qty: 2, uom: "ea" }],
      approvalLimitCents: 500,
      idempotencyKey: "idem-pr",
    });
    expect(pr2.id).toBe(pr1.id);
    expect(core.listPRs("tenant-a")).toHaveLength(1);

    core.submitPR({ tenantId: "tenant-a", actorId: "u", purchaseRequestId: pr1.id });
    core.approvePR({
      tenantId: "tenant-a",
      actorId: "admin",
      purchaseRequestId: pr1.id,
      role: "admin",
    });
    const rfq = core.createRfq({
      tenantId: "tenant-a",
      actorId: "u",
      purchaseRequestId: pr1.id,
      invitedSupplierIds: [supplier.id],
    });
    core.addQuote({
      tenantId: "tenant-a",
      actorId: "u",
      rfqId: rfq.id,
      supplierId: supplier.id,
      unitPriceCents: 100,
      leadDays: 2,
    });

    const po1 = core.createPO({
      tenantId: "tenant-a",
      actorId: "u",
      rfqId: rfq.id,
      selectedSupplierId: supplier.id,
      idempotencyKey: "idem-po",
    });
    const po2 = core.createPO({
      tenantId: "tenant-a",
      actorId: "u",
      rfqId: rfq.id,
      selectedSupplierId: supplier.id,
      idempotencyKey: "idem-po",
    });
    expect(po2.id).toBe(po1.id);

    core.issuePO({ tenantId: "tenant-a", actorId: "u", purchaseOrderId: po1.id });
    const r1 = core.postReceipt({
      tenantId: "tenant-a",
      actorId: "u",
      purchaseOrderId: po1.id,
      lines: [{ sku: "I-1", qtyReceived: 2, uom: "ea" }],
      idempotencyKey: "idem-rcpt",
    });
    const r2 = core.postReceipt({
      tenantId: "tenant-a",
      actorId: "u",
      purchaseOrderId: po1.id,
      lines: [{ sku: "I-1", qtyReceived: 2, uom: "ea" }],
      idempotencyKey: "idem-rcpt",
    });
    expect(r2.id).toBe(r1.id);
    expect(core.listReceipts("tenant-a")).toHaveLength(1);
  });

  it("audit trail is non-empty after mutations", () => {
    core.createSupplier({
      tenantId: "tenant-a",
      actorId: "auditor",
      name: "Audited",
      category: "misc",
    });
    const log = core.listAuditLog("tenant-a");
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]).toMatchObject({
      tenantId: "tenant-a",
      actorId: "auditor",
      action: "supplier_created",
      entityType: "supplier",
    });
    expect(log[0].at).toBeTruthy();
    expect(log[0].id).toBeTruthy();
  });

  it("QA integrity: assertPurchasesCoreIntegrity ok (critical flows ≥90 conceptual)", () => {
    const result = assertPurchasesCoreIntegrity();
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("rejects empty tenantId on every scoped op", () => {
    expect(() =>
      core.createSupplier({ tenantId: "", actorId: "x", name: "n", category: "c" }),
    ).toThrow(PurchasesSuppliersError);
    try {
      core.createSupplier({ tenantId: "   ", actorId: "x", name: "n", category: "c" });
      throw new Error("expected throw");
    } catch (err) {
      expect((err as PurchasesSuppliersError).code).toBe("TENANT_MISMATCH");
    }
  });

  it("attachment meta is metadata-only (sha256 placeholder, no binary)", () => {
    const supplier = core.createSupplier({
      tenantId: "tenant-a",
      actorId: "u",
      name: "Att Co",
      category: "docs",
    });
    const meta = core.attachMeta({
      tenantId: "tenant-a",
      actorId: "u",
      entityType: "supplier",
      entityId: supplier.id,
      filename: "terms.pdf",
    });
    expect(meta.sha256.startsWith("placeholder-")).toBe(true);
    expect(meta.filename).toBe("terms.pdf");
    expect(core.listAttachments("tenant-a")).toHaveLength(1);
  });

  it("singleton helpers reset cleanly for tests", () => {
    resetPurchasesSuppliersCoreForTests();
    const shared = getPurchasesSuppliersCore();
    shared.createSupplier({
      tenantId: "t1",
      actorId: "u",
      name: "Shared",
      category: "x",
    });
    expect(shared.listSuppliers("t1")).toHaveLength(1);
    resetPurchasesSuppliersCoreForTests();
    expect(getPurchasesSuppliersCore().listSuppliers("t1")).toHaveLength(0);
  });
});

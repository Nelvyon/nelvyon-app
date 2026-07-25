/**
 * Purchases & Suppliers ERP CORE — Block 26 (zero-cost, no payments/accounting).
 *
 * In-memory, multi-tenant procurement domain: suppliers, purchase requests (PR),
 * RFQs/quotes, purchase orders (PO), goods receipts, returns, incidents,
 * attachment metadata, approval policies, and an append-only audit log.
 *
 * Hard scope boundaries:
 * - NO payment, bank, tax, payroll, or accounting APIs.
 * - `recordPayment()` is a permanent stub that ALWAYS throws `BLOCKED_SCOPE`.
 * - Monetary fields (`unitPriceCents`, `approvalLimitCents`, `maxApproveCents`)
 *   are informational / policy gates only — they never move money.
 * - Attachment storage is metadata-only (`sha256` placeholder); no binary store.
 * - No network I/O. Parent wires catalog/API; this module stays pure domain.
 */

import { randomUUID } from "node:crypto";

export type TenantId = string;

export type PurchasesErrorCode =
  | "TENANT_MISMATCH"
  | "BLOCKED_SCOPE"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "APPROVAL_LIMIT_EXCEEDED"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_INPUT";

export class PurchasesSuppliersError extends Error {
  readonly code: PurchasesErrorCode;

  constructor(code: PurchasesErrorCode, message: string) {
    super(message);
    this.name = "PurchasesSuppliersError";
    this.code = code;
  }
}

export type SupplierStatus = "active" | "inactive";

export type SupplierContact = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
};

export type Supplier = {
  id: string;
  tenantId: TenantId;
  name: string;
  category: string;
  /** Free-text commercial note — NEVER a payment instruction or bank detail. */
  paymentTermsNote: string;
  status: SupplierStatus;
  contacts: SupplierContact[];
  createdAt: string;
};

export type PrLine = {
  sku: string;
  qty: number;
  uom: string;
};

export type PurchaseRequestStatus = "draft" | "submitted" | "approved" | "rejected";

export type PurchaseRequest = {
  id: string;
  tenantId: TenantId;
  requesterId: string;
  status: PurchaseRequestStatus;
  lines: PrLine[];
  /** Informational ceiling for approval policy checks — NOT a payment amount. */
  approvalLimitCents: number;
  createdAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
};

export type QuoteLine = {
  supplierId: string;
  /** Informational unit price — NEVER triggers payment. */
  unitPriceCents: number;
  leadDays: number;
  notes: string;
};

export type Rfq = {
  id: string;
  tenantId: TenantId;
  purchaseRequestId: string;
  invitedSupplierIds: string[];
  quotes: QuoteLine[];
  createdAt: string;
};

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "partially_received"
  | "received"
  | "closed"
  | "cancelled";

export type PoLine = {
  sku: string;
  qtyOrdered: number;
  qtyReceived: number;
  uom: string;
  unitPriceCents: number;
};

export type PurchaseOrder = {
  id: string;
  tenantId: TenantId;
  purchaseRequestId: string;
  rfqId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  lines: PoLine[];
  createdAt: string;
  issuedAt: string | null;
  closedAt: string | null;
};

export type ReceiptLine = {
  sku: string;
  qtyReceived: number;
  uom: string;
};

export type GoodsReceipt = {
  id: string;
  tenantId: TenantId;
  purchaseOrderId: string;
  lines: ReceiptLine[];
  postedAt: string;
  postedBy: string;
  /** Once true, receipt is immutable. */
  posted: true;
};

export type SupplierReturn = {
  id: string;
  tenantId: TenantId;
  goodsReceiptId: string;
  purchaseOrderId: string;
  sku: string;
  qty: number;
  reason: string;
  createdAt: string;
  createdBy: string;
};

export type IncidentEntityType = "purchase_order" | "goods_receipt";

export type Incident = {
  id: string;
  tenantId: TenantId;
  entityType: IncidentEntityType;
  entityId: string;
  title: string;
  detail: string;
  status: "open" | "resolved";
  createdAt: string;
  createdBy: string;
};

export type AttachmentEntityType =
  | "supplier"
  | "purchase_request"
  | "rfq"
  | "purchase_order"
  | "goods_receipt"
  | "supplier_return"
  | "incident";

export type AttachmentMeta = {
  id: string;
  tenantId: TenantId;
  entityType: AttachmentEntityType;
  entityId: string;
  filename: string;
  /** Placeholder hash — metadata only; no binary store in this core. */
  sha256: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  tenantId: TenantId;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
};

export type ApprovalRole = "requester" | "manager" | "admin";

export type ApprovalPolicy = {
  tenantId: TenantId;
  maxApproveCents: Record<ApprovalRole, number>;
  updatedAt: string;
};

export const DEFAULT_APPROVAL_POLICY_CENTS: Record<ApprovalRole, number> = {
  requester: 0,
  manager: 50_000,
  admin: 1_000_000,
};

type IdempotencyBucket = "pr" | "po" | "receipt";

type TenantState = {
  suppliers: Map<string, Supplier>;
  purchaseRequests: Map<string, PurchaseRequest>;
  rfqs: Map<string, Rfq>;
  purchaseOrders: Map<string, PurchaseOrder>;
  goodsReceipts: Map<string, GoodsReceipt>;
  returns: Map<string, SupplierReturn>;
  incidents: Map<string, Incident>;
  attachments: Map<string, AttachmentMeta>;
  auditLog: AuditEntry[];
  approvalPolicy: ApprovalPolicy;
  idempotency: Map<string, string>;
};

function emptyTenantState(tenantId: TenantId): TenantState {
  return {
    suppliers: new Map(),
    purchaseRequests: new Map(),
    rfqs: new Map(),
    purchaseOrders: new Map(),
    goodsReceipts: new Map(),
    returns: new Map(),
    incidents: new Map(),
    attachments: new Map(),
    auditLog: [],
    approvalPolicy: {
      tenantId,
      maxApproveCents: { ...DEFAULT_APPROVAL_POLICY_CENTS },
      updatedAt: new Date().toISOString(),
    },
    idempotency: new Map(),
  };
}

function idemKey(bucket: IdempotencyBucket, key: string): string {
  return `${bucket}:${key}`;
}

/**
 * In-memory Purchases & Suppliers ERP core. Constructor does not bind a single
 * tenant — every operation requires an explicit `tenantId` and rejects empty /
 * cross-tenant access with `TENANT_MISMATCH`.
 */
export class PurchasesSuppliersCore {
  private readonly tenants = new Map<TenantId, TenantState>();

  constructor() {
    // Multi-tenant map; tenant scoping is enforced on every public method.
  }

  reset(): void {
    this.tenants.clear();
  }

  private requireTenantId(tenantId: TenantId): TenantId {
    if (!tenantId || !tenantId.trim()) {
      throw new PurchasesSuppliersError("TENANT_MISMATCH", "tenantId is required");
    }
    return tenantId;
  }

  private stateFor(tenantId: TenantId): TenantState {
    const id = this.requireTenantId(tenantId);
    let state = this.tenants.get(id);
    if (!state) {
      state = emptyTenantState(id);
      this.tenants.set(id, state);
    }
    return state;
  }

  private audit(
    tenantId: TenantId,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    detail: string,
  ): void {
    this.stateFor(tenantId).auditLog.push({
      id: randomUUID(),
      at: new Date().toISOString(),
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
      detail,
    });
  }

  private assertOwned<T extends { tenantId: TenantId }>(
    tenantId: TenantId,
    entity: T | undefined,
    label: string,
    id: string,
  ): T {
    if (!entity) {
      throw new PurchasesSuppliersError("NOT_FOUND", `${label} not found: ${id}`);
    }
    if (entity.tenantId !== tenantId) {
      throw new PurchasesSuppliersError(
        "TENANT_MISMATCH",
        `cross-tenant access to ${label} denied`,
      );
    }
    return entity;
  }

  private resolveIdempotency(
    state: TenantState,
    bucket: IdempotencyBucket,
    key: string | undefined,
  ): string | null {
    if (!key?.trim()) return null;
    const existing = state.idempotency.get(idemKey(bucket, key.trim()));
    return existing ?? null;
  }

  private rememberIdempotency(
    state: TenantState,
    bucket: IdempotencyBucket,
    key: string | undefined,
    entityId: string,
  ): void {
    if (!key?.trim()) return;
    state.idempotency.set(idemKey(bucket, key.trim()), entityId);
  }

  // --- Suppliers ---

  createSupplier(input: {
    tenantId: TenantId;
    actorId: string;
    name: string;
    category: string;
    paymentTermsNote?: string;
    status?: SupplierStatus;
  }): Supplier {
    const state = this.stateFor(input.tenantId);
    if (!input.name?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "supplier name is required");
    }
    if (!input.category?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "supplier category is required");
    }
    const supplier: Supplier = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      category: input.category.trim(),
      paymentTermsNote: (input.paymentTermsNote ?? "").trim(),
      status: input.status ?? "active",
      contacts: [],
      createdAt: new Date().toISOString(),
    };
    state.suppliers.set(supplier.id, supplier);
    this.audit(
      input.tenantId,
      input.actorId,
      "supplier_created",
      "supplier",
      supplier.id,
      `name=${supplier.name} category=${supplier.category}`,
    );
    return structuredClone(supplier);
  }

  addSupplierContact(input: {
    tenantId: TenantId;
    actorId: string;
    supplierId: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  }): Supplier {
    const state = this.stateFor(input.tenantId);
    const supplier = this.assertOwned(
      input.tenantId,
      state.suppliers.get(input.supplierId),
      "supplier",
      input.supplierId,
    );
    if (!input.name?.trim() || !input.email?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "contact name and email are required");
    }
    const contact: SupplierContact = {
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim(),
      role: input.role?.trim(),
    };
    supplier.contacts.push(contact);
    this.audit(
      input.tenantId,
      input.actorId,
      "supplier_contact_added",
      "supplier",
      supplier.id,
      `contact=${contact.id} email=${contact.email}`,
    );
    return structuredClone(supplier);
  }

  setSupplierStatus(input: {
    tenantId: TenantId;
    actorId: string;
    supplierId: string;
    status: SupplierStatus;
  }): Supplier {
    const state = this.stateFor(input.tenantId);
    const supplier = this.assertOwned(
      input.tenantId,
      state.suppliers.get(input.supplierId),
      "supplier",
      input.supplierId,
    );
    supplier.status = input.status;
    this.audit(
      input.tenantId,
      input.actorId,
      "supplier_status_changed",
      "supplier",
      supplier.id,
      `status=${input.status}`,
    );
    return structuredClone(supplier);
  }

  getSupplier(tenantId: TenantId, supplierId: string): Supplier {
    const state = this.stateFor(tenantId);
    return structuredClone(
      this.assertOwned(tenantId, state.suppliers.get(supplierId), "supplier", supplierId),
    );
  }

  listSuppliers(tenantId: TenantId): Supplier[] {
    return [...this.stateFor(tenantId).suppliers.values()].map((s) => structuredClone(s));
  }

  // --- Approval policy ---

  setApprovalPolicy(input: {
    tenantId: TenantId;
    actorId: string;
    maxApproveCents: Partial<Record<ApprovalRole, number>>;
  }): ApprovalPolicy {
    const state = this.stateFor(input.tenantId);
    for (const [role, cents] of Object.entries(input.maxApproveCents) as [ApprovalRole, number][]) {
      if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0) {
        throw new PurchasesSuppliersError("INVALID_INPUT", `invalid maxApproveCents for ${role}`);
      }
      state.approvalPolicy.maxApproveCents[role] = Math.round(cents);
    }
    state.approvalPolicy.updatedAt = new Date().toISOString();
    this.audit(
      input.tenantId,
      input.actorId,
      "approval_policy_updated",
      "approval_policy",
      input.tenantId,
      `maxApproveCents=${JSON.stringify(state.approvalPolicy.maxApproveCents)}`,
    );
    return structuredClone(state.approvalPolicy);
  }

  getApprovalPolicy(tenantId: TenantId): ApprovalPolicy {
    return structuredClone(this.stateFor(tenantId).approvalPolicy);
  }

  // --- Purchase requests ---

  createPR(input: {
    tenantId: TenantId;
    actorId: string;
    requesterId: string;
    lines: PrLine[];
    approvalLimitCents: number;
    idempotencyKey?: string;
  }): PurchaseRequest {
    const state = this.stateFor(input.tenantId);
    const existingId = this.resolveIdempotency(state, "pr", input.idempotencyKey);
    if (existingId) {
      const existing = state.purchaseRequests.get(existingId);
      if (existing) return structuredClone(existing);
      throw new PurchasesSuppliersError("IDEMPOTENCY_CONFLICT", "idempotency key maps to missing PR");
    }
    if (!input.requesterId?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "requesterId is required");
    }
    if (!input.lines?.length) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "PR must have at least one line");
    }
    for (const line of input.lines) {
      if (!line.sku?.trim() || !(line.qty > 0) || !line.uom?.trim()) {
        throw new PurchasesSuppliersError("INVALID_INPUT", "invalid PR line");
      }
    }
    if (!Number.isFinite(input.approvalLimitCents) || input.approvalLimitCents < 0) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "approvalLimitCents must be >= 0");
    }

    const pr: PurchaseRequest = {
      id: randomUUID(),
      tenantId: input.tenantId,
      requesterId: input.requesterId,
      status: "draft",
      lines: input.lines.map((l) => ({ sku: l.sku.trim(), qty: l.qty, uom: l.uom.trim() })),
      approvalLimitCents: Math.round(input.approvalLimitCents),
      createdAt: new Date().toISOString(),
      submittedAt: null,
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    };
    state.purchaseRequests.set(pr.id, pr);
    this.rememberIdempotency(state, "pr", input.idempotencyKey, pr.id);
    this.audit(
      input.tenantId,
      input.actorId,
      "pr_created",
      "purchase_request",
      pr.id,
      `lines=${pr.lines.length} approvalLimitCents=${pr.approvalLimitCents}`,
    );
    return structuredClone(pr);
  }

  submitPR(input: { tenantId: TenantId; actorId: string; purchaseRequestId: string }): PurchaseRequest {
    const state = this.stateFor(input.tenantId);
    const pr = this.assertOwned(
      input.tenantId,
      state.purchaseRequests.get(input.purchaseRequestId),
      "purchase_request",
      input.purchaseRequestId,
    );
    if (pr.status !== "draft") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot submit PR from status=${pr.status}`);
    }
    pr.status = "submitted";
    pr.submittedAt = new Date().toISOString();
    this.audit(
      input.tenantId,
      input.actorId,
      "pr_submitted",
      "purchase_request",
      pr.id,
      "status=submitted",
    );
    return structuredClone(pr);
  }

  approvePR(input: {
    tenantId: TenantId;
    actorId: string;
    purchaseRequestId: string;
    role: ApprovalRole;
    note?: string;
  }): PurchaseRequest {
    const state = this.stateFor(input.tenantId);
    const pr = this.assertOwned(
      input.tenantId,
      state.purchaseRequests.get(input.purchaseRequestId),
      "purchase_request",
      input.purchaseRequestId,
    );
    if (pr.status !== "submitted") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot approve PR from status=${pr.status}`);
    }
    const limit = state.approvalPolicy.maxApproveCents[input.role];
    if (pr.approvalLimitCents > limit) {
      throw new PurchasesSuppliersError(
        "APPROVAL_LIMIT_EXCEEDED",
        `role=${input.role} maxApproveCents=${limit} cannot approve PR approvalLimitCents=${pr.approvalLimitCents} (informational; no payment)`,
      );
    }
    pr.status = "approved";
    pr.decidedAt = new Date().toISOString();
    pr.decidedBy = input.actorId;
    pr.decisionNote = input.note?.trim() ?? null;
    this.audit(
      input.tenantId,
      input.actorId,
      "pr_approved",
      "purchase_request",
      pr.id,
      `role=${input.role} approvalLimitCents=${pr.approvalLimitCents}`,
    );
    return structuredClone(pr);
  }

  rejectPR(input: {
    tenantId: TenantId;
    actorId: string;
    purchaseRequestId: string;
    note?: string;
  }): PurchaseRequest {
    const state = this.stateFor(input.tenantId);
    const pr = this.assertOwned(
      input.tenantId,
      state.purchaseRequests.get(input.purchaseRequestId),
      "purchase_request",
      input.purchaseRequestId,
    );
    if (pr.status !== "submitted") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot reject PR from status=${pr.status}`);
    }
    pr.status = "rejected";
    pr.decidedAt = new Date().toISOString();
    pr.decidedBy = input.actorId;
    pr.decisionNote = input.note?.trim() ?? null;
    this.audit(
      input.tenantId,
      input.actorId,
      "pr_rejected",
      "purchase_request",
      pr.id,
      `note=${pr.decisionNote ?? ""}`,
    );
    return structuredClone(pr);
  }

  getPR(tenantId: TenantId, purchaseRequestId: string): PurchaseRequest {
    const state = this.stateFor(tenantId);
    return structuredClone(
      this.assertOwned(
        tenantId,
        state.purchaseRequests.get(purchaseRequestId),
        "purchase_request",
        purchaseRequestId,
      ),
    );
  }

  listPRs(tenantId: TenantId): PurchaseRequest[] {
    return [...this.stateFor(tenantId).purchaseRequests.values()].map((p) => structuredClone(p));
  }

  // --- RFQ / quotes ---

  createRfq(input: {
    tenantId: TenantId;
    actorId: string;
    purchaseRequestId: string;
    invitedSupplierIds: string[];
  }): Rfq {
    const state = this.stateFor(input.tenantId);
    const pr = this.assertOwned(
      input.tenantId,
      state.purchaseRequests.get(input.purchaseRequestId),
      "purchase_request",
      input.purchaseRequestId,
    );
    if (pr.status !== "approved") {
      throw new PurchasesSuppliersError("INVALID_STATE", "RFQ requires an approved PR");
    }
    if (!input.invitedSupplierIds?.length) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "at least one invited supplier is required");
    }
    for (const supplierId of input.invitedSupplierIds) {
      this.assertOwned(input.tenantId, state.suppliers.get(supplierId), "supplier", supplierId);
    }
    const rfq: Rfq = {
      id: randomUUID(),
      tenantId: input.tenantId,
      purchaseRequestId: pr.id,
      invitedSupplierIds: [...input.invitedSupplierIds],
      quotes: [],
      createdAt: new Date().toISOString(),
    };
    state.rfqs.set(rfq.id, rfq);
    this.audit(
      input.tenantId,
      input.actorId,
      "rfq_created",
      "rfq",
      rfq.id,
      `pr=${pr.id} invited=${rfq.invitedSupplierIds.length}`,
    );
    return structuredClone(rfq);
  }

  addQuote(input: {
    tenantId: TenantId;
    actorId: string;
    rfqId: string;
    supplierId: string;
    unitPriceCents: number;
    leadDays: number;
    notes?: string;
  }): Rfq {
    const state = this.stateFor(input.tenantId);
    const rfq = this.assertOwned(input.tenantId, state.rfqs.get(input.rfqId), "rfq", input.rfqId);
    this.assertOwned(input.tenantId, state.suppliers.get(input.supplierId), "supplier", input.supplierId);
    if (!rfq.invitedSupplierIds.includes(input.supplierId)) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "supplier was not invited to this RFQ");
    }
    if (!Number.isFinite(input.unitPriceCents) || input.unitPriceCents < 0) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "unitPriceCents must be >= 0 (informational)");
    }
    if (!Number.isFinite(input.leadDays) || input.leadDays < 0) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "leadDays must be >= 0");
    }
    const existingIdx = rfq.quotes.findIndex((q) => q.supplierId === input.supplierId);
    const quote: QuoteLine = {
      supplierId: input.supplierId,
      unitPriceCents: Math.round(input.unitPriceCents),
      leadDays: Math.round(input.leadDays),
      notes: (input.notes ?? "").trim(),
    };
    if (existingIdx >= 0) rfq.quotes[existingIdx] = quote;
    else rfq.quotes.push(quote);
    this.audit(
      input.tenantId,
      input.actorId,
      "rfq_quote_added",
      "rfq",
      rfq.id,
      `supplier=${input.supplierId} unitPriceCents=${quote.unitPriceCents} leadDays=${quote.leadDays}`,
    );
    return structuredClone(rfq);
  }

  compareQuotes(tenantId: TenantId, rfqId: string): {
    rfqId: string;
    quotes: QuoteLine[];
    bestByUnitPrice: QuoteLine | null;
    bestByLeadDays: QuoteLine | null;
  } {
    const state = this.stateFor(tenantId);
    const rfq = this.assertOwned(tenantId, state.rfqs.get(rfqId), "rfq", rfqId);
    const quotes = [...rfq.quotes];
    const bestByUnitPrice =
      quotes.length === 0
        ? null
        : quotes.reduce((a, b) => (b.unitPriceCents < a.unitPriceCents ? b : a));
    const bestByLeadDays =
      quotes.length === 0 ? null : quotes.reduce((a, b) => (b.leadDays < a.leadDays ? b : a));
    return {
      rfqId: rfq.id,
      quotes: quotes.map((q) => ({ ...q })),
      bestByUnitPrice: bestByUnitPrice ? { ...bestByUnitPrice } : null,
      bestByLeadDays: bestByLeadDays ? { ...bestByLeadDays } : null,
    };
  }

  getRfq(tenantId: TenantId, rfqId: string): Rfq {
    const state = this.stateFor(tenantId);
    return structuredClone(this.assertOwned(tenantId, state.rfqs.get(rfqId), "rfq", rfqId));
  }

  // --- Purchase orders ---

  createPO(input: {
    tenantId: TenantId;
    actorId: string;
    rfqId: string;
    selectedSupplierId: string;
    idempotencyKey?: string;
  }): PurchaseOrder {
    const state = this.stateFor(input.tenantId);
    const existingId = this.resolveIdempotency(state, "po", input.idempotencyKey);
    if (existingId) {
      const existing = state.purchaseOrders.get(existingId);
      if (existing) return structuredClone(existing);
      throw new PurchasesSuppliersError("IDEMPOTENCY_CONFLICT", "idempotency key maps to missing PO");
    }
    const rfq = this.assertOwned(input.tenantId, state.rfqs.get(input.rfqId), "rfq", input.rfqId);
    const quote = rfq.quotes.find((q) => q.supplierId === input.selectedSupplierId);
    if (!quote) {
      throw new PurchasesSuppliersError(
        "NOT_FOUND",
        `no quote from supplier ${input.selectedSupplierId} on RFQ ${input.rfqId}`,
      );
    }
    const pr = this.assertOwned(
      input.tenantId,
      state.purchaseRequests.get(rfq.purchaseRequestId),
      "purchase_request",
      rfq.purchaseRequestId,
    );
    this.assertOwned(
      input.tenantId,
      state.suppliers.get(input.selectedSupplierId),
      "supplier",
      input.selectedSupplierId,
    );

    const po: PurchaseOrder = {
      id: randomUUID(),
      tenantId: input.tenantId,
      purchaseRequestId: pr.id,
      rfqId: rfq.id,
      supplierId: input.selectedSupplierId,
      status: "draft",
      lines: pr.lines.map((l) => ({
        sku: l.sku,
        qtyOrdered: l.qty,
        qtyReceived: 0,
        uom: l.uom,
        unitPriceCents: quote.unitPriceCents,
      })),
      createdAt: new Date().toISOString(),
      issuedAt: null,
      closedAt: null,
    };
    state.purchaseOrders.set(po.id, po);
    this.rememberIdempotency(state, "po", input.idempotencyKey, po.id);
    this.audit(
      input.tenantId,
      input.actorId,
      "po_created",
      "purchase_order",
      po.id,
      `supplier=${po.supplierId} rfq=${rfq.id} from_quote_unitPriceCents=${quote.unitPriceCents}`,
    );
    return structuredClone(po);
  }

  issuePO(input: { tenantId: TenantId; actorId: string; purchaseOrderId: string }): PurchaseOrder {
    const state = this.stateFor(input.tenantId);
    const po = this.assertOwned(
      input.tenantId,
      state.purchaseOrders.get(input.purchaseOrderId),
      "purchase_order",
      input.purchaseOrderId,
    );
    if (po.status !== "draft") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot issue PO from status=${po.status}`);
    }
    po.status = "issued";
    po.issuedAt = new Date().toISOString();
    this.audit(input.tenantId, input.actorId, "po_issued", "purchase_order", po.id, "status=issued");
    return structuredClone(po);
  }

  cancelPO(input: { tenantId: TenantId; actorId: string; purchaseOrderId: string }): PurchaseOrder {
    const state = this.stateFor(input.tenantId);
    const po = this.assertOwned(
      input.tenantId,
      state.purchaseOrders.get(input.purchaseOrderId),
      "purchase_order",
      input.purchaseOrderId,
    );
    if (po.status === "received" || po.status === "closed" || po.status === "cancelled") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot cancel PO from status=${po.status}`);
    }
    if (po.lines.some((l) => l.qtyReceived > 0)) {
      throw new PurchasesSuppliersError("INVALID_STATE", "cannot cancel PO with received quantities");
    }
    po.status = "cancelled";
    this.audit(
      input.tenantId,
      input.actorId,
      "po_cancelled",
      "purchase_order",
      po.id,
      "status=cancelled",
    );
    return structuredClone(po);
  }

  closePO(input: { tenantId: TenantId; actorId: string; purchaseOrderId: string }): PurchaseOrder {
    const state = this.stateFor(input.tenantId);
    const po = this.assertOwned(
      input.tenantId,
      state.purchaseOrders.get(input.purchaseOrderId),
      "purchase_order",
      input.purchaseOrderId,
    );
    if (po.status !== "received" && po.status !== "partially_received") {
      throw new PurchasesSuppliersError("INVALID_STATE", `cannot close PO from status=${po.status}`);
    }
    po.status = "closed";
    po.closedAt = new Date().toISOString();
    this.audit(input.tenantId, input.actorId, "po_closed", "purchase_order", po.id, "status=closed");
    return structuredClone(po);
  }

  getPO(tenantId: TenantId, purchaseOrderId: string): PurchaseOrder {
    const state = this.stateFor(tenantId);
    return structuredClone(
      this.assertOwned(
        tenantId,
        state.purchaseOrders.get(purchaseOrderId),
        "purchase_order",
        purchaseOrderId,
      ),
    );
  }

  listPOs(tenantId: TenantId): PurchaseOrder[] {
    return [...this.stateFor(tenantId).purchaseOrders.values()].map((p) => structuredClone(p));
  }

  // --- Goods receipts ---

  postReceipt(input: {
    tenantId: TenantId;
    actorId: string;
    purchaseOrderId: string;
    lines: ReceiptLine[];
    idempotencyKey?: string;
  }): GoodsReceipt {
    const state = this.stateFor(input.tenantId);
    const existingId = this.resolveIdempotency(state, "receipt", input.idempotencyKey);
    if (existingId) {
      const existing = state.goodsReceipts.get(existingId);
      if (existing) return structuredClone(existing);
      throw new PurchasesSuppliersError(
        "IDEMPOTENCY_CONFLICT",
        "idempotency key maps to missing receipt",
      );
    }
    const po = this.assertOwned(
      input.tenantId,
      state.purchaseOrders.get(input.purchaseOrderId),
      "purchase_order",
      input.purchaseOrderId,
    );
    if (po.status !== "issued" && po.status !== "partially_received") {
      throw new PurchasesSuppliersError(
        "INVALID_STATE",
        `cannot post receipt against PO status=${po.status}`,
      );
    }
    if (!input.lines?.length) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "receipt must have at least one line");
    }

    for (const line of input.lines) {
      if (!line.sku?.trim() || !(line.qtyReceived > 0) || !line.uom?.trim()) {
        throw new PurchasesSuppliersError("INVALID_INPUT", "invalid receipt line");
      }
      const poLine = po.lines.find((l) => l.sku === line.sku);
      if (!poLine) {
        throw new PurchasesSuppliersError("INVALID_INPUT", `SKU ${line.sku} not on PO`);
      }
      if (poLine.qtyReceived + line.qtyReceived > poLine.qtyOrdered) {
        throw new PurchasesSuppliersError(
          "INVALID_INPUT",
          `over-receipt for SKU ${line.sku}: ordered=${poLine.qtyOrdered} already=${poLine.qtyReceived} incoming=${line.qtyReceived}`,
        );
      }
    }

    for (const line of input.lines) {
      const poLine = po.lines.find((l) => l.sku === line.sku)!;
      poLine.qtyReceived += line.qtyReceived;
    }

    const allReceived = po.lines.every((l) => l.qtyReceived >= l.qtyOrdered);
    const anyReceived = po.lines.some((l) => l.qtyReceived > 0);
    po.status = allReceived ? "received" : anyReceived ? "partially_received" : po.status;

    const receipt: GoodsReceipt = {
      id: randomUUID(),
      tenantId: input.tenantId,
      purchaseOrderId: po.id,
      lines: input.lines.map((l) => ({
        sku: l.sku.trim(),
        qtyReceived: l.qtyReceived,
        uom: l.uom.trim(),
      })),
      postedAt: new Date().toISOString(),
      postedBy: input.actorId,
      posted: true,
    };
    state.goodsReceipts.set(receipt.id, receipt);
    this.rememberIdempotency(state, "receipt", input.idempotencyKey, receipt.id);
    this.audit(
      input.tenantId,
      input.actorId,
      "receipt_posted",
      "goods_receipt",
      receipt.id,
      `po=${po.id} po_status=${po.status} lines=${receipt.lines.length}`,
    );
    return structuredClone(receipt);
  }

  getReceipt(tenantId: TenantId, receiptId: string): GoodsReceipt {
    const state = this.stateFor(tenantId);
    return structuredClone(
      this.assertOwned(tenantId, state.goodsReceipts.get(receiptId), "goods_receipt", receiptId),
    );
  }

  listReceipts(tenantId: TenantId): GoodsReceipt[] {
    return [...this.stateFor(tenantId).goodsReceipts.values()].map((r) => structuredClone(r));
  }

  // --- Returns ---

  createReturn(input: {
    tenantId: TenantId;
    actorId: string;
    goodsReceiptId: string;
    sku: string;
    qty: number;
    reason: string;
  }): SupplierReturn {
    const state = this.stateFor(input.tenantId);
    const receipt = this.assertOwned(
      input.tenantId,
      state.goodsReceipts.get(input.goodsReceiptId),
      "goods_receipt",
      input.goodsReceiptId,
    );
    const receiptLine = receipt.lines.find((l) => l.sku === input.sku);
    if (!receiptLine) {
      throw new PurchasesSuppliersError("INVALID_INPUT", `SKU ${input.sku} not on receipt`);
    }
    if (!(input.qty > 0) || input.qty > receiptLine.qtyReceived) {
      throw new PurchasesSuppliersError(
        "INVALID_INPUT",
        `return qty must be 1..${receiptLine.qtyReceived}`,
      );
    }
    if (!input.reason?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "return reason is required");
    }
    const ret: SupplierReturn = {
      id: randomUUID(),
      tenantId: input.tenantId,
      goodsReceiptId: receipt.id,
      purchaseOrderId: receipt.purchaseOrderId,
      sku: input.sku,
      qty: input.qty,
      reason: input.reason.trim(),
      createdAt: new Date().toISOString(),
      createdBy: input.actorId,
    };
    state.returns.set(ret.id, ret);
    this.audit(
      input.tenantId,
      input.actorId,
      "supplier_return_created",
      "supplier_return",
      ret.id,
      `receipt=${receipt.id} sku=${ret.sku} qty=${ret.qty}`,
    );
    return structuredClone(ret);
  }

  listReturns(tenantId: TenantId): SupplierReturn[] {
    return [...this.stateFor(tenantId).returns.values()].map((r) => structuredClone(r));
  }

  // --- Incidents ---

  createIncident(input: {
    tenantId: TenantId;
    actorId: string;
    entityType: IncidentEntityType;
    entityId: string;
    title: string;
    detail: string;
  }): Incident {
    const state = this.stateFor(input.tenantId);
    if (input.entityType === "purchase_order") {
      this.assertOwned(
        input.tenantId,
        state.purchaseOrders.get(input.entityId),
        "purchase_order",
        input.entityId,
      );
    } else {
      this.assertOwned(
        input.tenantId,
        state.goodsReceipts.get(input.entityId),
        "goods_receipt",
        input.entityId,
      );
    }
    if (!input.title?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "incident title is required");
    }
    const incident: Incident = {
      id: randomUUID(),
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title.trim(),
      detail: (input.detail ?? "").trim(),
      status: "open",
      createdAt: new Date().toISOString(),
      createdBy: input.actorId,
    };
    state.incidents.set(incident.id, incident);
    this.audit(
      input.tenantId,
      input.actorId,
      "incident_created",
      "incident",
      incident.id,
      `entity=${input.entityType}:${input.entityId}`,
    );
    return structuredClone(incident);
  }

  listIncidents(tenantId: TenantId): Incident[] {
    return [...this.stateFor(tenantId).incidents.values()].map((i) => structuredClone(i));
  }

  // --- Attachments (metadata only) ---

  attachMeta(input: {
    tenantId: TenantId;
    actorId: string;
    entityType: AttachmentEntityType;
    entityId: string;
    filename: string;
    sha256?: string;
  }): AttachmentMeta {
    this.requireTenantId(input.tenantId);
    if (!input.filename?.trim()) {
      throw new PurchasesSuppliersError("INVALID_INPUT", "filename is required");
    }
    const meta: AttachmentMeta = {
      id: randomUUID(),
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      filename: input.filename.trim(),
      sha256: input.sha256?.trim() || `placeholder-${randomUUID().replace(/-/g, "")}`,
      createdAt: new Date().toISOString(),
    };
    this.stateFor(input.tenantId).attachments.set(meta.id, meta);
    this.audit(
      input.tenantId,
      input.actorId,
      "attachment_meta_added",
      "attachment_meta",
      meta.id,
      `entity=${input.entityType}:${input.entityId} file=${meta.filename}`,
    );
    return structuredClone(meta);
  }

  listAttachments(tenantId: TenantId): AttachmentMeta[] {
    return [...this.stateFor(tenantId).attachments.values()].map((a) => structuredClone(a));
  }

  // --- Audit ---

  listAuditLog(tenantId: TenantId): readonly AuditEntry[] {
    return this.stateFor(tenantId).auditLog.map((e) => structuredClone(e));
  }

  /**
   * Permanent payment stub — ALWAYS throws `BLOCKED_SCOPE`.
   * This core never records payments, bank transfers, tax, or payroll.
   */
  recordPayment(_input?: {
    tenantId?: TenantId;
    amountCents?: number;
    supplierId?: string;
    purchaseOrderId?: string;
  }): never {
    throw new PurchasesSuppliersError(
      "BLOCKED_SCOPE",
      "recordPayment is permanently blocked — PurchasesSuppliersCore has no payment/accounting scope",
    );
  }
}

let coreSingleton: PurchasesSuppliersCore | undefined;

export function getPurchasesSuppliersCore(): PurchasesSuppliersCore {
  if (!coreSingleton) coreSingleton = new PurchasesSuppliersCore();
  return coreSingleton;
}

export function resetPurchasesSuppliersCoreForTests(): void {
  coreSingleton?.reset();
  coreSingleton = undefined;
}

/**
 * Integrity self-test: payments blocked, empty tenant rejected, tenant isolation OK.
 */
export function assertPurchasesCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const core = new PurchasesSuppliersCore();

  try {
    core.recordPayment({ tenantId: "t", amountCents: 1 });
    violations.push("payments_not_blocked");
  } catch (err) {
    if (!(err instanceof PurchasesSuppliersError) || err.code !== "BLOCKED_SCOPE") {
      violations.push("payments_wrong_error");
    }
  }

  try {
    core.createSupplier({ tenantId: "", actorId: "sys", name: "x", category: "y" });
    violations.push("empty_tenant_accepted");
  } catch (err) {
    if (!(err instanceof PurchasesSuppliersError) || err.code !== "TENANT_MISMATCH") {
      violations.push("empty_tenant_wrong_error");
    }
  }

  const a = core.createSupplier({
    tenantId: "integrity-a",
    actorId: "sys",
    name: "Supp A",
    category: "hardware",
  });
  core.createSupplier({
    tenantId: "integrity-b",
    actorId: "sys",
    name: "Supp B",
    category: "software",
  });

  if (core.listSuppliers("integrity-b").some((s) => s.id === a.id)) {
    violations.push("tenant_isolation_leak");
  }

  try {
    core.getSupplier("integrity-b", a.id);
    violations.push("cross_tenant_get_allowed");
  } catch (err) {
    if (!(err instanceof PurchasesSuppliersError) || err.code !== "NOT_FOUND") {
      violations.push("cross_tenant_get_wrong_error");
    }
  }

  return { ok: violations.length === 0, violations };
}

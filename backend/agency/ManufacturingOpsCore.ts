/**
 * Manufacturing / Quality / Maintenance / PLM CORE — Block 28.
 *
 * In-memory, multi-tenant modular domain for BOM, routing, manufacturing orders,
 * quality (inspection / NC / CAPA), asset maintenance, and PLM change control.
 * No database, no external IoT, no shop-floor vendor integrations.
 *
 * `IoTAdapter.connect()` ALWAYS throws `BLOCKED_EXTERNAL` (PREPARED_OFF) — there is
 * no environment flag that unlocks a real device mesh. Going live with IoT requires
 * a manual code rewrite after an explicit CEO ops checklist — never a runtime toggle.
 *
 * Hard rules enforced in this module:
 * - tenant isolation (tenant A never reads/mutates tenant B)
 * - cannot consume components unless MO is released (or already in_progress)
 * - scrap/merma cannot exceed cumulative good production
 * - IoT path permanently blocked
 */

import { randomUUID } from "node:crypto";

export type TenantId = string;

export type ManufacturingOpsErrorCode =
  | "BLOCKED_EXTERNAL"
  | "TENANT_MISMATCH"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "INVALID_INPUT"
  | "SCRAP_EXCEEDS_PRODUCED";

export class ManufacturingOpsError extends Error {
  readonly code: ManufacturingOpsErrorCode;

  constructor(code: ManufacturingOpsErrorCode, message: string) {
    super(message);
    this.name = "ManufacturingOpsError";
    this.code = code;
  }
}

export type BomStatus = "draft" | "approved" | "obsolete";

export type BomLine = {
  componentSku: string;
  qty: number;
  uom: string;
};

export type Bom = {
  id: string;
  tenantId: TenantId;
  productSku: string;
  version: number;
  lines: BomLine[];
  status: BomStatus;
  createdAt: string;
  approvedAt: string | null;
};

export type WorkCenter = {
  id: string;
  tenantId: TenantId;
  code: string;
  name: string;
  createdAt: string;
};

export type RoutingOperation = {
  seq: number;
  workCenterId: string;
  name: string;
  stdMinutes: number;
};

export type Routing = {
  id: string;
  tenantId: TenantId;
  productSku: string;
  version: number;
  operations: RoutingOperation[];
  createdAt: string;
};

export type ManufacturingOrderStatus =
  | "draft"
  | "released"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ComponentConsumption = {
  componentSku: string;
  qty: number;
  uom: string;
  at: string;
};

export type ManufacturingOrder = {
  id: string;
  tenantId: TenantId;
  productSku: string;
  bomId: string;
  bomVersion: number;
  qty: number;
  status: ManufacturingOrderStatus;
  qtyGood: number;
  qtyScrap: number;
  consumptions: ComponentConsumption[];
  createdAt: string;
  releasedAt: string | null;
  completedAt: string | null;
};

export type QualityPlan = {
  id: string;
  tenantId: TenantId;
  productSku: string;
  name: string;
  checkpoints: string[];
  createdAt: string;
};

export type InspectionResult = "pass" | "fail";

export type Inspection = {
  id: string;
  tenantId: TenantId;
  qualityPlanId: string;
  manufacturingOrderId: string | null;
  result: InspectionResult;
  /** Evidence refs are URLs or opaque string ids — never binary payloads. */
  evidenceRefs: string[];
  notes: string;
  inspectedAt: string;
};

export type NonConformanceStatus = "open" | "closed";

export type NonConformance = {
  id: string;
  tenantId: TenantId;
  inspectionId: string;
  manufacturingOrderId: string | null;
  description: string;
  status: NonConformanceStatus;
  createdAt: string;
  closedAt: string | null;
};

export type CorrectiveActionStatus = "open" | "in_progress" | "done";

export type CorrectiveAction = {
  id: string;
  tenantId: TenantId;
  nonConformanceId: string;
  title: string;
  status: CorrectiveActionStatus;
  createdAt: string;
  completedAt: string | null;
};

export type Asset = {
  id: string;
  tenantId: TenantId;
  code: string;
  name: string;
  workCenterId: string | null;
  createdAt: string;
};

export type MaintenanceKind = "preventive" | "corrective";

export type MaintenanceOrderStatus = "scheduled" | "in_progress" | "done" | "cancelled";

export type MaintenanceOrder = {
  id: string;
  tenantId: TenantId;
  assetId: string;
  kind: MaintenanceKind;
  scheduleAt: string;
  status: MaintenanceOrderStatus;
  title: string;
  createdAt: string;
  completedAt: string | null;
};

export type PlmChangeRequestStatus = "pending" | "approved" | "rejected";

export type PlmDocument = {
  id: string;
  tenantId: TenantId;
  productSku: string;
  version: number;
  title: string;
  /** Traceability links (BOM id, routing id, doc refs) — strings only. */
  traceabilityLinks: string[];
  changeRequest: {
    status: PlmChangeRequestStatus;
    reason: string;
    requestedAt: string;
    resolvedAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEntry = {
  id: string;
  tenantId: TenantId;
  at: string;
  action: string;
  detail: string;
};

/** JSON-serializable tenant snapshot (Maps → Record / arrays). */
export type ManufacturingTenantSnapshot = {
  boms: Record<string, Bom>;
  workCenters: Record<string, WorkCenter>;
  routings: Record<string, Routing>;
  manufacturingOrders: Record<string, ManufacturingOrder>;
  qualityPlans: Record<string, QualityPlan>;
  inspections: Record<string, Inspection>;
  nonConformances: Record<string, NonConformance>;
  correctiveActions: Record<string, CorrectiveAction>;
  assets: Record<string, Asset>;
  maintenanceOrders: Record<string, MaintenanceOrder>;
  plmDocuments: Record<string, PlmDocument>;
  auditLog: AuditEntry[];
  bomVersionBySku: Record<string, number>;
  plmVersionBySku: Record<string, number>;
};

/**
 * IoT adapter stub — PREPARED_OFF. `connect()` ALWAYS throws `BLOCKED_EXTERNAL`.
 * No env flag unlocks this path.
 */
export class IoTAdapter {
  readonly status = "PREPARED_OFF" as const;

  connect(_input?: { tenantId?: TenantId; endpoint?: string }): never {
    throw new ManufacturingOpsError(
      "BLOCKED_EXTERNAL",
      "IoTAdapter.connect is permanently blocked (PREPARED_OFF). Real device mesh requires " +
        "a manual code rewrite after CEO ops approval — never a runtime flag or input parameter.",
    );
  }
}

type TenantState = {
  boms: Map<string, Bom>;
  workCenters: Map<string, WorkCenter>;
  routings: Map<string, Routing>;
  manufacturingOrders: Map<string, ManufacturingOrder>;
  qualityPlans: Map<string, QualityPlan>;
  inspections: Map<string, Inspection>;
  nonConformances: Map<string, NonConformance>;
  correctiveActions: Map<string, CorrectiveAction>;
  assets: Map<string, Asset>;
  maintenanceOrders: Map<string, MaintenanceOrder>;
  plmDocuments: Map<string, PlmDocument>;
  auditLog: AuditEntry[];
  /** Highest BOM version issued per productSku (for bump helpers). */
  bomVersionBySku: Map<string, number>;
  /** Highest PLM version issued per productSku. */
  plmVersionBySku: Map<string, number>;
};

function mapToRecord<V>(map: Map<string, V>): Record<string, V> {
  return Object.fromEntries(map.entries());
}

function recordToMap<V>(record: Record<string, V> | undefined): Map<string, V> {
  return new Map(Object.entries(record ?? {}));
}

function emptyManufacturingSnapshot(): ManufacturingTenantSnapshot {
  return {
    boms: {},
    workCenters: {},
    routings: {},
    manufacturingOrders: {},
    qualityPlans: {},
    inspections: {},
    nonConformances: {},
    correctiveActions: {},
    assets: {},
    maintenanceOrders: {},
    plmDocuments: {},
    auditLog: [],
    bomVersionBySku: {},
    plmVersionBySku: {},
  };
}

function emptyTenantState(): TenantState {
  return {
    boms: new Map(),
    workCenters: new Map(),
    routings: new Map(),
    manufacturingOrders: new Map(),
    qualityPlans: new Map(),
    inspections: new Map(),
    nonConformances: new Map(),
    correctiveActions: new Map(),
    assets: new Map(),
    maintenanceOrders: new Map(),
    plmDocuments: new Map(),
    auditLog: [],
    bomVersionBySku: new Map(),
    plmVersionBySku: new Map(),
  };
}

function requirePositiveQty(n: number, label: string): number {
  if (!Number.isFinite(n) || n <= 0) {
    throw new ManufacturingOpsError("INVALID_INPUT", `${label} must be a positive number`);
  }
  return n;
}

function requireNonNegativeQty(n: number, label: string): number {
  if (!Number.isFinite(n) || n < 0) {
    throw new ManufacturingOpsError("INVALID_INPUT", `${label} must be a non-negative number`);
  }
  return n;
}

/**
 * In-memory multi-tenant manufacturing ops core. Tenant A never sees tenant B data.
 */
export class ManufacturingOpsCore {
  private readonly tenants = new Map<TenantId, TenantState>();

  private stateFor(tenantId: TenantId): TenantState {
    if (!tenantId || !tenantId.trim()) {
      throw new ManufacturingOpsError("TENANT_MISMATCH", "tenantId is required");
    }
    let state = this.tenants.get(tenantId);
    if (!state) {
      state = emptyTenantState();
      this.tenants.set(tenantId, state);
    }
    return state;
  }

  private audit(tenantId: TenantId, action: string, detail: string): AuditEntry {
    const entry: AuditEntry = {
      id: randomUUID(),
      tenantId,
      at: new Date().toISOString(),
      action,
      detail,
    };
    this.stateFor(tenantId).auditLog.push(entry);
    return entry;
  }

  reset(): void {
    this.tenants.clear();
  }

  /**
   * Serialize one tenant's state to a JSON-safe snapshot.
   * Missing / empty tenant → empty structure.
   */
  exportTenantSnapshot(tenantId: string): ManufacturingTenantSnapshot {
    const id = (tenantId ?? "").trim();
    if (!id) return emptyManufacturingSnapshot();
    const state = this.tenants.get(id);
    if (!state) return emptyManufacturingSnapshot();
    return {
      boms: mapToRecord(state.boms),
      workCenters: mapToRecord(state.workCenters),
      routings: mapToRecord(state.routings),
      manufacturingOrders: mapToRecord(state.manufacturingOrders),
      qualityPlans: mapToRecord(state.qualityPlans),
      inspections: mapToRecord(state.inspections),
      nonConformances: mapToRecord(state.nonConformances),
      correctiveActions: mapToRecord(state.correctiveActions),
      assets: mapToRecord(state.assets),
      maintenanceOrders: mapToRecord(state.maintenanceOrders),
      plmDocuments: mapToRecord(state.plmDocuments),
      auditLog: state.auditLog.map((e) => ({ ...e })),
      bomVersionBySku: mapToRecord(state.bomVersionBySku),
      plmVersionBySku: mapToRecord(state.plmVersionBySku),
    };
  }

  /**
   * Replace one tenant's state from a snapshot (clear then load). Restores Maps.
   */
  importTenantSnapshot(tenantId: string, snapshot: object): void {
    if (!tenantId || !tenantId.trim()) {
      throw new ManufacturingOpsError("TENANT_MISMATCH", "tenantId is required");
    }
    const id = tenantId.trim();
    const snap = (snapshot ?? {}) as Partial<ManufacturingTenantSnapshot>;
    const next: TenantState = {
      boms: recordToMap(snap.boms),
      workCenters: recordToMap(snap.workCenters),
      routings: recordToMap(snap.routings),
      manufacturingOrders: recordToMap(snap.manufacturingOrders),
      qualityPlans: recordToMap(snap.qualityPlans),
      inspections: recordToMap(snap.inspections),
      nonConformances: recordToMap(snap.nonConformances),
      correctiveActions: recordToMap(snap.correctiveActions),
      assets: recordToMap(snap.assets),
      maintenanceOrders: recordToMap(snap.maintenanceOrders),
      plmDocuments: recordToMap(snap.plmDocuments),
      auditLog: Array.isArray(snap.auditLog) ? snap.auditLog.map((e) => ({ ...e })) : [],
      bomVersionBySku: recordToMap(snap.bomVersionBySku),
      plmVersionBySku: recordToMap(snap.plmVersionBySku),
    };
    this.tenants.set(id, next);
  }

  // ── BOM ──────────────────────────────────────────────────────────────────

  createBom(input: {
    tenantId: TenantId;
    productSku: string;
    lines: BomLine[];
    version?: number;
  }): Bom {
    const state = this.stateFor(input.tenantId);
    if (!input.productSku?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "productSku is required");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new ManufacturingOpsError("INVALID_INPUT", "BOM must have at least one line");
    }
    for (const line of input.lines) {
      requirePositiveQty(line.qty, `line ${line.componentSku} qty`);
      if (!line.componentSku?.trim() || !line.uom?.trim()) {
        throw new ManufacturingOpsError("INVALID_INPUT", "BOM lines require componentSku and uom");
      }
    }

    const nextDefault = (state.bomVersionBySku.get(input.productSku) ?? 0) + 1;
    const version = input.version ?? nextDefault;
    if (version < 1 || !Number.isInteger(version)) {
      throw new ManufacturingOpsError("INVALID_INPUT", "BOM version must be a positive integer");
    }
    state.bomVersionBySku.set(input.productSku, Math.max(state.bomVersionBySku.get(input.productSku) ?? 0, version));

    const bom: Bom = {
      id: randomUUID(),
      tenantId: input.tenantId,
      productSku: input.productSku,
      version,
      lines: input.lines.map((l) => ({ ...l })),
      status: "draft",
      createdAt: new Date().toISOString(),
      approvedAt: null,
    };
    state.boms.set(bom.id, bom);
    this.audit(input.tenantId, "bom_created", `bom=${bom.id} sku=${bom.productSku} v=${bom.version}`);
    return { ...bom, lines: bom.lines.map((l) => ({ ...l })) };
  }

  approveBom(tenantId: TenantId, bomId: string): Bom {
    const state = this.stateFor(tenantId);
    const bom = state.boms.get(bomId);
    if (!bom) throw new ManufacturingOpsError("NOT_FOUND", `BOM not found: ${bomId}`);
    if (bom.status !== "draft") {
      throw new ManufacturingOpsError("INVALID_STATE", `BOM cannot be approved from status=${bom.status}`);
    }
    bom.status = "approved";
    bom.approvedAt = new Date().toISOString();
    this.audit(tenantId, "bom_approved", `bom=${bom.id} sku=${bom.productSku} v=${bom.version}`);
    return { ...bom, lines: bom.lines.map((l) => ({ ...l })) };
  }

  obsoleteBom(tenantId: TenantId, bomId: string): Bom {
    const state = this.stateFor(tenantId);
    const bom = state.boms.get(bomId);
    if (!bom) throw new ManufacturingOpsError("NOT_FOUND", `BOM not found: ${bomId}`);
    if (bom.status === "obsolete") {
      throw new ManufacturingOpsError("INVALID_STATE", "BOM already obsolete");
    }
    bom.status = "obsolete";
    this.audit(tenantId, "bom_obsoleted", `bom=${bom.id}`);
    return { ...bom, lines: bom.lines.map((l) => ({ ...l })) };
  }

  getBom(tenantId: TenantId, bomId: string): Bom | null {
    const bom = this.stateFor(tenantId).boms.get(bomId);
    return bom ? { ...bom, lines: bom.lines.map((l) => ({ ...l })) } : null;
  }

  listBoms(tenantId: TenantId, productSku?: string): Bom[] {
    const all = [...this.stateFor(tenantId).boms.values()];
    const filtered = productSku ? all.filter((b) => b.productSku === productSku) : all;
    return filtered.map((b) => ({ ...b, lines: b.lines.map((l) => ({ ...l })) }));
  }

  // ── Work centers & routing ───────────────────────────────────────────────

  createWorkCenter(input: { tenantId: TenantId; code: string; name: string }): WorkCenter {
    const state = this.stateFor(input.tenantId);
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "work center code and name are required");
    }
    const existing = [...state.workCenters.values()].find((w) => w.code === input.code);
    if (existing) {
      throw new ManufacturingOpsError("INVALID_INPUT", `work center code already exists: ${input.code}`);
    }
    const wc: WorkCenter = {
      id: randomUUID(),
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      createdAt: new Date().toISOString(),
    };
    state.workCenters.set(wc.id, wc);
    this.audit(input.tenantId, "work_center_created", `wc=${wc.id} code=${wc.code}`);
    return { ...wc };
  }

  listWorkCenters(tenantId: TenantId): WorkCenter[] {
    return [...this.stateFor(tenantId).workCenters.values()].map((w) => ({ ...w }));
  }

  createRouting(input: {
    tenantId: TenantId;
    productSku: string;
    version: number;
    operations: RoutingOperation[];
  }): Routing {
    const state = this.stateFor(input.tenantId);
    if (!input.productSku?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "productSku is required");
    }
    if (!Array.isArray(input.operations) || input.operations.length === 0) {
      throw new ManufacturingOpsError("INVALID_INPUT", "routing must have at least one operation");
    }
    for (const op of input.operations) {
      if (!state.workCenters.has(op.workCenterId)) {
        throw new ManufacturingOpsError("NOT_FOUND", `work center not found: ${op.workCenterId}`);
      }
      requirePositiveQty(op.stdMinutes, `operation ${op.name} stdMinutes`);
    }
    const routing: Routing = {
      id: randomUUID(),
      tenantId: input.tenantId,
      productSku: input.productSku,
      version: input.version,
      operations: input.operations.map((o) => ({ ...o })).sort((a, b) => a.seq - b.seq),
      createdAt: new Date().toISOString(),
    };
    state.routings.set(routing.id, routing);
    this.audit(input.tenantId, "routing_created", `routing=${routing.id} sku=${routing.productSku}`);
    return { ...routing, operations: routing.operations.map((o) => ({ ...o })) };
  }

  listRoutings(tenantId: TenantId, productSku?: string): Routing[] {
    const all = [...this.stateFor(tenantId).routings.values()];
    const filtered = productSku ? all.filter((r) => r.productSku === productSku) : all;
    return filtered.map((r) => ({ ...r, operations: r.operations.map((o) => ({ ...o })) }));
  }

  // ── Manufacturing orders ─────────────────────────────────────────────────

  createManufacturingOrder(input: {
    tenantId: TenantId;
    bomId: string;
    qty: number;
  }): ManufacturingOrder {
    const state = this.stateFor(input.tenantId);
    const bom = state.boms.get(input.bomId);
    if (!bom) throw new ManufacturingOpsError("NOT_FOUND", `BOM not found: ${input.bomId}`);
    if (bom.status !== "approved") {
      throw new ManufacturingOpsError("INVALID_STATE", "MO requires an approved BOM");
    }
    const qty = requirePositiveQty(input.qty, "qty");
    const mo: ManufacturingOrder = {
      id: randomUUID(),
      tenantId: input.tenantId,
      productSku: bom.productSku,
      bomId: bom.id,
      bomVersion: bom.version,
      qty,
      status: "draft",
      qtyGood: 0,
      qtyScrap: 0,
      consumptions: [],
      createdAt: new Date().toISOString(),
      releasedAt: null,
      completedAt: null,
    };
    state.manufacturingOrders.set(mo.id, mo);
    this.audit(input.tenantId, "mo_created", `mo=${mo.id} sku=${mo.productSku} qty=${qty}`);
    return this.cloneMo(mo);
  }

  releaseManufacturingOrder(tenantId: TenantId, moId: string): ManufacturingOrder {
    const mo = this.requireMo(tenantId, moId);
    if (mo.status !== "draft") {
      throw new ManufacturingOpsError("INVALID_STATE", `MO cannot be released from status=${mo.status}`);
    }
    mo.status = "released";
    mo.releasedAt = new Date().toISOString();
    this.audit(tenantId, "mo_released", `mo=${mo.id}`);
    return this.cloneMo(mo);
  }

  /**
   * Consume BOM components for an MO. Allowed only when status is `released` or
   * `in_progress`. First successful consume transitions released → in_progress.
   */
  consumeComponents(
    tenantId: TenantId,
    moId: string,
    lines?: Array<{ componentSku: string; qty: number; uom: string }>,
  ): ManufacturingOrder {
    const state = this.stateFor(tenantId);
    const mo = this.requireMo(tenantId, moId);
    if (mo.status !== "released" && mo.status !== "in_progress") {
      throw new ManufacturingOpsError(
        "INVALID_STATE",
        `cannot consume components unless MO is released or in_progress (status=${mo.status})`,
      );
    }
    const bom = state.boms.get(mo.bomId);
    if (!bom) throw new ManufacturingOpsError("NOT_FOUND", `BOM not found: ${mo.bomId}`);

    const toConsume =
      lines ??
      bom.lines.map((l) => ({
        componentSku: l.componentSku,
        qty: l.qty * mo.qty,
        uom: l.uom,
      }));

    const at = new Date().toISOString();
    for (const line of toConsume) {
      requirePositiveQty(line.qty, `consume ${line.componentSku} qty`);
      mo.consumptions.push({ ...line, at });
    }
    if (mo.status === "released") mo.status = "in_progress";
    this.audit(tenantId, "mo_components_consumed", `mo=${mo.id} lines=${toConsume.length}`);
    return this.cloneMo(mo);
  }

  /**
   * Report good + scrap production. Scrap/merma cannot exceed cumulative good
   * production after the report is applied. Total good+scrap cannot exceed MO qty.
   */
  reportProduction(
    tenantId: TenantId,
    moId: string,
    qtyGood: number,
    qtyScrap: number,
  ): ManufacturingOrder {
    const mo = this.requireMo(tenantId, moId);
    if (mo.status !== "released" && mo.status !== "in_progress") {
      throw new ManufacturingOpsError(
        "INVALID_STATE",
        `cannot report production from status=${mo.status}`,
      );
    }
    const good = requireNonNegativeQty(qtyGood, "qtyGood");
    const scrap = requireNonNegativeQty(qtyScrap, "qtyScrap");
    if (good === 0 && scrap === 0) {
      throw new ManufacturingOpsError("INVALID_INPUT", "reportProduction requires qtyGood or qtyScrap > 0");
    }

    const nextGood = mo.qtyGood + good;
    const nextScrap = mo.qtyScrap + scrap;
    if (nextScrap > nextGood) {
      throw new ManufacturingOpsError(
        "SCRAP_EXCEEDS_PRODUCED",
        `scrap/merma (${nextScrap}) cannot exceed produced good (${nextGood})`,
      );
    }
    if (nextGood + nextScrap > mo.qty) {
      throw new ManufacturingOpsError(
        "INVALID_INPUT",
        `total produced good+scrap (${nextGood + nextScrap}) exceeds MO qty (${mo.qty})`,
      );
    }

    mo.qtyGood = nextGood;
    mo.qtyScrap = nextScrap;
    if (mo.status === "released") mo.status = "in_progress";
    this.audit(
      tenantId,
      "mo_production_reported",
      `mo=${mo.id} +good=${good} +scrap=${scrap} totalGood=${mo.qtyGood} totalScrap=${mo.qtyScrap}`,
    );
    return this.cloneMo(mo);
  }

  completeManufacturingOrder(tenantId: TenantId, moId: string): ManufacturingOrder {
    const mo = this.requireMo(tenantId, moId);
    if (mo.status !== "in_progress") {
      throw new ManufacturingOpsError("INVALID_STATE", `MO cannot be completed from status=${mo.status}`);
    }
    if (mo.qtyGood <= 0) {
      throw new ManufacturingOpsError("INVALID_STATE", "MO cannot complete with zero good production");
    }
    mo.status = "completed";
    mo.completedAt = new Date().toISOString();
    this.audit(tenantId, "mo_completed", `mo=${mo.id} good=${mo.qtyGood} scrap=${mo.qtyScrap}`);
    return this.cloneMo(mo);
  }

  cancelManufacturingOrder(tenantId: TenantId, moId: string): ManufacturingOrder {
    const mo = this.requireMo(tenantId, moId);
    if (mo.status === "completed" || mo.status === "cancelled") {
      throw new ManufacturingOpsError("INVALID_STATE", `MO cannot be cancelled from status=${mo.status}`);
    }
    mo.status = "cancelled";
    this.audit(tenantId, "mo_cancelled", `mo=${mo.id}`);
    return this.cloneMo(mo);
  }

  getManufacturingOrder(tenantId: TenantId, moId: string): ManufacturingOrder | null {
    const mo = this.stateFor(tenantId).manufacturingOrders.get(moId);
    return mo ? this.cloneMo(mo) : null;
  }

  listManufacturingOrders(tenantId: TenantId): ManufacturingOrder[] {
    return [...this.stateFor(tenantId).manufacturingOrders.values()].map((m) => this.cloneMo(m));
  }

  private requireMo(tenantId: TenantId, moId: string): ManufacturingOrder {
    const mo = this.stateFor(tenantId).manufacturingOrders.get(moId);
    if (!mo) throw new ManufacturingOpsError("NOT_FOUND", `manufacturing order not found: ${moId}`);
    return mo;
  }

  private cloneMo(mo: ManufacturingOrder): ManufacturingOrder {
    return {
      ...mo,
      consumptions: mo.consumptions.map((c) => ({ ...c })),
    };
  }

  // ── Quality ──────────────────────────────────────────────────────────────

  createQualityPlan(input: {
    tenantId: TenantId;
    productSku: string;
    name: string;
    checkpoints: string[];
  }): QualityPlan {
    const state = this.stateFor(input.tenantId);
    if (!input.productSku?.trim() || !input.name?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "productSku and name are required");
    }
    if (!Array.isArray(input.checkpoints) || input.checkpoints.length === 0) {
      throw new ManufacturingOpsError("INVALID_INPUT", "quality plan requires checkpoints");
    }
    const plan: QualityPlan = {
      id: randomUUID(),
      tenantId: input.tenantId,
      productSku: input.productSku,
      name: input.name,
      checkpoints: [...input.checkpoints],
      createdAt: new Date().toISOString(),
    };
    state.qualityPlans.set(plan.id, plan);
    this.audit(input.tenantId, "quality_plan_created", `plan=${plan.id}`);
    return { ...plan, checkpoints: [...plan.checkpoints] };
  }

  recordInspection(input: {
    tenantId: TenantId;
    qualityPlanId: string;
    result: InspectionResult;
    evidenceRefs?: string[];
    notes?: string;
    manufacturingOrderId?: string | null;
  }): Inspection {
    const state = this.stateFor(input.tenantId);
    const plan = state.qualityPlans.get(input.qualityPlanId);
    if (!plan) throw new ManufacturingOpsError("NOT_FOUND", `quality plan not found: ${input.qualityPlanId}`);
    if (input.manufacturingOrderId) {
      if (!state.manufacturingOrders.has(input.manufacturingOrderId)) {
        throw new ManufacturingOpsError("NOT_FOUND", `MO not found: ${input.manufacturingOrderId}`);
      }
    }
    const evidenceRefs = (input.evidenceRefs ?? []).map((r) => String(r));
    if (evidenceRefs.some((r) => !r.trim())) {
      throw new ManufacturingOpsError("INVALID_INPUT", "evidence refs must be non-empty strings (no binary)");
    }
    const inspection: Inspection = {
      id: randomUUID(),
      tenantId: input.tenantId,
      qualityPlanId: plan.id,
      manufacturingOrderId: input.manufacturingOrderId ?? null,
      result: input.result,
      evidenceRefs,
      notes: input.notes ?? "",
      inspectedAt: new Date().toISOString(),
    };
    state.inspections.set(inspection.id, inspection);
    this.audit(
      input.tenantId,
      "inspection_recorded",
      `inspection=${inspection.id} result=${inspection.result} evidence=${evidenceRefs.length}`,
    );
    return { ...inspection, evidenceRefs: [...inspection.evidenceRefs] };
  }

  openNonConformance(input: {
    tenantId: TenantId;
    inspectionId: string;
    description: string;
  }): NonConformance {
    const state = this.stateFor(input.tenantId);
    const inspection = state.inspections.get(input.inspectionId);
    if (!inspection) {
      throw new ManufacturingOpsError("NOT_FOUND", `inspection not found: ${input.inspectionId}`);
    }
    if (inspection.result !== "fail") {
      throw new ManufacturingOpsError("INVALID_STATE", "NC requires a failed inspection");
    }
    if (!input.description?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "NC description is required");
    }
    const nc: NonConformance = {
      id: randomUUID(),
      tenantId: input.tenantId,
      inspectionId: inspection.id,
      manufacturingOrderId: inspection.manufacturingOrderId,
      description: input.description,
      status: "open",
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
    state.nonConformances.set(nc.id, nc);
    this.audit(input.tenantId, "nc_opened", `nc=${nc.id} inspection=${inspection.id}`);
    return { ...nc };
  }

  createCorrectiveAction(input: {
    tenantId: TenantId;
    nonConformanceId: string;
    title: string;
  }): CorrectiveAction {
    const state = this.stateFor(input.tenantId);
    const nc = state.nonConformances.get(input.nonConformanceId);
    if (!nc) throw new ManufacturingOpsError("NOT_FOUND", `NC not found: ${input.nonConformanceId}`);
    if (!input.title?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "CAPA title is required");
    }
    const capa: CorrectiveAction = {
      id: randomUUID(),
      tenantId: input.tenantId,
      nonConformanceId: nc.id,
      title: input.title,
      status: "open",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    state.correctiveActions.set(capa.id, capa);
    this.audit(input.tenantId, "capa_created", `capa=${capa.id} nc=${nc.id}`);
    return { ...capa };
  }

  advanceCorrectiveAction(
    tenantId: TenantId,
    capaId: string,
    status: CorrectiveActionStatus,
  ): CorrectiveAction {
    const state = this.stateFor(tenantId);
    const capa = state.correctiveActions.get(capaId);
    if (!capa) throw new ManufacturingOpsError("NOT_FOUND", `CAPA not found: ${capaId}`);
    capa.status = status;
    if (status === "done") capa.completedAt = new Date().toISOString();
    this.audit(tenantId, "capa_advanced", `capa=${capa.id} status=${status}`);
    return { ...capa };
  }

  listInspections(tenantId: TenantId): Inspection[] {
    return [...this.stateFor(tenantId).inspections.values()].map((i) => ({
      ...i,
      evidenceRefs: [...i.evidenceRefs],
    }));
  }

  listNonConformances(tenantId: TenantId): NonConformance[] {
    return [...this.stateFor(tenantId).nonConformances.values()].map((n) => ({ ...n }));
  }

  listCorrectiveActions(tenantId: TenantId): CorrectiveAction[] {
    return [...this.stateFor(tenantId).correctiveActions.values()].map((c) => ({ ...c }));
  }

  // ── Assets & maintenance ─────────────────────────────────────────────────

  createAsset(input: {
    tenantId: TenantId;
    code: string;
    name: string;
    workCenterId?: string | null;
  }): Asset {
    const state = this.stateFor(input.tenantId);
    if (!input.code?.trim() || !input.name?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "asset code and name are required");
    }
    if (input.workCenterId && !state.workCenters.has(input.workCenterId)) {
      throw new ManufacturingOpsError("NOT_FOUND", `work center not found: ${input.workCenterId}`);
    }
    const asset: Asset = {
      id: randomUUID(),
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      workCenterId: input.workCenterId ?? null,
      createdAt: new Date().toISOString(),
    };
    state.assets.set(asset.id, asset);
    this.audit(input.tenantId, "asset_created", `asset=${asset.id} code=${asset.code}`);
    return { ...asset };
  }

  createMaintenanceOrder(input: {
    tenantId: TenantId;
    assetId: string;
    kind: MaintenanceKind;
    scheduleAt: string;
    title: string;
  }): MaintenanceOrder {
    const state = this.stateFor(input.tenantId);
    if (!state.assets.has(input.assetId)) {
      throw new ManufacturingOpsError("NOT_FOUND", `asset not found: ${input.assetId}`);
    }
    if (!input.scheduleAt || Number.isNaN(Date.parse(input.scheduleAt))) {
      throw new ManufacturingOpsError("INVALID_INPUT", "scheduleAt must be a valid ISO datetime");
    }
    if (!input.title?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "maintenance title is required");
    }
    const order: MaintenanceOrder = {
      id: randomUUID(),
      tenantId: input.tenantId,
      assetId: input.assetId,
      kind: input.kind,
      scheduleAt: new Date(input.scheduleAt).toISOString(),
      status: "scheduled",
      title: input.title,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    state.maintenanceOrders.set(order.id, order);
    this.audit(
      input.tenantId,
      "maintenance_scheduled",
      `mo=${order.id} kind=${order.kind} at=${order.scheduleAt}`,
    );
    return { ...order };
  }

  /** Maintenance calendar sorted by scheduleAt ascending. */
  listMaintenanceCalendar(tenantId: TenantId): MaintenanceOrder[] {
    return [...this.stateFor(tenantId).maintenanceOrders.values()]
      .map((o) => ({ ...o }))
      .sort((a, b) => a.scheduleAt.localeCompare(b.scheduleAt));
  }

  listAssets(tenantId: TenantId): Asset[] {
    return [...this.stateFor(tenantId).assets.values()].map((a) => ({ ...a }));
  }

  // ── PLM ──────────────────────────────────────────────────────────────────

  createPlmDocument(input: {
    tenantId: TenantId;
    productSku: string;
    title: string;
    version?: number;
    traceabilityLinks?: string[];
  }): PlmDocument {
    const state = this.stateFor(input.tenantId);
    if (!input.productSku?.trim() || !input.title?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "productSku and title are required");
    }
    const nextDefault = (state.plmVersionBySku.get(input.productSku) ?? 0) + 1;
    const version = input.version ?? nextDefault;
    state.plmVersionBySku.set(
      input.productSku,
      Math.max(state.plmVersionBySku.get(input.productSku) ?? 0, version),
    );
    const now = new Date().toISOString();
    const doc: PlmDocument = {
      id: randomUUID(),
      tenantId: input.tenantId,
      productSku: input.productSku,
      version,
      title: input.title,
      traceabilityLinks: [...(input.traceabilityLinks ?? [])],
      changeRequest: null,
      createdAt: now,
      updatedAt: now,
    };
    state.plmDocuments.set(doc.id, doc);
    this.audit(input.tenantId, "plm_created", `doc=${doc.id} sku=${doc.productSku} v=${doc.version}`);
    return this.clonePlm(doc);
  }

  submitChangeRequest(input: {
    tenantId: TenantId;
    documentId: string;
    reason: string;
  }): PlmDocument {
    const state = this.stateFor(input.tenantId);
    const doc = state.plmDocuments.get(input.documentId);
    if (!doc) throw new ManufacturingOpsError("NOT_FOUND", `PLM document not found: ${input.documentId}`);
    if (doc.changeRequest?.status === "pending") {
      throw new ManufacturingOpsError("INVALID_STATE", "a pending change request already exists");
    }
    if (!input.reason?.trim()) {
      throw new ManufacturingOpsError("INVALID_INPUT", "change request reason is required");
    }
    doc.changeRequest = {
      status: "pending",
      reason: input.reason,
      requestedAt: new Date().toISOString(),
      resolvedAt: null,
    };
    doc.updatedAt = new Date().toISOString();
    this.audit(input.tenantId, "plm_change_submitted", `doc=${doc.id}`);
    return this.clonePlm(doc);
  }

  /** Approve change request and bump document version by +1. */
  approveChangeRequest(tenantId: TenantId, documentId: string): PlmDocument {
    const state = this.stateFor(tenantId);
    const doc = state.plmDocuments.get(documentId);
    if (!doc) throw new ManufacturingOpsError("NOT_FOUND", `PLM document not found: ${documentId}`);
    if (!doc.changeRequest || doc.changeRequest.status !== "pending") {
      throw new ManufacturingOpsError("INVALID_STATE", "no pending change request to approve");
    }
    doc.changeRequest.status = "approved";
    doc.changeRequest.resolvedAt = new Date().toISOString();
    doc.version += 1;
    state.plmVersionBySku.set(
      doc.productSku,
      Math.max(state.plmVersionBySku.get(doc.productSku) ?? 0, doc.version),
    );
    doc.updatedAt = new Date().toISOString();
    this.audit(tenantId, "plm_change_approved", `doc=${doc.id} newVersion=${doc.version}`);
    return this.clonePlm(doc);
  }

  rejectChangeRequest(tenantId: TenantId, documentId: string): PlmDocument {
    const state = this.stateFor(tenantId);
    const doc = state.plmDocuments.get(documentId);
    if (!doc) throw new ManufacturingOpsError("NOT_FOUND", `PLM document not found: ${documentId}`);
    if (!doc.changeRequest || doc.changeRequest.status !== "pending") {
      throw new ManufacturingOpsError("INVALID_STATE", "no pending change request to reject");
    }
    doc.changeRequest.status = "rejected";
    doc.changeRequest.resolvedAt = new Date().toISOString();
    doc.updatedAt = new Date().toISOString();
    this.audit(tenantId, "plm_change_rejected", `doc=${doc.id}`);
    return this.clonePlm(doc);
  }

  getPlmDocument(tenantId: TenantId, documentId: string): PlmDocument | null {
    const doc = this.stateFor(tenantId).plmDocuments.get(documentId);
    return doc ? this.clonePlm(doc) : null;
  }

  listPlmDocuments(tenantId: TenantId, productSku?: string): PlmDocument[] {
    const all = [...this.stateFor(tenantId).plmDocuments.values()];
    const filtered = productSku ? all.filter((d) => d.productSku === productSku) : all;
    return filtered.map((d) => this.clonePlm(d));
  }

  private clonePlm(doc: PlmDocument): PlmDocument {
    return {
      ...doc,
      traceabilityLinks: [...doc.traceabilityLinks],
      changeRequest: doc.changeRequest ? { ...doc.changeRequest } : null,
    };
  }

  // ── Audit ────────────────────────────────────────────────────────────────

  listAudit(tenantId: TenantId): AuditEntry[] {
    return this.stateFor(tenantId).auditLog.map((e) => ({ ...e }));
  }
}

let coreSingleton: ManufacturingOpsCore | undefined;

export function getManufacturingOpsCore(): ManufacturingOpsCore {
  if (!coreSingleton) coreSingleton = new ManufacturingOpsCore();
  return coreSingleton;
}

export function resetManufacturingOpsCoreForTests(): void {
  coreSingleton?.reset();
  coreSingleton = undefined;
}

/**
 * Integrity gate: IoT permanently blocked + tenant isolation self-check.
 * Treat passing this + critical happy-path tests as QA ≥ 90 for the modular core.
 */
export function assertManufacturingCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const iot = new IoTAdapter();
  if (iot.status !== "PREPARED_OFF") violations.push("iot_must_be_prepared_off");
  try {
    iot.connect({ tenantId: "integrity-a", endpoint: "mqtt://example" });
    violations.push("iot_connect_must_throw");
  } catch (err) {
    if (!(err instanceof ManufacturingOpsError) || err.code !== "BLOCKED_EXTERNAL") {
      violations.push("iot_connect_wrong_error");
    }
  }

  const core = new ManufacturingOpsCore();
  const bomA = core.createBom({
    tenantId: "integrity-a",
    productSku: "SKU-A",
    lines: [{ componentSku: "C1", qty: 1, uom: "ea" }],
  });
  core.approveBom("integrity-a", bomA.id);
  core.createBom({
    tenantId: "integrity-b",
    productSku: "SKU-B",
    lines: [{ componentSku: "C2", qty: 2, uom: "ea" }],
  });

  if (core.listBoms("integrity-a").length !== 1) violations.push("tenant_a_bom_count");
  if (core.listBoms("integrity-b").length !== 1) violations.push("tenant_b_bom_count");
  if (core.listBoms("integrity-a").some((b) => b.tenantId !== "integrity-a")) {
    violations.push("tenant_a_isolation_leak");
  }
  if (core.listBoms("integrity-b").some((b) => b.tenantId !== "integrity-b")) {
    violations.push("tenant_b_isolation_leak");
  }
  if (core.getBom("integrity-b", bomA.id) !== null) {
    violations.push("cross_tenant_bom_read_leak");
  }

  const mo = core.createManufacturingOrder({ tenantId: "integrity-a", bomId: bomA.id, qty: 10 });
  try {
    core.consumeComponents("integrity-a", mo.id);
    violations.push("consume_without_release_must_fail");
  } catch (err) {
    if (!(err instanceof ManufacturingOpsError) || err.code !== "INVALID_STATE") {
      violations.push("consume_without_release_wrong_error");
    }
  }

  core.releaseManufacturingOrder("integrity-a", mo.id);
  core.consumeComponents("integrity-a", mo.id);
  core.reportProduction("integrity-a", mo.id, 5, 1);
  try {
    core.reportProduction("integrity-a", mo.id, 0, 10);
    violations.push("scrap_exceeds_produced_must_fail");
  } catch (err) {
    if (!(err instanceof ManufacturingOpsError) || err.code !== "SCRAP_EXCEEDS_PRODUCED") {
      violations.push("scrap_exceeds_produced_wrong_error");
    }
  }

  return { ok: violations.length === 0, violations };
}

export const MANUFACTURING_OPS_ROLLBACK_PLAN = [
  "Do not wire IoTAdapter.connect — permanently BLOCKED_EXTERNAL / PREPARED_OFF",
  "Keep ManufacturingOpsCore in-memory only until CEO approves DB/API surface",
  "Do not register catalog as IMPLEMENTED_VERIFIED without vitest evidence",
  "Do not confuse OS manufactura marketing agents with this MRP/QC/PLM core",
] as const;

/**
 * Inventory / Warehouses / Traceability CORE — Block 27.
 *
 * In-memory multi-tenant inventory domain: products, warehouses/locations,
 * immutable stock moves, lots/serials, reservations, physical counts, min-stock
 * alerts, and append-only audit. Stock balances are maintained as materialized
 * projections of the move log with hard invariants (available/reserved/inTransit
 * never go negative; reserve cannot exceed available).
 *
 * Hard rules:
 *  - Tenant isolation hard-fails with `TENANT_MISMATCH` on cross-tenant mutate/read
 *    of owned entity ids (and per-tenant maps never leak stock across tenants).
 *  - StockMove is IMMUTABLE after append (`Object.freeze`); never mutated.
 *  - Adjust moves require an approved PhysicalCount (or explicit approved adjust path).
 *  - Idempotency on moves by (tenantId, idempotencyKey).
 *  - No cost accounting / GL — qty + traceability only.
 */

import { randomUUID } from "node:crypto";

export type TenantId = string;

export type InventoryErrorCode =
  | "TENANT_MISMATCH"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "INSUFFICIENT_STOCK"
  | "APPROVAL_REQUIRED"
  | "INVALID_QTY"
  | "CONFLICT";

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(code: InventoryErrorCode, message: string) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

export type ProductVariant = {
  sku: string;
  attrs: Record<string, string>;
};

export type Product = {
  sku: string;
  name: string;
  uom: string;
  variants: ProductVariant[];
  tenantId: TenantId;
};

export type Warehouse = {
  id: string;
  tenantId: TenantId;
  code: string;
  name: string;
};

export type Location = {
  id: string;
  tenantId: TenantId;
  warehouseId: string;
  code: string;
};

export type StockBalance = {
  tenantId: TenantId;
  locationId: string;
  productSku: string;
  available: number;
  reserved: number;
  inTransit: number;
};

export type StockMoveType =
  | "receive"
  | "adjust"
  | "transfer"
  | "pick"
  | "return"
  | "reserve"
  | "release";

export type StockMove = {
  id: string;
  tenantId: TenantId;
  type: StockMoveType;
  productSku: string;
  fromLocId: string | null;
  toLocId: string | null;
  qty: number;
  lotId?: string;
  serialIds?: string[];
  reason: string;
  actorId: string;
  idempotencyKey: string;
  createdAt: string;
  orderRef?: string;
  reservationId?: string;
  physicalCountId?: string;
  /** Synthetic purchase/sale/return ref for traceability chains. */
  traceRef?: string;
};

export type Lot = {
  id: string;
  tenantId: TenantId;
  code: string;
  productSku: string;
  expiryDate?: string;
};

export type Serial = {
  id: string;
  tenantId: TenantId;
  code: string;
  productSku: string;
};

export type ReservationStatus = "held" | "released" | "consumed";

export type Reservation = {
  id: string;
  tenantId: TenantId;
  orderRef: string;
  productSku: string;
  locationId: string;
  qty: number;
  status: ReservationStatus;
  createdAt: string;
  moveId: string;
};

export type PhysicalCountStatus = "draft" | "submitted" | "approved";

export type PhysicalCount = {
  id: string;
  tenantId: TenantId;
  warehouseId: string;
  locationId: string;
  productSku: string;
  countedQty: number;
  status: PhysicalCountStatus;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  adjustMoveId: string | null;
  actorId: string;
};

export type MinStockRule = {
  id: string;
  tenantId: TenantId;
  sku: string;
  warehouseId: string;
  minQty: number;
};

export type MinStockAlert = {
  ruleId: string;
  tenantId: TenantId;
  sku: string;
  warehouseId: string;
  minQty: number;
  availableQty: number;
};

export type AuditEntry = {
  id: string;
  tenantId: TenantId;
  at: string;
  action: string;
  detail: string;
};

type BalanceKey = string;

function balanceKey(locationId: string, productSku: string): BalanceKey {
  return `${locationId}::${productSku}`;
}

type TenantState = {
  products: Map<string, Product>;
  warehouses: Map<string, Warehouse>;
  locations: Map<string, Location>;
  balances: Map<BalanceKey, StockBalance>;
  moves: StockMove[];
  movesByIdempotency: Map<string, string>;
  movesById: Map<string, StockMove>;
  lots: Map<string, Lot>;
  lotsByCode: Map<string, string>;
  serials: Map<string, Serial>;
  serialsByCode: Map<string, string>;
  reservations: Map<string, Reservation>;
  physicalCounts: Map<string, PhysicalCount>;
  minStockRules: Map<string, MinStockRule>;
  auditLog: AuditEntry[];
};

function emptyTenantState(): TenantState {
  return {
    products: new Map(),
    warehouses: new Map(),
    locations: new Map(),
    balances: new Map(),
    moves: [],
    movesByIdempotency: new Map(),
    movesById: new Map(),
    lots: new Map(),
    lotsByCode: new Map(),
    serials: new Map(),
    serialsByCode: new Map(),
    reservations: new Map(),
    physicalCounts: new Map(),
    minStockRules: new Map(),
    auditLog: [],
  };
}

function emptyBalance(tenantId: TenantId, locationId: string, productSku: string): StockBalance {
  return {
    tenantId,
    locationId,
    productSku,
    available: 0,
    reserved: 0,
    inTransit: 0,
  };
}

/**
 * In-memory inventory core. Never performs I/O. Tenant A can never read or mutate
 * tenant B stock, moves, lots, serials, reservations, or audit entries.
 */
export class InventoryWarehousesCore {
  private readonly tenants = new Map<TenantId, TenantState>();
  /** Global ownership index for hard TENANT_MISMATCH on cross-tenant id access. */
  private readonly entityOwner = new Map<string, TenantId>();

  private stateFor(tenantId: TenantId): TenantState {
    if (!tenantId) throw new InventoryError("TENANT_MISMATCH", "tenantId is required");
    let state = this.tenants.get(tenantId);
    if (!state) {
      state = emptyTenantState();
      this.tenants.set(tenantId, state);
    }
    return state;
  }

  private registerOwner(entityId: string, tenantId: TenantId): void {
    this.entityOwner.set(entityId, tenantId);
  }

  private assertEntityOwner(tenantId: TenantId, entityId: string, label: string): void {
    const owner = this.entityOwner.get(entityId);
    if (owner === undefined) return;
    if (owner !== tenantId) {
      throw new InventoryError("TENANT_MISMATCH", `cross-tenant access to ${label} denied`);
    }
  }

  private audit(tenantId: TenantId, action: string, detail: string): void {
    this.stateFor(tenantId).auditLog.push({
      id: randomUUID(),
      tenantId,
      at: new Date().toISOString(),
      action,
      detail,
    });
  }

  private getBalanceMutable(
    state: TenantState,
    tenantId: TenantId,
    locationId: string,
    productSku: string,
  ): StockBalance {
    const key = balanceKey(locationId, productSku);
    let bal = state.balances.get(key);
    if (!bal) {
      bal = emptyBalance(tenantId, locationId, productSku);
      state.balances.set(key, bal);
    }
    return bal;
  }

  private requireProduct(tenantId: TenantId, sku: string): Product {
    const product = this.stateFor(tenantId).products.get(sku);
    if (!product) throw new InventoryError("NOT_FOUND", `product not found: ${sku}`);
    if (product.tenantId !== tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to product denied");
    }
    return product;
  }

  private requireWarehouse(tenantId: TenantId, warehouseId: string): Warehouse {
    this.assertEntityOwner(tenantId, warehouseId, "warehouse");
    const wh = this.stateFor(tenantId).warehouses.get(warehouseId);
    if (!wh) throw new InventoryError("NOT_FOUND", `warehouse not found: ${warehouseId}`);
    if (wh.tenantId !== tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to warehouse denied");
    }
    return wh;
  }

  private requireLocation(tenantId: TenantId, locationId: string): Location {
    this.assertEntityOwner(tenantId, locationId, "location");
    const loc = this.stateFor(tenantId).locations.get(locationId);
    if (!loc) throw new InventoryError("NOT_FOUND", `location not found: ${locationId}`);
    if (loc.tenantId !== tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to location denied");
    }
    return loc;
  }

  private requireLot(tenantId: TenantId, lotId: string): Lot {
    this.assertEntityOwner(tenantId, lotId, "lot");
    const lot = this.stateFor(tenantId).lots.get(lotId);
    if (!lot) throw new InventoryError("NOT_FOUND", `lot not found: ${lotId}`);
    if (lot.tenantId !== tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to lot denied");
    }
    return lot;
  }

  private requireSerials(tenantId: TenantId, serialIds: string[], productSku: string): Serial[] {
    const state = this.stateFor(tenantId);
    return serialIds.map((id) => {
      this.assertEntityOwner(tenantId, id, "serial");
      const serial = state.serials.get(id);
      if (!serial) throw new InventoryError("NOT_FOUND", `serial not found: ${id}`);
      if (serial.tenantId !== tenantId) {
        throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to serial denied");
      }
      if (serial.productSku !== productSku) {
        throw new InventoryError("CONFLICT", `serial ${id} productSku mismatch`);
      }
      return serial;
    });
  }

  reset(): void {
    this.tenants.clear();
    this.entityOwner.clear();
  }

  // ─── Master data ─────────────────────────────────────────────────────────

  createProduct(input: {
    tenantId: TenantId;
    sku: string;
    name: string;
    uom: string;
    variants?: ProductVariant[];
  }): Product {
    const state = this.stateFor(input.tenantId);
    if (!input.sku.trim()) throw new InventoryError("INVALID_QTY", "sku is required");
    if (state.products.has(input.sku)) {
      throw new InventoryError("CONFLICT", `product already exists: ${input.sku}`);
    }
    const product: Product = {
      sku: input.sku,
      name: input.name,
      uom: input.uom,
      variants: input.variants ? input.variants.map((v) => ({ sku: v.sku, attrs: { ...v.attrs } })) : [],
      tenantId: input.tenantId,
    };
    state.products.set(product.sku, product);
    this.audit(input.tenantId, "product_created", `sku=${product.sku} name=${product.name}`);
    return { ...product, variants: product.variants.map((v) => ({ ...v, attrs: { ...v.attrs } })) };
  }

  getProduct(tenantId: TenantId, sku: string): Product | null {
    const p = this.stateFor(tenantId).products.get(sku);
    return p ? { ...p, variants: p.variants.map((v) => ({ ...v, attrs: { ...v.attrs } })) } : null;
  }

  listProducts(tenantId: TenantId): Product[] {
    return [...this.stateFor(tenantId).products.values()].map((p) => ({
      ...p,
      variants: p.variants.map((v) => ({ ...v, attrs: { ...v.attrs } })),
    }));
  }

  createWarehouse(input: { tenantId: TenantId; code: string; name: string }): Warehouse {
    const state = this.stateFor(input.tenantId);
    for (const wh of state.warehouses.values()) {
      if (wh.code === input.code) {
        throw new InventoryError("CONFLICT", `warehouse code already exists: ${input.code}`);
      }
    }
    const warehouse: Warehouse = {
      id: randomUUID(),
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
    };
    state.warehouses.set(warehouse.id, warehouse);
    this.registerOwner(warehouse.id, input.tenantId);
    this.audit(input.tenantId, "warehouse_created", `id=${warehouse.id} code=${warehouse.code}`);
    return { ...warehouse };
  }

  getWarehouse(tenantId: TenantId, warehouseId: string): Warehouse | null {
    this.assertEntityOwner(tenantId, warehouseId, "warehouse");
    const wh = this.stateFor(tenantId).warehouses.get(warehouseId);
    return wh ? { ...wh } : null;
  }

  listWarehouses(tenantId: TenantId): Warehouse[] {
    return [...this.stateFor(tenantId).warehouses.values()].map((w) => ({ ...w }));
  }

  createLocation(input: {
    tenantId: TenantId;
    warehouseId: string;
    code: string;
  }): Location {
    this.requireWarehouse(input.tenantId, input.warehouseId);
    const state = this.stateFor(input.tenantId);
    for (const loc of state.locations.values()) {
      if (loc.warehouseId === input.warehouseId && loc.code === input.code) {
        throw new InventoryError("CONFLICT", `location code already exists in warehouse: ${input.code}`);
      }
    }
    const location: Location = {
      id: randomUUID(),
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      code: input.code,
    };
    state.locations.set(location.id, location);
    this.registerOwner(location.id, input.tenantId);
    this.audit(
      input.tenantId,
      "location_created",
      `id=${location.id} warehouse=${input.warehouseId} code=${location.code}`,
    );
    return { ...location };
  }

  getLocation(tenantId: TenantId, locationId: string): Location | null {
    this.assertEntityOwner(tenantId, locationId, "location");
    const loc = this.stateFor(tenantId).locations.get(locationId);
    return loc ? { ...loc } : null;
  }

  listLocations(tenantId: TenantId, warehouseId?: string): Location[] {
    const locs = [...this.stateFor(tenantId).locations.values()];
    return (warehouseId ? locs.filter((l) => l.warehouseId === warehouseId) : locs).map((l) => ({ ...l }));
  }

  createLot(input: {
    tenantId: TenantId;
    code: string;
    productSku: string;
    expiryDate?: string;
  }): Lot {
    this.requireProduct(input.tenantId, input.productSku);
    const state = this.stateFor(input.tenantId);
    if (state.lotsByCode.has(input.code)) {
      throw new InventoryError("CONFLICT", `lot code already exists: ${input.code}`);
    }
    const lot: Lot = {
      id: randomUUID(),
      tenantId: input.tenantId,
      code: input.code,
      productSku: input.productSku,
      expiryDate: input.expiryDate,
    };
    state.lots.set(lot.id, lot);
    state.lotsByCode.set(lot.code, lot.id);
    this.registerOwner(lot.id, input.tenantId);
    this.audit(input.tenantId, "lot_created", `id=${lot.id} code=${lot.code} sku=${lot.productSku}`);
    return { ...lot };
  }

  getLot(tenantId: TenantId, lotId: string): Lot | null {
    this.assertEntityOwner(tenantId, lotId, "lot");
    const lot = this.stateFor(tenantId).lots.get(lotId);
    return lot ? { ...lot } : null;
  }

  createSerial(input: { tenantId: TenantId; code: string; productSku: string }): Serial {
    this.requireProduct(input.tenantId, input.productSku);
    const state = this.stateFor(input.tenantId);
    if (state.serialsByCode.has(input.code)) {
      throw new InventoryError("CONFLICT", `serial code already exists: ${input.code}`);
    }
    const serial: Serial = {
      id: randomUUID(),
      tenantId: input.tenantId,
      code: input.code,
      productSku: input.productSku,
    };
    state.serials.set(serial.id, serial);
    state.serialsByCode.set(serial.code, serial.id);
    this.registerOwner(serial.id, input.tenantId);
    this.audit(input.tenantId, "serial_created", `id=${serial.id} code=${serial.code} sku=${serial.productSku}`);
    return { ...serial };
  }

  getSerial(tenantId: TenantId, serialId: string): Serial | null {
    this.assertEntityOwner(tenantId, serialId, "serial");
    const serial = this.stateFor(tenantId).serials.get(serialId);
    return serial ? { ...serial } : null;
  }

  getSerialByCode(tenantId: TenantId, code: string): Serial | null {
    const state = this.stateFor(tenantId);
    const id = state.serialsByCode.get(code);
    if (!id) return null;
    const serial = state.serials.get(id);
    return serial ? { ...serial } : null;
  }

  // ─── Balances ────────────────────────────────────────────────────────────

  getBalance(tenantId: TenantId, locationId: string, productSku: string): StockBalance {
    this.requireLocation(tenantId, locationId);
    this.requireProduct(tenantId, productSku);
    const bal = this.stateFor(tenantId).balances.get(balanceKey(locationId, productSku));
    return bal
      ? { ...bal }
      : emptyBalance(tenantId, locationId, productSku);
  }

  listBalances(tenantId: TenantId, filter?: { warehouseId?: string; productSku?: string }): StockBalance[] {
    const state = this.stateFor(tenantId);
    let balances = [...state.balances.values()];
    if (filter?.productSku) {
      balances = balances.filter((b) => b.productSku === filter.productSku);
    }
    if (filter?.warehouseId) {
      this.requireWarehouse(tenantId, filter.warehouseId);
      const locIds = new Set(
        [...state.locations.values()].filter((l) => l.warehouseId === filter.warehouseId).map((l) => l.id),
      );
      balances = balances.filter((b) => locIds.has(b.locationId));
    }
    return balances.map((b) => ({ ...b }));
  }

  warehouseAvailable(tenantId: TenantId, warehouseId: string, productSku: string): number {
    return this.listBalances(tenantId, { warehouseId, productSku }).reduce((sum, b) => sum + b.available, 0);
  }

  // ─── Immutable moves ─────────────────────────────────────────────────────

  private appendMove(
    tenantId: TenantId,
    input: {
      type: StockMoveType;
      productSku: string;
      fromLocId: string | null;
      toLocId: string | null;
      qty: number;
      lotId?: string;
      serialIds?: string[];
      reason: string;
      actorId: string;
      idempotencyKey: string;
      orderRef?: string;
      reservationId?: string;
      physicalCountId?: string;
      traceRef?: string;
      /** When true, skip approval gate (used only by approvePhysicalCount). */
      approvedAdjust?: boolean;
    },
  ): StockMove {
    if (input.qty <= 0 || !Number.isFinite(input.qty)) {
      throw new InventoryError("INVALID_QTY", "qty must be a positive finite number");
    }
    if (!input.idempotencyKey.trim()) {
      throw new InventoryError("INVALID_STATE", "idempotencyKey is required");
    }
    if (!input.actorId.trim()) {
      throw new InventoryError("INVALID_STATE", "actorId is required");
    }

    const state = this.stateFor(tenantId);
    const existingId = state.movesByIdempotency.get(input.idempotencyKey);
    if (existingId) {
      const existing = state.movesById.get(existingId);
      if (!existing) throw new InventoryError("CONFLICT", "idempotency map corrupted");
      return existing;
    }

    this.requireProduct(tenantId, input.productSku);
    if (input.fromLocId) this.requireLocation(tenantId, input.fromLocId);
    if (input.toLocId) this.requireLocation(tenantId, input.toLocId);
    if (input.lotId) {
      const lot = this.requireLot(tenantId, input.lotId);
      if (lot.productSku !== input.productSku) {
        throw new InventoryError("CONFLICT", "lot productSku mismatch");
      }
    }
    if (input.serialIds?.length) {
      this.requireSerials(tenantId, input.serialIds, input.productSku);
    }

    if (input.type === "adjust" && !input.approvedAdjust) {
      throw new InventoryError(
        "APPROVAL_REQUIRED",
        "adjust moves require approved physical count before posting",
      );
    }

    // Apply balance mutations by type
    switch (input.type) {
      case "receive":
      case "return": {
        if (!input.toLocId) throw new InventoryError("INVALID_STATE", `${input.type} requires toLocId`);
        const bal = this.getBalanceMutable(state, tenantId, input.toLocId, input.productSku);
        bal.available += input.qty;
        break;
      }
      case "adjust": {
        // Signed semantics via from/to: toLoc increases, fromLoc decreases.
        if (input.toLocId && input.fromLocId) {
          throw new InventoryError("INVALID_STATE", "adjust must use either fromLocId or toLocId, not both");
        }
        if (input.toLocId) {
          const bal = this.getBalanceMutable(state, tenantId, input.toLocId, input.productSku);
          bal.available += input.qty;
        } else if (input.fromLocId) {
          const bal = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
          if (bal.available < input.qty) {
            throw new InventoryError("INSUFFICIENT_STOCK", "adjust decrease exceeds available");
          }
          bal.available -= input.qty;
        } else {
          throw new InventoryError("INVALID_STATE", "adjust requires fromLocId or toLocId");
        }
        break;
      }
      case "transfer": {
        if (!input.fromLocId || !input.toLocId) {
          throw new InventoryError("INVALID_STATE", "transfer requires fromLocId and toLocId");
        }
        if (input.fromLocId === input.toLocId) {
          throw new InventoryError("INVALID_STATE", "transfer fromLoc and toLoc must differ");
        }
        const from = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
        if (from.available < input.qty) {
          throw new InventoryError("INSUFFICIENT_STOCK", "transfer exceeds available");
        }
        from.available -= input.qty;
        from.inTransit += input.qty;
        const to = this.getBalanceMutable(state, tenantId, input.toLocId, input.productSku);
        to.inTransit += input.qty;
        // Complete transfer atomically into destination available (single immutable move).
        from.inTransit -= input.qty;
        to.inTransit -= input.qty;
        to.available += input.qty;
        break;
      }
      case "pick": {
        if (!input.fromLocId) throw new InventoryError("INVALID_STATE", "pick requires fromLocId");
        if (input.reservationId) {
          const res = state.reservations.get(input.reservationId);
          if (!res) throw new InventoryError("NOT_FOUND", `reservation not found: ${input.reservationId}`);
          if (res.tenantId !== tenantId) {
            throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to reservation denied");
          }
          if (res.status !== "held") {
            throw new InventoryError("INVALID_STATE", `cannot pick from reservation status=${res.status}`);
          }
          if (res.qty !== input.qty || res.productSku !== input.productSku || res.locationId !== input.fromLocId) {
            throw new InventoryError("CONFLICT", "pick does not match reservation");
          }
          const bal = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
          if (bal.reserved < input.qty) {
            throw new InventoryError("INSUFFICIENT_STOCK", "pick exceeds reserved");
          }
          bal.reserved -= input.qty;
          res.status = "consumed";
        } else {
          const bal = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
          if (bal.available < input.qty) {
            throw new InventoryError("INSUFFICIENT_STOCK", "pick exceeds available");
          }
          bal.available -= input.qty;
        }
        break;
      }
      case "reserve": {
        if (!input.fromLocId) throw new InventoryError("INVALID_STATE", "reserve requires fromLocId");
        const bal = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
        if (bal.available < input.qty) {
          throw new InventoryError("INSUFFICIENT_STOCK", "cannot reserve more than available");
        }
        bal.available -= input.qty;
        bal.reserved += input.qty;
        break;
      }
      case "release": {
        if (!input.fromLocId) throw new InventoryError("INVALID_STATE", "release requires fromLocId");
        if (!input.reservationId) {
          throw new InventoryError("INVALID_STATE", "release requires reservationId");
        }
        const res = state.reservations.get(input.reservationId);
        if (!res) throw new InventoryError("NOT_FOUND", `reservation not found: ${input.reservationId}`);
        if (res.tenantId !== tenantId) {
          throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to reservation denied");
        }
        if (res.status !== "held") {
          throw new InventoryError("INVALID_STATE", `cannot release reservation status=${res.status}`);
        }
        if (res.qty !== input.qty || res.locationId !== input.fromLocId || res.productSku !== input.productSku) {
          throw new InventoryError("CONFLICT", "release does not match reservation");
        }
        const bal = this.getBalanceMutable(state, tenantId, input.fromLocId, input.productSku);
        if (bal.reserved < input.qty) {
          throw new InventoryError("INSUFFICIENT_STOCK", "release exceeds reserved");
        }
        bal.reserved -= input.qty;
        bal.available += input.qty;
        res.status = "released";
        break;
      }
      default: {
        const _exhaustive: never = input.type;
        throw new InventoryError("INVALID_STATE", `unknown move type: ${_exhaustive}`);
      }
    }

    const move: StockMove = Object.freeze({
      id: randomUUID(),
      tenantId,
      type: input.type,
      productSku: input.productSku,
      fromLocId: input.fromLocId,
      toLocId: input.toLocId,
      qty: input.qty,
      ...(input.lotId ? { lotId: input.lotId } : {}),
      ...(input.serialIds?.length ? { serialIds: Object.freeze([...input.serialIds]) as string[] } : {}),
      reason: input.reason,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
      ...(input.orderRef ? { orderRef: input.orderRef } : {}),
      ...(input.reservationId ? { reservationId: input.reservationId } : {}),
      ...(input.physicalCountId ? { physicalCountId: input.physicalCountId } : {}),
      ...(input.traceRef ? { traceRef: input.traceRef } : {}),
    });

    state.moves.push(move);
    state.movesById.set(move.id, move);
    state.movesByIdempotency.set(input.idempotencyKey, move.id);
    this.registerOwner(move.id, tenantId);
    this.audit(
      tenantId,
      "stock_move",
      `id=${move.id} type=${move.type} sku=${move.productSku} qty=${move.qty} key=${move.idempotencyKey}`,
    );
    return move;
  }

  receive(input: {
    tenantId: TenantId;
    productSku: string;
    toLocId: string;
    qty: number;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
    lotId?: string;
    serialIds?: string[];
    traceRef?: string;
  }): StockMove {
    return this.appendMove(input.tenantId, {
      type: "receive",
      productSku: input.productSku,
      fromLocId: null,
      toLocId: input.toLocId,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "receive",
      lotId: input.lotId,
      serialIds: input.serialIds,
      traceRef: input.traceRef,
    });
  }

  transfer(input: {
    tenantId: TenantId;
    productSku: string;
    fromLocId: string;
    toLocId: string;
    qty: number;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
    lotId?: string;
    serialIds?: string[];
  }): StockMove {
    return this.appendMove(input.tenantId, {
      type: "transfer",
      productSku: input.productSku,
      fromLocId: input.fromLocId,
      toLocId: input.toLocId,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "transfer",
      lotId: input.lotId,
      serialIds: input.serialIds,
    });
  }

  pick(input: {
    tenantId: TenantId;
    productSku: string;
    fromLocId: string;
    qty: number;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
    lotId?: string;
    serialIds?: string[];
    reservationId?: string;
    orderRef?: string;
    traceRef?: string;
  }): StockMove {
    return this.appendMove(input.tenantId, {
      type: "pick",
      productSku: input.productSku,
      fromLocId: input.fromLocId,
      toLocId: null,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "pick",
      lotId: input.lotId,
      serialIds: input.serialIds,
      reservationId: input.reservationId,
      orderRef: input.orderRef,
      traceRef: input.traceRef,
    });
  }

  returnStock(input: {
    tenantId: TenantId;
    productSku: string;
    toLocId: string;
    qty: number;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
    lotId?: string;
    serialIds?: string[];
    orderRef?: string;
    traceRef?: string;
  }): StockMove {
    return this.appendMove(input.tenantId, {
      type: "return",
      productSku: input.productSku,
      fromLocId: null,
      toLocId: input.toLocId,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "return",
      lotId: input.lotId,
      serialIds: input.serialIds,
      orderRef: input.orderRef,
      traceRef: input.traceRef,
    });
  }

  /**
   * Reserve available qty against an order. Concurrent over-reserve hard-fails
   * with INSUFFICIENT_STOCK — cannot reserve more than available.
   */
  reserve(input: {
    tenantId: TenantId;
    productSku: string;
    locationId: string;
    qty: number;
    orderRef: string;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
  }): { move: StockMove; reservation: Reservation } {
    const state = this.stateFor(input.tenantId);
    const existingId = state.movesByIdempotency.get(input.idempotencyKey);
    if (existingId) {
      const existingMove = state.movesById.get(existingId);
      if (!existingMove) throw new InventoryError("CONFLICT", "idempotency map corrupted");
      const reservation = [...state.reservations.values()].find((r) => r.moveId === existingMove.id);
      if (!reservation) throw new InventoryError("CONFLICT", "reservation missing for idempotent move");
      return { move: existingMove, reservation: { ...reservation } };
    }

    const reservationId = randomUUID();
    const move = this.appendMove(input.tenantId, {
      type: "reserve",
      productSku: input.productSku,
      fromLocId: input.locationId,
      toLocId: null,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "reserve",
      orderRef: input.orderRef,
      reservationId,
    });

    const reservation: Reservation = {
      id: reservationId,
      tenantId: input.tenantId,
      orderRef: input.orderRef,
      productSku: input.productSku,
      locationId: input.locationId,
      qty: input.qty,
      status: "held",
      createdAt: new Date().toISOString(),
      moveId: move.id,
    };
    state.reservations.set(reservation.id, reservation);
    this.registerOwner(reservation.id, input.tenantId);
    this.audit(
      input.tenantId,
      "reservation_held",
      `id=${reservation.id} order=${reservation.orderRef} qty=${reservation.qty}`,
    );
    return { move, reservation: { ...reservation } };
  }

  releaseReservation(input: {
    tenantId: TenantId;
    reservationId: string;
    actorId: string;
    idempotencyKey: string;
    reason?: string;
  }): StockMove {
    this.assertEntityOwner(input.tenantId, input.reservationId, "reservation");
    const res = this.stateFor(input.tenantId).reservations.get(input.reservationId);
    if (!res) throw new InventoryError("NOT_FOUND", `reservation not found: ${input.reservationId}`);
    if (res.tenantId !== input.tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to reservation denied");
    }
    return this.appendMove(input.tenantId, {
      type: "release",
      productSku: res.productSku,
      fromLocId: res.locationId,
      toLocId: null,
      qty: res.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason ?? "release",
      reservationId: res.id,
      orderRef: res.orderRef,
    });
  }

  getReservation(tenantId: TenantId, reservationId: string): Reservation | null {
    this.assertEntityOwner(tenantId, reservationId, "reservation");
    const res = this.stateFor(tenantId).reservations.get(reservationId);
    return res ? { ...res } : null;
  }

  listReservations(tenantId: TenantId, filter?: { orderRef?: string; status?: ReservationStatus }): Reservation[] {
    let list = [...this.stateFor(tenantId).reservations.values()];
    if (filter?.orderRef) list = list.filter((r) => r.orderRef === filter.orderRef);
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    return list.map((r) => ({ ...r }));
  }

  getMove(tenantId: TenantId, moveId: string): StockMove | null {
    this.assertEntityOwner(tenantId, moveId, "stock_move");
    return this.stateFor(tenantId).movesById.get(moveId) ?? null;
  }

  listMoves(tenantId: TenantId, filter?: { productSku?: string; type?: StockMoveType; lotId?: string }): readonly StockMove[] {
    let moves = this.stateFor(tenantId).moves;
    if (filter?.productSku) moves = moves.filter((m) => m.productSku === filter.productSku);
    if (filter?.type) moves = moves.filter((m) => m.type === filter.type);
    if (filter?.lotId) moves = moves.filter((m) => m.lotId === filter.lotId);
    return moves;
  }

  /** Traceability: all moves touching a lot (purchase→sale→return chain). */
  traceLot(tenantId: TenantId, lotId: string): readonly StockMove[] {
    this.requireLot(tenantId, lotId);
    return this.stateFor(tenantId).moves.filter((m) => m.lotId === lotId);
  }

  /** Traceability: all moves touching a serial id. */
  traceSerial(tenantId: TenantId, serialId: string): readonly StockMove[] {
    this.assertEntityOwner(tenantId, serialId, "serial");
    const serial = this.stateFor(tenantId).serials.get(serialId);
    if (!serial) throw new InventoryError("NOT_FOUND", `serial not found: ${serialId}`);
    return this.stateFor(tenantId).moves.filter((m) => m.serialIds?.includes(serialId));
  }

  // ─── Physical count → approved adjust ────────────────────────────────────

  createPhysicalCount(input: {
    tenantId: TenantId;
    warehouseId: string;
    locationId: string;
    productSku: string;
    countedQty: number;
    actorId: string;
  }): PhysicalCount {
    this.requireWarehouse(input.tenantId, input.warehouseId);
    const loc = this.requireLocation(input.tenantId, input.locationId);
    if (loc.warehouseId !== input.warehouseId) {
      throw new InventoryError("CONFLICT", "location does not belong to warehouse");
    }
    this.requireProduct(input.tenantId, input.productSku);
    if (input.countedQty < 0 || !Number.isFinite(input.countedQty)) {
      throw new InventoryError("INVALID_QTY", "countedQty must be a non-negative finite number");
    }
    const count: PhysicalCount = {
      id: randomUUID(),
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      productSku: input.productSku,
      countedQty: input.countedQty,
      status: "draft",
      createdAt: new Date().toISOString(),
      submittedAt: null,
      approvedAt: null,
      adjustMoveId: null,
      actorId: input.actorId,
    };
    this.stateFor(input.tenantId).physicalCounts.set(count.id, count);
    this.registerOwner(count.id, input.tenantId);
    this.audit(input.tenantId, "physical_count_draft", `id=${count.id} counted=${count.countedQty}`);
    return { ...count };
  }

  submitPhysicalCount(input: { tenantId: TenantId; physicalCountId: string }): PhysicalCount {
    this.assertEntityOwner(input.tenantId, input.physicalCountId, "physical_count");
    const count = this.stateFor(input.tenantId).physicalCounts.get(input.physicalCountId);
    if (!count) throw new InventoryError("NOT_FOUND", `physical count not found: ${input.physicalCountId}`);
    if (count.tenantId !== input.tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to physical count denied");
    }
    if (count.status !== "draft") {
      throw new InventoryError("INVALID_STATE", `cannot submit physical count from status=${count.status}`);
    }
    count.status = "submitted";
    count.submittedAt = new Date().toISOString();
    this.audit(input.tenantId, "physical_count_submitted", `id=${count.id}`);
    return { ...count };
  }

  /**
   * Approve a submitted physical count and post the immutable adjust move.
   * Adjustments NEVER post without this approval path.
   */
  approvePhysicalCount(input: {
    tenantId: TenantId;
    physicalCountId: string;
    actorId: string;
    idempotencyKey: string;
  }): { count: PhysicalCount; move: StockMove | null; systemQty: number; delta: number } {
    this.assertEntityOwner(input.tenantId, input.physicalCountId, "physical_count");
    const state = this.stateFor(input.tenantId);
    const count = state.physicalCounts.get(input.physicalCountId);
    if (!count) throw new InventoryError("NOT_FOUND", `physical count not found: ${input.physicalCountId}`);
    if (count.tenantId !== input.tenantId) {
      throw new InventoryError("TENANT_MISMATCH", "cross-tenant access to physical count denied");
    }
    if (count.status === "approved" && count.adjustMoveId) {
      const existing = state.movesById.get(count.adjustMoveId) ?? null;
      const systemQty = this.getBalance(input.tenantId, count.locationId, count.productSku).available;
      return { count: { ...count }, move: existing, systemQty, delta: 0 };
    }
    if (count.status !== "submitted") {
      throw new InventoryError("INVALID_STATE", `cannot approve physical count from status=${count.status}`);
    }

    const bal = this.getBalance(input.tenantId, count.locationId, count.productSku);
    // System qty for variance = available + reserved (on-hand at location).
    const systemQty = bal.available + bal.reserved;
    const delta = count.countedQty - systemQty;

    let move: StockMove | null = null;
    if (delta !== 0) {
      move = this.appendMove(input.tenantId, {
        type: "adjust",
        productSku: count.productSku,
        fromLocId: delta < 0 ? count.locationId : null,
        toLocId: delta > 0 ? count.locationId : null,
        qty: Math.abs(delta),
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        reason: `physical_count_adjust count=${count.id}`,
        physicalCountId: count.id,
        approvedAdjust: true,
      });
      count.adjustMoveId = move.id;
    }

    count.status = "approved";
    count.approvedAt = new Date().toISOString();
    this.audit(
      input.tenantId,
      "physical_count_approved",
      `id=${count.id} system=${systemQty} counted=${count.countedQty} delta=${delta}`,
    );
    return { count: { ...count }, move, systemQty, delta };
  }

  getPhysicalCount(tenantId: TenantId, physicalCountId: string): PhysicalCount | null {
    this.assertEntityOwner(tenantId, physicalCountId, "physical_count");
    const count = this.stateFor(tenantId).physicalCounts.get(physicalCountId);
    return count ? { ...count } : null;
  }

  /** Direct adjust without approval — always rejected (API clarity for callers/tests). */
  adjustUnauthorized(input: {
    tenantId: TenantId;
    productSku: string;
    locationId: string;
    qty: number;
    actorId: string;
    idempotencyKey: string;
  }): never {
    this.appendMove(input.tenantId, {
      type: "adjust",
      productSku: input.productSku,
      fromLocId: null,
      toLocId: input.locationId,
      qty: input.qty,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      reason: "unauthorized",
      approvedAdjust: false,
    });
    throw new InventoryError("APPROVAL_REQUIRED", "unreachable");
  }

  // ─── Min stock ───────────────────────────────────────────────────────────

  setMinStockRule(input: {
    tenantId: TenantId;
    sku: string;
    warehouseId: string;
    minQty: number;
  }): MinStockRule {
    this.requireProduct(input.tenantId, input.sku);
    this.requireWarehouse(input.tenantId, input.warehouseId);
    if (input.minQty < 0 || !Number.isFinite(input.minQty)) {
      throw new InventoryError("INVALID_QTY", "minQty must be a non-negative finite number");
    }
    const state = this.stateFor(input.tenantId);
    const existing = [...state.minStockRules.values()].find(
      (r) => r.sku === input.sku && r.warehouseId === input.warehouseId,
    );
    if (existing) {
      existing.minQty = input.minQty;
      this.audit(input.tenantId, "min_stock_rule_updated", `id=${existing.id} min=${existing.minQty}`);
      return { ...existing };
    }
    const rule: MinStockRule = {
      id: randomUUID(),
      tenantId: input.tenantId,
      sku: input.sku,
      warehouseId: input.warehouseId,
      minQty: input.minQty,
    };
    state.minStockRules.set(rule.id, rule);
    this.registerOwner(rule.id, input.tenantId);
    this.audit(input.tenantId, "min_stock_rule_created", `id=${rule.id} sku=${rule.sku} min=${rule.minQty}`);
    return { ...rule };
  }

  listMinStockRules(tenantId: TenantId): MinStockRule[] {
    return [...this.stateFor(tenantId).minStockRules.values()].map((r) => ({ ...r }));
  }

  listAlerts(tenantId: TenantId): MinStockAlert[] {
    const state = this.stateFor(tenantId);
    const alerts: MinStockAlert[] = [];
    for (const rule of state.minStockRules.values()) {
      const availableQty = this.warehouseAvailable(tenantId, rule.warehouseId, rule.sku);
      if (availableQty < rule.minQty) {
        alerts.push({
          ruleId: rule.id,
          tenantId,
          sku: rule.sku,
          warehouseId: rule.warehouseId,
          minQty: rule.minQty,
          availableQty,
        });
      }
    }
    return alerts;
  }

  listAuditLog(tenantId: TenantId): readonly AuditEntry[] {
    return this.stateFor(tenantId).auditLog;
  }
}

let coreSingleton: InventoryWarehousesCore | undefined;

export function getInventoryWarehousesCore(): InventoryWarehousesCore {
  if (!coreSingleton) coreSingleton = new InventoryWarehousesCore();
  return coreSingleton;
}

export function resetInventoryWarehousesCoreForTests(): void {
  coreSingleton?.reset();
  coreSingleton = undefined;
}

/**
 * Integrity check: tenant isolation, non-negative balances, immutable moves,
 * adjust-requires-approval, and over-reserve rejection.
 */
export function assertInventoryCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const core = new InventoryWarehousesCore();

  const productA = core.createProduct({
    tenantId: "integrity-tenant-a",
    sku: "SKU-A",
    name: "Widget A",
    uom: "ea",
  });
  const whA = core.createWarehouse({ tenantId: "integrity-tenant-a", code: "WH-A", name: "A" });
  const locA = core.createLocation({
    tenantId: "integrity-tenant-a",
    warehouseId: whA.id,
    code: "A-01",
  });

  core.createProduct({
    tenantId: "integrity-tenant-b",
    sku: "SKU-B",
    name: "Widget B",
    uom: "ea",
  });
  const whB = core.createWarehouse({ tenantId: "integrity-tenant-b", code: "WH-B", name: "B" });
  const locB = core.createLocation({
    tenantId: "integrity-tenant-b",
    warehouseId: whB.id,
    code: "B-01",
  });

  core.receive({
    tenantId: "integrity-tenant-a",
    productSku: productA.sku,
    toLocId: locA.id,
    qty: 10,
    actorId: "integrity",
    idempotencyKey: "integrity-recv-1",
  });

  // Tenant B must not see tenant A stock
  if (core.listBalances("integrity-tenant-b").length !== 0) {
    violations.push("tenant_isolation_balance_leak");
  }
  if (core.listProducts("integrity-tenant-b").some((p) => p.sku === "SKU-A")) {
    violations.push("tenant_isolation_product_leak");
  }

  try {
    core.getBalance("integrity-tenant-b", locA.id, "SKU-B");
    violations.push("tenant_mismatch_read_did_not_throw");
  } catch (err) {
    if (!(err instanceof InventoryError) || err.code !== "TENANT_MISMATCH") {
      violations.push("tenant_mismatch_read_wrong_code");
    }
  }

  try {
    core.receive({
      tenantId: "integrity-tenant-b",
      productSku: "SKU-B",
      toLocId: locA.id,
      qty: 1,
      actorId: "integrity",
      idempotencyKey: "integrity-cross-recv",
    });
    violations.push("tenant_mismatch_mutate_did_not_throw");
  } catch (err) {
    if (!(err instanceof InventoryError) || err.code !== "TENANT_MISMATCH") {
      violations.push("tenant_mismatch_mutate_wrong_code");
    }
  }

  // Over-reserve rejected
  try {
    core.reserve({
      tenantId: "integrity-tenant-a",
      productSku: productA.sku,
      locationId: locA.id,
      qty: 999,
      orderRef: "ORD-OVER",
      actorId: "integrity",
      idempotencyKey: "integrity-over-reserve",
    });
    violations.push("over_reserve_did_not_throw");
  } catch (err) {
    if (!(err instanceof InventoryError) || err.code !== "INSUFFICIENT_STOCK") {
      violations.push("over_reserve_wrong_code");
    }
  }

  // Adjust without approval rejected
  try {
    core.adjustUnauthorized({
      tenantId: "integrity-tenant-a",
      productSku: productA.sku,
      locationId: locA.id,
      qty: 1,
      actorId: "integrity",
      idempotencyKey: "integrity-bad-adjust",
    });
    violations.push("unapproved_adjust_did_not_throw");
  } catch (err) {
    if (!(err instanceof InventoryError) || err.code !== "APPROVAL_REQUIRED") {
      violations.push("unapproved_adjust_wrong_code");
    }
  }

  // Immutable move
  const moves = core.listMoves("integrity-tenant-a");
  if (moves.length < 1) {
    violations.push("expected_receive_move");
  } else {
    const move = moves[0]!;
    try {
      (move as { qty: number }).qty = 999;
      if (move.qty === 999) violations.push("stock_move_mutated");
    } catch {
      // freeze may throw in strict mode — ok
    }
    if (move.qty !== 10) violations.push("stock_move_not_immutable");
  }

  // Non-negative balances
  for (const bal of core.listBalances("integrity-tenant-a")) {
    if (bal.available < 0 || bal.reserved < 0 || bal.inTransit < 0) {
      violations.push("negative_balance");
    }
  }

  // Idempotent receive
  const m1 = core.receive({
    tenantId: "integrity-tenant-a",
    productSku: productA.sku,
    toLocId: locA.id,
    qty: 5,
    actorId: "integrity",
    idempotencyKey: "integrity-idem-recv",
  });
  const m2 = core.receive({
    tenantId: "integrity-tenant-a",
    productSku: productA.sku,
    toLocId: locA.id,
    qty: 5,
    actorId: "integrity",
    idempotencyKey: "integrity-idem-recv",
  });
  if (m1.id !== m2.id) violations.push("idempotency_broken");
  const balAfter = core.getBalance("integrity-tenant-a", locA.id, productA.sku);
  if (balAfter.available !== 15) violations.push("idempotent_receive_double_applied");

  // locB unused except ensuring B state exists
  void locB;

  return { ok: violations.length === 0, violations };
}

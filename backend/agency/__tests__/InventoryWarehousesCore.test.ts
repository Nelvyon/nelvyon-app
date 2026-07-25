import { beforeEach, describe, expect, it } from "vitest";
import {
  InventoryError,
  InventoryWarehousesCore,
  assertInventoryCoreIntegrity,
  getInventoryWarehousesCore,
  resetInventoryWarehousesCoreForTests,
} from "../InventoryWarehousesCore";

describe("InventoryWarehousesCore — Block 27", () => {
  let core: InventoryWarehousesCore;
  const tenantA = "tenant-a";
  const tenantB = "tenant-b";
  const actor = "actor-1";

  beforeEach(() => {
    core = new InventoryWarehousesCore();
  });

  function seedWarehouse(tenantId: string, sku = "SKU-1") {
    core.createProduct({
      tenantId,
      sku,
      name: `Product ${sku}`,
      uom: "ea",
      variants: [{ sku: `${sku}-RED`, attrs: { color: "red" } }],
    });
    const wh = core.createWarehouse({ tenantId, code: `WH-${tenantId}`, name: "Main" });
    const loc1 = core.createLocation({ tenantId, warehouseId: wh.id, code: "A-01" });
    const loc2 = core.createLocation({ tenantId, warehouseId: wh.id, code: "A-02" });
    return { wh, loc1, loc2, sku };
  }

  it("receive → reserve → pick → transfer → return happy path", () => {
    const { loc1, loc2, sku } = seedWarehouse(tenantA);

    const recv = core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 100,
      actorId: actor,
      idempotencyKey: "recv-1",
    });
    expect(recv.type).toBe("receive");
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(100);

    const { reservation, move: reserveMove } = core.reserve({
      tenantId: tenantA,
      productSku: sku,
      locationId: loc1.id,
      qty: 30,
      orderRef: "ORD-100",
      actorId: actor,
      idempotencyKey: "rsv-1",
    });
    expect(reserveMove.type).toBe("reserve");
    expect(reservation.status).toBe("held");
    expect(core.getBalance(tenantA, loc1.id, sku)).toMatchObject({ available: 70, reserved: 30 });

    const pick = core.pick({
      tenantId: tenantA,
      productSku: sku,
      fromLocId: loc1.id,
      qty: 30,
      actorId: actor,
      idempotencyKey: "pick-1",
      reservationId: reservation.id,
      orderRef: "ORD-100",
      traceRef: "sale:ORD-100",
    });
    expect(pick.type).toBe("pick");
    expect(core.getReservation(tenantA, reservation.id)?.status).toBe("consumed");
    expect(core.getBalance(tenantA, loc1.id, sku)).toMatchObject({ available: 70, reserved: 0 });

    const xfer = core.transfer({
      tenantId: tenantA,
      productSku: sku,
      fromLocId: loc1.id,
      toLocId: loc2.id,
      qty: 20,
      actorId: actor,
      idempotencyKey: "xfer-1",
    });
    expect(xfer.type).toBe("transfer");
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(50);
    expect(core.getBalance(tenantA, loc2.id, sku).available).toBe(20);

    const ret = core.returnStock({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 5,
      actorId: actor,
      idempotencyKey: "ret-1",
      orderRef: "ORD-100",
      traceRef: "return:ORD-100",
    });
    expect(ret.type).toBe("return");
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(55);

    const types = core.listMoves(tenantA).map((m) => m.type);
    expect(types).toEqual(["receive", "reserve", "pick", "transfer", "return"]);
    expect(core.listAuditLog(tenantA).length).toBeGreaterThanOrEqual(5);
  });

  it("lots/serials traceability chain purchase → sale → return", () => {
    const { loc1, sku } = seedWarehouse(tenantA);
    const lot = core.createLot({
      tenantId: tenantA,
      code: "LOT-2026-01",
      productSku: sku,
      expiryDate: "2027-01-01",
    });
    const serial = core.createSerial({ tenantId: tenantA, code: "SN-001", productSku: sku });

    core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 1,
      actorId: actor,
      idempotencyKey: "purchase-1",
      lotId: lot.id,
      serialIds: [serial.id],
      traceRef: "purchase:PO-9",
      reason: "purchase receipt",
    });

    const { reservation } = core.reserve({
      tenantId: tenantA,
      productSku: sku,
      locationId: loc1.id,
      qty: 1,
      orderRef: "ORD-SALE-1",
      actorId: actor,
      idempotencyKey: "rsv-sale-1",
    });

    core.pick({
      tenantId: tenantA,
      productSku: sku,
      fromLocId: loc1.id,
      qty: 1,
      actorId: actor,
      idempotencyKey: "sale-pick-1",
      reservationId: reservation.id,
      lotId: lot.id,
      serialIds: [serial.id],
      orderRef: "ORD-SALE-1",
      traceRef: "sale:ORD-SALE-1",
    });

    core.returnStock({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 1,
      actorId: actor,
      idempotencyKey: "sale-return-1",
      lotId: lot.id,
      serialIds: [serial.id],
      orderRef: "ORD-SALE-1",
      traceRef: "return:ORD-SALE-1",
    });

    const lotChain = core.traceLot(tenantA, lot.id);
    expect(lotChain.map((m) => m.type)).toEqual(["receive", "pick", "return"]);
    expect(lotChain.map((m) => m.traceRef)).toEqual([
      "purchase:PO-9",
      "sale:ORD-SALE-1",
      "return:ORD-SALE-1",
    ]);

    const serialChain = core.traceSerial(tenantA, serial.id);
    expect(serialChain.map((m) => m.type)).toEqual(["receive", "pick", "return"]);
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(1);
  });

  it("raises min stock alert when warehouse available < minQty", () => {
    const { wh, loc1, sku } = seedWarehouse(tenantA);
    core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 5,
      actorId: actor,
      idempotencyKey: "recv-min",
    });
    core.setMinStockRule({ tenantId: tenantA, sku, warehouseId: wh.id, minQty: 10 });

    const alerts = core.listAlerts(tenantA);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ sku, minQty: 10, availableQty: 5 });

    core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 10,
      actorId: actor,
      idempotencyKey: "recv-min-2",
    });
    expect(core.listAlerts(tenantA)).toHaveLength(0);
  });

  it("rejects over-reserve (cannot reserve more than available)", () => {
    const { loc1, sku } = seedWarehouse(tenantA);
    core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 10,
      actorId: actor,
      idempotencyKey: "recv-or",
    });

    expect(() =>
      core.reserve({
        tenantId: tenantA,
        productSku: sku,
        locationId: loc1.id,
        qty: 11,
        orderRef: "ORD-OVER",
        actorId: actor,
        idempotencyKey: "rsv-over",
      }),
    ).toThrow(InventoryError);

    try {
      core.reserve({
        tenantId: tenantA,
        productSku: sku,
        locationId: loc1.id,
        qty: 11,
        orderRef: "ORD-OVER",
        actorId: actor,
        idempotencyKey: "rsv-over-2",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryError);
      expect((err as InventoryError).code).toBe("INSUFFICIENT_STOCK");
    }

    // Concurrent: first reserve takes 8, second for 3 ok, third for 1 fails
    core.reserve({
      tenantId: tenantA,
      productSku: sku,
      locationId: loc1.id,
      qty: 8,
      orderRef: "ORD-1",
      actorId: actor,
      idempotencyKey: "rsv-c1",
    });
    core.reserve({
      tenantId: tenantA,
      productSku: sku,
      locationId: loc1.id,
      qty: 2,
      orderRef: "ORD-2",
      actorId: actor,
      idempotencyKey: "rsv-c2",
    });
    expect(() =>
      core.reserve({
        tenantId: tenantA,
        productSku: sku,
        locationId: loc1.id,
        qty: 1,
        orderRef: "ORD-3",
        actorId: actor,
        idempotencyKey: "rsv-c3",
      }),
    ).toThrow(/cannot reserve more than available/);
    expect(core.getBalance(tenantA, loc1.id, sku)).toMatchObject({ available: 0, reserved: 10 });
  });

  it("double idempotent receive returns same move and does not double stock", () => {
    const { loc1, sku } = seedWarehouse(tenantA);
    const m1 = core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 25,
      actorId: actor,
      idempotencyKey: "idem-recv",
    });
    const m2 = core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 25,
      actorId: actor,
      idempotencyKey: "idem-recv",
    });
    expect(m2.id).toBe(m1.id);
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(25);
    expect(core.listMoves(tenantA, { type: "receive" })).toHaveLength(1);
  });

  it("physical count draft → submitted → approved posts adjust", () => {
    const { wh, loc1, sku } = seedWarehouse(tenantA);
    core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 40,
      actorId: actor,
      idempotencyKey: "recv-pc",
    });

    try {
      core.adjustUnauthorized({
        tenantId: tenantA,
        productSku: sku,
        locationId: loc1.id,
        qty: 1,
        actorId: actor,
        idempotencyKey: "bad-adj",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryError);
      expect((err as InventoryError).code).toBe("APPROVAL_REQUIRED");
    }

    const draft = core.createPhysicalCount({
      tenantId: tenantA,
      warehouseId: wh.id,
      locationId: loc1.id,
      productSku: sku,
      countedQty: 37,
      actorId: actor,
    });
    expect(draft.status).toBe("draft");

    expect(() =>
      core.approvePhysicalCount({
        tenantId: tenantA,
        physicalCountId: draft.id,
        actorId: actor,
        idempotencyKey: "pc-adj-early",
      }),
    ).toThrow(InventoryError);

    const submitted = core.submitPhysicalCount({ tenantId: tenantA, physicalCountId: draft.id });
    expect(submitted.status).toBe("submitted");

    const approved = core.approvePhysicalCount({
      tenantId: tenantA,
      physicalCountId: draft.id,
      actorId: actor,
      idempotencyKey: "pc-adj-1",
    });
    expect(approved.count.status).toBe("approved");
    expect(approved.delta).toBe(-3);
    expect(approved.move?.type).toBe("adjust");
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(37);

    // Positive variance
    const draft2 = core.createPhysicalCount({
      tenantId: tenantA,
      warehouseId: wh.id,
      locationId: loc1.id,
      productSku: sku,
      countedQty: 40,
      actorId: actor,
    });
    core.submitPhysicalCount({ tenantId: tenantA, physicalCountId: draft2.id });
    const up = core.approvePhysicalCount({
      tenantId: tenantA,
      physicalCountId: draft2.id,
      actorId: actor,
      idempotencyKey: "pc-adj-2",
    });
    expect(up.delta).toBe(3);
    expect(core.getBalance(tenantA, loc1.id, sku).available).toBe(40);
  });

  it("cross-tenant isolation A/B: read + mutate hard-fail TENANT_MISMATCH", () => {
    const a = seedWarehouse(tenantA, "SKU-A");
    const b = seedWarehouse(tenantB, "SKU-B");

    core.receive({
      tenantId: tenantA,
      productSku: a.sku,
      toLocId: a.loc1.id,
      qty: 50,
      actorId: actor,
      idempotencyKey: "recv-a",
    });
    core.receive({
      tenantId: tenantB,
      productSku: b.sku,
      toLocId: b.loc1.id,
      qty: 7,
      actorId: actor,
      idempotencyKey: "recv-b",
    });

    // Read: A never sees B stock
    expect(core.listBalances(tenantA).every((bal) => bal.tenantId === tenantA)).toBe(true);
    expect(core.listBalances(tenantB).every((bal) => bal.tenantId === tenantB)).toBe(true);
    expect(core.listProducts(tenantA).map((p) => p.sku)).toEqual(["SKU-A"]);
    expect(core.listProducts(tenantB).map((p) => p.sku)).toEqual(["SKU-B"]);
    expect(core.listMoves(tenantA)).toHaveLength(1);
    expect(core.listMoves(tenantB)).toHaveLength(1);
    expect(core.getBalance(tenantA, a.loc1.id, a.sku).available).toBe(50);
    expect(core.getBalance(tenantB, b.loc1.id, b.sku).available).toBe(7);

    // Mutate: B cannot receive into A's location
    try {
      core.receive({
        tenantId: tenantB,
        productSku: b.sku,
        toLocId: a.loc1.id,
        qty: 1,
        actorId: actor,
        idempotencyKey: "cross-recv",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryError);
      expect((err as InventoryError).code).toBe("TENANT_MISMATCH");
    }

    // Read: B cannot getBalance on A's location
    try {
      core.getBalance(tenantB, a.loc1.id, b.sku);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryError);
      expect((err as InventoryError).code).toBe("TENANT_MISMATCH");
    }

    // Mutate: A cannot pick from B's location
    try {
      core.pick({
        tenantId: tenantA,
        productSku: a.sku,
        fromLocId: b.loc1.id,
        qty: 1,
        actorId: actor,
        idempotencyKey: "cross-pick",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InventoryError);
      expect((err as InventoryError).code).toBe("TENANT_MISMATCH");
    }

    // Stock unchanged after failed cross-tenant attempts
    expect(core.getBalance(tenantA, a.loc1.id, a.sku).available).toBe(50);
    expect(core.getBalance(tenantB, b.loc1.id, b.sku).available).toBe(7);
  });

  it("stock moves are immutable after append", () => {
    const { loc1, sku } = seedWarehouse(tenantA);
    const move = core.receive({
      tenantId: tenantA,
      productSku: sku,
      toLocId: loc1.id,
      qty: 3,
      actorId: actor,
      idempotencyKey: "imm-1",
    });
    expect(Object.isFrozen(move)).toBe(true);
    expect(() => {
      (move as { qty: number }).qty = 99;
    }).toThrow();
    expect(core.getMove(tenantA, move.id)?.qty).toBe(3);
  });

  it("requires tenantId", () => {
    expect(() => core.createProduct({ tenantId: "", sku: "X", name: "x", uom: "ea" })).toThrow(
      InventoryError,
    );
  });

  it("passes assertInventoryCoreIntegrity", () => {
    expect(assertInventoryCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("singleton helper can be reset for tests", () => {
    resetInventoryWarehousesCoreForTests();
    const a = getInventoryWarehousesCore();
    a.createProduct({ tenantId: tenantA, sku: "S", name: "S", uom: "ea" });
    expect(getInventoryWarehousesCore().getProduct(tenantA, "S")?.sku).toBe("S");
    resetInventoryWarehousesCoreForTests();
    expect(getInventoryWarehousesCore().getProduct(tenantA, "S")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { InventoryWarehousesCore } from "../InventoryWarehousesCore";
import { ManufacturingOpsCore } from "../ManufacturingOpsCore";
import { ProjectsFieldServiceCore } from "../ProjectsFieldServiceCore";
import { PurchasesSuppliersCore } from "../PurchasesSuppliersCore";
import { withPurchasesPersistence } from "../erp/ErpPersistentRuntime";

describe("ERP core persistence roundtrip — all 4 domains (no DB)", () => {
  it("PurchasesSuppliersCore: create supplier → export → import", () => {
    const src = new PurchasesSuppliersCore();
    const supplier = src.createSupplier({
      tenantId: "rt-purchases",
      actorId: "buyer",
      name: "Vendor Alpha",
      category: "components",
    });
    const snap = JSON.parse(JSON.stringify(src.exportTenantSnapshot("rt-purchases")));

    const dst = new PurchasesSuppliersCore();
    dst.importTenantSnapshot("rt-purchases", snap);
    const listed = dst.listSuppliers("rt-purchases");
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(supplier.id);
    expect(listed[0].name).toBe("Vendor Alpha");
  });

  it("InventoryWarehousesCore: product + receive → export → import", () => {
    const src = new InventoryWarehousesCore();
    const tenantId = "rt-inventory";
    src.createProduct({ tenantId, sku: "SKU-RT", name: "Widget", uom: "ea" });
    const wh = src.createWarehouse({ tenantId, code: "WH1", name: "Main" });
    const loc = src.createLocation({ tenantId, warehouseId: wh.id, code: "A-01" });
    const move = src.receive({
      tenantId,
      productSku: "SKU-RT",
      toLocId: loc.id,
      qty: 25,
      actorId: "recv",
      idempotencyKey: "rt-recv-1",
    });

    const snap = JSON.parse(JSON.stringify(src.exportTenantSnapshot(tenantId)));
    const dst = new InventoryWarehousesCore();
    dst.importTenantSnapshot(tenantId, snap);

    expect(dst.getProduct(tenantId, "SKU-RT")?.name).toBe("Widget");
    expect(dst.getBalance(tenantId, loc.id, "SKU-RT").available).toBe(25);
    expect(dst.listMoves(tenantId)).toHaveLength(1);
    expect(dst.listMoves(tenantId)[0].id).toBe(move.id);
    // Imported moves stay frozen
    expect(Object.isFrozen(dst.listMoves(tenantId)[0])).toBe(true);
  });

  it("ManufacturingOpsCore: bom + mo → export → import", () => {
    const src = new ManufacturingOpsCore();
    const tenantId = "rt-mfg";
    const bom = src.createBom({
      tenantId,
      productSku: "FG-1",
      lines: [{ componentSku: "C1", qty: 2, uom: "ea" }],
    });
    src.approveBom(tenantId, bom.id);
    const mo = src.createManufacturingOrder({
      tenantId,
      bomId: bom.id,
      qty: 10,
    });

    const snap = JSON.parse(JSON.stringify(src.exportTenantSnapshot(tenantId)));
    const dst = new ManufacturingOpsCore();
    dst.importTenantSnapshot(tenantId, snap);

    expect(dst.listBoms(tenantId)).toHaveLength(1);
    expect(dst.listBoms(tenantId)[0].id).toBe(bom.id);
    expect(dst.listBoms(tenantId)[0].status).toBe("approved");
    const restoredMo = dst.getManufacturingOrder(tenantId, mo.id);
    expect(restoredMo?.qty).toBe(10);
    expect(restoredMo?.bomId).toBe(bom.id);
  });

  it("ProjectsFieldServiceCore: project + task → export → import", () => {
    const src = new ProjectsFieldServiceCore();
    const tenantId = "rt-projects";
    const project = src.createProject({
      tenantId,
      name: "Field Rollout",
    });
    const task = src.addTask({
      tenantId,
      projectId: project.id,
      title: "Site survey",
      status: "todo",
    });

    const snap = JSON.parse(JSON.stringify(src.exportTenantSnapshot(tenantId)));
    const dst = new ProjectsFieldServiceCore();
    dst.importTenantSnapshot(tenantId, snap);

    const listed = dst.listProjects(tenantId);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(project.id);
    expect(listed[0].tasks).toHaveLength(1);
    expect(listed[0].tasks[0].id).toBe(task.id);
    expect(listed[0].tasks[0].title).toBe("Site survey");
  });
});

describe("withPurchasesPersistence — in-memory fallback (no DATABASE_URL)", () => {
  it("createSupplier via withPurchasesPersistence returns supplier when DB absent", async () => {
    const prev = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const tenantId = `rt-persist-mem-${Date.now()}`;
      const supplier = await withPurchasesPersistence(tenantId, (core) =>
        core.createSupplier({
          tenantId,
          actorId: "buyer",
          name: "Mem Vendor",
          category: "smoke",
        }),
      );
      expect(supplier.name).toBe("Mem Vendor");
      const listed = await withPurchasesPersistence(tenantId, (core) =>
        core.listSuppliers(tenantId),
      );
      expect(listed.some((s) => s.id === supplier.id)).toBe(true);
    } finally {
      if (prev !== undefined) process.env.DATABASE_URL = prev;
    }
  });
});

const hasDb = Boolean((process.env.DATABASE_URL ?? "").trim());

(hasDb ? describe : describe.skip)("withPurchasesPersistence — optional DB roundtrip", () => {
  it("create supplier → reload via withPurchasesPersistence when DATABASE_URL is set", async () => {
    const tenantId = `rt-persist-db-${Date.now()}`;
    const name = `DB Vendor ${Date.now()}`;

    const supplier = await withPurchasesPersistence(tenantId, (core) =>
      core.createSupplier({
        tenantId,
        actorId: "buyer",
        name,
        category: "db-smoke",
      }),
    );
    expect(supplier.id).toBeTruthy();

    const listed = await withPurchasesPersistence(tenantId, (core) =>
      core.listSuppliers(tenantId),
    );
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(supplier.id);
    expect(listed[0].name).toBe(name);
  });
});

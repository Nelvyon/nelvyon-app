import { describe, expect, it } from "vitest";
import {
  PurchasesSuppliersCore,
  type PurchasesTenantSnapshot,
} from "../PurchasesSuppliersCore";

describe("ErpDomainSnapshotStore — core export/import (no DB)", () => {
  it("PurchasesSuppliersCore export/import roundtrip restores supplier state", () => {
    const core = new PurchasesSuppliersCore();
    const supplier = core.createSupplier({
      tenantId: "snap-tenant",
      actorId: "u1",
      name: "Acme Parts",
      category: "hardware",
      paymentTermsNote: "Net 30",
    });

    const snapshot = core.exportTenantSnapshot("snap-tenant");
    expect(snapshot.suppliers[supplier.id]?.name).toBe("Acme Parts");
    expect(Object.keys(snapshot.purchaseOrders)).toHaveLength(0);

    // JSON roundtrip proves serializability
    const wire = JSON.parse(JSON.stringify(snapshot)) as PurchasesTenantSnapshot;

    const restored = new PurchasesSuppliersCore();
    restored.importTenantSnapshot("snap-tenant", wire);

    const listed = restored.listSuppliers("snap-tenant");
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(supplier.id);
    expect(listed[0].name).toBe("Acme Parts");
    expect(listed[0].category).toBe("hardware");

    // Other tenants stay empty / isolated
    expect(restored.listSuppliers("other-tenant")).toHaveLength(0);

    // Missing tenant exports empty structure
    const empty = core.exportTenantSnapshot("missing-tenant");
    expect(Object.keys(empty.suppliers)).toHaveLength(0);
    expect(empty.auditLog).toEqual([]);
  });

  it("importTenantSnapshot replaces prior tenant state", () => {
    const core = new PurchasesSuppliersCore();
    core.createSupplier({
      tenantId: "t1",
      actorId: "u1",
      name: "Old Co",
      category: "a",
    });
    const snap = new PurchasesSuppliersCore();
    const fresh = snap.createSupplier({
      tenantId: "t1",
      actorId: "u1",
      name: "New Co",
      category: "b",
    });
    core.importTenantSnapshot("t1", snap.exportTenantSnapshot("t1"));
    const listed = core.listSuppliers("t1");
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(fresh.id);
    expect(listed[0].name).toBe("New Co");
  });
});

const hasDb = Boolean((process.env.DATABASE_URL ?? "").trim());

(hasDb ? describe : describe.skip)("ErpDomainSnapshotStore — optional DB integration", () => {
  it("load/saveSnapshot optimistic version roundtrip when DATABASE_URL is set", async () => {
    // Lazy import so unit runs without requiring DbClient when skipped.
    const { DbClient } = await import("../../db/DbClient");
    const { ErpDomainSnapshotStore, ErpSnapshotConflictError } = await import(
      "../erp/ErpDomainSnapshotStore"
    );

    const store = new ErpDomainSnapshotStore(DbClient.getInstance());
    const tenantId = `erp-snap-test-${Date.now()}`;
    const domain = "purchases" as const;

    const loaded = await store.loadSnapshot(tenantId, domain);
    expect(loaded).toBeNull();

    const v1 = await store.saveSnapshot(tenantId, domain, { hello: "world" }, 0);
    expect(v1).toBe(1);

    const after = await store.loadSnapshot(tenantId, domain);
    expect(after?.version).toBe(1);
    expect(after?.payload).toEqual({ hello: "world" });

    await expect(store.saveSnapshot(tenantId, domain, { stale: true }, 0)).rejects.toBeInstanceOf(
      ErpSnapshotConflictError,
    );

    const v2 = await store.saveSnapshot(tenantId, domain, { hello: "updated" }, 1);
    expect(v2).toBe(2);
  });
});

/**
 * ERP persistent runtime — load domain snapshot → mutate in-core → save.
 *
 * When DATABASE_URL is missing, falls back to in-memory singleton cores
 * (unit-test friendly; no Postgres required).
 */

import { DbClient } from "../../db/DbClient";
import {
  InventoryWarehousesCore,
  getInventoryWarehousesCore,
} from "../InventoryWarehousesCore";
import {
  ManufacturingOpsCore,
  getManufacturingOpsCore,
} from "../ManufacturingOpsCore";
import {
  ProjectsFieldServiceCore,
  getProjectsFieldServiceCore,
} from "../ProjectsFieldServiceCore";
import {
  PurchasesSuppliersCore,
  getPurchasesSuppliersCore,
} from "../PurchasesSuppliersCore";
import {
  ErpDomainSnapshotStore,
  getErpDomainSnapshotStore,
  type ErpDomain,
} from "./ErpDomainSnapshotStore";

function hasDatabaseUrl(): boolean {
  const url = (process.env.DATABASE_URL ?? "").trim();
  return url.length > 0;
}

function getStore(): ErpDomainSnapshotStore {
  // Ensure DbClient is constructible when URL is present.
  void DbClient.getInstance();
  return getErpDomainSnapshotStore();
}

async function withDomainPersistence<TCore, T>(
  tenantId: string,
  domain: ErpDomain,
  createCore: () => TCore,
  getMemoryCore: () => TCore,
  importSnap: (core: TCore, tenantId: string, snapshot: object) => void,
  exportSnap: (core: TCore, tenantId: string) => object,
  fn: (core: TCore) => T | Promise<T>,
): Promise<T> {
  if (!hasDatabaseUrl()) {
    return await fn(getMemoryCore());
  }

  const store = getStore();
  let out!: T;
  await store.withDomainMutation(tenantId, domain, async (payload) => {
    const core = createCore();
    importSnap(core, tenantId, payload);
    out = await fn(core);
    return exportSnap(core, tenantId) as Record<string, unknown>;
  });
  return out;
}

export async function withPurchasesPersistence<T>(
  tenantId: string,
  fn: (core: PurchasesSuppliersCore) => T | Promise<T>,
): Promise<T> {
  return withDomainPersistence(
    tenantId,
    "purchases",
    () => new PurchasesSuppliersCore(),
    getPurchasesSuppliersCore,
    (core, id, snap) => core.importTenantSnapshot(id, snap),
    (core, id) => core.exportTenantSnapshot(id),
    fn,
  );
}

export async function withInventoryPersistence<T>(
  tenantId: string,
  fn: (core: InventoryWarehousesCore) => T | Promise<T>,
): Promise<T> {
  return withDomainPersistence(
    tenantId,
    "inventory",
    () => new InventoryWarehousesCore(),
    getInventoryWarehousesCore,
    (core, id, snap) => core.importTenantSnapshot(id, snap),
    (core, id) => core.exportTenantSnapshot(id),
    fn,
  );
}

export async function withManufacturingPersistence<T>(
  tenantId: string,
  fn: (core: ManufacturingOpsCore) => T | Promise<T>,
): Promise<T> {
  return withDomainPersistence(
    tenantId,
    "manufacturing",
    () => new ManufacturingOpsCore(),
    getManufacturingOpsCore,
    (core, id, snap) => core.importTenantSnapshot(id, snap),
    (core, id) => core.exportTenantSnapshot(id),
    fn,
  );
}

export async function withProjectsFsPersistence<T>(
  tenantId: string,
  fn: (core: ProjectsFieldServiceCore) => T | Promise<T>,
): Promise<T> {
  return withDomainPersistence(
    tenantId,
    "projects_fs",
    () => new ProjectsFieldServiceCore(),
    getProjectsFieldServiceCore,
    (core, id, snap) => core.importTenantSnapshot(id, snap),
    (core, id) => core.exportTenantSnapshot(id),
    fn,
  );
}

import { describe, it, expect } from "vitest";
import { SaasStoreService, SaasStoreError } from "../SaasStoreService";

type DbPort = { query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]> };

const TENANT = "tenant-1";
const PROD_ID = "prod-uuid-1";
const ORDER_ID = "order-uuid-1";

const baseProdRow = {
  id: PROD_ID, tenantId: TENANT, name: "Camiseta", description: "Algodón 100%",
  price: 29.99, currency: "EUR", type: "physical", active: true, imageUrl: null,
  sku: "CAM-001", stock: 50, slug: "camiseta", category: "Ropa", variants: null,
  salesCount: 5, createdAt: new Date().toISOString(),
};

const baseSettingsRow = {
  tenantId: TENANT, currency: "EUR", vatPct: 21, vatIncluded: true,
  shippingFee: 5, freeShippingAbove: 50, storeName: "Mi Tienda",
  storeDescription: null, updatedAt: new Date().toISOString(),
};

const baseOrderRow = {
  id: ORDER_ID, tenantId: TENANT, orderNumber: "NEL-202606-0001", status: "pending",
  customerEmail: "client@test.com", customerName: "Ana García",
  customerAddress: null, paymentIntentId: "pi_abc",
  subtotal: 59.98, vatPct: 21, vatAmount: 0, shippingFee: 0, total: 59.98,
  currency: "EUR", notes: null, paidAt: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

function makeDb(responses: Record<string, unknown[][]> = {}): DbPort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    query: async <T>(sql: string, _params?: unknown[]): Promise<T[]> => {
      const key = sql.trim().slice(0, 80);
      calls.push(key);
      for (const [k, rows] of Object.entries(responses)) {
        if (sql.toLowerCase().includes(k.toLowerCase())) return rows as T[];
      }
      return [] as T[];
    },
  };
}

// ── Product CRUD ──────────────────────────────────────────────────────────────

describe("SaasStoreService.createStoreProduct", () => {
  it("throws VALIDATION when name is empty", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.createStoreProduct(TENANT, { name: "", price: 10 })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION for negative price", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.createStoreProduct(TENANT, { name: "X", price: -1 })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("inserts product and returns StoreProduct", async () => {
    const db = makeDb({ "insert into products": [baseProdRow] });
    const svc = new SaasStoreService({ db });
    const p = await svc.createStoreProduct(TENANT, { name: "Camiseta", price: 29.99, sku: "CAM-001", stock: 50 });
    expect(p.id).toBe(PROD_ID);
    expect(p.name).toBe("Camiseta");
    expect(p.sku).toBe("CAM-001");
    expect(p.stock).toBe(50);
  });

  it("stores variant JSON", async () => {
    const variants = [{ name: "Talla M", priceModifier: 0, stock: 20 }];
    let capturedVariants: unknown;
    const db: DbPort = {
      query: async <T>(_sql: string, params?: unknown[]): Promise<T[]> => {
        capturedVariants = params?.[11];
        return [{ ...baseProdRow, variants }] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    await svc.createStoreProduct(TENANT, { name: "Camiseta", price: 29.99, variants });
    expect(capturedVariants).toBe(JSON.stringify(variants));
  });
});

describe("SaasStoreService.updateStoreProduct", () => {
  it("throws VALIDATION with no fields", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.updateStoreProduct(TENANT, PROD_ID, {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws NOT_FOUND when product absent", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.updateStoreProduct(TENANT, PROD_ID, { name: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates stock correctly", async () => {
    const db = makeDb({ "update products": [{ ...baseProdRow, stock: 99 }] });
    const svc = new SaasStoreService({ db });
    const p = await svc.updateStoreProduct(TENANT, PROD_ID, { stock: 99 });
    expect(p.stock).toBe(99);
  });

  it("updates active flag", async () => {
    const db = makeDb({ "update products": [{ ...baseProdRow, active: false }] });
    const svc = new SaasStoreService({ db });
    const p = await svc.updateStoreProduct(TENANT, PROD_ID, { active: false });
    expect(p.active).toBe(false);
  });
});

describe("SaasStoreService.deleteStoreProduct", () => {
  it("throws NOT_FOUND when product absent", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.deleteStoreProduct(TENANT, PROD_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("resolves on successful delete", async () => {
    const db = makeDb({ "delete from products": [{ id: PROD_ID }] });
    const svc = new SaasStoreService({ db });
    await expect(svc.deleteStoreProduct(TENANT, PROD_ID)).resolves.toBeUndefined();
  });
});

describe("SaasStoreService.listStoreProducts", () => {
  it("returns empty array when no products", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    const ps = await svc.listStoreProducts(TENANT);
    expect(ps).toEqual([]);
  });

  it("returns mapped products", async () => {
    const db = makeDb({ "from products": [baseProdRow] });
    const svc = new SaasStoreService({ db });
    const ps = await svc.listStoreProducts(TENANT);
    expect(ps).toHaveLength(1);
    expect(ps[0].id).toBe(PROD_ID);
    expect(ps[0].slug).toBe("camiseta");
  });

  it("passes activeOnly filter", async () => {
    let sqlCapture = "";
    const db: DbPort = { query: async <T>(sql: string): Promise<T[]> => { sqlCapture = sql; return [baseProdRow] as T[]; } };
    const svc = new SaasStoreService({ db });
    await svc.listStoreProducts(TENANT, { activeOnly: true });
    expect(sqlCapture).toContain("active = true");
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

describe("SaasStoreService.getSettings", () => {
  it("returns defaults when no row exists", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    const s = await svc.getSettings(TENANT);
    expect(s.vatPct).toBe(21);
    expect(s.currency).toBe("EUR");
    expect(s.vatIncluded).toBe(true);
  });

  it("returns stored settings", async () => {
    const db = makeDb({ "from store_settings": [baseSettingsRow] });
    const svc = new SaasStoreService({ db });
    const s = await svc.getSettings(TENANT);
    expect(s.vatPct).toBe(21);
    expect(s.shippingFee).toBe(5);
    expect(s.storeName).toBe("Mi Tienda");
  });
});

describe("SaasStoreService.updateSettings", () => {
  it("upserts settings and returns updated values", async () => {
    let upsertCalled = false;
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("insert into store_settings")) { upsertCalled = true; return [] as T[]; }
        if (sql.toLowerCase().includes("from store_settings")) return [{ ...baseSettingsRow, vatPct: 10 }] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    const s = await svc.updateSettings(TENANT, { vatPct: 10 });
    expect(upsertCalled).toBe(true);
    expect(s.vatPct).toBe(10);
  });
});

// ── Orders ────────────────────────────────────────────────────────────────────

describe("SaasStoreService.createOrder", () => {
  it("throws VALIDATION when email is missing", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.createOrder(TENANT, { customerEmail: "", items: [{ productName: "X", quantity: 1, unitPrice: 10 }] })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when items are empty", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.createOrder(TENANT, { customerEmail: "a@b.com", items: [] })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("creates order with correct subtotal and VAT (not included)", async () => {
    let insertedTotal: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("from store_settings")) return [{ ...baseSettingsRow, vatIncluded: false, vatPct: 21, shippingFee: 0, freeShippingAbove: null }] as T[];
        if (sql.toLowerCase().includes("count(*)")) return [{ count: "0" }] as T[];
        if (sql.toLowerCase().includes("insert into store_orders")) {
          // params: [tenantId, orderNumber, email, name, addr, piId, subtotal, vatPct, vatAmount, shippingFee, total, ...]
          insertedTotal = params?.[10];
          return [{ ...baseOrderRow, vatAmount: 12.60, total: 72.58, subtotal: 60 }] as T[];
        }
        if (sql.toLowerCase().includes("insert into store_order_items")) return [] as T[];
        if (sql.toLowerCase().includes("update products")) return [] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    const order = await svc.createOrder(TENANT, {
      customerEmail: "client@test.com",
      items: [{ productName: "Camiseta", quantity: 2, unitPrice: 30 }],
    });
    // subtotal=60, vatAmount=60*0.21=12.6, total=72.6
    expect(Number(insertedTotal)).toBeCloseTo(72.6, 1);
    expect(order.orderNumber).toMatch(/^NEL-/);
  });

  it("creates order with VAT included (no extra VAT charge)", async () => {
    let insertedVatAmount: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("from store_settings")) return [{ ...baseSettingsRow, vatIncluded: true, shippingFee: 0, freeShippingAbove: null }] as T[];
        if (sql.toLowerCase().includes("count(*)")) return [{ count: "0" }] as T[];
        if (sql.toLowerCase().includes("insert into store_orders")) {
          insertedVatAmount = params?.[8];
          return [baseOrderRow] as T[];
        }
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    await svc.createOrder(TENANT, {
      customerEmail: "a@b.com",
      items: [{ productName: "P", quantity: 1, unitPrice: 50 }],
    });
    expect(Number(insertedVatAmount)).toBe(0);
  });

  it("applies free shipping above threshold", async () => {
    let insertedShipping: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("from store_settings")) return [{ ...baseSettingsRow, shippingFee: 10, freeShippingAbove: 50, vatIncluded: true, vatPct: 0 }] as T[];
        if (sql.toLowerCase().includes("count(*)")) return [{ count: "5" }] as T[];
        if (sql.toLowerCase().includes("insert into store_orders")) {
          insertedShipping = params?.[9];
          return [baseOrderRow] as T[];
        }
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    await svc.createOrder(TENANT, {
      customerEmail: "a@b.com",
      items: [{ productName: "P", quantity: 2, unitPrice: 30 }], // subtotal=60 >= 50 → free shipping
    });
    expect(Number(insertedShipping)).toBe(0);
  });

  it("generates sequential order number NEL-YYYYMM-XXXX", async () => {
    let capturedOrderNumber: unknown;
    const db: DbPort = {
      query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
        if (sql.toLowerCase().includes("from store_settings")) return [{ ...baseSettingsRow, vatIncluded: true, shippingFee: 0, freeShippingAbove: null }] as T[];
        if (sql.toLowerCase().includes("count(*)")) return [{ count: "4" }] as T[];
        if (sql.toLowerCase().includes("insert into store_orders")) {
          capturedOrderNumber = params?.[1];
          return [baseOrderRow] as T[];
        }
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    await svc.createOrder(TENANT, { customerEmail: "a@b.com", items: [{ productName: "X", quantity: 1, unitPrice: 5 }] });
    expect(String(capturedOrderNumber)).toMatch(/^NEL-\d{6}-0005$/);
  });
});

describe("SaasStoreService.updateOrderStatus", () => {
  it("throws NOT_FOUND when order absent", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    await expect(svc.updateOrderStatus(TENANT, ORDER_ID, "shipped")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sets paid_at when status=paid", async () => {
    let sqlCapture = "";
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        sqlCapture = sql;
        return [{ ...baseOrderRow, status: "paid", paidAt: new Date().toISOString() }] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    const order = await svc.updateOrderStatus(TENANT, ORDER_ID, "paid");
    expect(order.status).toBe("paid");
    expect(sqlCapture).toContain("paid_at");
  });
});

describe("SaasStoreService.handlePaymentSucceeded", () => {
  it("returns null when no pending order matches payment intent", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    const result = await svc.handlePaymentSucceeded("pi_nonexistent");
    expect(result).toBeNull();
  });

  it("marks order as paid and returns it", async () => {
    const db = makeDb({ "update store_orders": [{ ...baseOrderRow, status: "paid", paidAt: new Date().toISOString() }] });
    const svc = new SaasStoreService({ db });
    const order = await svc.handlePaymentSucceeded("pi_abc");
    expect(order?.status).toBe("paid");
    expect(order?.paidAt).not.toBeNull();
  });
});

describe("SaasStoreService.getPublicCatalog", () => {
  it("returns empty catalog for unknown subdomain", async () => {
    const svc = new SaasStoreService({ db: makeDb() });
    const cat = await svc.getPublicCatalog("unknown-subdomain");
    expect(cat.products).toHaveLength(0);
  });

  it("returns products and settings for known subdomain", async () => {
    const db: DbPort = {
      query: async <T>(sql: string): Promise<T[]> => {
        if (sql.toLowerCase().includes("from saas_tenants")) return [{ id: TENANT }] as T[];
        if (sql.toLowerCase().includes("from store_settings")) return [baseSettingsRow] as T[];
        if (sql.toLowerCase().includes("from products")) return [baseProdRow] as T[];
        return [] as T[];
      },
    };
    const svc = new SaasStoreService({ db });
    const cat = await svc.getPublicCatalog("mi-tienda");
    expect(cat.products).toHaveLength(1);
    expect(cat.settings.vatPct).toBe(21);
  });
});

// ── SaasStoreError ────────────────────────────────────────────────────────────

describe("SaasStoreError", () => {
  it("has correct name and code", () => {
    const e = new SaasStoreError("not found", "NOT_FOUND");
    expect(e.name).toBe("SaasStoreError");
    expect(e.code).toBe("NOT_FOUND");
    expect(e instanceof Error).toBe(true);
  });
});

// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetShopifyServiceForTests, ShopifyService } from "../ShopifyService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [{ user_id: UID, shop_domain: "test.myshopify.com", access_token: "SHOP_TOKEN", is_active: true }];
}

function mockDbReads() {
  return vi.fn((sql: string) => {
    if (sql.includes("integration_shopify") && sql.includes("SELECT")) return Promise.resolve(credRow());
    return Promise.resolve([]);
  });
}

function jsonResponse(obj: unknown) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
}

function buildFetchMock() {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
    const u = String(input);
    if (u.includes("/inventory_levels.json")) {
      return jsonResponse({
        inventory_levels: [
          { inventory_item_id: 9001, location_id: 1, available: 3 },
          { inventory_item_id: 9001, location_id: 2, available: 2 },
        ],
      });
    }
    if (u.includes("/products.json")) {
      return jsonResponse({
        products: [
          {
            id: 100,
            title: "Tee",
            status: "active",
            created_at: "2026-01-01T00:00:00Z",
            variants: [{ id: 501, inventory_item_id: 9001, title: "Small", sku: "T-S" }],
            images: [{ id: 1 }, { id: 2 }],
          },
        ],
      });
    }
    if (u.includes("/orders.json")) {
      return jsonResponse({
        orders: [
          {
            id: 7001,
            name: "#1001",
            total_price: "99.50",
            financial_status: "paid",
            created_at: "2026-05-01T12:00:00Z",
            line_items: [
              { title: "Widget", quantity: 2, price: "25.00" },
              { title: "Gadget", quantity: 1, price: "49.50" },
            ],
          },
        ],
      });
    }
    if (u.includes("/customers.json")) {
      return jsonResponse({
        customers: [
          {
            id: 42,
            email: "a@b.com",
            total_spent: "120.00",
            orders_count: 3,
            created_at: "2025-06-01T00:00:00Z",
          },
        ],
      });
    }
    return jsonResponse({});
  });
}

describe("ShopifyService", () => {
  beforeEach(() => {
    resetShopifyServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetShopifyServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new ShopifyService({ db: { query } });
    await svc.saveCredentials(UID, "https://STORE.myshopify.com/", "tok");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_shopify"), [
      UID,
      "store.myshopify.com",
      "tok",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new ShopifyService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.shopDomain).toBe("test.myshopify.com");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new ShopifyService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("getProducts", async () => {
    const query = mockDbReads();
    const svc = new ShopifyService({ db: { query } });
    const products = await svc.getProducts(UID, 10);
    expect(products).toHaveLength(1);
    expect(products[0]?.title).toBe("Tee");
    expect(products[0]?.variants).toBe(1);
    expect(products[0]?.images).toBe(2);
    expect(globalThis.fetch.mock.calls[0][1]?.headers?.["X-Shopify-Access-Token"]).toBe("SHOP_TOKEN");
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain("/admin/api/2024-01/products.json");
  });

  it("getOrders", async () => {
    const query = mockDbReads();
    const svc = new ShopifyService({ db: { query } });
    const orders = await svc.getOrders(UID);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.totalPrice).toBe(99.5);
    expect(orders[0]?.lineItems).toHaveLength(2);
  });

  it("getSalesSummary", async () => {
    const query = mockDbReads();
    const svc = new ShopifyService({ db: { query } });
    const s = await svc.getSalesSummary(UID);
    expect(s.totalOrders).toBe(1);
    expect(s.totalRevenue).toBe(99.5);
    expect(s.avgOrderValue).toBe(99.5);
    expect(s.topProducts[0]?.title).toBe("Widget");
    expect(s.topProducts[0]?.revenue).toBeCloseTo(50);
  });

  it("getInventory", async () => {
    const query = mockDbReads();
    const svc = new ShopifyService({ db: { query } });
    const inv = await svc.getInventory(UID);
    expect(inv).toHaveLength(1);
    expect(inv[0]?.available).toBe(5);
    expect(inv[0]?.productTitle).toBe("Tee");
    expect(globalThis.fetch.mock.calls.some((c) => String(c[0]).includes("inventory_levels"))).toBe(true);
  });

  it("getCustomers", async () => {
    const query = mockDbReads();
    const svc = new ShopifyService({ db: { query } });
    const cust = await svc.getCustomers(UID, 10);
    expect(cust[0]?.email).toBe("a@b.com");
    expect(cust[0]?.ordersCount).toBe(3);
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new ShopifyService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_shopify"), [UID]);
  });
});

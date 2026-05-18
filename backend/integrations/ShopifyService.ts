import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const API_VERSION = "2024-01";

export interface ShopifyCredentials {
  userId: string;
  shopDomain: string;
  accessToken: string;
  isActive: boolean;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  variants: number;
  images: number;
  createdAt: string;
}

export interface ShopifyOrderLineItem {
  title: string;
  quantity: number;
  price: number;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  totalPrice: number;
  financialStatus: string;
  createdAt: string;
  lineItems: ShopifyOrderLineItem[];
}

export interface ShopifySalesSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: ReadonlyArray<{ title: string; revenue: number; quantity: number }>;
}

export interface ShopifyInventoryItem {
  inventoryItemId: number;
  variantId: number;
  productId: number;
  productTitle: string;
  variantTitle: string;
  sku: string;
  available: number;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
}

export type ShopifyServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

function toNum(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number.parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeShopHost(domain: string): string {
  const t = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return t;
}

function isoUtcDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

type JsonRecord = Record<string, unknown>;

export class ShopifyService {
  constructor(private readonly deps: ShopifyServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private adminUrl(creds: ShopifyCredentials, path: string, params: Record<string, string>): string {
    const host = normalizeShopHost(creds.shopDomain);
    const url = new URL(`https://${host}/admin/api/${API_VERSION}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
    return url.toString();
  }

  private async adminGet(userId: string, path: string, params: Record<string, string>): Promise<unknown> {
    const c = await this.requireCredentials(userId);
    const url = this.adminUrl(c, path, params);
    const res = await this.fetchImpl(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": c.accessToken,
        "Content-Type": "application/json",
      },
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new OsAgentError(`Shopify returned non-JSON (HTTP ${res.status})`, "shopify_http");
    }
    if (!res.ok) {
      throw new OsAgentError(`Shopify API HTTP ${res.status}: ${text.slice(0, 400)}`, "shopify_api");
    }
    return body;
  }

  async saveCredentials(userId: string, shopDomain: string, accessToken: string): Promise<void> {
    const host = normalizeShopHost(shopDomain);
    const tok = accessToken.trim();
    if (!host || !tok) {
      throw new OsAgentError("shopDomain y accessToken son requeridos.", "shopify_validation");
    }
    await this.db.query(
      `INSERT INTO integration_shopify (user_id, shop_domain, access_token, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         shop_domain = EXCLUDED.shop_domain,
         access_token = EXCLUDED.access_token,
         is_active = true,
         updated_at = NOW()`,
      [userId, host, tok],
    );
  }

  async getCredentials(userId: string): Promise<ShopifyCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      shop_domain: string | null;
      access_token: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, shop_domain, access_token, is_active
       FROM integration_shopify
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.access_token || !r.shop_domain) return null;
    return {
      userId: r.user_id,
      shopDomain: r.shop_domain,
      accessToken: r.access_token,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<ShopifyCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Shopify is not connected for this user.", "shopify_auth");
    }
    return c;
  }

  async getProducts(userId: string, limit = 50): Promise<ShopifyProduct[]> {
    const capped = Math.max(1, Math.min(limit, 250));
    const body = (await this.adminGet(userId, "/products.json", { limit: String(capped) })) as { products?: JsonRecord[] };
    const products = body.products ?? [];
    return products.map((p) => {
      const varArr = p.variants;
      const imgArr = p.images;
      return {
        id: Math.trunc(toNum(p.id)),
        title: String(p.title ?? ""),
        status: String(p.status ?? ""),
        variants: Array.isArray(varArr) ? varArr.length : 0,
        images: Array.isArray(imgArr) ? imgArr.length : 0,
        createdAt: String(p.created_at ?? ""),
      };
    });
  }

  async getOrders(
    userId: string,
    dateRange?: { createdAtMin: string; createdAtMax: string },
  ): Promise<ShopifyOrder[]> {
    const all: ShopifyOrder[] = [];
    let sinceId = "";
    for (;;) {
      const params: Record<string, string> = {
        status: "any",
        limit: "250",
      };
      if (dateRange?.createdAtMin) params.created_at_min = dateRange.createdAtMin;
      if (dateRange?.createdAtMax) params.created_at_max = dateRange.createdAtMax;
      if (sinceId) params.since_id = sinceId;

      const body = (await this.adminGet(userId, "/orders.json", params)) as { orders?: JsonRecord[] };
      const batch = body.orders ?? [];
      if (batch.length === 0) break;

      for (const o of batch) {
        const itemsRaw = o.line_items;
        const lineItems: ShopifyOrderLineItem[] = [];
        if (Array.isArray(itemsRaw)) {
          for (const li of itemsRaw) {
            if (typeof li !== "object" || li === null) continue;
            const x = li as JsonRecord;
            lineItems.push({
              title: String(x.title ?? ""),
              quantity: Math.round(toNum(x.quantity)),
              price: toNum(x.price),
            });
          }
        }
        all.push({
          id: Math.trunc(toNum(o.id)),
          name: String(o.name ?? ""),
          totalPrice: toNum(o.total_price ?? o.current_total_price),
          financialStatus: String(o.financial_status ?? ""),
          createdAt: String(o.created_at ?? ""),
          lineItems,
        });
      }

      if (batch.length < 250) break;
      const lastOrder = batch[batch.length - 1] as JsonRecord;
      sinceId = String(Math.trunc(toNum(lastOrder.id)));
    }
    return all;
  }

  async getSalesSummary(userId: string): Promise<ShopifySalesSummary> {
    const min = isoUtcDaysAgo(30);
    const max = new Date().toISOString();
    const orders = await this.getOrders(userId, { createdAtMin: min, createdAtMax: max });
    let totalRevenue = 0;
    const productRev = new Map<string, { revenue: number; quantity: number }>();
    for (const o of orders) {
      totalRevenue += o.totalPrice;
      for (const li of o.lineItems) {
        const title = li.title || "Unknown";
        const rev = li.quantity * li.price;
        const prev = productRev.get(title) ?? { revenue: 0, quantity: 0 };
        productRev.set(title, {
          revenue: prev.revenue + rev,
          quantity: prev.quantity + li.quantity,
        });
      }
    }
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const topProducts = [...productRev.entries()]
      .map(([title, v]) => ({ title, revenue: v.revenue, quantity: v.quantity }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      topProducts,
    };
  }

  async getInventory(userId: string): Promise<ShopifyInventoryItem[]> {
    const body = (await this.adminGet(userId, "/products.json", { limit: "250" })) as { products?: JsonRecord[] };
    const products = body.products ?? [];
    type Meta = { variantId: number; productId: number; productTitle: string; variantTitle: string; sku: string };
    const byInventoryItemId = new Map<number, Meta>();
    const invItemIdSet = new Set<number>();
    for (const p of products) {
      const pid = Math.trunc(toNum(p.id));
      const ptitle = String(p.title ?? "");
      const vars = p.variants;
      if (!Array.isArray(vars)) continue;
      for (const v of vars) {
        if (typeof v !== "object" || v === null) continue;
        const vr = v as JsonRecord;
        const iid = Math.trunc(toNum(vr.inventory_item_id));
        const vid = Math.trunc(toNum(vr.id));
        if (!iid) continue;
        invItemIdSet.add(iid);
        byInventoryItemId.set(iid, {
          variantId: vid,
          productId: pid,
          productTitle: ptitle,
          variantTitle: String(vr.title ?? ""),
          sku: String(vr.sku ?? ""),
        });
      }
    }
    const inventoryItemIds = [...invItemIdSet];
    const LOW_STOCK_THRESHOLD = 10;
    const totalAvailable = new Map<number, number>();
    const chunkSize = 50;
    for (let i = 0; i < inventoryItemIds.length; i += chunkSize) {
      const chunk = inventoryItemIds.slice(i, i + chunkSize);
      const ids = chunk.join(",");
      const ilBody = (await this.adminGet(userId, "/inventory_levels.json", {
        inventory_item_ids: ids,
      })) as { inventory_levels?: JsonRecord[] };
      for (const il of ilBody.inventory_levels ?? []) {
        const iid = Math.trunc(toNum(il.inventory_item_id));
        const avail = Math.trunc(toNum(il.available));
        totalAvailable.set(iid, (totalAvailable.get(iid) ?? 0) + avail);
      }
    }
    const out: ShopifyInventoryItem[] = [];
    for (const [iid, avail] of totalAvailable) {
      if (avail >= LOW_STOCK_THRESHOLD) continue;
      const meta = byInventoryItemId.get(iid);
      if (!meta) continue;
      out.push({
        inventoryItemId: iid,
        variantId: meta.variantId,
        productId: meta.productId,
        productTitle: meta.productTitle,
        variantTitle: meta.variantTitle,
        sku: meta.sku,
        available: avail,
      });
    }
    return out;
  }

  async getCustomers(userId: string, limit = 50): Promise<ShopifyCustomer[]> {
    const capped = Math.max(1, Math.min(limit, 250));
    const body = (await this.adminGet(userId, "/customers.json", { limit: String(capped) })) as { customers?: JsonRecord[] };
    const customers = body.customers ?? [];
    return customers.map((c) => ({
      id: Math.trunc(toNum(c.id)),
      email: String(c.email ?? ""),
      totalSpent: toNum(c.total_spent),
      ordersCount: Math.round(toNum(c.orders_count)),
      createdAt: String(c.created_at ?? ""),
    }));
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_shopify SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedShopify: ShopifyService | undefined;

export function getShopifyService(): ShopifyService {
  if (!cachedShopify) cachedShopify = new ShopifyService();
  return cachedShopify;
}

export function resetShopifyServiceForTests(): void {
  cachedShopify = undefined;
}

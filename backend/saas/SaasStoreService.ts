import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

// ── Types ──────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface StoreVariant {
  name: string;
  priceModifier: number; // added to base price
  stock: number;
}

export interface StoreProduct {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: string;
  active: boolean;
  imageUrl: string | null;
  sku: string | null;
  stock: number;
  slug: string | null;
  category: string | null;
  variants: StoreVariant[] | null;
  salesCount: number;
  createdAt: string;
}

export interface StoreSettings {
  tenantId: string;
  currency: string;
  vatPct: number;
  vatIncluded: boolean;
  shippingFee: number;
  freeShippingAbove: number | null;
  storeName: string | null;
  storeDescription: string | null;
  updatedAt: string;
}

export interface StoreOrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface StoreOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string | null;
  customerAddress: Record<string, string> | null;
  paymentIntentId: string | null;
  subtotal: number;
  vatPct: number;
  vatAmount: number;
  shippingFee: number;
  total: number;
  currency: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: StoreOrderItem[];
}

export interface CreateStoreProductInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  type?: string;
  imageUrl?: string;
  sku?: string;
  stock?: number;
  slug?: string;
  category?: string;
  variants?: StoreVariant[];
}

export interface UpdateStoreProductInput {
  name?: string;
  description?: string;
  price?: number;
  type?: string;
  imageUrl?: string;
  active?: boolean;
  sku?: string;
  stock?: number;
  slug?: string;
  category?: string;
  variants?: StoreVariant[];
}

export interface UpdateStoreSettingsInput {
  currency?: string;
  vatPct?: number;
  vatIncluded?: boolean;
  shippingFee?: number;
  freeShippingAbove?: number | null;
  storeName?: string;
  storeDescription?: string;
}

export interface CartItemInput {
  productId?: string;
  productName: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerEmail: string;
  customerName?: string;
  customerAddress?: Record<string, string>;
  paymentIntentId?: string;
  items: CartItemInput[];
  notes?: string;
  currency?: string;
}

export class SaasStoreError extends Error {
  constructor(message: string, public code: "NOT_FOUND" | "VALIDATION" | "CONFLICT") {
    super(message);
    this.name = "SaasStoreError";
  }
}

// ── Mappers ────────────────────────────────────────────────────────────────────

type ProductRow = Record<string, unknown>;

function parseVariants(raw: unknown): StoreVariant[] | null {
  if (!raw) return null;
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return null;
    return arr as StoreVariant[];
  } catch { return null; }
}

function rowToProduct(r: ProductRow): StoreProduct {
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    name: String(r.name),
    description: r.description != null ? String(r.description) : null,
    price: Number(r.price),
    currency: String(r.currency ?? "EUR"),
    type: String(r.type ?? "physical"),
    active: Boolean(r.active ?? true),
    imageUrl: r.imageUrl != null ? String(r.imageUrl) : r.image_url != null ? String(r.image_url) : null,
    sku: r.sku != null ? String(r.sku) : null,
    stock: Number(r.stock ?? 0),
    slug: r.slug != null ? String(r.slug) : null,
    category: r.category != null ? String(r.category) : null,
    variants: parseVariants(r.variants),
    salesCount: Number(r.salesCount ?? r.sales_count ?? 0),
    createdAt: String(r.createdAt ?? r.created_at),
  };
}

function rowToSettings(r: Record<string, unknown>): StoreSettings {
  return {
    tenantId: String(r.tenantId ?? r.tenant_id),
    currency: String(r.currency ?? "EUR"),
    vatPct: Number(r.vatPct ?? r.vat_pct ?? 21),
    vatIncluded: Boolean(r.vatIncluded ?? r.vat_included ?? true),
    shippingFee: Number(r.shippingFee ?? r.shipping_fee ?? 0),
    freeShippingAbove: r.freeShippingAbove != null ? Number(r.freeShippingAbove) : r.free_shipping_above != null ? Number(r.free_shipping_above) : null,
    storeName: r.storeName != null ? String(r.storeName) : r.store_name != null ? String(r.store_name) : null,
    storeDescription: r.storeDescription != null ? String(r.storeDescription) : r.store_description != null ? String(r.store_description) : null,
    updatedAt: String(r.updatedAt ?? r.updated_at ?? new Date().toISOString()),
  };
}

function rowToOrderItem(r: Record<string, unknown>): StoreOrderItem {
  return {
    id: String(r.id),
    orderId: String(r.orderId ?? r.order_id),
    productId: r.productId != null ? String(r.productId) : r.product_id != null ? String(r.product_id) : null,
    productName: String(r.productName ?? r.product_name),
    variantName: r.variantName != null ? String(r.variantName) : r.variant_name != null ? String(r.variant_name) : null,
    sku: r.sku != null ? String(r.sku) : null,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unitPrice ?? r.unit_price),
    totalPrice: Number(r.totalPrice ?? r.total_price),
  };
}

function rowToOrder(r: Record<string, unknown>, items?: StoreOrderItem[]): StoreOrder {
  let addr: Record<string, string> | null = null;
  try {
    const raw = r.customerAddress ?? r.customer_address;
    if (raw && typeof raw === "object") addr = raw as Record<string, string>;
    else if (typeof raw === "string") addr = JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {
    id: String(r.id),
    tenantId: String(r.tenantId ?? r.tenant_id),
    orderNumber: String(r.orderNumber ?? r.order_number),
    status: String(r.status) as OrderStatus,
    customerEmail: String(r.customerEmail ?? r.customer_email),
    customerName: r.customerName != null ? String(r.customerName) : r.customer_name != null ? String(r.customer_name) : null,
    customerAddress: addr,
    paymentIntentId: r.paymentIntentId != null ? String(r.paymentIntentId) : r.payment_intent_id != null ? String(r.payment_intent_id) : null,
    subtotal: Number(r.subtotal),
    vatPct: Number(r.vatPct ?? r.vat_pct ?? 21),
    vatAmount: Number(r.vatAmount ?? r.vat_amount ?? 0),
    shippingFee: Number(r.shippingFee ?? r.shipping_fee ?? 0),
    total: Number(r.total),
    currency: String(r.currency ?? "EUR"),
    notes: r.notes != null ? String(r.notes) : null,
    paidAt: r.paidAt != null ? String(r.paidAt) : r.paid_at != null ? String(r.paid_at) : null,
    createdAt: String(r.createdAt ?? r.created_at),
    updatedAt: String(r.updatedAt ?? r.updated_at),
    items,
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

const PROD_SEL = `id, tenant_id AS "tenantId", name, description,
  price, currency, type, active, image_url AS "imageUrl",
  sku, stock, slug, category, variants,
  sales_count AS "salesCount", created_at AS "createdAt"`;

export class SaasStoreService {
  private db: Pick<DbClient, "query">;

  constructor(deps?: { db?: Pick<DbClient, "query"> }) {
    this.db = deps?.db ?? DbClientClass.getInstance();
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async listStoreProducts(tenantId: string, opts?: { activeOnly?: boolean; category?: string }): Promise<StoreProduct[]> {
    const conditions: string[] = [`p.tenant_id = $1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.activeOnly) { conditions.push(`p.active = true`); }
    if (opts?.category) { conditions.push(`p.category = $${i++}`); params.push(opts.category); }
    const rows = await this.db.query<ProductRow>(
      `SELECT ${PROD_SEL} FROM products p WHERE ${conditions.join(" AND ")} ORDER BY p.created_at DESC`,
      params,
    );
    return rows.map(rowToProduct);
  }

  async getStoreProduct(tenantId: string, id: string): Promise<StoreProduct> {
    const rows = await this.db.query<ProductRow>(
      `SELECT ${PROD_SEL} FROM products p WHERE p.tenant_id = $1 AND p.id = $2`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasStoreError("Producto no encontrado", "NOT_FOUND");
    return rowToProduct(rows[0]);
  }

  async getStoreProductBySlug(tenantId: string, slug: string): Promise<StoreProduct> {
    const rows = await this.db.query<ProductRow>(
      `SELECT ${PROD_SEL} FROM products p WHERE p.tenant_id = $1 AND p.slug = $2 AND p.active = true`,
      [tenantId, slug],
    );
    if (!rows[0]) throw new SaasStoreError("Producto no encontrado", "NOT_FOUND");
    return rowToProduct(rows[0]);
  }

  async createStoreProduct(tenantId: string, input: CreateStoreProductInput): Promise<StoreProduct> {
    if (!input.name?.trim()) throw new SaasStoreError("El nombre es obligatorio", "VALIDATION");
    if (input.price < 0) throw new SaasStoreError("El precio no puede ser negativo", "VALIDATION");
    const rows = await this.db.query<ProductRow>(
      `INSERT INTO products (tenant_id, name, description, price, currency, type, active, image_url, sku, stock, slug, category, variants)
       VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11,$12)
       RETURNING ${PROD_SEL}`,
      [
        tenantId,
        input.name.trim(),
        input.description?.trim() ?? null,
        input.price,
        input.currency ?? "EUR",
        input.type ?? "physical",
        input.imageUrl ?? null,
        input.sku?.trim() ?? null,
        input.stock ?? 0,
        input.slug?.trim() ?? null,
        input.category?.trim() ?? null,
        input.variants ? JSON.stringify(input.variants) : null,
      ],
    );
    return rowToProduct(rows[0]);
  }

  async updateStoreProduct(tenantId: string, id: string, patch: UpdateStoreProductInput): Promise<StoreProduct> {
    const sets: string[] = [];
    const params: unknown[] = [tenantId, id];
    let i = 3;
    const add = (col: string, val: unknown) => { sets.push(`${col} = $${i++}`); params.push(val); };
    if (patch.name !== undefined) add("name", patch.name.trim());
    if (patch.description !== undefined) add("description", patch.description ?? null);
    if (patch.price !== undefined) add("price", patch.price);
    if (patch.type !== undefined) add("type", patch.type);
    if (patch.imageUrl !== undefined) add("image_url", patch.imageUrl ?? null);
    if (patch.active !== undefined) add("active", patch.active);
    if (patch.sku !== undefined) add("sku", patch.sku?.trim() ?? null);
    if (patch.stock !== undefined) add("stock", patch.stock);
    if (patch.slug !== undefined) add("slug", patch.slug?.trim() ?? null);
    if (patch.category !== undefined) add("category", patch.category?.trim() ?? null);
    if (patch.variants !== undefined) add("variants", patch.variants ? JSON.stringify(patch.variants) : null);
    if (sets.length === 0) throw new SaasStoreError("Sin cambios", "VALIDATION");
    const rows = await this.db.query<ProductRow>(
      `UPDATE products SET ${sets.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING ${PROD_SEL}`,
      params,
    );
    if (!rows[0]) throw new SaasStoreError("Producto no encontrado", "NOT_FOUND");
    return rowToProduct(rows[0]);
  }

  async deleteStoreProduct(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM products WHERE tenant_id = $1 AND id = $2 RETURNING id`, [tenantId, id],
    );
    if (!rows[0]) throw new SaasStoreError("Producto no encontrado", "NOT_FOUND");
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(tenantId: string): Promise<StoreSettings> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT tenant_id AS "tenantId", currency, vat_pct AS "vatPct", vat_included AS "vatIncluded",
              shipping_fee AS "shippingFee", free_shipping_above AS "freeShippingAbove",
              store_name AS "storeName", store_description AS "storeDescription",
              updated_at AS "updatedAt"
       FROM store_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    if (rows[0]) return rowToSettings(rows[0]);
    // Return defaults without requiring a DB row
    return {
      tenantId, currency: "EUR", vatPct: 21, vatIncluded: true,
      shippingFee: 0, freeShippingAbove: null, storeName: null, storeDescription: null,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateSettings(tenantId: string, patch: UpdateStoreSettingsInput): Promise<StoreSettings> {
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (patch.currency !== undefined) { sets.push(`currency = $${i++}`); params.push(patch.currency); }
    if (patch.vatPct !== undefined) { sets.push(`vat_pct = $${i++}`); params.push(patch.vatPct); }
    if (patch.vatIncluded !== undefined) { sets.push(`vat_included = $${i++}`); params.push(patch.vatIncluded); }
    if (patch.shippingFee !== undefined) { sets.push(`shipping_fee = $${i++}`); params.push(patch.shippingFee); }
    if (patch.freeShippingAbove !== undefined) { sets.push(`free_shipping_above = $${i++}`); params.push(patch.freeShippingAbove ?? null); }
    if (patch.storeName !== undefined) { sets.push(`store_name = $${i++}`); params.push(patch.storeName ?? null); }
    if (patch.storeDescription !== undefined) { sets.push(`store_description = $${i++}`); params.push(patch.storeDescription ?? null); }

    await this.db.query(
      `INSERT INTO store_settings (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO UPDATE SET ${sets.join(", ")}`,
      params,
    );
    return this.getSettings(tenantId);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async listOrders(tenantId: string, opts?: { status?: OrderStatus; limit?: number }): Promise<StoreOrder[]> {
    const conditions = [`o.tenant_id = $1`];
    const params: unknown[] = [tenantId];
    let i = 2;
    if (opts?.status) { conditions.push(`o.status = $${i++}`); params.push(opts.status); }
    const limit = opts?.limit ?? 50;
    params.push(limit);
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT o.id, o.tenant_id AS "tenantId", o.order_number AS "orderNumber", o.status,
              o.customer_email AS "customerEmail", o.customer_name AS "customerName",
              o.customer_address AS "customerAddress", o.payment_intent_id AS "paymentIntentId",
              o.subtotal, o.vat_pct AS "vatPct", o.vat_amount AS "vatAmount",
              o.shipping_fee AS "shippingFee", o.total, o.currency,
              o.notes, o.paid_at AS "paidAt", o.created_at AS "createdAt", o.updated_at AS "updatedAt"
       FROM store_orders o WHERE ${conditions.join(" AND ")}
       ORDER BY o.created_at DESC LIMIT $${i}`,
      params,
    );
    return rows.map(r => rowToOrder(r));
  }

  async getOrder(tenantId: string, orderId: string): Promise<StoreOrder> {
    const [orders, items] = await Promise.all([
      this.db.query<Record<string, unknown>>(
        `SELECT o.id, o.tenant_id AS "tenantId", o.order_number AS "orderNumber", o.status,
                o.customer_email AS "customerEmail", o.customer_name AS "customerName",
                o.customer_address AS "customerAddress", o.payment_intent_id AS "paymentIntentId",
                o.subtotal, o.vat_pct AS "vatPct", o.vat_amount AS "vatAmount",
                o.shipping_fee AS "shippingFee", o.total, o.currency,
                o.notes, o.paid_at AS "paidAt", o.created_at AS "createdAt", o.updated_at AS "updatedAt"
         FROM store_orders o WHERE o.tenant_id = $1 AND o.id = $2`,
        [tenantId, orderId],
      ),
      this.db.query<Record<string, unknown>>(
        `SELECT id, order_id AS "orderId", product_id AS "productId",
                product_name AS "productName", variant_name AS "variantName",
                sku, quantity, unit_price AS "unitPrice", total_price AS "totalPrice"
         FROM store_order_items WHERE order_id = $1 ORDER BY created_at`,
        [orderId],
      ),
    ]);
    if (!orders[0]) throw new SaasStoreError("Pedido no encontrado", "NOT_FOUND");
    return rowToOrder(orders[0], items.map(rowToOrderItem));
  }

  async createOrder(tenantId: string, input: CreateOrderInput): Promise<StoreOrder> {
    if (!input.customerEmail?.trim()) throw new SaasStoreError("El email del cliente es obligatorio", "VALIDATION");
    if (!input.items?.length) throw new SaasStoreError("El pedido debe tener al menos un artículo", "VALIDATION");

    const settings = await this.getSettings(tenantId);
    const currency = input.currency ?? settings.currency;
    const vatPct = settings.vatPct;
    const shipping = input.items.length > 0 && settings.freeShippingAbove != null
      ? input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) >= settings.freeShippingAbove ? 0 : settings.shippingFee
      : settings.shippingFee;

    const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const vatAmount = settings.vatIncluded ? 0 : Math.round(subtotal * vatPct) / 100;
    const total = subtotal + vatAmount + shipping;

    // Generate order number: NEL-{YYYYMM}-{seq}
    const seqRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM store_orders WHERE tenant_id = $1`, [tenantId],
    );
    const seq = (Number(seqRows[0]?.count ?? 0) + 1).toString().padStart(4, "0");
    const now = new Date();
    const orderNumber = `NEL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`;

    const orders = await this.db.query<Record<string, unknown>>(
      `INSERT INTO store_orders (tenant_id, order_number, status, customer_email, customer_name,
         customer_address, payment_intent_id, subtotal, vat_pct, vat_amount, shipping_fee, total, currency, notes)
       VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, order_number AS "orderNumber", status, customer_email AS "customerEmail",
                 customer_name AS "customerName", subtotal, vat_pct AS "vatPct", vat_amount AS "vatAmount",
                 shipping_fee AS "shippingFee", total, currency, payment_intent_id AS "paymentIntentId",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        tenantId, orderNumber, input.customerEmail.trim(), input.customerName?.trim() ?? null,
        input.customerAddress ? JSON.stringify(input.customerAddress) : null,
        input.paymentIntentId ?? null, subtotal, vatPct, vatAmount, shipping, total, currency, input.notes ?? null,
      ],
    );
    const order = orders[0];

    // Insert items and reduce stock
    for (const item of input.items) {
      await this.db.query(
        `INSERT INTO store_order_items (order_id, tenant_id, product_id, product_name, variant_name, sku, quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [order.id, tenantId, item.productId ?? null, item.productName, item.variantName ?? null,
         item.sku ?? null, item.quantity, item.unitPrice, item.unitPrice * item.quantity],
      );
      if (item.productId) {
        await this.db.query(
          `UPDATE products SET stock = GREATEST(0, stock - $1), sales_count = sales_count + $1
           WHERE id = $2 AND tenant_id = $3`,
          [item.quantity, item.productId, tenantId],
        );
      }
    }

    return rowToOrder({ ...order, tenantId, customerAddress: input.customerAddress ?? null, notes: input.notes ?? null, paidAt: null });
  }

  async updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<StoreOrder> {
    const extra = status === "paid" ? `, paid_at = NOW()` : "";
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE store_orders SET status = $3, updated_at = NOW()${extra}
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, order_number AS "orderNumber", status, customer_email AS "customerEmail",
                 customer_name AS "customerName", subtotal, vat_pct AS "vatPct", vat_amount AS "vatAmount",
                 shipping_fee AS "shippingFee", total, currency, payment_intent_id AS "paymentIntentId",
                 paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [tenantId, orderId, status],
    );
    if (!rows[0]) throw new SaasStoreError("Pedido no encontrado", "NOT_FOUND");
    return rowToOrder({ ...rows[0], tenantId, customerAddress: null, notes: null });
  }

  async handlePaymentSucceeded(paymentIntentId: string): Promise<StoreOrder | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE store_orders SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE payment_intent_id = $1 AND status = 'pending'
       RETURNING id, tenant_id AS "tenantId", order_number AS "orderNumber", status,
                 customer_email AS "customerEmail", customer_name AS "customerName",
                 subtotal, vat_pct AS "vatPct", vat_amount AS "vatAmount",
                 shipping_fee AS "shippingFee", total, currency, payment_intent_id AS "paymentIntentId",
                 paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [paymentIntentId],
    );
    if (!rows[0]) return null;
    return rowToOrder({ ...rows[0], customerAddress: null, notes: null });
  }

  // ── Public catalog (for /store/[subdomain]) ────────────────────────────────

  async getPublicCatalog(subdomain: string): Promise<{ settings: StoreSettings; products: StoreProduct[] }> {
    // Resolve tenant by subdomain
    const tenants = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_tenants WHERE subdomain = $1 OR slug = $1 LIMIT 1`, [subdomain],
    );
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      return { settings: { tenantId: "", currency: "EUR", vatPct: 21, vatIncluded: true, shippingFee: 0, freeShippingAbove: null, storeName: null, storeDescription: null, updatedAt: new Date().toISOString() }, products: [] };
    }
    const [settings, products] = await Promise.all([
      this.getSettings(tenantId),
      this.listStoreProducts(tenantId, { activeOnly: true }),
    ]);
    return { settings, products };
  }
}

let _instance: SaasStoreService | null = null;
export function getSaasStoreService(): SaasStoreService {
  _instance ??= new SaasStoreService();
  return _instance;
}

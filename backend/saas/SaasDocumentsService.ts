import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type DocumentType = "document" | "contract" | "proposal" | "nda";
export type DocumentStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";
export type ProductType = "one_time" | "subscription" | "digital";

export interface Document {
  id: string;
  tenantId: string;
  contactId: string | null;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  templateId: string | null;
  fileUrl: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: ProductType;
  active: boolean;
  imageUrl: string | null;
  stripePriceId: string | null;
  salesCount: number;
  createdAt: string;
}

export interface CreateDocumentInput {
  contactId?: string;
  name: string;
  type?: DocumentType;
  templateId?: string;
  fileUrl?: string;
  expiresAt?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  type?: ProductType;
  imageUrl?: string;
  stripePriceId?: string;
}

export type SaasDocumentsServiceDeps = { db?: Pick<DbClient, "query"> };

const DOC_SEL = `id, tenant_id as "tenantId", contact_id as "contactId",
  name, type, status, template_id as "templateId", file_url as "fileUrl",
  signed_at as "signedAt", expires_at as "expiresAt",
  created_at as "createdAt", updated_at as "updatedAt"`;

const PROD_SEL = `id, tenant_id as "tenantId", name, description,
  price, currency, type, active, image_url as "imageUrl",
  stripe_price_id as "stripePriceId", sales_count as "salesCount",
  created_at as "createdAt"`;

function mapDoc(r: Record<string, unknown>): Document {
  return {
    id: String(r.id), tenantId: String(r.tenantId),
    contactId: r.contactId != null ? String(r.contactId) : null,
    name: String(r.name), type: String(r.type) as DocumentType,
    status: String(r.status) as DocumentStatus,
    templateId: r.templateId != null ? String(r.templateId) : null,
    fileUrl: r.fileUrl != null ? String(r.fileUrl) : null,
    signedAt: r.signedAt != null ? String(r.signedAt) : null,
    expiresAt: r.expiresAt != null ? String(r.expiresAt) : null,
    createdAt: String(r.createdAt), updatedAt: String(r.updatedAt),
  };
}

function mapProd(r: Record<string, unknown>): Product {
  return {
    id: String(r.id), tenantId: String(r.tenantId), name: String(r.name),
    description: r.description != null ? String(r.description) : null,
    price: Number(r.price ?? 0), currency: String(r.currency ?? "EUR"),
    type: String(r.type) as ProductType, active: Boolean(r.active),
    imageUrl: r.imageUrl != null ? String(r.imageUrl) : null,
    stripePriceId: r.stripePriceId != null ? String(r.stripePriceId) : null,
    salesCount: Number(r.salesCount ?? 0), createdAt: String(r.createdAt),
  };
}

export class SaasDocumentsService {
  constructor(private readonly deps: SaasDocumentsServiceDeps = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  // ── Documents ─────────────────────────────────────────────────────────────

  async listDocuments(tenantId: string, status?: DocumentStatus): Promise<Document[]> {
    const base = `SELECT ${DOC_SEL} FROM documents WHERE tenant_id=$1`;
    const rows = status
      ? await this.db.query<Record<string, unknown>>(base + ` AND status=$2 ORDER BY created_at DESC`, [tenantId, status])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY created_at DESC`, [tenantId]);
    return rows.map(mapDoc);
  }

  async getDocument(tenantId: string, id: string): Promise<Document | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${DOC_SEL} FROM documents WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapDoc(rows[0]) : null;
  }

  async createDocument(tenantId: string, input: CreateDocumentInput): Promise<Document> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO documents (tenant_id, contact_id, name, type, status, template_id, file_url, expires_at)
       VALUES ($1,$2,$3,$4,'draft',$5,$6,$7)
       RETURNING ${DOC_SEL}`,
      [tenantId, input.contactId ?? null, input.name.trim(),
       input.type ?? "document", input.templateId ?? null,
       input.fileUrl ?? null, input.expiresAt ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasDocumentsService.createDocument: no row");
    return mapDoc(row);
  }

  async updateDocument(tenantId: string, id: string, patch: {
    status?: DocumentStatus; fileUrl?: string; signedAt?: string; expiresAt?: string; name?: string;
  }): Promise<Document | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE documents SET
         status    = COALESCE($3, status),
         name      = COALESCE($4, name),
         file_url  = COALESCE($5, file_url),
         signed_at = COALESCE($6::timestamptz, signed_at),
         expires_at= COALESCE($7::timestamptz, expires_at),
         updated_at= NOW()
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${DOC_SEL}`,
      [id, tenantId, patch.status ?? null, patch.name ?? null,
       patch.fileUrl ?? null, patch.signedAt ?? null, patch.expiresAt ?? null],
    );
    return rows[0] ? mapDoc(rows[0]) : null;
  }

  async deleteDocument(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM documents WHERE id=$1::uuid AND tenant_id=$2 AND status='draft' RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async listProducts(tenantId: string, activeOnly = false): Promise<Product[]> {
    const base = `SELECT ${PROD_SEL} FROM products WHERE tenant_id=$1`;
    const rows = activeOnly
      ? await this.db.query<Record<string, unknown>>(base + ` AND active=true ORDER BY name`, [tenantId])
      : await this.db.query<Record<string, unknown>>(base + ` ORDER BY name`, [tenantId]);
    return rows.map(mapProd);
  }

  async getProduct(tenantId: string, id: string): Promise<Product | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT ${PROD_SEL} FROM products WHERE id=$1::uuid AND tenant_id=$2`,
      [id, tenantId],
    );
    return rows[0] ? mapProd(rows[0]) : null;
  }

  async createProduct(tenantId: string, input: CreateProductInput): Promise<Product> {
    if (!input.name?.trim()) throw Object.assign(new Error("name is required"), { code: "VALIDATION" });
    if (input.price < 0) throw Object.assign(new Error("price must be >= 0"), { code: "VALIDATION" });
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO products (tenant_id, name, description, price, currency, type, image_url, stripe_price_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${PROD_SEL}`,
      [tenantId, input.name.trim(), input.description ?? null, input.price,
       input.currency ?? "EUR", input.type ?? "one_time",
       input.imageUrl ?? null, input.stripePriceId ?? null],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasDocumentsService.createProduct: no row");
    return mapProd(row);
  }

  async updateProduct(tenantId: string, id: string, patch: Partial<CreateProductInput> & { active?: boolean }): Promise<Product | null> {
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE products SET
         name          = COALESCE($3, name),
         description   = COALESCE($4, description),
         price         = COALESCE($5, price),
         currency      = COALESCE($6, currency),
         type          = COALESCE($7, type),
         active        = COALESCE($8, active),
         image_url     = COALESCE($9, image_url),
         stripe_price_id = COALESCE($10, stripe_price_id)
       WHERE id=$1::uuid AND tenant_id=$2
       RETURNING ${PROD_SEL}`,
      [id, tenantId, patch.name ?? null, patch.description ?? null, patch.price ?? null,
       patch.currency ?? null, patch.type ?? null, patch.active ?? null,
       patch.imageUrl ?? null, patch.stripePriceId ?? null],
    );
    return rows[0] ? mapProd(rows[0]) : null;
  }

  async deleteProduct(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM products WHERE id=$1::uuid AND tenant_id=$2 RETURNING id`,
      [id, tenantId],
    );
    return rows.length > 0;
  }
}

let _svc: SaasDocumentsService | undefined;
export function getSaasDocumentsService(): SaasDocumentsService {
  if (!_svc) _svc = new SaasDocumentsService();
  return _svc;
}
export function resetSaasDocumentsServiceForTests(): void { _svc = undefined; }

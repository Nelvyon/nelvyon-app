import { describe, it, expect, vi } from "vitest";
import { SaasDocumentsService } from "../SaasDocumentsService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-docs";

const baseDoc: Row = {
  id: "doc-1", tenantId: TENANT, contactId: null, name: "Contrato SEO",
  type: "contract", status: "draft", templateId: null, fileUrl: null,
  signedAt: null, expiresAt: null,
  createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z",
};

const baseProd: Row = {
  id: "prod-1", tenantId: TENANT, name: "Pack SEO", description: "SEO mensual",
  price: 497, currency: "EUR", type: "subscription", active: true,
  imageUrl: null, stripePriceId: null, salesCount: 0, createdAt: "2026-06-24T00:00:00Z",
};

// ── Documents ──────────────────────────────────────────────────────────────

describe("SaasDocumentsService — listDocuments", () => {
  it("returns empty array", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).listDocuments(TENANT)).toEqual([]);
  });
  it("maps document row", async () => {
    const [d] = await new SaasDocumentsService({ db: makeDb([[baseDoc]]) }).listDocuments(TENANT);
    expect(d.name).toBe("Contrato SEO");
    expect(d.type).toBe("contract");
    expect(d.status).toBe("draft");
  });
  it("passes status filter", async () => {
    const db = makeDb([[]]);
    await new SaasDocumentsService({ db }).listDocuments(TENANT, "sent");
    expect(String(db.query.mock.calls[0][0])).toContain("status=$2");
  });
});

describe("SaasDocumentsService — getDocument", () => {
  it("returns null when not found", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).getDocument(TENANT, "x")).toBeNull();
  });
  it("returns document", async () => {
    const d = await new SaasDocumentsService({ db: makeDb([[baseDoc]]) }).getDocument(TENANT, "doc-1");
    expect(d?.id).toBe("doc-1");
  });
});

describe("SaasDocumentsService — createDocument", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasDocumentsService({ db: makeDb() }).createDocument(TENANT, { name: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates document in draft status", async () => {
    const db = makeDb([[baseDoc]]);
    const d = await new SaasDocumentsService({ db }).createDocument(TENANT, { name: "Contrato SEO", type: "contract" });
    expect(d.status).toBe("draft");
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO documents");
  });
});

describe("SaasDocumentsService — updateDocument", () => {
  it("returns null when not found", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).updateDocument(TENANT, "x", { status: "sent" })).toBeNull();
  });
  it("updates status to sent", async () => {
    const db = makeDb([[{ ...baseDoc, status: "sent" }]]);
    const d = await new SaasDocumentsService({ db }).updateDocument(TENANT, "doc-1", { status: "sent" });
    expect(d?.status).toBe("sent");
  });
});

describe("SaasDocumentsService — deleteDocument", () => {
  it("only deletes draft — returns false for non-draft", async () => {
    const db = makeDb([[]]);
    expect(await new SaasDocumentsService({ db }).deleteDocument(TENANT, "doc-1")).toBe(false);
    expect(String(db.query.mock.calls[0][0])).toContain("status='draft'");
  });
  it("returns true when deleted", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[{ id: "doc-1" }]]) }).deleteDocument(TENANT, "doc-1")).toBe(true);
  });
});

// ── Products ───────────────────────────────────────────────────────────────

describe("SaasDocumentsService — listProducts", () => {
  it("returns empty array", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).listProducts(TENANT)).toEqual([]);
  });
  it("maps product row", async () => {
    const [p] = await new SaasDocumentsService({ db: makeDb([[baseProd]]) }).listProducts(TENANT);
    expect(p.name).toBe("Pack SEO");
    expect(p.price).toBe(497);
    expect(p.type).toBe("subscription");
  });
  it("filters active products", async () => {
    const db = makeDb([[]]);
    await new SaasDocumentsService({ db }).listProducts(TENANT, true);
    expect(String(db.query.mock.calls[0][0])).toContain("active=true");
  });
});

describe("SaasDocumentsService — createProduct", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasDocumentsService({ db: makeDb() }).createProduct(TENANT, { name: "", price: 0 }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("throws VALIDATION when price negative", async () => {
    await expect(new SaasDocumentsService({ db: makeDb() }).createProduct(TENANT, { name: "X", price: -1 }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates product", async () => {
    const db = makeDb([[baseProd]]);
    const p = await new SaasDocumentsService({ db }).createProduct(TENANT, { name: "Pack SEO", price: 497 });
    expect(p.price).toBe(497);
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO products");
  });
});

describe("SaasDocumentsService — updateProduct", () => {
  it("returns null when not found", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).updateProduct(TENANT, "x", { active: false })).toBeNull();
  });
  it("deactivates product", async () => {
    const db = makeDb([[{ ...baseProd, active: false }]]);
    const p = await new SaasDocumentsService({ db }).updateProduct(TENANT, "prod-1", { active: false });
    expect(p?.active).toBe(false);
  });
});

describe("SaasDocumentsService — deleteProduct", () => {
  it("returns false when not found", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[]]) }).deleteProduct(TENANT, "x")).toBe(false);
  });
  it("returns true", async () => {
    expect(await new SaasDocumentsService({ db: makeDb([[{ id: "prod-1" }]]) }).deleteProduct(TENANT, "prod-1")).toBe(true);
  });
});

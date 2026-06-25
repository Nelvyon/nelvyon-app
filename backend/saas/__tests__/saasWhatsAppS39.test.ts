/**
 * S39 — WhatsApp 10/10: Meta templates sync, catalog, template send UI
 * 25+ tests covering new SaasWhatsAppCloudService v2 methods
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SaasWhatsAppCloudService,
  resetSaasWhatsAppCloudServiceForTests,
  SaasWhatsAppCloudError,
} from "../SaasWhatsAppCloudService";

const TENANT = "t-s39";
const now = new Date();

function makeDb(rows: Record<string, unknown>[][] = []) {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
}

function makeFetch(responses: Array<{ status: number; body: unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const r = responses[call++] ?? { status: 200, body: {} };
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  }) as unknown as typeof fetch;
}

function makeSingleFetch(status: number, body: unknown) {
  return makeFetch([{ status, body }]);
}

// ── resolveWabaId ────────────────────────────────────────────────────────────

describe("SaasWhatsAppCloudService.resolveWabaId", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    vi.stubEnv("META_WA_BUSINESS_ACCOUNT_ID", "");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("returns env var directly when META_WA_BUSINESS_ACCOUNT_ID is set", async () => {
    vi.stubEnv("META_WA_BUSINESS_ACCOUNT_ID", "waba-from-env");
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(await svc.resolveWabaId()).toBe("waba-from-env");
  });

  it("resolves via Graph API when env not set", async () => {
    const fetchMock = makeSingleFetch(200, { whatsapp_business_account: { id: "waba-graph-123" } });
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const wabaId = await svc.resolveWabaId();
    expect(wabaId).toBe("waba-graph-123");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("phone-123"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-abc" }) }),
    );
  });

  it("caches WABA ID on second call", async () => {
    const fetchMock = makeSingleFetch(200, { whatsapp_business_account: { id: "waba-cached" } });
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await svc.resolveWabaId();
    await svc.resolveWabaId(); // second call
    expect(fetchMock).toHaveBeenCalledTimes(1); // only fetched once
  });

  it("throws NOT_CONFIGURED when Meta not configured", async () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "");
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.resolveWabaId()).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("throws API_ERROR when Graph API returns error", async () => {
    const fetchMock = makeSingleFetch(400, { error: { message: "Invalid phone number" } });
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await expect(svc.resolveWabaId()).rejects.toMatchObject({ code: "API_ERROR" });
  });
});

// ── syncTemplates / listTemplates ────────────────────────────────────────────

const templatePayload = {
  data: [
    {
      id: "meta-tpl-1",
      name: "promo_verano",
      language: "es",
      status: "APPROVED",
      category: "MARKETING",
      components: [
        { type: "HEADER", format: "TEXT", text: "¡Oferta especial!" },
        { type: "BODY", text: "Hola {{1}}, tienes un descuento del {{2}}%." },
        { type: "FOOTER", text: "Nelvyon" },
      ],
      quality_score: { score: "GREEN" },
    },
    {
      id: "meta-tpl-2",
      name: "auth_otp",
      language: "es",
      status: "APPROVED",
      category: "AUTHENTICATION",
      components: [{ type: "BODY", text: "Tu código es {{1}}." }],
      quality_score: null,
    },
  ],
};

describe("SaasWhatsAppCloudService.syncTemplates", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    vi.stubEnv("META_WA_BUSINESS_ACCOUNT_ID", "waba-999");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("fetches templates and upserts into DB", async () => {
    const fetchMock = makeSingleFetch(200, templatePayload);
    const db = makeDb([[], []]); // 2 upserts
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const count = await svc.syncTemplates(TENANT);
    expect(count).toBe(2);
    expect(db.query).toHaveBeenCalledTimes(2);
    // Each call should be an UPSERT
    const calls = (db.query.mock.calls as Array<[string, unknown[]]>);
    expect(calls[0]![0]).toContain("INSERT INTO saas_wa_templates");
    expect(calls[0]![0]).toContain("ON CONFLICT");
  });

  it("handles pagination (next page)", async () => {
    const fetchMock = makeFetch([
      { status: 200, body: { data: [templatePayload.data[0]], paging: { next: "https://graph.facebook.com/next" } } },
      { status: 200, body: { data: [templatePayload.data[1]], paging: {} } },
    ]);
    const db = makeDb([[], []]); // 2 upserts
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const count = await svc.syncTemplates(TENANT);
    expect(count).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws API_ERROR when Meta returns error", async () => {
    const fetchMock = makeSingleFetch(400, { error: { message: "Invalid WABA" } });
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await expect(svc.syncTemplates(TENANT)).rejects.toMatchObject({ code: "API_ERROR" });
  });
});

describe("SaasWhatsAppCloudService.listTemplates", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("returns empty array when no templates", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(await svc.listTemplates(TENANT)).toEqual([]);
  });

  it("maps template rows correctly", async () => {
    const db = makeDb([[{
      id: "t1", tenant_id: TENANT, meta_template_id: "meta-1",
      name: "promo_verano", language: "es", status: "APPROVED",
      category: "MARKETING",
      components: [{ type: "BODY", text: "Hola {{1}}" }],
      quality_score: "GREEN", synced_at: now,
    }]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    const templates = await svc.listTemplates(TENANT);
    expect(templates).toHaveLength(1);
    expect(templates[0]!.name).toBe("promo_verano");
    expect(templates[0]!.status).toBe("APPROVED");
    expect(templates[0]!.category).toBe("MARKETING");
    expect(templates[0]!.components[0]!.type).toBe("BODY");
    expect(templates[0]!.qualityScore).toBe("GREEN");
  });

  it("filters by status when provided", async () => {
    const db = makeDb([[{
      id: "t2", tenant_id: TENANT, meta_template_id: "meta-2",
      name: "auth_otp", language: "es", status: "APPROVED",
      category: "AUTHENTICATION", components: [], quality_score: null, synced_at: now,
    }]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    const templates = await svc.listTemplates(TENANT, { status: "APPROVED" });
    expect(templates).toHaveLength(1);
    // Verify status filter was in the query
    const call = (db.query.mock.calls as Array<[string, unknown[]]>)[0]!;
    expect(call[1]).toContain("APPROVED");
  });

  it("filters by language when provided", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    await svc.listTemplates(TENANT, { language: "en" });
    const call = (db.query.mock.calls as Array<[string, unknown[]]>)[0]!;
    expect(call[1]).toContain("en");
  });

  it("handles JSONB components as array", async () => {
    const db = makeDb([[{
      id: "t3", tenant_id: TENANT, meta_template_id: "m3",
      name: "util", language: "es", status: "APPROVED",
      category: "UTILITY", components: "[]", quality_score: null, synced_at: now,
    }]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    const templates = await svc.listTemplates(TENANT);
    expect(Array.isArray(templates[0]!.components)).toBe(true);
  });
});

// ── sendTemplate ─────────────────────────────────────────────────────────────

describe("SaasWhatsAppCloudService.sendTemplate", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("throws VALIDATION when to is empty", async () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.sendTemplate(TENANT, { to: "", templateName: "promo" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when templateName is empty", async () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.sendTemplate(TENANT, { to: "+34600", templateName: "  " }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("sends template with components via Graph API", async () => {
    const fetchMock = makeSingleFetch(200, { messages: [{ id: "wamid.tpl.1" }] });
    const msgRow = {
      id: "msg-tpl-1", tenant_id: TENANT, conversation_id: null,
      to_number: "+34600000001", body: "[template:promo_verano]",
      twilio_sid: "wamid.tpl.1", status: "sent", contact_id: null, created_at: now,
    };
    const db = makeDb([[{ id: "conv-1" }], [msgRow], []]);
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const msg = await svc.sendTemplate(TENANT, {
      to: "+34600000001",
      templateName: "promo_verano",
      templateLanguage: "es",
      templateComponents: [
        { type: "body", parameters: [{ type: "text", text: "Ana" }, { type: "text", text: "20" }] } as never,
      ],
    });
    expect(msg.metaWamid).toBe("wamid.tpl.1");
    expect(msg.status).toBe("sent");
    // Verify template payload was sent
    const fetchCall = fetchMock.mock.calls[0] as [string, { body: string }];
    const payload = JSON.parse(fetchCall[1]!.body) as { template?: { name: string; components?: unknown[] } };
    expect(payload.template?.name).toBe("promo_verano");
    expect(payload.template?.components).toHaveLength(1);
  });

  it("sends template without components (no variables)", async () => {
    const fetchMock = makeSingleFetch(200, { messages: [{ id: "wamid.tpl.2" }] });
    const msgRow = {
      id: "msg-tpl-2", tenant_id: TENANT, conversation_id: null,
      to_number: "+34600000002", body: "[template:auth_otp]",
      twilio_sid: "wamid.tpl.2", status: "sent", contact_id: null, created_at: now,
    };
    const db = makeDb([[{ id: "conv-2" }], [msgRow], []]);
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const msg = await svc.sendTemplate(TENANT, { to: "+34600000002", templateName: "auth_otp" });
    expect(msg.status).toBe("sent");
    const fetchCall = fetchMock.mock.calls[0] as [string, { body: string }];
    const payload = JSON.parse(fetchCall[1]!.body) as { template?: { components?: unknown[] } };
    expect(payload.template?.components).toBeUndefined();
  });

  it("throws NOT_CONFIGURED when Meta not set", async () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "");
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.sendTemplate(TENANT, { to: "+34600", templateName: "x" }))
      .rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });
});

// ── syncCatalog / listCatalogProducts ────────────────────────────────────────

const catalogPayload = {
  data: [
    {
      id: "prod-1", name: "Camiseta básica",
      description: "100% algodón", price: "29.99 EUR",
      currency: "EUR", image_url: "https://cdn.example.com/img1.jpg",
      availability: "in stock", retailer_id: "SKU-001",
    },
    {
      id: "prod-2", name: "Pantalón slim",
      description: null, price: "59.99 EUR",
      currency: "EUR", image_url: null,
      availability: "out of stock", retailer_id: null,
    },
  ],
};

describe("SaasWhatsAppCloudService.syncCatalog", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    vi.stubEnv("META_WA_CATALOG_ID", "catalog-456");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("fetches catalog and upserts products into DB", async () => {
    const fetchMock = makeSingleFetch(200, catalogPayload);
    const db = makeDb([[], []]); // 2 upserts
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const count = await svc.syncCatalog(TENANT);
    expect(count).toBe(2);
    expect(db.query).toHaveBeenCalledTimes(2);
    const calls = (db.query.mock.calls as Array<[string, unknown[]]>);
    expect(calls[0]![0]).toContain("INSERT INTO saas_wa_catalog_products");
  });

  it("falls back to saas_wa_settings when META_WA_CATALOG_ID not set", async () => {
    vi.stubEnv("META_WA_CATALOG_ID", "");
    const fetchMock = makeSingleFetch(200, catalogPayload);
    const db = makeDb([
      [{ catalog_id: "catalog-from-settings" }], // saas_wa_settings query
      [], [], // upserts
    ]);
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const count = await svc.syncCatalog(TENANT);
    expect(count).toBe(2);
  });

  it("throws NOT_CONFIGURED when no catalog ID and no settings row", async () => {
    vi.stubEnv("META_WA_CATALOG_ID", "");
    const db = makeDb([[]]); // settings returns no row
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.syncCatalog(TENANT)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("throws API_ERROR when Meta returns error", async () => {
    const fetchMock = makeSingleFetch(400, { error: { message: "Invalid catalog ID" } });
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await expect(svc.syncCatalog(TENANT)).rejects.toMatchObject({ code: "API_ERROR" });
  });

  it("parses price correctly — strips currency suffix", async () => {
    const fetchMock = makeSingleFetch(200, { data: [{ id: "p1", name: "Item", price: "12.50 EUR" }] });
    const db = makeDb([[]]); // upsert
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await svc.syncCatalog(TENANT);
    const call = (db.query.mock.calls as Array<[string, unknown[]]>)[0]!;
    // price_amount param should be 12.50
    expect(call[1]).toContain(12.5);
  });
});

describe("SaasWhatsAppCloudService.listCatalogProducts", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "phone-123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "token-abc");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("returns empty array when no products", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(await svc.listCatalogProducts(TENANT)).toEqual([]);
  });

  it("maps catalog rows correctly", async () => {
    const db = makeDb([[{
      id: "c1", tenant_id: TENANT, meta_product_id: "prod-1", catalog_id: "cat-456",
      name: "Camiseta básica", description: "100% algodón",
      price_amount: "29.99", price_currency: "EUR",
      image_url: "https://cdn.example.com/img1.jpg",
      availability: "in stock", retailer_id: "SKU-001",
      synced_at: now,
    }]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    const products = await svc.listCatalogProducts(TENANT);
    expect(products).toHaveLength(1);
    expect(products[0]!.name).toBe("Camiseta básica");
    expect(products[0]!.priceAmount).toBe(29.99);
    expect(products[0]!.priceCurrency).toBe("EUR");
    expect(products[0]!.imageUrl).toBe("https://cdn.example.com/img1.jpg");
    expect(products[0]!.retailerId).toBe("SKU-001");
  });

  it("returns null priceAmount when price_amount is null", async () => {
    const db = makeDb([[{
      id: "c2", tenant_id: TENANT, meta_product_id: "prod-2", catalog_id: "cat-456",
      name: "Item", description: null, price_amount: null, price_currency: "EUR",
      image_url: null, availability: "out of stock", retailer_id: null, synced_at: now,
    }]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    const products = await svc.listCatalogProducts(TENANT);
    expect(products[0]!.priceAmount).toBeNull();
    expect(products[0]!.imageUrl).toBeNull();
  });

  it("returns multiple products", async () => {
    const db = makeDb([[
      { id: "c1", tenant_id: TENANT, meta_product_id: "p1", catalog_id: "cat", name: "A", description: null, price_amount: null, price_currency: "EUR", image_url: null, availability: "in stock", retailer_id: null, synced_at: now },
      { id: "c2", tenant_id: TENANT, meta_product_id: "p2", catalog_id: "cat", name: "B", description: null, price_amount: "9.99", price_currency: "EUR", image_url: null, availability: "in stock", retailer_id: null, synced_at: now },
    ]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(await svc.listCatalogProducts(TENANT)).toHaveLength(2);
  });
});

// ── SaasWhatsAppCloudError ───────────────────────────────────────────────────

describe("SaasWhatsAppCloudError", () => {
  it("is instanceof Error with correct code", () => {
    const e = new SaasWhatsAppCloudError("test error", "TEST_CODE");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("TEST_CODE");
    expect(e.name).toBe("SaasWhatsAppCloudError");
    expect(e.message).toBe("test error");
  });
});

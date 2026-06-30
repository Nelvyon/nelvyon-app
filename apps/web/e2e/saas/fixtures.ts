/**
 * Shared Playwright fixtures and API mock helpers for SaaS E2E suite.
 *
 * Auth strategy: middleware only checks that `nelvyon_token` cookie is
 * present (non-empty). We set a dummy value and then intercept all
 * `/api/saas/*` calls with page.route() so no real DB is needed in CI.
 */
import { type Page, type BrowserContext, type APIRequestContext, expect } from "@playwright/test";


/** Matches login redirect from middleware (/login?next=...). */
export const LOGIN_URL = /\/login/;

export const DUMMY_TOKEN = "e2e-test-token-nelvyon";

/** Injects the platform session cookie that lets middleware pass SaaS pages. */
export async function setAuthCookie(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: "nelvyon_token",
      value: DUMMY_TOKEN,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
    },
  ]);
}

/** GET/POST without auth must return 401; retries transient dev-server connection errors in CI. */
export async function expectUnauthorizedApi(
  request: APIRequestContext,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: object,
): Promise<void> {
  const opts = { maxRedirects: 0 as const };
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res =
        method === "GET"
          ? await request.get(path, opts)
          : await request.post(path, { ...opts, data: body ?? {} });
      expect(res.status()).toBe(401);
      return;
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      if (!/ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(msg)) throw err;
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ─── Common fixture payloads ─────────────────────────────────────────────────

export const FIXTURE_SETTINGS = {
  tenant: { companyName: "Nelvyon E2E Corp", industry: "tech", plan: "pro", website: null, phone: null, employees: null },
  role: "owner",
  permissions: [
    "contacts.read", "contacts.write", "deals.read", "deals.write",
    "campaigns.read", "campaigns.write", "workflows.read", "workflows.write",
    "sso.read", "sso.write", "audit.read", "settings.write",
    "affiliates.read", "affiliates.write", "loyalty.read", "loyalty.write",
  ],
};

export const FIXTURE_CONTACTS = {
  contacts: [
    { id: "c-001", name: "Alice García", email: "alice@empresa.com", status: "lead", pipeline_stage: "new", value: "5000", company: "Empresa SL", phone: "+34600000000", position: null, notes: null, tags: [] },
  ],
  total: 1, page: 1, pageSize: 50,
};

export const FIXTURE_DEALS = {
  deals: [
    { id: "d-001", tenant_id: "t1", contact_id: "c-001", title: "Deal E2E", stage: "prospecting", value: "10000", currency: "EUR", probability: 25, owner_id: null, expected_close_date: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  total: 1,
};

export const FIXTURE_CAMPANIAS = {
  campanias: [
    { id: "camp-001", name: "Campaña E2E", status: "draft", subject: "Test Subject", total_recipients: 0, sent_count: 0, open_count: 0, click_count: 0, error_count: 0, scheduled_at: null, completed_at: null, created_at: new Date().toISOString() },
  ],
  total: 1, ses_configured: false,
};

export const FIXTURE_WORKFLOWS = {
  workflows: [
    { id: "wf-001", name: "Workflow E2E", status: "active", trigger_type: "manual", run_count: 0, last_run_at: null, created_at: new Date().toISOString() },
  ],
  total: 1, ses_configured: false,
};

export const FIXTURE_BILLING = {
  plan: "pro",
  trialEnds: null,
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
  cancelAtPeriodEnd: false,
  seats: 5,
  invoices: [],
};

export const FIXTURE_AUDIT = {
  entries: [
    { id: "a-001", tenant_id: "t1", user_email: "owner@test.com", action: "create", module: "crm", resource_id: "c-001", details: {}, ip_address: null, created_at: new Date().toISOString() },
  ],
  total: 1,
};

export const FIXTURE_AFFILIATES = {
  program: null, links: [], commissions: [], stats: { totalClicks: 0, totalConversions: 0, totalPaid: 0, pendingPayouts: 0 },
};

export const FIXTURE_LOYALTY = {
  program: null, members: [], stats: { totalMembers: 0, totalPointsIssued: 0, totalRedeemed: 0, activeTiers: 0 },
};

export const FIXTURE_API_KEYS = { keys: [], total: 0 };

export const FIXTURE_LEAD_SCORING = {
  rules: [
    { id: "r-001", name: "Visita web", field: "last_activity", operator: "exists", value: "true", score: 10, active: true },
  ],
  stats: { scored: 42, hot: 5, warm: 12, cold: 25 },
};

export const FIXTURE_REPORTES = {
  attribution: { channels: [], campaigns: [], totalRevenue: 0 },
  summary: { leads: 0, converted: 0, revenue: 0 },
};

export const FIXTURE_SSO = { config: null, identities: [] };

export const FIXTURE_FUNNELS = {
  funnels: [
    {
      id: "f-e2e-1", name: "E2E Test Funnel", description: "Funnel para E2E", status: "active",
      publicSlug: "e2e-test-funnel-xyz", publishedAt: new Date().toISOString(),
      stepsCount: 2, totalVisitors: 120, totalConversions: 30,
      steps: [
        { id: "s-e2e-1", funnelId: "f-e2e-1", type: "landing", name: "Landing Page", content: "<h1>Bienvenido</h1>", ctaLabel: "Empezar", ctaUrl: null, stepOrder: 0, visitors: 120, conversions: 60 },
        { id: "s-e2e-2", funnelId: "f-e2e-1", type: "form", name: "Formulario", content: "<form>Tus datos</form>", ctaLabel: "Enviar", ctaUrl: null, stepOrder: 1, visitors: 60, conversions: 30 },
      ],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
};

export const FIXTURE_BRIEF_TO_LAUNCH = {
  packs: [
    {
      id: "local-business-growth", name: "Crecimiento Local", tagline: "Landing + SEO local",
      availability: "available", estimatedMinutes: 45, inputs: [], outputs: [], accent: "#0084ff",
    },
    {
      id: "ecommerce-growth", name: "Crecimiento Ecommerce", tagline: "DTC growth",
      availability: "beta", estimatedMinutes: 60, inputs: [], outputs: [], accent: "#0084ff",
    },
  ],
  launches: [],
};

export const FIXTURE_COMPLIANCE = {
  summary: { total: 0, pending: 0, verified: 0, expiringSoon: 0 },
  artifacts: [],
};

export const FIXTURE_AUTOPILOT = {
  status: {
    tenantId: "t1", seoEnabled: false, socialEnabled: true, reputationEnabled: false, adsEnabled: false,
    seoDayOfMonth: 1, socialDayOfMonth: 1, lastSeoRunAt: null, lastSocialRunAt: "2026-06-01T08:00:00Z",
    lastReputationRunAt: null, lastAdsRunAt: null, updatedAt: new Date().toISOString(),
    activeCount: 1, nextSeoRun: null, nextSocialRun: "2026-07-01T08:00:00Z",
  },
};

export const FIXTURE_ENTREGABLES = {
  deliverables: [],
  summary: { total: 0, pendingReview: 0, approved: 0, avgQaScore: null, byType: {}, byStatus: {} },
};

export const FIXTURE_ENTREGABLES_DATA = {
  deliverables: [
    {
      id: "d-1", source: "os", type: "landing", title: "Landing ACME E2E",
      packId: "local-business-growth", status: "approved",
      qaScore: 91, legalPassed: true,
      downloadUrl: null, portalUrl: "/portal/deliverables/d-1",
      createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(),
    },
  ],
  summary: {
    total: 1, pendingReview: 0, approved: 1, avgQaScore: 91,
    byType: { landing: 1 }, byStatus: { approved: 1 },
  },
};

export const FIXTURE_PUBLICIDAD = {
  ok: true,
  attribution: {
    model: "last_click",
    channels: [{ channel: "meta", revenue: 12000, conversions: 48, roas: 4.2, spend: 2857 }],
    totalRevenue: 12000, totalConversions: 48, totalSpend: 2857,
  },
  connections: {
    meta: { status: "disconnected", accountName: null },
    google: { status: "disconnected", accountName: null },
    tiktok: { status: "disconnected", accountName: null },
  },
};

export const FIXTURE_ADS = {
  status: [
    { platform: "meta", connected: false },
    { platform: "google", connected: false },
    { platform: "linkedin", connected: false },
    { platform: "tiktok", connected: false },
  ],
};

export const FIXTURE_INTEGRATIONS = {
  catalog: [], connections: [],
  summary: { total: 0, connected: 0, envOnly: 0, oauthReady: 0 },
};

export const FIXTURE_MEMBERSHIPS = {
  program: null,
  plans: [
    {
      id: "plan-1", tenantId: "t1", name: "Pro", slug: "pro",
      priceAmount: 29.99, priceCurrency: "EUR", billingInterval: "month",
      includes: { courses: [], communities: [], features: ["Acceso total"] },
      affiliateCommissionPct: 10, isActive: true, stripePriceId: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
  communities: [],
  stats: { members: 0, activePlans: 1 },
};

export const FIXTURE_WHATSAPP_TEMPLATES = {
  templates: [
    {
      id: "t1", metaTemplateId: "meta-1", name: "promo_verano",
      language: "es", status: "APPROVED", category: "MARKETING",
      components: [
        { type: "HEADER", format: "TEXT", text: "¡Oferta especial!" },
        { type: "BODY", text: "Hola {{1}}, tienes un descuento del {{2}}%." },
      ],
      qualityScore: "GREEN",
      syncedAt: new Date().toISOString(),
    },
  ],
};

export const FIXTURE_WHATSAPP = {
  whatsapp_configured: true, provider: "meta", phone_number_id: "123456789",
  from_number: null,
  messages: [{ id: "m1", to: "+34600000001", body: "Hola!", status: "sent", createdAt: new Date().toISOString() }],
};

/** Cookie + default SaaS API mocks — use in beforeEach for authenticated pages. */
export async function setupAuthedSaas(page: Page, context: BrowserContext): Promise<void> {
  await setAuthCookie(context);
  await mockSaasApis(page);
}

export type EntregablesListFixture = {
  deliverables: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

/** List GET /api/saas/entregables — does NOT match /revenue or /:id subpaths. */
export async function mockEntregablesList(
  page: Page,
  payload: EntregablesListFixture,
): Promise<void> {
  await page.route("**/api/saas/entregables**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/revenue") || /\/entregables\/[^/]+$/.test(path)) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: payload });
  });
}

/** GET/POST /api/saas/entregables/revenue */
export async function mockEntregablesRevenue(
  page: Page,
  items: unknown[] = [],
): Promise<void> {
  await page.route("**/api/saas/entregables/revenue**", route => {
    if (route.request().method() === "POST") {
      return route.fulfill({ json: { refreshed: true, items: [] } });
    }
    return route.fulfill({ json: { items, model: "last_click", days: 30 } });
  });
}

export const FIXTURE_PWA_STATUS = {
  installable: true,
  scope: "/saas",
  manifestUrl: "/api/saas/pwa/manifest",
  fallbackManifestUrl: "/manifest-saas.json",
  swUrl: "/sw.js",
  offlineUrl: "/offline-saas.html",
  themeColor: "#0084ff",
  backgroundColor: "#020817",
  appName: "Nelvyon SaaS",
  whiteLabel: false,
  stats: { total: 3, byPlatform: { ios: 2, android: 1 }, lastInstalledAt: new Date().toISOString() },
};

/** Intercepts PWA endpoints. Call AFTER setupAuthedSaas (LIFO). */
export async function mockSaasPwa(page: Page): Promise<void> {
  await page.route("**/api/saas/pwa/install**", route =>
    route.fulfill({ json: { ok: true, id: "inst-1" } }));
  await page.route("**/api/saas/pwa/status**", route =>
    route.fulfill({ json: FIXTURE_PWA_STATUS }));
  await page.route("**/api/saas/pwa/manifest**", route =>
    route.fulfill({ contentType: "application/manifest+json", body: JSON.stringify({ name: "Nelvyon SaaS", short_name: "Nelvyon", scope: "/saas", start_url: "/saas/dashboard", display: "standalone", theme_color: "#0084ff", background_color: "#020817", icons: [] }) }));
}

export const FIXTURE_VOICE = {
  catalog: [
    { id: "nav_crm", phrases: ["crm", "ir a crm"], actionType: "navigate", route: "/saas/crm", description: "Abrir el CRM" },
    { id: "nav_packs", phrases: ["pack store", "packs"], actionType: "navigate", route: "/saas/packs", description: "Abrir el Pack Store" },
    { id: "act_refresh_playbooks", phrases: ["sincronizar playbooks"], actionType: "action", action: "refresh_playbooks", route: "/saas/playbooks", description: "Regenerar tus playbooks" },
    { id: "qry_subcuentas", phrases: ["cuantas subcuentas"], actionType: "query", action: "count_subcuentas", description: "Cuántas subcuentas tienes" },
  ],
  history: [
    { id: "v1", tenantId: "t1", userId: null, transcript: "ir a crm", matchedIntent: "nav_crm", actionType: "navigate", actionPayload: {}, success: true, errorMessage: null, source: "web_speech", createdAt: new Date().toISOString() },
  ],
};

/** Intercepts voice endpoints. Call AFTER setupAuthedSaas (LIFO). */
export async function mockSaasVoice(page: Page): Promise<void> {
  await page.route("**/api/saas/voice**", route => {
    if (route.request().url().includes("/parse") || route.request().url().includes("/execute")) {
      return route.fallback();
    }
    return route.fulfill({ json: FIXTURE_VOICE });
  });
  await page.route("**/api/saas/voice/parse**", route =>
    route.fulfill({ json: { result: { success: true, route: "/saas/crm", intent: { id: "nav_crm" } }, intent: { id: "nav_crm" } } }));
  await page.route("**/api/saas/voice/execute**", route =>
    route.fulfill({ json: { success: true, route: "/saas/crm", intent: { id: "nav_crm", actionType: "navigate", route: "/saas/crm" }, message: "Abrir el CRM" } }));
}

export const FIXTURE_PARTNER_ZONE = {
  eligibility: { eligible: true, plan: "agency", reason: "plan" },
  connect: { connected: false, accountId: null, status: "not_connected", chargesEnabled: false, payoutsEnabled: false, onboardedAt: null },
  summary: {
    eligible: true, plan: "agency", subcuentasActive: 2,
    recentSubcuentas: [
      { id: "s1", name: "Cliente Uno", status: "active" },
      { id: "s2", name: "Cliente Dos", status: "active" },
    ],
    marginTotal: 240.5, grossTotal: 600,
    connect: { connected: false, accountId: null, status: "not_connected", chargesEnabled: false, payoutsEnabled: false, onboardedAt: null },
    referralCode: "AGENCY99",
  },
  catalog: [
    { sku: "plan_pro", label: "Plan Pro", kind: "plan", wholesaleEur: 79, suggestedRetailEur: 199, retailEur: 199, marginEur: 120, marginPct: 60, hasOverride: false },
    { sku: "pack_local_growth", label: "Pack Crecimiento Local", kind: "pack", wholesaleEur: 49, suggestedRetailEur: 149, retailEur: 149, marginEur: 100, marginPct: 67, hasOverride: false },
  ],
};

const FIXTURE_PARTNER_LEDGER = {
  entries: [
    { source: "connect", grossEur: 100, wholesaleEur: 60, marginEur: 40, currency: "eur", status: "transferred", description: "Sub1", createdAt: new Date().toISOString() },
  ],
  totals: { gross: 100, wholesale: 60, margin: 40 },
};

/** Intercepts partner-zone endpoints. Call AFTER setupAuthedSaas (LIFO). */
export async function mockPartnerZone(page: Page): Promise<void> {
  await page.route("**/api/saas/partner/ledger**", route =>
    route.fulfill({ json: FIXTURE_PARTNER_LEDGER }));
  await page.route("**/api/saas/partner/referrals**", route =>
    route.fulfill({ json: { partner: { id: "p1", referralCode: "AGENCY99" }, referrals: [] } }));
  await page.route(/\/api\/saas\/partner(\?|$)/, route =>
    route.fulfill({ json: FIXTURE_PARTNER_ZONE }));
}

export const FIXTURE_DATA_PLAYBOOKS = {
  summary: { suggested: 2, active: 0, completed: 0, dismissed: 0 },
  playbooks: [
    {
      id: "pb-1", tenantId: "t1", slug: "improve-email-open-rate",
      title: "Mejora la apertura de tus emails", triggerReason: "Tu apertura (12.0%) está por debajo de la media del sector (21.2%)",
      category: "email", priority: 80, status: "suggested", contextSnapshot: {},
      renderedSummary: "Acme abre el 12.0% de sus emails frente al 21.2% del sector.",
      packId: null, ctaHref: "/saas/campanias",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      activatedAt: null, completedAt: null,
      steps: [
        { id: "st-1", playbookId: "pb-1", sortOrder: 0, stepType: "insight", title: "Diagnóstico", body: "Apertura 12.0% vs 21.2%", metadata: {}, completed: false },
        { id: "st-2", playbookId: "pb-1", sortOrder: 1, stepType: "email_draft", title: "Reescribe 3 asuntos", body: "Crea 3 variantes...", metadata: {}, completed: false },
      ],
    },
    {
      id: "pb-2", tenantId: "t1", slug: "launch-growth-pack",
      title: "Lanza tu primer pack de crecimiento", triggerReason: "Todavía no has lanzado ningún pack",
      category: "growth", priority: 90, status: "suggested", contextSnapshot: {},
      renderedSummary: "Acme puede generar landing, SEO y chatbot lanzando Crecimiento Local.",
      packId: "local-business-growth", ctaHref: "/saas/brief-to-launch?packId=local-business-growth",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      activatedAt: null, completedAt: null,
      steps: [
        { id: "st-3", playbookId: "pb-2", sortOrder: 0, stepType: "launch_pack", title: "Lanza el pack", body: "Lanza Crecimiento Local", metadata: { packId: "local-business-growth" }, completed: false },
      ],
    },
  ],
};

/** Intercepts data-playbooks endpoints. Call AFTER setupAuthedSaas (LIFO). */
export async function mockDataPlaybooks(page: Page): Promise<void> {
  await page.route("**/api/saas/data-playbooks/refresh**", route =>
    route.fulfill({ json: { generated: 2, playbooks: FIXTURE_DATA_PLAYBOOKS.playbooks } }));
  await page.route(/\/api\/saas\/data-playbooks\/[^/]+$/, route =>
    route.fulfill({ json: { playbook: FIXTURE_DATA_PLAYBOOKS.playbooks[0] } }));
  await page.route(/\/api\/saas\/data-playbooks(\?|$)/, route =>
    route.fulfill({ json: FIXTURE_DATA_PLAYBOOKS }));
}

export const FIXTURE_PACK_STORE = {
  summary: { totalPacks: 3, available: 2, owned: 1, launchesRemaining: 1 },
  catalog: [
    {
      id: "local-business-growth", slug: "local-growth", name: "Crecimiento Local",
      tagline: "Aparece en Google y convierte visitas en citas", category: "growth",
      availability: "available", outputs: ["Landing", "SEO local", "Chatbot"], estimatedMinutes: 8,
      launchPackId: "local-business-growth", access: "included", owned: true,
      launchesRemaining: 1, canLaunch: true,
    },
    {
      id: "ecommerce-growth", slug: "ecommerce-growth", name: "Crecimiento Ecommerce",
      tagline: "Tienda que vende y retargeting en Meta", category: "growth",
      availability: "available", outputs: ["Landing tienda", "Kit Meta Ads"], estimatedMinutes: 10,
      launchPackId: "ecommerce-growth", access: "purchasable", owned: false,
      launchesRemaining: null, canLaunch: false,
    },
    {
      id: "future-pack", slug: "future", name: "Pack Futuro", tagline: "Próximamente",
      category: "ads", availability: "coming_soon", outputs: [], estimatedMinutes: 5,
      launchPackId: null, access: "coming_soon", owned: false, launchesRemaining: null, canLaunch: false,
    },
  ],
  entitlements: [],
};

/** Intercepts pack store endpoints. Call AFTER setupAuthedSaas so it wins (LIFO). */
export async function mockPackStore(page: Page): Promise<void> {
  await page.route("**/api/saas/packs/*/purchase**", route =>
    route.fulfill({ json: { granted: true, source: "plan" } }));
  await page.route(/\/api\/saas\/packs(\?|$)/, route =>
    route.fulfill({ json: FIXTURE_PACK_STORE }));
}

export const FIXTURE_BENCHMARK = {
  dashboard: {
    tenantId: "t1",
    sectorKey: "ecommerce",
    sectorLabel: "E-commerce",
    periodDays: 30,
    clientMetrics: [
      { key: "email_open_rate", label: "Tasa de apertura email", value: 0.31, unit: "%", source: "Campañas email" },
      { key: "conversion_rate", label: "Tasa de conversión", value: 0.04, unit: "%", source: "Atribución de leads" },
      { key: "roas", label: "ROAS publicidad", value: 4.6, unit: "x", source: "Métricas de ads" },
    ],
    industryMetrics: { email_open_rate: 0.1568, conversion_rate: 0.0257, roas: 4.12 },
    comparisons: [
      { key: "email_open_rate", label: "Tasa de apertura email", clientValue: 0.31, industryValue: 0.1568, unit: "%", deltaPct: 97.7, higherBetter: true, rating: "excelente" },
      { key: "conversion_rate", label: "Tasa de conversión", clientValue: 0.04, industryValue: 0.0257, unit: "%", deltaPct: 55.6, higherBetter: true, rating: "excelente" },
      { key: "roas", label: "ROAS publicidad", clientValue: 4.6, industryValue: 4.12, unit: "x", deltaPct: 11.7, higherBetter: true, rating: "bueno" },
    ],
    summary: { metricsTracked: 3, metricsCompared: 3, aboveIndustry: 3, belowIndustry: 0, overallScore: 100 },
    dataSources: ["Campañas email", "Atribución de leads", "Métricas de ads"],
    degraded: false,
    computedAt: new Date().toISOString(),
  },
  fromSnapshot: false,
};

/** Intercepts benchmark endpoints with a populated fixture dashboard. */
export async function mockSectorBenchmark(page: Page): Promise<void> {
  // Register broad pattern first; specific refresh last (Playwright LIFO → refresh wins).
  await page.route("**/api/saas/benchmark**", route =>
    route.fulfill({ json: FIXTURE_BENCHMARK }));
  await page.route("**/api/saas/benchmarks/sectors**", route =>
    route.fulfill({ json: { sectors: [{ key: "ecommerce", label: "E-commerce" }] } }));
  await page.route("**/api/saas/benchmark/refresh**", route =>
    route.fulfill({ json: { dashboard: FIXTURE_BENCHMARK.dashboard } }));
}

// ─── Route interceptors ──────────────────────────────────────────────────────

/** Intercepts /api/saas/* with fixtures. Catch-all registered FIRST (LIFO → lowest priority). */
export async function mockSaasApis(page: Page): Promise<void> {
  await page.route("**/api/saas/**", route =>
    route.fulfill({ json: { ok: true }, status: 200 }));

  await page.route("**/api/saas/settings**", route =>
    route.fulfill({ json: FIXTURE_SETTINGS }));
  await page.route("**/api/saas/crm/contacts**", route =>
    route.fulfill({ json: FIXTURE_CONTACTS }));
  await page.route("**/api/saas/deals**", route =>
    route.fulfill({ json: FIXTURE_DEALS }));
  await page.route("**/api/saas/campanias**", route =>
    route.fulfill({ json: FIXTURE_CAMPANIAS }));
  await page.route("**/api/saas/workflows**", route =>
    route.fulfill({ json: FIXTURE_WORKFLOWS }));
  await page.route("**/api/saas/billing**", route =>
    route.fulfill({ json: FIXTURE_BILLING }));
  await page.route("**/api/saas/audit**", route =>
    route.fulfill({ json: FIXTURE_AUDIT }));
  await page.route("**/api/saas/affiliates**", route =>
    route.fulfill({ json: FIXTURE_AFFILIATES }));
  await page.route("**/api/saas/loyalty**", route =>
    route.fulfill({ json: FIXTURE_LOYALTY }));
  await page.route("**/api/saas/api-keys**", route =>
    route.fulfill({ json: FIXTURE_API_KEYS }));
  await page.route("**/api/saas/lead-scoring**", route =>
    route.fulfill({ json: FIXTURE_LEAD_SCORING }));
  await page.route("**/api/saas/reportes**", route =>
    route.fulfill({ json: FIXTURE_REPORTES }));
  await page.route("**/api/saas/sso**", route =>
    route.fulfill({ json: FIXTURE_SSO }));
  await page.route("**/api/saas/pipeline**", route =>
    route.fulfill({ json: FIXTURE_DEALS }));
  await page.route("**/api/saas/funnels**", route =>
    route.fulfill({ json: FIXTURE_FUNNELS }));
  await page.route("**/api/saas/inbox**", route =>
    route.fulfill({ json: { conversations: [], total: 0 } }));
  await page.route("**/api/saas/brief-to-launch**", route => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, json: { launch: { id: "launch-e2e", status: "queued", packId: "local-business-growth" } } });
    }
    return route.fulfill({ json: FIXTURE_BRIEF_TO_LAUNCH });
  });
  await page.route("**/api/saas/compliance**", route => {
    if (route.request().url().includes("/sync")) {
      return route.fulfill({ json: { synced: 0, artifacts: [] } });
    }
    return route.fulfill({ json: FIXTURE_COMPLIANCE });
  });
  await page.route("**/api/saas/autopilot**", route => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({ json: { settings: FIXTURE_AUTOPILOT.status } });
    }
    return route.fulfill({ json: FIXTURE_AUTOPILOT });
  });
  await mockEntregablesRevenue(page);
  await mockEntregablesList(page, FIXTURE_ENTREGABLES_DATA);
  await page.route("**/api/saas/publicidad**", route =>
    route.fulfill({ json: FIXTURE_PUBLICIDAD }));
  await page.route("**/api/saas/ads**", route => {
    const url = route.request().url();
    if (url.includes("attribution")) {
      return route.fulfill({ json: { roas: [] } });
    }
    if (url.includes("campaigns")) {
      return route.fulfill({ json: { campaigns: [] } });
    }
    return route.fulfill({ json: FIXTURE_ADS });
  });
  await page.route("**/api/saas/integrations**", route =>
    route.fulfill({ json: FIXTURE_INTEGRATIONS }));
  await page.route("**/api/saas/memberships**", route =>
    route.fulfill({ json: FIXTURE_MEMBERSHIPS }));
  // Broad pattern first; specific subpaths last (Playwright LIFO → specific wins).
  await page.route("**/api/saas/whatsapp**", route => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        json: {
          message: { id: "m2", to: "+34600000099", body: "[template]", status: "sent", createdAt: new Date().toISOString() },
          provider: "meta",
        },
      });
    }
    return route.fulfill({ json: FIXTURE_WHATSAPP });
  });
  await page.route("**/api/saas/whatsapp/catalog**", route =>
    route.fulfill({ json: { products: [] } }));
  await page.route("**/api/saas/whatsapp/templates**", route =>
    route.fulfill({ json: FIXTURE_WHATSAPP_TEMPLATES }));
  await page.route("**/api/saas/contracts**", route =>
    route.fulfill({ json: { contracts: [] } }));
  await page.route("**/api/saas/quotes**", route =>
    route.fulfill({ json: { quotes: [] } }));
  await page.route("**/api/saas/playbooks**", route => {
    const url = route.request().url();
    if (url.includes("resource=forecast")) {
      return route.fulfill({ json: { forecast: { weightedTotal: 0, bestCase: 0, committed: 0, byStage: [] } } });
    }
    return route.fulfill({ json: { playbooks: [] } });
  });
  await page.route("**/api/saas/web-builder**", route =>
    route.fulfill({ json: { sites: [] } }));
  await mockSaasVoice(page);
  await mockSectorBenchmark(page);
  // Re-register last (Playwright LIFO) so funnels mock always wins over catch-all.
  await page.route("**/api/saas/funnels**", route =>
    route.fulfill({ json: FIXTURE_FUNNELS }));
}

/** Funnels list + optional analytics/variants for depth E2E. Register after mockSaasApis. */
export async function mockSaasFunnelsDepth(
  page: Page,
  analytics: Record<string, unknown> = {
    analytics: {
      funnelId: "f-e2e-1",
      totalVisitors: 120,
      totalConversions: 30,
      overallCvr: 25.0,
      steps: [
        { id: "s-e2e-1", name: "Landing Page", type: "landing", stepOrder: 0, visitors: 120, conversions: 60, cvr: 50.0, dropOff: 0, variants: [] },
        { id: "s-e2e-2", name: "Formulario", type: "form", stepOrder: 1, visitors: 60, conversions: 30, cvr: 50.0, dropOff: 50, variants: [] },
      ],
    },
  },
): Promise<void> {
  await page.route((url) => url.pathname.includes("/api/saas/funnels"), route => {
    const reqUrl = route.request().url();
    if (reqUrl.includes("resource=analytics")) {
      return route.fulfill({ json: analytics });
    }
    if (reqUrl.includes("resource=variants")) {
      return route.fulfill({ json: { variants: [] } });
    }
    return route.fulfill({ json: FIXTURE_FUNNELS });
  });
}

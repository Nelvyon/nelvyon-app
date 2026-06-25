/**
 * Shared Playwright fixtures and API mock helpers for SaaS E2E suite.
 *
 * Auth strategy: middleware only checks that `nelvyon_token` cookie is
 * present (non-empty). We set a dummy value and then intercept all
 * `/api/saas/*` calls with page.route() so no real DB is needed in CI.
 */
import { type Page, type BrowserContext } from "@playwright/test";

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

// ─── Route interceptors ──────────────────────────────────────────────────────

/** Intercepts ALL /api/saas/* calls and returns fixture data. */
export async function mockSaasApis(page: Page): Promise<void> {
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

  await page.route("**/api/saas/**", route =>
    route.fulfill({ json: { ok: true }, status: 200 }));
}

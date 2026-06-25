import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, LOGIN_URL } from "./fixtures";

const FIXTURE_CONVS = {
  conversations: [
    {
      id: "cv-e2e-1",
      contactId: "c1", contactName: "Ana García", contactEmail: "ana@example.com", contactPhone: null,
      channel: "email", status: "open", priority: "normal",
      assignedTo: null, threadId: "thread-1", subject: "Consulta",
      firstResponseAt: null,
      slaDueAt: new Date(Date.now() + 1800_000).toISOString(), // 30 min away = at risk
      slaBreached: false,
      unreadCount: 2,
      lastMessage: "Hola, necesito ayuda",
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
};

const FIXTURE_MESSAGES = {
  messages: [
    { id: "m1", direction: "inbound", channel: "email", body: "Hola, necesito ayuda", status: "sent", createdAt: new Date().toISOString() },
    { id: "m2", direction: "outbound", channel: "email", body: "Con mucho gusto te ayudamos", status: "delivered", createdAt: new Date().toISOString() },
  ],
};

test.describe("SaaS Inbox Depth (S38)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);

    await page.route("**/api/saas/inbox**", route => {
      const url = route.request().url();
      if (url.includes("view=threads")) {
        return route.fulfill({ json: { threads: [] } });
      }
      if (url.includes("sla=at_risk")) {
        return route.fulfill({ json: { conversations: FIXTURE_CONVS.conversations.filter(c => c.slaBreached || c.slaDueAt) } });
      }
      return route.fulfill({ json: FIXTURE_CONVS });
    });

    await page.route("**/api/saas/inbox/cv-e2e-1/messages**", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: FIXTURE_MESSAGES });
      }
      return route.fulfill({ json: { message: { id: "m3", direction: "outbound", channel: "email", body: "Respuesta", status: "sent", createdAt: new Date().toISOString() }, channel_dispatched: false } });
    });

    await page.route("**/api/saas/team**", route =>
      route.fulfill({ json: { members: [{ id: "member1", name: "Carlos", email: "carlos@n.com", role: "user", status: "active" }] } }),
    );
  });

  test("inbox carga sin error con KPIs y lista de conversaciones", async ({ page }) => {
    await page.goto("/saas/inbox", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    await page.waitForTimeout(700);

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    // Header
    expect(body).toContain("Bandeja unificada");
    // KPI cards
    expect(body).toContain("Abiertas");
    expect(body).toContain("En riesgo SLA");
    expect(body).toContain("SLA incumplido");
  });

  test("filtro de canal funciona y tabs hilos/conversaciones visibles", async ({ page }) => {
    await page.goto("/saas/inbox");
    await page.waitForTimeout(600);

    const body = await page.locator("body").textContent();
    // Tabs
    expect(body).toContain("Conversaciones");
    expect(body).toContain("Hilos por contacto");
    // Channel filter buttons
    expect(body).toContain("📧");
    expect(body).toContain("💬");
    expect(body).toContain("📱");
  });

  test("SLA badge visible cuando hay conversación con slaDueAt próximo", async ({ page }) => {
    await page.goto("/saas/inbox");
    await page.waitForTimeout(600);

    const body = await page.locator("body").textContent();
    // Ana García should appear
    expect(body).toContain("Ana García");
    // SLA badge for at-risk conversation (30 min)
    expect(body).toMatch(/SLA\s+\d+m/);
  });
});

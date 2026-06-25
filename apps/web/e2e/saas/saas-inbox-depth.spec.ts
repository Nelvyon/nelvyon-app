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
      slaDueAt: new Date(Date.now() + 1800_000).toISOString(),
      slaBreached: false,
      unreadCount: 2,
      lastMessage: "Hola, necesito ayuda",
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ],
};

test.describe("SaaS Inbox Depth (S38)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await page.route("**/api/saas/inbox**", route => {
      const url = route.request().url();
      if (url.includes("view=threads")) {
        return route.fulfill({ json: { threads: [] } });
      }
      if (url.includes("sla=at_risk")) {
        return route.fulfill({ json: { conversations: FIXTURE_CONVS.conversations } });
      }
      return route.fulfill({ json: FIXTURE_CONVS });
    });
    await page.route("**/api/saas/team**", route =>
      route.fulfill({ json: { members: [{ id: "member1", name: "Carlos", email: "carlos@n.com", role: "user", status: "active" }] } }),
    );
    await mockSaasApis(page);
  });

  test("inbox S38 smoke — KPIs, tabs, canal y SLA badge", async ({ page }) => {
    await page.goto("/saas/inbox", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    await page.waitForTimeout(800);

    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    expect(body).toContain("Bandeja unificada");
    expect(body).toContain("Abiertas");
    expect(body).toContain("Conversaciones");
    expect(body).toContain("Hilos por contacto");
  });
});

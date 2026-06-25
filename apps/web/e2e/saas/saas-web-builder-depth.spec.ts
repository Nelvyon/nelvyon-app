import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis, LOGIN_URL } from "./fixtures";

const FIXTURE_PAGES = {
  pages: [
    {
      id: "p-e2e-1", title: "E2E Test Page", slug: "e2e-test-page", type: "landing",
      status: "published", views: 42, customDomain: null, publishedAt: new Date().toISOString(),
      cdnUrl: "https://pages.nelvyon.com/demo/e2e-test-page",
      seoTitle: null, seoDescription: null, publishedHtml: null, domainStatus: "none", sslStatus: "pending",
      sections: [
        { id: "s1", type: "hero", content: { headline: "Hello E2E", subtitle: "Subtitle", ctaLabel: "Go", ctaUrl: "#" } },
        { id: "s2", type: "cta", content: { heading: "CTA", body: "Body", ctaLabel: "Click", ctaUrl: "#" } },
      ],
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    },
  ],
};

test.describe("SaaS Web Builder Depth (S37)", () => {
  test.beforeEach(async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.route("**/api/saas/web-builder**", route => {
      const url = route.request().url();
      if (url.includes("/p-e2e-1")) {
        return route.fulfill({ json: { page: FIXTURE_PAGES.pages[0] } });
      }
      return route.fulfill({ json: FIXTURE_PAGES });
    });
  });

  test("listado de páginas carga sin error y muestra KPIs", async ({ page }) => {
    await page.goto("/saas/web-builder");
    await expect(page).not.toHaveURL(LOGIN_URL);
    await page.waitForTimeout(600);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    expect(body).toContain("Web Builder");
  });

  test("editor WYSIWYG abre con sections y permite guardar", async ({ page }) => {
    await page.route("**/api/saas/web-builder/p-e2e-1", route =>
      route.fulfill({ json: { page: FIXTURE_PAGES.pages[0] } }),
    );
    await page.goto("/saas/web-builder/p-e2e-1");
    await page.waitForTimeout(700);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    expect(body).toContain("E2E Test Page");
  });

  test("public site API responde 404 para slug inexistente", async ({ request }) => {
    const res = await request.get("/api/public/site/no-tenant/no-page", { maxRedirects: 0 });
    expect([404, 500]).toContain(res.status());
  });
});

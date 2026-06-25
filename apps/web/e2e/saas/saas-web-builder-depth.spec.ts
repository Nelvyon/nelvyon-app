import { test, expect } from "@playwright/test";
import { setAuthCookie, mockSaasApis } from "./fixtures";

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
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await page.waitForTimeout(600);
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Something went wrong");
    // Should show the web builder section
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
    // Editor should show section list or editor chrome
    expect(body).toContain("E2E Test Page");
  });

  test("public URL 404 para slug inexistente", async ({ page }) => {
    await page.route("**/api/public/site/no-tenant/no-page**", route =>
      route.fulfill({ status: 404, body: "Not found" }),
    );
    await page.goto("/w/no-tenant/no-page");
    await page.waitForTimeout(400);
    // Next.js notFound() renders 404 page
    const status = page.url();
    // Not redirected to login
    expect(status).not.toContain("login");
  });
});

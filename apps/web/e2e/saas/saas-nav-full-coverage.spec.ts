/**
 * E2E smoke — all SaaS nav routes load without 500 (59 modules).
 */
import { test, expect } from "@playwright/test";
import { SAAS_NAV_ITEMS } from "../../src/features/saas-shell/saasNav";
import { setAuthCookie, mockSaasApis, LOGIN_URL } from "./fixtures";

const SKIP_HREFS = new Set<string>();

for (const item of SAAS_NAV_ITEMS) {
  if (SKIP_HREFS.has(item.href)) continue;

  test(`SaaS nav ${item.id} — ${item.href} loads`, async ({ page, context }) => {
    await setAuthCookie(context);
    await mockSaasApis(page);
    await page.goto(item.href, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    const body = await page.locator("body").textContent();
    expect(body ?? "").not.toContain("Internal Server Error");
  });
}

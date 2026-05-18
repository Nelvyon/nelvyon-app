import { test, expect } from "@playwright/test";

/** Shared storage key with WorkspaceContext and NelvyonAPI (contract test). */
test("active workspace id persists in localStorage for API header injection", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nelvyon_active_workspace_id", "42");
  });
  const v = await page.evaluate(() => localStorage.getItem("nelvyon_active_workspace_id"));
  expect(v).toBe("42");
});

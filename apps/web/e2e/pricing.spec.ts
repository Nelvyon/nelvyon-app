import { expect, test } from "@playwright/test";

test("Click en Empezar con Pro navega a /auth/register?plan=pro", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Empezar con Pro" }).click();
  await expect(page).toHaveURL(/\/auth\/register\?plan=pro$/);
});

test("Click en Empezar con Starter navega a /auth/register?plan=starter", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Empezar con Starter" }).click();
  await expect(page).toHaveURL(/\/auth\/register\?plan=starter$/);
});

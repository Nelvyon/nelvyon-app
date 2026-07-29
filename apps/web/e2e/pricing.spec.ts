import { expect, test } from "@playwright/test";

test("Click en Empezar con Pro navega a login con next del plan", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Empezar con Pro/i }).first().click();
  await expect(page).toHaveURL(/\/login\?next=.*plan%3Dpro/);
});

test("Click en Empezar con Starter navega a login con next del plan", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Empezar con Starter/i }).first().click();
  await expect(page).toHaveURL(/\/login\?next=.*plan%3Dstarter/);
});

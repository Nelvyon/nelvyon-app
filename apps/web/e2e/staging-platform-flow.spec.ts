import { expect, test, type Page, request as playwrightRequest } from "@playwright/test";

const email = process.env.STAGING_E2E_EMAIL ?? "qa-audit-20260612@nelvyon.test";
const password = process.env.STAGING_E2E_PASSWORD ?? "StagingQA2026!";

async function dismissCookieBanner(page: Page) {
  const accept = page.getByRole("button", { name: /aceptar todo/i });
  if (await accept.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await accept.click();
  }
}

async function loginAsQa(page: Page, baseURL: string) {
  const origin = baseURL.replace(/\/$/, "");
  const api = await playwrightRequest.newContext({ baseURL: origin });
  const res = await api.post("/api/auth/login", { data: { email, password } });
  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);
  await api.dispose();
  await page.goto("/dashboard");
  await dismissCookieBanner(page);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText(email)).toBeVisible({ timeout: 60_000 });
}

test.describe("Staging platform flow", () => {
  test("login → workspace → client → campaign → detail", async ({ page, baseURL }) => {
    const stamp = Date.now();
    const clientName = `E2E Client ${stamp}`;
    const campaignName = `E2E Campaign ${stamp}`;

    await loginAsQa(page, baseURL ?? "");

    await expect(page.getByText(/workspaces unavailable|workspaces no disponibles/i)).not.toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/crm/clients/new");
    await dismissCookieBanner(page);
    await page.getByLabel(/nombre comercial|business/i).fill(clientName);
    await page.getByLabel(/sector/i).fill("Tech");
    await page.getByRole("button", { name: /crear cliente/i }).click();
    await expect(page).toHaveURL(/\/crm\/clients\/\d+/, { timeout: 30_000 });

    await page.goto("/campaigns/new");
    await dismissCookieBanner(page);
    await expect(page.getByLabel(/cliente/i)).toBeVisible({ timeout: 20_000 });
    await page.getByLabel(/cliente/i).selectOption({ label: clientName });
    await page.getByLabel(/nombre de la campaña/i).fill(campaignName);
    await page.getByRole("button", { name: /crear campaña/i }).click();
    await expect(page).toHaveURL(/\/campaigns\/\d+/, { timeout: 30_000 });

    await page.goto("/campaigns");
    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("link", { name: campaignName }).click();
    await expect(page).toHaveURL(/\/campaigns\/\d+/);
    await expect(page.getByRole("heading", { level: 1, name: campaignName })).toBeVisible({
      timeout: 20_000,
    });
  });
});

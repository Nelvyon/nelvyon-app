/**
 * S55 — E2E: Voice Command
 */
import { expect, test } from "@playwright/test";
import { setupAuthedSaas, mockSaasVoice, expectUnauthorizedApi, LOGIN_URL } from "./fixtures";

test.describe("S55 — /saas/voice page", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthedSaas(page, context);
    await mockSaasVoice(page);
  });

  test("page loads without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("header visible", async ({ page }) => {
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Comandos de voz/ })).toBeVisible({ timeout: 10_000 });
  });

  test("catalog commands render", async ({ page }) => {
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Abrir el CRM")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Abrir el Pack Store")).toBeVisible();
  });

  test("history shows past transcript", async ({ page }) => {
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await page.waitForResponse("**/api/saas/voice**", { timeout: 15_000 });
    await expect(page.getByText("«ir a crm»")).toBeVisible({ timeout: 15_000 });
  });

  test("nav sidebar shows Voz item", async ({ page }) => {
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Voz/i })).toBeVisible();
  });

  test("voice FAB present in shell when supported", async ({ page }) => {
    // Inject a stub SpeechRecognition so the FAB renders deterministically.
    await page.addInitScript(() => {
      class FakeRec {
        lang = ""; continuous = false; interimResults = false;
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() { /* noop */ }
        stop() { /* noop */ }
      }
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRec;
    });
    await page.goto("/saas/voice", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Comando de voz/i })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("S55 — Voice API auth", () => {
  test("GET /api/saas/voice requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/voice");
  });

  test("POST /api/saas/voice/parse requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/voice/parse", "POST", { transcript: "ir a crm" });
  });

  test("POST /api/saas/voice/execute requires auth", async ({ request }) => {
    await expectUnauthorizedApi(request, "/api/saas/voice/execute", "POST", { transcript: "ir a crm" });
  });
});

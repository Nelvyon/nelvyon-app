/**
 * Captures real SaaS UI screenshots for the public marketing site.
 *
 * Auth: cookie + API fixtures (same pattern as e2e/saas). Renders the real
 * Next.js `/saas/*` React UI with demo-safe data — no production login.
 *
 * Output (raw PNG): apps/web/public/brand/public/saas-shots/raw/
 * Optimized WebP:  apps/web/public/brand/public/saas-shots/
 *
 * Run (server already on 3010):
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 pnpm exec playwright test --config playwright.marketing-shots.config.ts
 *   node apps/web/scripts/optimize-saas-shots.mjs
 */
import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { setAuthCookie } from "./fixtures";
import { mockMarketingSaasApis } from "./marketingDemoData";

const OUT_DIR = path.resolve(__dirname, "../../public/brand/public/saas-shots/raw");

type Shot = {
  id: string;
  path: string;
  waitForText?: string | RegExp;
  viewport?: { width: number; height: number };
  /** Click a tab/button before capture (e.g. Deals) */
  clickText?: string | RegExp;
};

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const SHOTS: Shot[] = [
  { id: "dashboard", path: "/saas/dashboard", waitForText: /Aether Labs|Pipeline|Dashboard/i },
  { id: "crm", path: "/saas/crm", waitForText: /Marina Solís|Contactos/i },
  {
    id: "pipeline",
    path: "/saas/pipeline",
    waitForText: /Pipeline|Deals|Nimbus/i,
    clickText: /Deals\s*\(/i,
  },
  { id: "workflows", path: "/saas/workflows", waitForText: /Lead scoring|Workflow|Automatiz/i },
  { id: "agentes", path: "/saas/agentes", waitForText: /Agente|copy|pipeline|IA/i },
  { id: "ai", path: "/saas/ai", waitForText: /Panel IA|Router|MCP/i },
  { id: "chat", path: "/saas/chat", waitForText: /Chat|IA|convers|mensaje/i },
  { id: "analytics", path: "/saas/reportes", waitForText: /Report|Analít|leads|Canal/i },
  { id: "calendar", path: "/saas/citas", waitForText: /Cita|Calend|Demo CRM|Marina/i },
  { id: "campanias", path: "/saas/campanias", waitForText: /Campaña|Onboarding|Nurturing/i },
  { id: "billing", path: "/saas/billing", waitForText: /Billing|Factur|Plan|Agency|Stripe/i },
  { id: "store", path: "/saas/store", waitForText: /Store|Ecommerce|Producto|Plan/i },
  { id: "lms", path: "/saas/lms", waitForText: /LMS|Curso|Onboarding|Workflows/i },
  { id: "integraciones", path: "/saas/integraciones", waitForText: /Integracion|Stripe|SES|Twilio/i },
  { id: "settings", path: "/saas/settings", waitForText: /Settings|Ajustes|Aether|Equipo|Plan/i },
  { id: "inbox", path: "/saas/inbox", waitForText: /Inbox|Marina|Bandeja|convers/i },
  {
    id: "dashboard-mobile",
    path: "/saas/dashboard",
    viewport: MOBILE,
    waitForText: /Aether Labs|Dashboard|Pipeline/i,
  },
  {
    id: "crm-mobile",
    path: "/saas/crm",
    viewport: MOBILE,
    waitForText: /Marina|Contactos/i,
  },
];

test.describe.configure({ mode: "serial" });

test("capture marketing SaaS shots", async ({ page, context }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await setAuthCookie(context, process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010");
  await mockMarketingSaasApis(page);

  await context.addInitScript(() => {
    localStorage.setItem(
      "nelvyon_cookie_consent",
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
    );
  });

  await page.addStyleTag({
    content: `
      [data-sonner-toaster], .Toastify, nextjs-portal, [data-nextjs-toast],
      [data-nextjs-dialog-overlay], #nelvyon-cookie-banner, [class*="CookieBanner"] {
        display: none !important; visibility: hidden !important;
      }
      * { scroll-behavior: auto !important; }
    `,
  });

  const manifest: Array<{ id: string; file: string; route: string; capturedAt: string; ok: boolean }> = [];

  for (const shot of SHOTS) {
    const vp = shot.viewport ?? DESKTOP;
    await page.setViewportSize(vp);
    // Retry navigation if Next.js restarted under memory pressure
    let navigated = false;
    for (let attempt = 0; attempt < 4 && !navigated; attempt++) {
      try {
        await page.goto(shot.path, { waitUntil: "commit", timeout: 120_000 });
        navigated = true;
      } catch (err) {
        const msg = String(err);
        if (!/ERR_ABORTED|ECONNREFUSED|ERR_CONNECTION/i.test(msg) || attempt === 3) throw err;
        await page.waitForTimeout(4000 * (attempt + 1));
      }
    }
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForTimeout(2200);

    // Dismiss cookie banner if still visible
    const accept = page.getByRole("button", { name: /Aceptar todo|Solo necesarias/i }).first();
    if (await accept.isVisible().catch(() => false)) {
      await accept.click().catch(() => undefined);
      await page.waitForTimeout(300);
    }

    if (shot.waitForText) {
      try {
        await page.getByText(shot.waitForText).first().waitFor({ timeout: 15_000 });
      } catch {
        // continue — quality gate below
      }
    }

    if (shot.clickText) {
      const tab = page.getByText(shot.clickText).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click().catch(() => undefined);
        await page.waitForTimeout(800);
      }
    }

    const crashed = await page.getByText(/Algo salió mal|unexpected error/i).first().isVisible().catch(() => false);
    const file = `${shot.id}.png`;
    const out = path.join(OUT_DIR, file);
    await page.screenshot({
      path: out,
      type: "png",
      fullPage: false,
      animations: "disabled",
    });
    manifest.push({
      id: shot.id,
      file,
      route: shot.path,
      capturedAt: new Date().toISOString(),
      ok: !crashed,
    });
    if (crashed) {
      console.warn(`[shot] ERROR PAGE captured for ${shot.id} (${shot.path})`);
    } else {
      console.log(`[shot] ok ${shot.id}`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const failed = manifest.filter((m) => !m.ok);
  if (failed.length) {
    throw new Error(`Failed shots (error UI): ${failed.map((f) => f.id).join(", ")}`);
  }
});

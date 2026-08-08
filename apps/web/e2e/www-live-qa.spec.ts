import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PAGES = [
  "/www/index.html",
  "/www/pricing.html",
  "/www/contact.html",
  "/www/about.html",
  "/www/features.html",
  // Home 08 (`index.html`) y SaaS 02 (`saas.html`) son las dos paginas AIOR
  // vigentes. `home-ai-agent.html` y `home-saas-product-showcase.html` se
  // consolidaron en ellas y ya no existen.
  "/www/saas.html",
  "/www/blog.html",
  "/www/team.html",
  "/www/faq.html",
];

type QaResult = Record<string, unknown>;
const results: QaResult[] = [];

for (const route of PAGES) {
  test(`QA live ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failed404: { status: number; url: string }[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));
    page.on("response", (res) => {
      if (res.status() === 404 && res.url().includes("/www/")) {
        failed404.push({ status: 404, url: res.url().slice(0, 200) });
      }
    });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const imgs = [...document.images].map((img) => {
        const nw = img.naturalWidth || 0;
        const dw = img.clientWidth || 0;
        return {
          src: (img.currentSrc || img.src || "").replace(/^.*\/www\//, ""),
          pixelated: nw > 0 && dw > 120 && nw < dw * 0.55,
          broken: img.complete && nw === 0 && !!img.src,
        };
      });
      return {
        overflowX: doc.scrollWidth > doc.clientWidth + 2,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        pixelated: imgs.filter((i) => i.pixelated).slice(0, 8),
        brokenImgs: imgs.filter((i) => i.broken).slice(0, 8),
      };
    });
    const realConsole = consoleErrors.filter(
      (t) =>
        !/favicon\.ico|Download the React DevTools|third-party cookie|data:application\/font-woff|Failed to decode downloaded font|OTS parsing error|Content Security Policy|Framing 'https:\/\/www\.google\.com/i.test(
          t
        )
    );
    const uniq404 = [...new Map(failed404.map((f) => [f.url, f])).values()];
    const ok =
      !metrics.overflowX &&
      metrics.brokenImgs.length === 0 &&
      metrics.pixelated.length === 0 &&
      realConsole.length === 0 &&
      pageErrors.length === 0 &&
      uniq404.length === 0;
    results.push({
      path: route,
      viewport: page.viewportSize(),
      ok,
      overflowX: metrics.overflowX,
      pixelatedCount: metrics.pixelated.length,
      brokenImgs: metrics.brokenImgs,
      consoleErrors: [...new Set(realConsole)].slice(0, 8),
      pageErrors: [...new Set(pageErrors)].slice(0, 8),
      failed404: uniq404.slice(0, 12),
    });
    expect(ok, JSON.stringify(results[results.length - 1], null, 2)).toBeTruthy();
  });
}

test.afterAll(() => {
  const _outDir = path.join(process.cwd(), "..", "..", "docs", "evidence", "public-web-aior-nelvyon");
  // when cwd is apps/web
  const candidates = [
    path.join(process.cwd(), "docs", "evidence", "public-web-aior-nelvyon"),
    path.join(process.cwd(), "..", "..", "docs", "evidence", "public-web-aior-nelvyon"),
    path.resolve(process.cwd(), "../../docs/evidence/public-web-aior-nelvyon"),
  ];
  const dir = candidates.find((d) => fs.existsSync(path.dirname(d))) || candidates[1];
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    passCount: results.filter((r) => r.ok).length,
    failCount: results.filter((r) => !r.ok).length,
    results,
  };
  fs.writeFileSync(path.join(dir, "live-qa-final.json"), JSON.stringify(payload, null, 2));
});

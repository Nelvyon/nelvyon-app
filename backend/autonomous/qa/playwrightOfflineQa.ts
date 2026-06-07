/**
 * Phase F — offline Playwright QA on static landing HTML preview.
 * Falls back to DOM-parse checks if Playwright browser unavailable.
 */

export interface PlaywrightQaCheck {
  id: string;
  passed: boolean;
  message: string;
  /** When true, failure blocks Phase H staging handoff */
  blocking?: boolean;
}

export interface PlaywrightQaResult {
  passed: boolean;
  checks: PlaywrightQaCheck[];
  mode: "playwright" | "dom-parse";
}

const PROHIBITED_PATTERNS = [
  /el mejor restaurante del mundo/i,
  /100%\s*garantizado/i,
  /michelin\s+seguro/i,
  /sin gluten certificado sin documento/i,
  /#1\s+en\s+el\s+mundo/i,
];

async function tryLoadPlaywright(): Promise<typeof import("playwright") | null> {
  if (process.env.AUTONOMOUS_PLAYWRIGHT_QA !== "1") return null;
  try {
    const spec = "playwright";
    const importer = new Function("s", "return import(s)") as (s: string) => Promise<typeof import("playwright")>;
    return await importer(spec);
  } catch {
    return null;
  }
}

export async function runPlaywrightOfflineQa(html: string): Promise<PlaywrightQaResult> {
  const pw = await tryLoadPlaywright();
  if (!pw) return runDomParseFallback(html);

  try {
    const { chromium } = pw;
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const checks = await runPlaywrightChecks(page);
      await page.setViewportSize({ width: 375, height: 812 });
      const mobileHero = await page.locator('[data-section="hero"]').isVisible();
      checks.push({
        id: "PW-MOBILE-01",
        passed: mobileHero,
        message: mobileHero ? "Hero visible at 375px" : "Hero not visible on mobile viewport",
      });
      const passed = checks.every((c) => c.passed);
      return { passed, checks, mode: "playwright" };
    } finally {
      await browser.close();
    }
  } catch {
    return runDomParseFallback(html);
  }
}

async function runPlaywrightChecks(page: {
  locator: (s: string) => { isVisible: () => Promise<boolean>; textContent: () => Promise<string | null> };
  title: () => Promise<string>;
  evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<PlaywrightQaCheck[]> {
  const checks: PlaywrightQaCheck[] = [];

  const heroVisible = await page.locator('[data-section="hero"]').isVisible();
  checks.push({
    id: "PW-HERO-01",
    passed: heroVisible,
    message: heroVisible ? "Hero section visible" : "Hero section missing",
  });

  const ctaVisible = await page.locator("[data-cta]").isVisible();
  checks.push({
    id: "PW-CTA-01",
    passed: ctaVisible,
    message: ctaVisible ? "CTA visible" : "CTA not visible",
  });

  const title = await page.title();
  checks.push({
    id: "PW-SEO-01",
    passed: title.length >= 10,
    message: title.length >= 10 ? `Title OK: ${title.slice(0, 40)}` : "SEO title too short",
  });

  const metaDesc = await page.evaluate(() => {
    const el = document.querySelector('meta[name="description"]');
    return el?.getAttribute("content") ?? "";
  });
  checks.push({
    id: "PW-SEO-02",
    passed: metaDesc.length >= 20,
    message: metaDesc.length >= 20 ? "Meta description present" : "Meta description missing/short",
  });

  const contrastOk = await page.evaluate(() => {
    const btn = document.querySelector("[data-cta]") as HTMLElement | null;
    if (!btn) return false;
    const bg = getComputedStyle(btn).backgroundColor;
    const fg = getComputedStyle(btn).color;
    return bg !== fg && bg !== "rgba(0, 0, 0, 0)";
  });
  checks.push({
    id: "PW-A11Y-01",
    passed: contrastOk,
    message: contrastOk ? "CTA has distinct foreground/background" : "CTA contrast check failed",
  });

  const bodyText = (await page.locator("body").textContent()) ?? "";
  const prohibited = PROHIBITED_PATTERNS.find((p) => p.test(bodyText));
  checks.push({
    id: "PW-CLAIM-01",
    passed: !prohibited,
    message: prohibited ? `Prohibited claim detected: ${prohibited}` : "No prohibited claims in body",
  });

  return checks;
}

function runDomParseFallback(html: string): PlaywrightQaResult {
  const checks: PlaywrightQaCheck[] = [];
  checks.push({
    id: "PW-HERO-01",
    passed: html.includes('data-section="hero"'),
    message: "Hero marker in HTML (dom-parse fallback)",
  });
  checks.push({
    id: "PW-CTA-01",
    passed: html.includes("data-cta"),
    message: "CTA marker in HTML (dom-parse fallback)",
  });
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  checks.push({
    id: "PW-SEO-01",
    passed: Boolean(titleMatch && titleMatch[1].length >= 10),
    message: "Title tag present (dom-parse fallback)",
  });
  checks.push({
    id: "PW-SEO-02",
    passed: html.includes('meta name="description"'),
    message: "Meta description present (dom-parse fallback)",
  });
  const prohibited = PROHIBITED_PATTERNS.find((p) => p.test(html));
  checks.push({
    id: "PW-CLAIM-01",
    passed: !prohibited,
    message: prohibited ? "Prohibited claim in HTML" : "No prohibited claims (dom-parse)",
  });
  checks.push({
    id: "PW-MOBILE-01",
    passed: html.includes("viewport"),
    message: "Viewport meta for mobile (dom-parse fallback)",
  });
  const passed = checks.every((c) => c.passed);
  return { passed, checks, mode: "dom-parse" };
}

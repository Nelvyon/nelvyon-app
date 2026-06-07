/**
 * Phase H — Playwright staging QA (hero, CTA, responsive, SEO, H1, contrast, links, placeholders).
 */

import { runPlaywrightOfflineQa, type PlaywrightQaCheck, type PlaywrightQaResult } from "./playwrightOfflineQa";

export interface StagingQaResult extends PlaywrightQaResult {
  blocking_failures: string[];
  score: number;
}

/** Template defaults from landing_builder_service — must not ship in staging preview */
export const CRITICAL_PLACEHOLDER_PATTERNS = [
  /your headline here/i,
  /supporting text/i,
  /lorem ipsum/i,
  /get started/i,
  /welcome to our/i,
  /\[TODO\]/i,
  /placeholder\.(jpg|jpeg|png|webp|svg)/i,
  /mock:\/\//,
];

const PROHIBITED_CLAIM_PATTERNS = [
  /el mejor restaurante del mundo/i,
  /100%\s*garantizado/i,
  /michelin\s+seguro/i,
];

async function tryLoadPlaywright(): Promise<typeof import("playwright") | null> {
  if (process.env.AUTONOMOUS_PLAYWRIGHT_QA !== "1") return null;
  try {
    const importer = new Function("s", "return import(s)") as (s: string) => Promise<typeof import("playwright")>;
    return await importer("playwright");
  } catch {
    return null;
  }
}

export async function runPlaywrightStagingQa(html: string): Promise<StagingQaResult> {
  const base = await runPlaywrightOfflineQa(html);
  const extra = await runExtendedChecks(html);
  const checks = [...base.checks, ...extra];
  const blocking = checks.filter((c) => c.blocking && !c.passed).map((c) => c.id);
  const passed = checks.every((c) => c.passed);
  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);
  return {
    passed,
    checks,
    mode: base.mode,
    blocking_failures: blocking,
    score,
  };
}

async function runExtendedChecks(html: string): Promise<PlaywrightQaCheck[]> {
  const pw = await tryLoadPlaywright();
  if (pw) {
    try {
      const { chromium } = pw;
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        const checks = await runBrowserExtendedChecks(page);
        await page.setViewportSize({ width: 1280, height: 800 });
        const desktopHero = await page.locator('[data-section="hero"]').isVisible();
        checks.push({
          id: "PW-DESKTOP-01",
          passed: desktopHero,
          message: desktopHero ? "Hero visible at 1280px desktop" : "Hero not visible on desktop",
        });
        return checks;
      } finally {
        await browser.close();
      }
    } catch {
      return runDomExtendedChecks(html);
    }
  }
  return runDomExtendedChecks(html);
}

async function runBrowserExtendedChecks(page: {
  locator: (s: string) => { count: () => Promise<number>; isVisible: () => Promise<boolean>; allTextContents: () => Promise<string[]> };
  evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<PlaywrightQaCheck[]> {
  const checks: PlaywrightQaCheck[] = [];

  const h1Count = await page.locator("h1").count();
  checks.push({
    id: "PW-H1-01",
    passed: h1Count === 1,
    message: h1Count === 1 ? "Single H1 present" : `Expected 1 H1, found ${h1Count}`,
  });

  const navCount = await page.locator("[data-nav-link]").count();
  checks.push({
    id: "PW-LINKS-01",
    passed: navCount >= 3,
    message: navCount >= 3 ? `${navCount} main nav links` : "Insufficient main navigation links",
  });

  const bodyText = (await page.evaluate(() => document.body?.innerText ?? "")) as string;
  const critical = CRITICAL_PLACEHOLDER_PATTERNS.find((p) => p.test(bodyText));
  checks.push({
    id: "PW-PLACEHOLDER-01",
    passed: !critical,
    blocking: true,
    message: critical ? `Critical placeholder detected: ${critical}` : "No critical placeholders",
  });

  const claim = PROHIBITED_CLAIM_PATTERNS.find((p) => p.test(bodyText));
  if (claim) {
    checks.push({
      id: "PW-CLAIM-01",
      passed: false,
      message: `Prohibited claim: ${claim}`,
    });
  }

  return checks;
}

function runDomExtendedChecks(html: string): PlaywrightQaCheck[] {
  const h1Matches = html.match(/<h1[\s>]/gi) ?? [];
  const navLinks = (html.match(/data-nav-link/g) ?? []).length;
  const bodyText = html.replace(/<[^>]+>/g, " ");
  const critical = CRITICAL_PLACEHOLDER_PATTERNS.find((p) => p.test(bodyText));

  return [
    {
      id: "PW-H1-01",
      passed: h1Matches.length === 1,
      message: h1Matches.length === 1 ? "Single H1 (dom-parse)" : `H1 count ${h1Matches.length}`,
    },
    {
      id: "PW-LINKS-01",
      passed: navLinks >= 3,
      message: navLinks >= 3 ? `${navLinks} nav links (dom-parse)` : "Nav links missing",
    },
    {
      id: "PW-PLACEHOLDER-01",
      passed: !critical,
      blocking: true,
      message: critical ? "Critical placeholder in HTML" : "No critical placeholders (dom-parse)",
    },
    {
      id: "PW-DESKTOP-01",
      passed: html.includes("data-section=\"hero\"") && html.includes("@media(min-width:1280px)"),
      message: "Desktop layout markers present (dom-parse)",
    },
  ];
}

/** Score penalty when critical placeholders fail — used in Phase H gate */
export function stagingQaBlocksPublish(result: StagingQaResult): boolean {
  return result.blocking_failures.length > 0 || !result.passed;
}

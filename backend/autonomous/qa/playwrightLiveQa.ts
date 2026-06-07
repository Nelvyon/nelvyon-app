/**
 * Phase I — live QA against deployed staging_url (fetch or Playwright goto).
 */

import { runPlaywrightStagingQa, type StagingQaResult } from "./playwrightStagingQa";

export interface LiveQaComparison {
  local: StagingQaResult;
  live: StagingQaResult | null;
  live_skipped: boolean;
  live_skip_reason?: string;
  comparison: {
    local_score: number;
    live_score: number | null;
    delta: number | null;
    local_passed: boolean;
    live_passed: boolean | null;
    matched_check_ids: string[];
  };
}

export function isLiveQaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("mock://")) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

async function fetchHtmlFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function tryLoadPlaywright(): Promise<typeof import("playwright") | null> {
  if (process.env.AUTONOMOUS_PLAYWRIGHT_QA !== "1") return null;
  try {
    const importer = new Function("s", "return import(s)") as (s: string) => Promise<typeof import("playwright")>;
    return await importer("playwright");
  } catch {
    return null;
  }
}

async function fetchHtmlViaPlaywright(url: string): Promise<string | null> {
  const pw = await tryLoadPlaywright();
  if (!pw) return null;
  try {
    const { chromium } = pw;
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      return await page.content();
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

export async function runLiveQaComparison(
  localHtml: string,
  stagingUrl: string | null | undefined,
): Promise<LiveQaComparison> {
  const local = await runPlaywrightStagingQa(localHtml);

  if (!isLiveQaUrl(stagingUrl)) {
    return {
      local,
      live: null,
      live_skipped: true,
      live_skip_reason: stagingUrl ? "URL not eligible for live QA" : "No staging_url available",
      comparison: {
        local_score: local.score,
        live_score: null,
        delta: null,
        local_passed: local.passed,
        live_passed: null,
        matched_check_ids: [],
      },
    };
  }

  let liveHtml = await fetchHtmlViaPlaywright(stagingUrl!);
  if (!liveHtml) liveHtml = await fetchHtmlFromUrl(stagingUrl!);

  if (!liveHtml) {
    return {
      local,
      live: null,
      live_skipped: true,
      live_skip_reason: `Failed to fetch live HTML from ${stagingUrl}`,
      comparison: {
        local_score: local.score,
        live_score: null,
        delta: null,
        local_passed: local.passed,
        live_passed: null,
        matched_check_ids: [],
      },
    };
  }

  const live = await runPlaywrightStagingQa(liveHtml);
  const localById = new Map(local.checks.map((c) => [c.id, c]));
  const matched = live.checks
    .filter((c) => {
      const loc = localById.get(c.id);
      return loc !== undefined && loc.passed === c.passed;
    })
    .map((c) => c.id);

  return {
    local,
    live,
    live_skipped: false,
    comparison: {
      local_score: local.score,
      live_score: live.score,
      delta: live.score - local.score,
      local_passed: local.passed,
      live_passed: live.passed,
      matched_check_ids: matched,
    },
  };
}

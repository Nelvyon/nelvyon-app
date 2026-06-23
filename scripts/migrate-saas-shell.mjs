/**
 * Batch-migrates /saas/* stub pages from DashboardLayout + SaasSidebar inline
 * to SaasShellLayout pattern. Safe to re-run (idempotent — skips already migrated).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SAAS_PAGES_DIR = new URL("../apps/web/src/app/saas", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

let changed = 0;
let skipped = 0;
let errors = 0;

function findPageFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findPageFiles(full));
    } else if (entry === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

function migrate(filePath) {
  let src = readFileSync(filePath, "utf8");

  // Skip already fully migrated
  if (src.includes("SaasShellLayout") && !src.includes("DashboardLayout")) {
    skipped++;
    return;
  }

  // Skip if no DashboardLayout at all
  if (!src.includes("DashboardLayout")) {
    skipped++;
    return;
  }

  // Get activeId
  const sidebarMatch = src.match(/<SaasSidebar activeId="([^"]+)" \/>/);
  if (!sidebarMatch) {
    console.warn(`  SKIP (no SaasSidebar activeId): ${filePath}`);
    skipped++;
    return;
  }
  const activeId = sidebarMatch[1];

  // ── STEP 1: Replace import ────────────────────────────────────────────────
  src = src.replace(
    /import \{ DashboardLayout \} from "@\/components\/dashboard\/DashboardLayout";\n/,
    `import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";\n`,
  );

  // ── STEP 2: Replace opening block ─────────────────────────────────────────
  // Match: <DashboardLayout> + div.min-h-screen (optional) + div.grid + SaasSidebar + <main...>
  const openWithScreenDiv = /<DashboardLayout>\n\s+<div[^>]*min-h-screen[^>]*>\n\s+<div[^>]*grid[^>]*max-w-[^>]*>\n\s+<SaasSidebar activeId="[^"]+" \/>\n\s+<main[^>]*>/;
  const openWithoutScreenDiv = /<DashboardLayout>\n\s+<div[^>]*grid[^>]*max-w-[^>]*>\n\s+<SaasSidebar activeId="[^"]+" \/>\n\s+<main[^>]*>/;

  if (openWithScreenDiv.test(src)) {
    src = src.replace(openWithScreenDiv, `<SaasShellLayout sidebar={<SaasSidebar activeId="${activeId}" />}>`);
  } else if (openWithoutScreenDiv.test(src)) {
    src = src.replace(openWithoutScreenDiv, `<SaasShellLayout sidebar={<SaasSidebar activeId="${activeId}" />}>`);
  } else {
    console.warn(`  SKIP (unknown open pattern): ${filePath}`);
    skipped++;
    return;
  }

  // ── STEP 3: Replace closing block ─────────────────────────────────────────
  // After </main>, there may be:
  //   0–1 extra JSX lines (modals, etc.)
  //   2 closing </div> tags (grid + screen wrappers)
  //   </DashboardLayout>
  //
  // We remove the 2 </div> closing tags and replace </DashboardLayout> with </SaasShellLayout>.
  // Any extra JSX between </main> and the closing divs stays in place.

  // Remove the two extra closing </div> tags that were the grid and screen wrappers.
  // They appear as "        </div>" right before </DashboardLayout> (possibly with extra content between them).
  // Strategy: remove exactly 2 occurrences of the wrapper-level </div> tags.

  // Find </DashboardLayout> (last occurrence = the real one)
  const dashClose = src.lastIndexOf("</DashboardLayout>");
  if (dashClose === -1) {
    // Opening was already replaced but closing not found — file is in partial state
    // Try to detect and replace </DashboardLayout>
    console.error(`  ERROR: </DashboardLayout> not found after transform: ${filePath}`);
    errors++;
    return;
  }

  // Extract the block from </main> to </DashboardLayout>
  const mainClose = src.lastIndexOf("</main>", dashClose);
  if (mainClose === -1) {
    console.error(`  ERROR: </main> not found before </DashboardLayout>: ${filePath}`);
    errors++;
    return;
  }

  const blockBetween = src.slice(mainClose + "</main>".length, dashClose);
  // Remove exactly 2 </div> closing lines from the START of blockBetween (the grid and screen wrappers)
  // They come right after </main> before any modal JSX.
  // Pattern: "\n        </div>\n      </div>\n      {modal...}"
  let cleaned = blockBetween;
  for (let pass = 0; pass < 2; pass++) {
    // Remove the first </div> line from the start
    cleaned = cleaned.replace(/^\n\s+<\/div>/, "");
  }

  // Rebuild the closing section
  const newClosing = `</main>${cleaned}</SaasShellLayout>`;
  const originalClosing = src.slice(mainClose, dashClose + "</DashboardLayout>".length);
  src = src.slice(0, mainClose) + newClosing + src.slice(dashClose + "</DashboardLayout>".length);

  // Verify DashboardLayout is gone
  if (src.includes("DashboardLayout")) {
    console.error(`  ERROR: DashboardLayout still present after transform: ${filePath}`);
    errors++;
    return;
  }

  writeFileSync(filePath, src, "utf8");
  changed++;
  const label = filePath.split("saas/")[1]?.split("/page")[0] ?? filePath;
  console.log(`  ✓ ${label}`);
}

console.log("Migrating /saas/* pages to SaasShellLayout...\n");

const pages = findPageFiles(SAAS_PAGES_DIR);
for (const page of pages) {
  migrate(page);
}

console.log(`\nDone: ${changed} migrated, ${skipped} skipped, ${errors} errors`);
if (errors > 0) process.exit(1);

/**
 * Fix-up: removes the 2 extra </div> tags left by migrate-saas-shell.mjs
 * inside <SaasShellLayout> in pages that had modal JSX after </main>.
 *
 * The pattern to remove:
 *   </main>\n        </div>\n      </div>\n      {modal...}\n    </SaasShellLayout>
 *   → </main>\n      {modal...}\n    </SaasShellLayout>
 *
 * Safe to run on already-clean pages (removes nothing if pattern not found).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SAAS_PAGES_DIR = new URL("../apps/web/src/app/saas", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

let fixed = 0;
let skipped = 0;

function findPageFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...findPageFiles(full));
    else if (entry === "page.tsx") results.push(full);
  }
  return results;
}

function fixPage(filePath) {
  let src = readFileSync(filePath, "utf8");

  // Only touch migrated pages
  if (!src.includes("SaasShellLayout") || src.includes("DashboardLayout")) {
    skipped++;
    return;
  }

  const original = src;

  // Remove up to 2 extra </div> lines that appear right after </main>
  // These were wrapper divs (screen + grid) left by the migration.
  // Pattern: </main>\n  (extra </div> lines)  \n  (modal or SaasShellLayout close)
  for (let pass = 0; pass < 2; pass++) {
    // Find </main> followed by whitespace + </div>
    src = src.replace(/(<\/main>)(\n\s+<\/div>)(\n\s+<\/div>|\n\s+\{|\n\s+<\/SaasShellLayout>)/g, "$1$3");
  }
  // One more pass to catch the second </div> if first was removed
  for (let pass = 0; pass < 2; pass++) {
    src = src.replace(/(<\/main>)(\n\s+<\/div>)(\n\s+\{|\n\s+<\/SaasShellLayout>)/g, "$1$3");
  }

  // Also remove orphaned </main> (migration removed opening <main> but left the closing tag)
  if (!src.includes("<main") && src.includes("</main>")) {
    src = src.replace(/\n\s+<\/main>/, "");
  }

  if (src !== original) {
    writeFileSync(filePath, src, "utf8");
    fixed++;
    console.log(`  ✓ fixed ${filePath.split("saas/")[1]?.split("/page")[0] ?? filePath}`);
  } else {
    skipped++;
  }
}

console.log("Fixing extra </div> in SaasShellLayout pages...\n");

const pages = findPageFiles(SAAS_PAGES_DIR);
for (const page of pages) fixPage(page);

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);

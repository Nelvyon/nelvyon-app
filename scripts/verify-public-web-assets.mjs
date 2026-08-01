import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webPublic = path.join(root, "apps/web/public");

const required = [
  "brand/public/library/photos/F-01.webp",
  "brand/public/library/photos/F-01.avif",
  "brand/public/library/photos/F-02.webp",
  "brand/public/library/photos/F-02.avif",
  "brand/public/saas-shots/dashboard.webp",
  "brand/public/saas-shots/crm.webp",
  "brand/public/saas-shots/crm-mobile.webp",
  "brand/public/saas-shots/ai.webp",
  "brand/public/saas-shots/workflows.webp",
  "brand/public/saas-shots/analytics.webp",
  "brand/public/library/manifest.json",
];

const missingRequired = required.filter((p) => !fs.existsSync(path.join(webPublic, p)));

const visualLib = fs.readFileSync(
  path.join(root, "apps/web/src/features/public-web/content/visualLibrary.ts"),
  "utf8",
);
const iconPaths = [
  ...new Set(
    (visualLib.match(/\/brand\/public\/library\/icons\/I-\d+\/[a-z0-9][a-z0-9-]{1,100}\.svg/g) || []),
  ),
];
const missingIcons = iconPaths.filter((p) => !fs.existsSync(path.join(webPublic, p.replace(/^\//, ""))));

const catalog = fs.readFileSync(
  path.join(root, "apps/web/src/features/public-web/content/catalog.ts"),
  "utf8",
);
const catalogImgs = [
  ...new Set((catalog.match(/\/brand\/public\/(?:library\/photos|saas-shots)\/[A-Za-z0-9._/-]+\.webp/g) || [])),
];
const missingCatalog = catalogImgs.filter((p) => !fs.existsSync(path.join(webPublic, p.replace(/^\//, ""))));

const out = {
  generatedAt: new Date().toISOString(),
  missingRequired,
  iconRefs: iconPaths.length,
  missingIcons,
  catalogRefs: catalogImgs.length,
  missingCatalog,
  ok: missingRequired.length === 0 && missingIcons.length === 0 && missingCatalog.length === 0,
};

const outPath = path.join(root, "docs/evidence/public-web-asset-verify_latest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

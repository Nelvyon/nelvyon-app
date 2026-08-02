/**
 * Auditoría AIOR→NELVYON: todas las plantillas conservadas (no subset KEEP).
 */
import fs from "node:fs";
import path from "node:path";

const WWW = path.join(process.cwd(), "apps", "web", "public", "www");

const EXCLUDE = new Set([
  "home-ai-image-generate.html",
  "home-ai-image-generate-op.html",
  "home-finance-crypto-service.html",
  "home-finance-crypto-service-op.html",
]);

const REQUIRED_HOMES = [
  "index.html",
  "home-ai-startup.html",
  "home-ai-startup-op.html",
  "home-ai-chatbot.html",
  "home-ai-chatbot-op.html",
  "home-ai-writer-tool.html",
  "home-ai-writer-tool-op.html",
  "home-business-intelligence.html",
  "home-business-intelligence-op.html",
  "home-ai-agent.html",
  "home-ai-agent-op.html",
  "home-productivity-tools.html",
  "home-productivity-tools-op.html",
  "home-ai-chatbot-tool.html",
  "home-ai-chatbot-tool-op.html",
  "home-cloud-based-saas.html",
  "home-cloud-based-saas-op.html",
  "home-saas-product-showcase.html",
  "home-saas-product-showcase-op.html",
];

const REQUIRED_INNER = [
  "about.html",
  "blog.html",
  "blog-details.html",
  "cases.html",
  "case-studies.html",
  "case-studies-2.html",
  "case-studies-details.html",
  "contact.html",
  "error.html",
  "faq.html",
  "features.html",
  "integrations.html",
  "pricing.html",
  "team.html",
  "team-details.html",
  "testimonial.html",
  "typography.html",
];

const FORBIDDEN = [
  /\bAIOR\b/i,
  /\bAior\b/,
  /Aiorchat/i,
  /Aiorbot/i,
  /themehour/i,
  /lorem ipsum/i,
  /Bridal Makeup/i,
  /1850\+/i,
  /Likmy Clayton|Arnold Doe|Arina Sathi|Jakon John/i,
  /mail\.php/i,
  /Leadwayz/i,
  /Aurix/i,
  /aiors?@example\.com/i,
  /Message credits/i,
  /robotics and drones/i,
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

const report = {
  ok: false,
  requiredHomes: REQUIRED_HOMES.length,
  requiredInner: REQUIRED_INNER.length,
  presentHomes: 0,
  presentInner: 0,
  missing: [],
  unexpectedExcluded: [],
  pages: [],
  forbidden: [],
  missingSeo: [],
};

for (const name of [...EXCLUDE]) {
  if (fs.existsSync(path.join(WWW, name))) report.unexpectedExcluded.push(name);
}

for (const file of [...REQUIRED_HOMES, ...REQUIRED_INNER]) {
  const p = path.join(WWW, file);
  if (!fs.existsSync(p)) {
    report.missing.push(file);
    continue;
  }
  if (REQUIRED_HOMES.includes(file)) report.presentHomes++;
  else report.presentInner++;

  const raw = fs.readFileSync(p, "utf8");
  const html = strip(raw);
  const row = {
    file,
    bytes: raw.length,
    forbidden: 0,
    hasTitle: /<title>/.test(raw),
    hasCanonical: /rel="canonical"/.test(raw),
    hasOg: /og:title/.test(raw),
  };
  for (const re of FORBIDDEN) {
    const n = (html.match(re) || []).length;
    if (n) {
      row.forbidden += n;
      report.forbidden.push({ file, pattern: String(re), n });
    }
  }
  if (!row.hasTitle || !row.hasCanonical || !row.hasOg) {
    report.missingSeo.push(file);
  }
  report.pages.push(row);
}

report.ok =
  report.missing.length === 0 &&
  report.unexpectedExcluded.length === 0 &&
  report.forbidden.length === 0 &&
  report.missingSeo.length === 0 &&
  report.presentHomes === REQUIRED_HOMES.length &&
  report.presentInner === REQUIRED_INNER.length;

const outDir = path.join(process.cwd(), "docs", "evidence", "public-web-aior-nelvyon");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "audit-full-templates.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, presentHomes: report.presentHomes, presentInner: report.presentInner, missing: report.missing.length, forbidden: report.forbidden.length, missingSeo: report.missingSeo.length, unexpectedExcluded: report.unexpectedExcluded }, null, 2));
console.log("Wrote", out);
process.exit(report.ok ? 0 : 1);

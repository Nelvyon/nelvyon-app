/**
 * Excellence content sweep — visible-text oriented (strips scripts/styles).
 * Flags template/demo/awkward ES that would fail a design-director review.
 */
import fs from "node:fs";
import path from "node:path";

const WWW = path.join("apps", "web", "public", "www");
const OUT = path.join("docs", "evidence", "public-web-aior-nelvyon", "excellence-content-sweep.json");

const FLAGS = [
  { id: "en_nav", re: /\b(Price Table|Error Page|Case Studies|Blog Details|Recent Posts|Leave a Reply|Send Message|Your Message|Learn More|Read More|Get Started|Contact Us|Active Users|Follow Us|Happy Customers|Success Stories|Unlimited Members|Per month|\/month)\b/i },
  { id: "demo_names", re: /\b(Jems Colin|Sara Lin|Mark Rivas|Robentix|Chiropractic|ThemeHour|Themeforest|AIOR|Aiorchat|Planora|Zipchat)\b/i },
  { id: "fake_metrics", re: /\b(500K\+|2\.5B\+|10M\+|1850\+|5,000\+ companies)\b/i },
  { id: "swap_artifacts", re: /\b(Productoo|Productoion|Productoividad|Teamsss|Teamss|Self-Servicio|Negocio Intelligence|pensado para su)\b/i },
  { id: "awkward_es", re: /\b(Elija el plan|Descubrir Más|Saber Más|Benefites|Cookis|yEquipo|Negocioes|Productoion|Hechos de plataforma NELVYON About)\b/i },
  { id: "literal_en_es", re: /\b(AI solutions|How it Works|Why Choose|Our Features|Business Intelligence Abrir|Insights accionables|data science|kill-switch|build vs buy)\b/ },
  { id: "template_filler", re: /\b(lorem ipsum|pit!|praesentium|Coming Soon|dummy text|placeholder)\b/i },
  { id: "wrong_case_menu", re: />cases<|>Team<|>Testimonial<|>Changelog<|>FAQ</ },
  { id: "copyright_en", re: /Copyright\s*<a|Copyright NELVYON/i },
  { id: "mixed_pricing", re: /Chiropractic|Robentix|Message credits|Bridal Makeup/i },
  { id: "repetition_marker", re: /(Integraciones y webhooks: Stripe, SES, Twilio, Meta, Google y API del tenant\.)/g },
];

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const files = fs.readdirSync(WWW).filter((f) => f.endsWith(".html") && !f.startsWith("mapa-"));
const pages = [];
for (const file of files) {
  const html = fs.readFileSync(path.join(WWW, file), "utf8");
  const text = visibleText(html);
  const hits = [];
  for (const flag of FLAGS) {
    const m = [...html.matchAll(new RegExp(flag.re.source, flag.re.flags.includes("g") ? flag.re.flags : flag.re.flags + "g"))];
    if (!m.length) continue;
    const samples = [...new Set(m.map((x) => x[0].slice(0, 120)))].slice(0, 8);
    hits.push({ id: flag.id, count: m.length, samples });
  }
  // Duplicate checklist smell
  const stripeCount = (html.match(/Integraciones y webhooks: Stripe, SES, Twilio/g) || []).length;
  if (stripeCount >= 3) hits.push({ id: "repeated_body_copy", count: stripeCount, samples: ["Integraciones y webhooks… repeated"] });
  const experiencia = (html.match(/Experiencia operativa/g) || []).length;
  if (experiencia >= 4) hits.push({ id: "repeated_checklist", count: experiencia, samples: ["Experiencia operativa x" + experiencia] });
  pages.push({ file, hits, hitCount: hits.reduce((a, h) => a + h.count, 0) });
}

pages.sort((a, b) => b.hitCount - a.hitCount);
const summary = {
  ok: pages.every((p) => p.hitCount === 0),
  pages: pages.length,
  dirtyPages: pages.filter((p) => p.hitCount > 0).length,
  top: pages.filter((p) => p.hitCount > 0).slice(0, 20),
  all: pages,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: summary.ok, pages: summary.pages, dirtyPages: summary.dirtyPages, top: summary.top.map((p) => ({ file: p.file, hitCount: p.hitCount, ids: p.hits.map((h) => h.id) })) }, null, 2));

#!/usr/bin/env node
/**
 * Barrido de contenido residual en HTML de rutas públicas.
 * Usage: node scripts/public-web-content-sweep.mjs --base http://127.0.0.1:3010
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const base = (baseIdx >= 0 ? args[baseIdx + 1] : "http://127.0.0.1:3010").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/agencia",
  "/producto",
  "/producto/ia",
  "/producto/crm",
  "/enterprise",
  "/precios",
  "/contacto",
  "/integraciones",
  "/sectores",
  "/casos-de-uso",
  "/recursos",
  "/blog",
  "/faq",
  "/aviso-legal",
  "/privacidad",
  "/partners",
  "/alternatives",
  "/status",
];

const PATTERNS = [
  { id: "AIOR_brand", re: /\bWelcome to Aior\b|\bAior AI\b|\bAIOR\b(?![a-z])/i },
  { id: "Zubaz", re: /\bZubaz\b/i },
  { id: "Sofax", re: /\bSofax\b/i },
  { id: "Nivia", re: /\bNivia\b/i },
  { id: "lorem", re: /lorem\s+ipsum/i },
  { id: "demo_fake", re: /\b1850\+?\s*reviews\b|\bfake\s*client\b|\bthemehour\b/i },
  { id: "english_hero_leak", re: /\bGet Started Now\b|\bBook a Demo\b|\bOur Pricing\b|\bTrusted by\b/i },
];

const results = [];
let fail = 0;

for (const route of ROUTES) {
  const url = `${base}${route}`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "nelvyon-content-sweep/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    const html = await res.text();
    // Ignore Next flight / source maps / asset paths containing aior folder
    const body = html
      .replace(/\/brand\/public\/aior\/[^"'<\s]+/g, "")
      .replace(/nelvyon-aior\.css/g, "")
      .replace(/nv-aior[-\w]*/g, "")
      .replace(/Aior(Home|Page|Faq|Cta|Section|Blocks|Shot|Title|Feature|Related|Aside|Process|Card|Check)[A-Za-z]*/g, "")
      .replace(/webpack[^<]*/g, "");
    const hits = PATTERNS.filter((p) => p.re.test(body)).map((p) => p.id);
    const ok = res.ok && hits.length === 0;
    if (!ok) fail++;
    results.push({ route, status: res.status, ok, hits });
    console.log(`${ok ? "OK" : "FAIL"} ${res.status} ${route}${hits.length ? ` · ${hits.join(",")}` : ""}`);
  } catch (e) {
    fail++;
    results.push({ route, ok: false, error: String(e) });
    console.log(`ERR ${route}`);
  }
}

const out = {
  base,
  generatedAt: new Date().toISOString(),
  fail,
  pass: results.length - fail,
  results,
};
const outPath = path.join(process.cwd(), "docs/evidence/public-web-content-sweep_latest.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nWrote ${outPath} · fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);

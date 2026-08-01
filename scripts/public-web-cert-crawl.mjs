#!/usr/bin/env node
/**
 * HTTP crawl certification for NELVYON public web.
 * Usage: node scripts/public-web-cert-crawl.mjs --base https://host
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const base = (baseIdx >= 0 ? args[baseIdx + 1] : process.env.PUBLIC_WEB_BASE || "http://127.0.0.1:3010").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/plataforma",
  "/agencia",
  "/automatizaciones-ia",
  "/soluciones",
  "/servicios",
  "/sectores",
  "/enterprise",
  "/integraciones",
  "/precios",
  "/casos-de-exito",
  "/recursos",
  "/blog",
  "/faq",
  "/contacto",
  "/login",
  "/saas",
  "/aviso-legal",
  "/privacidad",
  "/cookies",
  "/terminos",
  "/seguridad",
  "/status",
  "/legal",
  "/legal/dpa",
  "/legal/subprocessors",
];

const bannedBody = [
  /lorem\s+ipsum/i,
  /\bSofax\b/,
  /\bNivia\b/,
  /\bEnvato Elements\b/i,
  /\bThemeForest\b/,
  /\bagenforce\b/i,
  /Próximamente\s*—/,
  /dummy text/i,
];

const outDir = path.join(process.cwd(), "docs/evidence");
fs.mkdirSync(outDir, { recursive: true });

async function crawl() {
  const results = [];
  for (const route of ROUTES) {
    const url = `${base}${route}`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "nelvyon-public-web-cert/1.0" },
      });
      const html = await res.text();
      const ms = Date.now() - started;
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
      const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
      const bans = bannedBody.filter((re) => re.test(html)).map((re) => String(re));
      const imgSrcs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
      const brokenHints = [];
      // check local brand images referenced
      for (const src of imgSrcs) {
        if (!src.startsWith("/brand/public/")) continue;
        const abs = `${base}${src}`;
        const ir = await fetch(abs, { method: "HEAD" }).catch(() => null);
        if (!ir || !ir.ok) brokenHints.push(src);
      }
      const hasMain = /id=["']contenido-principal["']/.test(html) || /<main\b/i.test(html);
      const hasNav = /aria-label=["']Principal["']/.test(html) || /NELVYON/.test(html);
      results.push({
        route,
        url,
        status: res.status,
        ms,
        title,
        h1: h1.slice(0, 160),
        ok: res.status >= 200 && res.status < 400 && bans.length === 0 && brokenHints.length === 0,
        bans,
        brokenImages: brokenHints,
        hasMain,
        hasNav,
        bytes: html.length,
      });
      console.log(`${res.status} ${ms}ms ${route}`);
    } catch (e) {
      results.push({
        route,
        url,
        status: 0,
        ms: Date.now() - started,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      console.log(`ERR ${route} ${e}`);
    }
  }

  // contact form endpoint smoke (expect 400 without body fields — proves route alive)
  let contactApi = { ok: false };
  try {
    const res = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    contactApi = { status: res.status, ok: res.status === 400 || res.status === 200 };
  } catch (e) {
    contactApi = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base,
    passCount: results.filter((r) => r.ok).length,
    total: results.length,
    contactApi,
    results,
    verdict: results.every((r) => r.ok) && contactApi.ok ? "PASS" : "FAIL",
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(outDir, `public-web-cert-crawl_${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "public-web-cert-crawl_latest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out, verdict: report.verdict, passCount: report.passCount, total: report.total, contactApi }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

crawl();

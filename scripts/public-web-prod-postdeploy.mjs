import fs from "node:fs";
import path from "node:path";

const bases = (process.env.PUBLIC_WEB_BASES || "https://app.nelvyon.com,https://nelvyon.com")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

const routes = [
  "/",
  "/producto",
  "/producto/crm",
  "/producto/ia",
  "/agencia",
  "/enterprise",
  "/servicios",
  "/sectores",
  "/plataforma",
  "/automatizaciones-ia",
  "/precios",
  "/contacto",
  "/faq",
  "/login",
  "/saas",
  "/seguridad",
  "/legal/dpa",
];

const assets = [
  "/brand/public/library/photos/F-01.webp",
  "/brand/public/library/photos/F-02.webp",
  "/brand/public/saas-shots/dashboard.webp",
  "/brand/public/saas-shots/crm.webp",
  "/brand/public/saas-shots/ai.webp",
  "/brand/public/library/icons/I-03/019-crm.svg",
  "/brand/public/library/icons/I-04/workflow.svg",
];

async function check(url, opts = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "nelvyon-public-web-prod-postdeploy/1.0" },
      ...opts,
    });
    const text = opts.headOnly ? "" : await res.text();
    return { url, status: res.status, ms: Date.now() - started, ok: res.status >= 200 && res.status < 400, bytes: text.length, text };
  } catch (e) {
    return { url, status: 0, ms: Date.now() - started, ok: false, error: String(e), text: "" };
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  commit: process.env.DEPLOY_COMMIT || null,
  deploymentId: process.env.DEPLOY_ID || null,
  service: "@nelvyon/web",
  environment: "production",
  bases: {},
};

let allOk = true;

for (const base of bases) {
  const health = await check(`${base}/api/health`);
  let healthBody = null;
  try {
    healthBody = JSON.parse(health.text);
  } catch {
    healthBody = health.text.slice(0, 200);
  }

  const routeResults = {};
  for (const r of routes) {
    const res = await check(`${base}${r}`);
    routeResults[r] = { status: res.status, ms: res.ms, ok: res.ok };
    if (!res.ok) allOk = false;
  }

  const assetResults = {};
  for (const a of assets) {
    const res = await check(`${base}${a}`);
    assetResults[a] = { status: res.status, ms: res.ms, ok: res.ok, bytes: res.bytes };
    if (!res.ok) allOk = false;
  }

  const home = await check(`${base}/`);
  const producto = await check(`${base}/producto`);
  const markers = {
    home_hasMacbook: /nv-device--macbook/.test(home.text),
    home_hasSaasShots: /saas-shots\//.test(home.text),
    home_hasLibraryIcons: /library\/icons\//.test(home.text),
    home_hasNelvyon: /NELVYON/.test(home.text),
    home_noSofax: !/Sofax/.test(home.text),
    home_noNivia: !/Nivia/.test(home.text),
    producto_hasMacbook: /nv-device--macbook/.test(producto.text),
    producto_hasF02: /library\/photos\/F-02/.test(producto.text),
    producto_hasIcons: /library\/icons\//.test(producto.text),
  };
  if (!Object.values(markers).every(Boolean)) allOk = false;
  if (!health.ok) allOk = false;

  const contact = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "nelvyon-public-web-prod-postdeploy/1.0" },
    body: "{}",
  }).catch(() => null);

  out.bases[base] = {
    health: { status: health.status, ok: health.ok, body: healthBody },
    contactApi: { status: contact?.status ?? 0, ok: contact?.status === 400 },
    routes: routeResults,
    assets: assetResults,
    markers,
    routePass: Object.values(routeResults).filter((x) => x.ok).length,
    routeTotal: routes.length,
    assetPass: Object.values(assetResults).filter((x) => x.ok).length,
    assetTotal: assets.length,
  };

  console.log(`BASE ${base} health=${health.status} routes=${out.bases[base].routePass}/${routes.length} assets=${out.bases[base].assetPass}/${assets.length}`);
}

out.verdict = allOk ? "PROD_LIVE_PASS" : "PROD_LIVE_FAIL";
const dir = path.join(process.cwd(), "docs/evidence");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(path.join(dir, "public-web-prod-postdeploy_latest.json"), JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(dir, `public-web-prod-postdeploy_${stamp}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ verdict: out.verdict, deploymentId: out.deploymentId, commit: out.commit }, null, 2));
process.exit(allOk ? 0 : 1);

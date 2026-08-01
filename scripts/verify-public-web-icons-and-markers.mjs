import fs from "node:fs";
import path from "node:path";

const base = process.env.PUBLIC_WEB_BASE || "http://127.0.0.1:3010";
const root = process.cwd();
const webPublic = path.join(root, "apps/web/public");

const src = fs.readFileSync(
  path.join(root, "apps/web/src/features/public-web/content/visualLibrary.ts"),
  "utf8",
);
const packs = { saas: "I-01", mkt: "I-02", crm: "I-03", auto: "I-04", db: "I-05" };
const refs = [];
const missing = [];
for (const [k, id] of Object.entries(packs)) {
  const re = new RegExp(`I\\.${k}\\("([^"]+)"\\)`, "g");
  let m;
  while ((m = re.exec(src))) {
    const p = `/brand/public/library/icons/${id}/${m[1]}.svg`;
    refs.push(p);
    if (!fs.existsSync(path.join(webPublic, p.replace(/^\//, "")))) missing.push(p);
  }
}

async function fetchText(route) {
  const res = await fetch(`${base}${route}`, {
    headers: { "user-agent": "nelvyon-public-web-cert/1.0" },
  });
  const text = await res.text();
  return { status: res.status, text };
}

const home = await fetchText("/");
const producto = await fetchText("/producto");
const markers = {
  home_status: home.status,
  home_hasMacbook: /nv-device--macbook/.test(home.text),
  home_hasSaasShots: /saas-shots\//.test(home.text),
  home_hasLibraryIcons: /library\/icons\//.test(home.text),
  home_hasNelvyon: /NELVYON/.test(home.text),
  home_noSofax: !/Sofax/.test(home.text),
  home_noNivia: !/Nivia/.test(home.text),
  producto_status: producto.status,
  producto_hasMacbook: /nv-device--macbook/.test(producto.text),
  producto_hasF02: /library\/photos\/F-02/.test(producto.text),
  producto_hasIcons: /library\/icons\//.test(producto.text),
};

const out = {
  generatedAt: new Date().toISOString(),
  iconRefs: refs.length,
  missingIcons: missing,
  markers,
  ok:
    missing.length === 0 &&
    home.status === 200 &&
    producto.status === 200 &&
    markers.home_hasMacbook &&
    markers.home_hasSaasShots &&
    markers.home_hasLibraryIcons &&
    markers.producto_hasMacbook &&
    markers.producto_hasIcons,
};

const outPath = path.join(root, "docs/evidence/public-web-icon-markers_latest.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

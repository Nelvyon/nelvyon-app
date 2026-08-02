/**
 * Brands AIOR HTML template as NELVYON without rebuilding layout.
 * Source: .reference/aior/download-version → apps/web/public/www
 * Excludes Home 03 (image generate) and Home 11 (finance crypto).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, ".reference", "aior", "download-version");
const DEST = path.join(ROOT, "apps", "web", "public", "www");

const EXCLUDE = new Set([
  "home-ai-image-generate.html",
  "home-ai-image-generate-op.html",
  "home-finance-crypto-service.html",
  "home-finance-crypto-service-op.html",
]);

/** DESACTIVADO: cambiar colores = cambiar estilo AIOR (prohibido por CEO). */
const COLOR_MAP = [];

const TEXT_REPLACEMENTS = [
  [/Aior\s*-\s*AI\s*&\s*SaaS/gi, "NELVYON — Agencia IA + SaaS B2B"],
  [/Aior\s*-\s*AI Startup/gi, "NELVYON — Agencia IA + SaaS"],
  [/AIOR FUTURE TECHNOLOGY/g, "NELVYON"],
  [/themehour/gi, "Nelvyon"],
  [/Aiorchat/gi, "NELVYON"],
  [/Aiorbot/gi, "NELVYON"],
  [/aiors?@example\.com/gi, "contact@nelvyon.com"],
  [/\bAIOR\b/g, "NELVYON"],
  [/\bAior\b/g, "NELVYON"],
  [/\baior\b/g, "nelvyon"],
  [
    /(?:Aior|NELVYON) is a Canada-based startup design agency specializing in modern, user-centric digital experiences\.\s*We help brands grow through strategic design, branding, and creative innovation\./gi,
    "NELVYON es la agencia de marketing digital operada por IA y el SaaS B2B que une CRM, campañas, workflows, agentes y automatización enterprise.",
  ],
  [
    /(?:Aior|NELVYON) is a digital production studio that brings your ideas to life through visually captivating designs and interactive experiences\./gi,
    "NELVYON une agencia operada por IA y software B2B para crecer con CRM, campañas, workflows y automatización.",
  ],
  [/(?:Aior|NELVYON) is a startup design agency based in Canada/gi, "NELVYON — agencia IA + SaaS B2B"],
  [/lang="zxx"/g, 'lang="es"'],
  [
    /We help businesses unlock new opportunities with AI-driven solutions for automation, insights, and growth\./gi,
    "Unimos agencia de marketing digital, inteligencia artificial y SaaS B2B para automatizar crecimiento y resultados.",
  ],
  [/Transform Your Business With AI/gi, "Transforma tu negocio con IA y marketing"],
  [/Empowering businesses with analytics/gi, "Potencia tu negocio con analytics e IA"],
  [/Empowering Businesses With Analytics/gi, "Potencia tu negocio con analytics e IA"],
  [/Scale Your Business with Cloud Powered SaaS Solutions/gi, "Escala tu negocio con el SaaS B2B de NELVYON"],
  [/Simplify your workflow with one powerful tool/gi, "Simplifica tu operación con una plataforma potente"],
  [/Work Smarter Achieve More\./gi, "Trabaja más inteligente. Crece más."],
  [/>Request a Demo</gi, ">Pedir demo<"],
  [/>Get Started</gi, ">Empezar<"],
  [/>Get Started Get Started</gi, ">Empezar<"],
  [/>Start Free Trial</gi, ">Probar gratis<"],
  [/>Book a Demo</gi, ">Reservar demo<"],
  [/>Try Demo</gi, ">Ver demo<"],
  [/>Try Demo Try Demo</gi, ">Ver demo<"],
  [/>Watch Demo</gi, ">Ver demo<"],
  [/>Log In</gi, ">Entrar<"],
  [/>Login</gi, ">Entrar<"],
  [/>Sign up</gi, ">Registrarse<"],
  [/>Sign UP</gi, ">Registrarse<"],
  [/>Contact Us</gi, ">Contacto<"],
  [/>About Us</gi, ">Nosotros<"],
  [/>Case Studies</gi, ">Casos<"],
  [/>Features</gi, ">Funciones<"],
  [/>Pricing</gi, ">Precios<"],
  [/>Blog</gi, ">Blog<"],
  [/>Home</gi, ">Inicio<"],
  [/>Pages</gi, ">Páginas<"],
  [/Request a Demo/g, "Pedir demo"],
  [/Start Free Trial/g, "Probar gratis"],
  [/Book a Demo/g, "Reservar demo"],
  [/Home Ai Startup/gi, "Home Agencia + IA"],
  [/Home Ai Chatbot/gi, "Home Chatbot IA"],
  [/Home Ai Image Generate/gi, "Home Image Gen"],
  [/Home AI Writer Tool/gi, "Home AI Writer"],
  [/Home Business Intelligence/gi, "Home Business Intelligence"],
  [/Home Ai Agent/gi, "Home Agentes IA"],
  [/Home productivity tools/gi, "Home Productividad"],
  [/Home AI chatbot tool/gi, "Home Chatbot Tool"],
  [/Home cloud Based Saas/gi, "Home Cloud SaaS"],
  [/Home Saas product Showcase/gi, "Home Producto SaaS"],
  [/Home finance crypto service/gi, "Home Finance"],
  [/No Credit card required/gi, "Sin tarjeta de crédito"],
  [/Free For 30 Day Trial/gi, "Prueba 30 días"],
  [/Live support 24\/7/gi, "Soporte 24/7"],
  [/Message credits\/moth/gi, "Acceso SaaS según plan"],
  [/Message credits\/month/gi, "Acceso SaaS según plan"],
  [/AI and Robotics Team/gi, "equipo de producto NELVYON"],
  [/team@example\.com/gi, "contact@nelvyon.com"],
  [/contact@aior/gi, "contact@nelvyon.com"],
  [/info@aior/gi, "contact@nelvyon.com"],
  [/support@aior/gi, "support@nelvyon.com"],
  [/Copyright 2026 Aior/gi, "Copyright 2026 NELVYON"],
  [/Copyright 2026 NELVYON \. All Rights Reserved\./gi, "Copyright © 2026 NELVYON. Todos los derechos reservados."],
  [/alt="Aior\s*"/gi, 'alt="NELVYON"'],
  [/alt="NELVYON\s*"/gi, 'alt="NELVYON"'],
];

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="NELVYON">
  <text x="0" y="29" fill="#0084FF" font-family="Sora, system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.03em">NELVYON</text>
</svg>
`;

const LOGO_WHITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="NELVYON">
  <text x="0" y="29" fill="#FFFFFF" font-family="Sora, system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.03em">NELVYON</text>
</svg>
`;

const LOGO_BLACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" role="img" aria-label="NELVYON">
  <text x="0" y="29" fill="#06050B" font-family="Sora, system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="-0.03em">NELVYON</text>
</svg>
`;

const LOGO_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="NELVYON">
  <rect width="40" height="40" rx="10" fill="#0084FF"/>
  <text x="20" y="27" text-anchor="middle" fill="#FFFFFF" font-family="Sora, system-ui, sans-serif" font-size="18" font-weight="700">N</text>
</svg>
`;

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function brandText(input) {
  let out = input;
  for (const [from, to] of COLOR_MAP) out = out.split(from).join(to);
  for (const [re, to] of TEXT_REPLACEMENTS) out = out.replace(re, to);

  // Preloader letters AIOR → NELV (4 letters) then full brand via CSS text if needed
  out = out.replace(
    /<span class="loader-letter">A<\/span>\s*<span class="loader-letter">I<\/span>\s*<span class="loader-letter">O<\/span>\s*<span class="loader-letter">R<\/span>/g,
    `<span class="loader-letter">N</span>
            <span class="loader-letter">E</span>
            <span class="loader-letter">L</span>
            <span class="loader-letter">V</span>`
  );

  // Strip links to excluded homes
  out = out.replace(/href="home-ai-image-generate[^"]*"/gi, 'href="index.html"');
  out = out.replace(/href="home-finance-crypto-service[^"]*"/gi, 'href="index.html"');

  return out;
}

function writeLogos() {
  const img = path.join(DEST, "assets", "img");
  fs.writeFileSync(path.join(img, "logo.svg"), LOGO_SVG);
  fs.writeFileSync(path.join(img, "logo-white.svg"), LOGO_WHITE_SVG);
  fs.writeFileSync(path.join(img, "logo-black.svg"), LOGO_BLACK_SVG);
  fs.writeFileSync(path.join(img, "logo-icon.svg"), LOGO_ICON_SVG);
  // Alternate logo files used across demos
  for (let i = 2; i <= 13; i++) {
    const f = path.join(img, `logo${i}.svg`);
    if (fs.existsSync(f)) fs.writeFileSync(f, LOGO_SVG);
  }
}

/** DESACTIVADO: override de --theme-color = cambio de estilo AIOR. */
function injectBrandCss() {
  console.log("injectBrandCss: SKIPPED (AIOR colors preserved)");
}

/** DESACTIVADO: capturas SaaS NELVYON prohibidas en la web pública. */
function injectSaasShots() {
  console.log("injectSaasShots: SKIPPED (keep AIOR illustrations/mockups)");
}

/** Precios SaaS reales en las 3 cards AIOR (misma composición). */
function patchPricingCards() {
  const file = path.join(DEST, "pricing.html");
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  // Solo el bloque de 3 price-card style2 — sustituye textos, no el markup de cards
  html = html
    .replace(/>Free</g, ">Starter<")
    .replace(/>pro</gi, ">Growth<")
    .replace(/>business</gi, ">Elite<")
    .replace(/\$<\/span>0/g, "&euro;</span>97")
    .replace(/\$<\/span>199/g, "&euro;</span>297")
    .replace(/\$<\/span>599/g, "&euro;</span>797")
    .replace(/>150 credits</g, ">Plan SaaS — 1 usuario<")
    .replace(/>25,000 credits</g, ">Plan SaaS — hasta 5 usuarios<")
    .replace(/>95,000 credits</g, ">Plan SaaS — enterprise<")
    .replace(/Most Popular/g, "Recomendado")
    .replace(/Pricing Plan/g, "Planes SaaS")
    .replace(/\[ Pricing \]/g, "[ Precios ]");
  // Feature bullets → NELVYON (misma lista de 6 ítems × 3 cards)
  const starter = [
    "Dashboard unificado",
    "CRM y pipeline esencial",
    "Email básico (AWS SES)",
    "1 canal publicitario inicial",
    "1 usuario",
    "Soporte por email",
  ];
  const growth = [
    "Todo lo de Starter",
    "Meta + Google (según activación)",
    "CRM integrado y workflows",
    "Automatización con idempotencia",
    "Hasta 5 usuarios",
    "Soporte prioritario",
  ];
  const elite = [
    "Todo lo de Growth",
    "Canales y usuarios ampliados",
    "CRM y reporting avanzados",
    "Integraciones y webhooks",
    "Gobierno enterprise",
    "Account manager",
  ];
  const lists = [starter, growth, elite];
  let li = 0;
  html = html.replace(/<div class="available-list">\s*<ul>[\s\S]*?<\/ul>\s*<\/div>/g, () => {
    const items = lists[li++] ?? starter;
    return `<div class="available-list">
                            <ul>
                                ${items.map((t) => `<li>${t}</li>`).join("\n                                ")}
                            </ul>
                        </div>`;
  });
  fs.writeFileSync(file, html);
}

/** Contacto: form → API Next; opciones de interés NELVYON. */
function patchContactForm() {
  const file = path.join(DEST, "contact.html");
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(
    /<form action="mail\.php" method="POST" class="contact-form ajax-contact">/,
    `<form action="/api/contact" method="POST" class="contact-form" id="nv-contact-form" data-nv-json="1">`
  );
  html = html.replace(
    /name="number"/g,
    'name="phone"'
  );
  html = html.replace(
    /<select name="subject" id="subject"[\s\S]*?<\/select>/,
    `<select name="plan" id="plan" class="form-select nice-select">
                                        <option value="" disabled selected hidden>Seleccione interés</option>
                                        <option value="demo">Demo del SaaS</option>
                                        <option value="starter">Plan Starter</option>
                                        <option value="growth">Plan Growth</option>
                                        <option value="elite">Plan Elite / Enterprise</option>
                                        <option value="agencia">Servicios de agencia / packs</option>
                                        <option value="otro">Otro</option>
                                    </select>`
  );
  html = html.replace(
    /Ready to Discuss your Project with us\?/g,
    "Cuéntenos su operación"
  );
  const bridge = `
<script>
(function(){
  var f=document.getElementById('nv-contact-form');
  if(!f) return;
  f.addEventListener('submit', function(e){
    e.preventDefault();
    var fd=new FormData(f);
    var payload={
      name:(fd.get('name')||'').toString(),
      email:(fd.get('email')||'').toString(),
      phone:(fd.get('phone')||fd.get('number')||'').toString(),
      plan:(fd.get('plan')||fd.get('subject')||'').toString(),
      message:(fd.get('message')||'').toString(),
      company:''
    };
    var box=f.querySelector('.form-messages');
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(box) box.textContent = x.ok ? 'Mensaje enviado. Le responderemos pronto.' : (x.j && x.j.error ? x.j.error : 'No se pudo enviar.');
      })
      .catch(function(){ if(box) box.textContent='Error de red. Inténtelo de nuevo.'; });
  });
})();
</script>`;
  html = html.replace(/<\/body>/i, bridge + "\n</body>");
  fs.writeFileSync(file, html);
}

function applyFidelityHooks() {
  console.log("Fidelity hooks: pricing, contact (media = fix-aior-selective-media.mjs) …");
  // Media: NO scramble HTML paths. Placeholders/crypto se sustituyen en disco vía fix selectivo.
  patchPricingCards();
  patchContactForm();
}

function writeDemosIndex() {
  const homes = [
    ["index.html", "01 · Agencia + IA (inicio)"],
    ["home-ai-startup.html", "01 · Agencia + IA"],
    ["home-ai-startup-op.html", "01 · Landing Agencia + IA"],
    ["home-ai-chatbot.html", "02 · Inbox / conversaciones"],
    ["home-ai-chatbot-op.html", "02 · Landing Inbox"],
    ["home-ai-writer-tool.html", "04 · Contenido / Agencia"],
    ["home-ai-writer-tool-op.html", "04 · Landing Contenido"],
    ["home-business-intelligence.html", "05 · Enterprise"],
    ["home-business-intelligence-op.html", "05 · Landing Enterprise"],
    ["home-ai-agent.html", "06 · IA y agentes"],
    ["home-ai-agent-op.html", "06 · Landing IA"],
    ["home-productivity-tools.html", "07 · Automatizaciones"],
    ["home-productivity-tools-op.html", "07 · Landing Automatizaciones"],
    ["home-ai-chatbot-tool.html", "08 · Comms / WhatsApp"],
    ["home-ai-chatbot-tool-op.html", "08 · Landing Comms"],
    ["home-cloud-based-saas.html", "09 · Cloud SaaS"],
    ["home-cloud-based-saas-op.html", "09 · Landing Cloud"],
    ["home-saas-product-showcase.html", "10 · Producto SaaS"],
    ["home-saas-product-showcase-op.html", "10 · Landing Producto"],
  ];
  const inners = [
    ["about.html", "Agencia"],
    ["features.html", "Soluciones"],
    ["pricing.html", "Precios"],
    ["case-studies.html", "Perfiles de proyecto"],
    ["case-studies-2.html", "Perfiles (variante)"],
    ["case-studies-details.html", "Detalle perfil"],
    ["cases.html", "Perfiles (cases)"],
    ["integrations.html", "Integraciones"],
    ["faq.html", "FAQ"],
    ["team.html", "Nosotros"],
    ["team-details.html", "Nosotros (detalle)"],
    ["blog.html", "Blog"],
    ["blog-details.html", "Artículo"],
    ["contact.html", "Contacto"],
    ["testimonial.html", "Hechos de plataforma"],
    ["typography.html", "Tipografía"],
    ["error.html", "Error"],
  ];
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>NELVYON — mapa de plantillas AIOR</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;background:#020817;color:#e8eefc;padding:48px 24px}
    a{color:#0084ff;text-decoration:none} a:hover{text-decoration:underline}
    h1{font-size:1.75rem;margin:0 0 8px} p{color:#9fb0d0;margin:0 0 32px}
    h2{font-size:1rem;text-transform:uppercase;letter-spacing:.08em;color:#6b7c99;margin:32px 0 12px}
    ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;max-width:640px}
    li a{display:block;padding:14px 16px;border:1px solid #1e2a44;border-radius:12px;background:#0b1224}
  </style>
</head>
<body>
  <h1>NELVYON · plantillas AIOR conservadas</h1>
  <p>Home 03 y 11 excluidas. Cada plantilla se conserva íntegra; solo cambia el contenido NELVYON. Índice interno (noindex).</p>
  <h2>Homes y landings</h2>
  <ul>${homes.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul>
  <h2>Páginas internas</h2>
  <ul>${inners.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul>
</body>
</html>`;
  fs.writeFileSync(path.join(DEST, "mapa-plantillas.html"), html);
}

if (!fs.existsSync(SRC)) {
  console.error("Missing source:", SRC);
  process.exit(1);
}

console.log("Copying AIOR → public/www …");
rmrf(DEST);
copyDir(SRC, DEST);

console.log("Branding text/colors …");
const files = walk(DEST).filter((f) => /\.(html|css|scss|js|json|svg|txt|md)$/i.test(f));
let n = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = brandText(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    n++;
  }
}

writeLogos();
// NO injectBrandCss / NO injectSaasShots — visual AIOR intacto
writeDemosIndex();
applyFidelityHooks();

fs.writeFileSync(
  path.join(DEST, "README-NELVYON.txt"),
  `NELVYON × AIOR — plantilla completa
- TODAS las homes excepto 03 (image-generate) y 11 (finance-crypto)
- TODAS las páginas internas
- Diseño/HTML/CSS/JS/imágenes AIOR intactos — SOLO logo + textos + precios + SEO/legales
- PROHIBIDO: capturas SaaS NELVYON, fidelity/selective media, cambio de colores
- index.html = Home 01 (startup) original
- Mapa: /www/mapa-plantillas.html (noindex)
- Regenerar contenido: node scripts/brand-aior-nelvyon.mjs && node scripts/content-aior-nelvyon-only.mjs
- Si se alteró media: node scripts/restore-aior-visuals-keep-content.mjs
- NUNCA: redistribute/fidelity/selective media passes
`
);

console.log(`Done. Branded files: ${n}. Output: ${DEST}`);
console.log("Excluded:", [...EXCLUDE].join(", "));
console.log("Next: node scripts/content-aior-nelvyon-only.mjs");

import {
  buildArtifactDownloadUrl,
  createArtifactZip,
  listZipEntryNames,
  publishArtifactZip,
  resolveStaticSiteZipPath,
} from "../artifacts/artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson, pickColor } from "../artifacts/htmlUtils";
import { webPremiumIntakeStrings } from "./webPremiumPrompts";

export { parseLooseJson, isValidHtmlDocument };

export type StaticSiteFileMap = {
  "index.html": string;
  "about.html": string;
  "services.html": string;
  "contact.html": string;
  "assets/styles.css": string;
  "assets/main.js": string;
} & Record<string, string>;

export interface DesignTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headingFont: string;
  bodyFont: string;
  brandName: string;
}

export interface PublishStaticSiteResult {
  assetId: string;
  downloadUrl: string;
  fileCount: number;
  sizeBytes: number;
}

const REQUIRED_FILES: (keyof StaticSiteFileMap)[] = [
  "index.html",
  "about.html",
  "services.html",
  "contact.html",
  "assets/styles.css",
  "assets/main.js",
];

export { resolveStaticSiteZipPath };

export function extractDesignTokens(designProposalJson: string, brandName: string): DesignTokens {
  const parsed = parseLooseJson<Record<string, unknown>>(designProposalJson, {});
  const palette =
    (parsed.colorPalette as Record<string, unknown> | undefined) ??
    (parsed.color_palette as Record<string, unknown> | undefined) ??
    {};
  const typography = (parsed.typography as Record<string, unknown> | undefined) ?? {};

  return {
    primary: pickColor(palette.primary, "#0f172a"),
    secondary: pickColor(palette.secondary, "#64748b"),
    accent: pickColor(palette.accent, "#7c3aed"),
    background: pickColor(palette.background, "#ffffff"),
    text: pickColor(palette.text, "#1e293b"),
    headingFont:
      typeof typography.heading === "string" ? typography.heading.split(",")[0]!.trim() : "system-ui",
    bodyFont: typeof typography.body === "string" ? typography.body.split(",")[0]!.trim() : "system-ui",
    brandName: brandName || "NELVYON",
  };
}

type Section = { name?: string; headline?: string; body?: string; cta?: string };
type ServiceItem = { name?: string; headline?: string; description?: string; benefits?: string[] };
type ValueItem = { name?: string; description?: string };

function siteNav(active: "home" | "about" | "services" | "contact", brand: string): string {
  const link = (href: string, label: string, key: typeof active) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`;
  return `<nav class="site-nav" aria-label="Principal">
  <a class="brand" href="index.html">${escapeHtml(brand)}</a>
  <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-menu">Menú</button>
  <div id="nav-menu" class="nav-links">
    ${link("index.html", "Inicio", "home")}
    ${link("about.html", "Nosotros", "about")}
    ${link("services.html", "Servicios", "services")}
    ${link("contact.html", "Contacto", "contact")}
  </div>
</nav>`;
}

function siteFooter(brand: string): string {
  return `<footer class="site-footer">
  <p>&copy; ${new Date().getFullYear()} ${escapeHtml(brand)}. Generado por NELVYON OS.</p>
  <p><a href="contact.html">Contacto</a> · <a href="services.html">Servicios</a></p>
</footer>`;
}

function pageDocument(
  title: string,
  description: string,
  active: "home" | "about" | "services" | "contact",
  brand: string,
  body: string,
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/styles.css">
  <script src="assets/main.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  ${siteNav(active, brand)}
  <main id="main">${body}</main>
  ${siteFooter(brand)}
</body>
</html>`;
}

function renderSections(sections: Section[]): string {
  if (!sections.length) return "";
  return sections
    .map(
      (s) => `<section class="content-section">
  <h2>${escapeHtml(s.headline ?? s.name ?? "Sección")}</h2>
  <p>${escapeHtml(s.body ?? "")}</p>
  ${s.cta ? `<a class="btn btn-secondary" href="contact.html">${escapeHtml(s.cta)}</a>` : ""}
</section>`,
    )
    .join("\n");
}

function renderServices(items: ServiceItem[]): string {
  if (!items.length) {
    return `<p class="lead">Descubre cómo podemos ayudarte a alcanzar tus objetivos.</p>`;
  }
  return items
    .map(
      (s) => `<article class="service-card">
  <h2>${escapeHtml(s.headline ?? s.name ?? "Servicio")}</h2>
  <p>${escapeHtml(s.description ?? "")}</p>
  ${
    Array.isArray(s.benefits) && s.benefits.length
      ? `<ul>${s.benefits.map((b) => `<li>${escapeHtml(String(b))}</li>`).join("")}</ul>`
      : ""
  }
  <a class="btn btn-secondary" href="contact.html">Solicitar información</a>
</article>`,
    )
    .join("\n");
}

export function buildStylesCss(tokens: DesignTokens): string {
  return `:root {
  --color-primary: ${tokens.primary};
  --color-secondary: ${tokens.secondary};
  --color-accent: ${tokens.accent};
  --color-bg: ${tokens.background};
  --color-text: ${tokens.text};
  --font-heading: ${tokens.headingFont}, system-ui, sans-serif;
  --font-body: ${tokens.bodyFont}, system-ui, sans-serif;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2.5rem;
  --space-xl: 4rem;
  --radius: 0.75rem;
  --shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
  --max-width: 72rem;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.6;
}
img { max-width: 100%; height: auto; }
a { color: var(--color-accent); }
a:focus-visible, button:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 2px; }

.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  background: var(--color-primary);
  color: #fff;
  padding: var(--space-xs) var(--space-sm);
  z-index: 100;
}
.skip-link:focus { left: var(--space-sm); }

.site-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
  position: sticky;
  top: 0;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  backdrop-filter: blur(8px);
  z-index: 50;
}
.brand {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.125rem;
  text-decoration: none;
  color: var(--color-primary);
}
.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
.nav-links a {
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
}
.nav-links a[aria-current="page"] {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}
.nav-toggle { display: none; }

main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: var(--space-lg) var(--space-md) var(--space-xl);
}

.hero {
  padding: var(--space-xl) var(--space-md);
  border-radius: var(--radius);
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 92%, #000), var(--color-accent));
  color: #fff;
  margin-bottom: var(--space-lg);
  box-shadow: var(--shadow);
}
.hero h1 {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
  margin: 0 0 var(--space-sm);
}
.hero .lead { font-size: 1.125rem; opacity: 0.95; max-width: 40rem; }
.hero-cta { margin-top: var(--space-md); display: flex; flex-wrap: wrap; gap: var(--space-sm); }

.page-hero {
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 2px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
}
.page-hero h1 {
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  margin: 0 0 var(--space-xs);
  color: var(--color-primary);
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn-primary {
  background: #fff;
  color: var(--color-primary);
}
.btn-secondary {
  background: var(--color-accent);
  color: #fff;
}
.btn:hover { transform: translateY(-2px); box-shadow: var(--shadow); }

.content-section, .service-card, .values-grid article, .contact-panel {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--color-bg) 88%, var(--color-secondary));
  border: 1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent);
}
.service-card h2, .content-section h2 { font-family: var(--font-heading); color: var(--color-primary); }

.values-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.contact-panel form {
  display: grid;
  gap: var(--space-sm);
  max-width: 28rem;
}
.contact-panel label { font-weight: 600; }
.contact-panel input, .contact-panel textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-secondary) 40%, transparent);
  border-radius: 0.5rem;
  font: inherit;
}

.site-footer {
  text-align: center;
  padding: var(--space-lg) var(--space-md);
  border-top: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
  font-size: 0.9rem;
  color: var(--color-secondary);
}
.site-footer a { margin: 0 0.35rem; }

@media (max-width: 640px) {
  .nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--color-secondary) 35%, transparent);
    border-radius: 0.5rem;
    background: var(--color-bg);
    font: inherit;
  }
  .nav-links {
    display: none;
    width: 100%;
    flex-direction: column;
    padding-top: var(--space-xs);
  }
  .nav-links.is-open { display: flex; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .btn { transition: none; }
}
`;
}

export function buildMainJs(): string {
  return `"use strict";
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var sections = document.querySelectorAll(".content-section, .service-card, .page-hero");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    sections.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    sections.forEach(function (el) { io.observe(el); });
  }
})();
`;
}

export function buildStaticSiteFiles(
  contentGenerationJson: string,
  designProposalJson: string,
  brandName: string,
): StaticSiteFileMap {
  const content = parseLooseJson<Record<string, unknown>>(contentGenerationJson, {});
  const homepage = (content.homepage as Record<string, unknown> | undefined) ?? {};
  const about = (content.about as Record<string, unknown> | undefined) ?? {};
  const contact = (content.contact as Record<string, unknown> | undefined) ?? {};
  const servicesRaw = content.services;
  const services: ServiceItem[] = Array.isArray(servicesRaw)
    ? (servicesRaw as ServiceItem[])
    : [];
  const sections = (homepage.sections as Section[] | undefined) ?? [];
  const values = (about.values as ValueItem[] | undefined) ?? [];

  const tokens = extractDesignTokens(designProposalJson, brandName);
  const brand = tokens.brandName;

  const indexBody = `
<section class="hero">
  <h1>${escapeHtml(String(homepage.heroHeadline ?? "Impulsa tu negocio"))}</h1>
  <p class="lead">${escapeHtml(String(homepage.heroSubheadline ?? "Soluciones digitales de nivel mundial."))}</p>
  <div class="hero-cta">
    <a class="btn btn-primary" href="contact.html">${escapeHtml(String(homepage.heroCta ?? "Empezar ahora"))}</a>
    <a class="btn btn-secondary" href="services.html">Ver servicios</a>
  </div>
</section>
${renderSections(sections)}`;

  const aboutBody = `
<header class="page-hero">
  <h1>${escapeHtml(String(about.headline ?? "Sobre nosotros"))}</h1>
  <p class="lead">${escapeHtml(String(about.story ?? "Historia y propósito de marca."))}</p>
</header>
<section class="values-grid">
  ${
    values.length
      ? values
          .map(
            (v) => `<article>
    <h2>${escapeHtml(v.name ?? "Valor")}</h2>
    <p>${escapeHtml(v.description ?? "")}</p>
  </article>`,
          )
          .join("\n")
      : `<article><h2>Excelencia</h2><p>Compromiso con resultados medibles.</p></article>`
  }
</section>`;

  const servicesBody = `
<header class="page-hero">
  <h1>Servicios</h1>
  <p class="lead">Soluciones diseñadas para crecer con claridad y enfoque.</p>
</header>
${renderServices(services)}`;

  const contactBody = `
<header class="page-hero">
  <h1>${escapeHtml(String(contact.headline ?? "Contacto"))}</h1>
  <p class="lead">${escapeHtml(String(contact.subheadline ?? "Cuéntanos tu proyecto."))}</p>
</header>
<section class="contact-panel">
  <form action="#" method="post">
    <label for="name">Nombre</label>
    <input id="name" name="name" type="text" required autocomplete="name">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="email">
    <label for="message">Mensaje</label>
    <textarea id="message" name="message" rows="5" required></textarea>
    <button class="btn btn-primary" type="submit">${escapeHtml(String(contact.cta ?? "Enviar"))}</button>
  </form>
</section>`;

  const css = buildStylesCss(tokens);
  const cssWithReveal = `${css}
.reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.is-visible { opacity: 1; transform: none; }
`;

  return {
    "index.html": pageDocument(
      `${brand} — Inicio`,
      String(homepage.heroSubheadline ?? "Sitio corporativo premium"),
      "home",
      brand,
      indexBody,
    ),
    "about.html": pageDocument(`${brand} — Nosotros`, String(about.story ?? "Conoce nuestra historia"), "about", brand, aboutBody),
    "services.html": pageDocument(`${brand} — Servicios`, "Catálogo de servicios", "services", brand, servicesBody),
    "contact.html": pageDocument(`${brand} — Contacto`, String(contact.subheadline ?? "Hablemos"), "contact", brand, contactBody),
    "assets/styles.css": cssWithReveal,
    "assets/main.js": buildMainJs(),
  };
}

export function createStaticSiteZip(files: StaticSiteFileMap): Uint8Array {
  return createArtifactZip(files);
}

export { listZipEntryNames };

export function buildStaticSiteDownloadUrl(jobId: string): string {
  return buildArtifactDownloadUrl("static-site", jobId);
}

export async function publishStaticSiteZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: StaticSiteFileMap;
  zipBytes?: Uint8Array;
}): Promise<PublishStaticSiteResult> {
  const result = await publishArtifactZip({
    kind: "static-site",
    clientId: options.clientId,
    tenantId: options.tenantId,
    jobId: options.jobId,
    serviceId: options.serviceId,
    files: options.files,
    zipBytes: options.zipBytes,
  });
  return {
    assetId: result.assetId,
    downloadUrl: result.downloadUrl,
    fileCount: REQUIRED_FILES.length,
    sizeBytes: result.sizeBytes,
  };
}

export function runSiteCodegen(
  designProposalJson: string,
  contentGenerationJson: string,
  payload: Record<string, unknown>,
): string {
  const { clientName } = webPremiumIntakeStrings(payload);
  const files = buildStaticSiteFiles(contentGenerationJson, designProposalJson, clientName);
  for (const key of REQUIRED_FILES) {
    if (!files[key]) throw new Error(`webStaticBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`webStaticBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({
    pages: ["index.html", "about.html", "services.html", "contact.html"],
    assets: ["assets/styles.css", "assets/main.js"],
    brandName: clientName,
  });
}

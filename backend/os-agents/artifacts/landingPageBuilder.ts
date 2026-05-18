import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { webPremiumIntakeStrings } from "../agents/webPremiumPrompts";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type LandingFileMap = {
  "index.html": string;
  "assets/styles.css": string;
};

export const LANDING_REQUIRED_FILES: (keyof LandingFileMap)[] = ["index.html", "assets/styles.css"];

function landingDocument(title: string, description: string, brand: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  <header class="site-nav">
    <span class="brand">${escapeHtml(brand)}</span>
    <a class="btn btn-primary nav-cta" href="#contacto">${escapeHtml("Empezar ahora")}</a>
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(brand)}. Generado por NELVYON OS.</p>
  </footer>
</body>
</html>`;
}

export function buildLandingPageFiles(
  contentJson: string,
  designJson: string,
  brandName: string,
): LandingFileMap {
  const content = parseLooseJson<Record<string, unknown>>(contentJson, {});
  const homepage = (content.homepage as Record<string, unknown> | undefined) ?? content;
  const tokens = extractDesignTokens(designJson, brandName);

  const heroHeadline = String(homepage.heroHeadline ?? homepage.headline ?? `Impulsa tu negocio con ${brandName}`);
  const heroSub = String(
    homepage.heroSubheadline ?? homepage.subheadline ?? "Landing optimizada para conversión con social proof y formulario de contacto.",
  );
  const heroCta = String(homepage.heroCta ?? homepage.cta ?? "Solicitar demo");

  const sections = Array.isArray(homepage.sections) ? homepage.sections : [];
  const proofItems = sections.length
    ? sections.slice(0, 3).map((s) => {
        const o = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
        return `<blockquote class="proof-card">
  <p>${escapeHtml(String(o.body ?? o.headline ?? "Resultados medibles en semanas."))}</p>
  <cite>${escapeHtml(String(o.name ?? o.headline ?? "Cliente verificado"))}</cite>
</blockquote>`;
      })
    : [
        `<blockquote class="proof-card"><p>+38% leads cualificados en 90 días.</p><cite>Director Marketing</cite></blockquote>`,
        `<blockquote class="proof-card"><p>Implementación en menos de 2 semanas.</p><cite>CEO SaaS B2B</cite></blockquote>`,
        `<blockquote class="proof-card"><p>ROI positivo desde el primer mes.</p><cite>CMO Retail</cite></blockquote>`,
      ];

  const contact = (content.contact as Record<string, unknown> | undefined) ?? {};
  const contactHeadline = String(contact.headline ?? "Hablemos hoy");
  const contactCta = String(contact.cta ?? heroCta);

  const body = `
<section class="hero">
  <p class="eyebrow">Landing premium · NELVYON OS</p>
  <h1>${escapeHtml(heroHeadline)}</h1>
  <p class="lead">${escapeHtml(heroSub)}</p>
  <a class="btn btn-primary btn-lg" href="#contacto">${escapeHtml(heroCta)}</a>
</section>
<section class="social-proof" aria-label="Prueba social">
  <h2>Confían en nosotros</h2>
  <div class="proof-grid">${proofItems.join("")}</div>
</section>
<section id="contacto" class="contact-section">
  <h2>${escapeHtml(contactHeadline)}</h2>
  <p class="lead">${escapeHtml(String(contact.subheadline ?? "Respuesta en menos de 24 horas laborables."))}</p>
  <form class="contact-form" action="#" method="post">
    <label for="name">Nombre</label>
    <input id="name" name="name" type="text" required autocomplete="name">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required autocomplete="email">
    <label for="company">Empresa</label>
    <input id="company" name="company" type="text" autocomplete="organization">
    <label for="message">Mensaje</label>
    <textarea id="message" name="message" rows="4" required></textarea>
    <button class="btn btn-primary" type="submit">${escapeHtml(contactCta)}</button>
  </form>
</section>`;

  const css = `${buildStylesCss(tokens)}
.site-nav { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); position:sticky; top:0; background:color-mix(in srgb, var(--color-bg) 95%, transparent); z-index:10; }
.nav-cta { margin-left:auto; }
.eyebrow { text-transform:uppercase; letter-spacing:0.08em; font-size:0.75rem; opacity:0.85; margin:0 0 0.5rem; }
.btn-lg { font-size:1.125rem; padding:1rem 2rem; }
.social-proof { margin-top:var(--space-xl); }
.proof-grid { display:grid; gap:var(--space-md); grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); }
.proof-card { margin:0; padding:var(--space-md); border-radius:var(--radius); background:color-mix(in srgb, var(--color-accent) 8%, var(--color-bg)); border-left:4px solid var(--color-accent); }
.proof-card cite { display:block; margin-top:0.75rem; font-style:normal; font-size:0.875rem; color:var(--color-secondary); }
.contact-section { margin-top:var(--space-xl); padding:var(--space-lg); border-radius:var(--radius); box-shadow:var(--shadow); background:var(--color-bg); border:1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent); }
.contact-form { display:grid; gap:var(--space-sm); max-width:32rem; }
.contact-form label { font-weight:600; }
.contact-form input, .contact-form textarea { width:100%; padding:0.65rem 0.75rem; border:1px solid color-mix(in srgb, var(--color-secondary) 35%, transparent); border-radius:0.5rem; font:inherit; }
`;

  return {
    "index.html": landingDocument(`${brandName} — Landing`, heroSub, brandName, body),
    "assets/styles.css": css,
  };
}

export function runLandingCodegen(
  designProposalJson: string,
  contentGenerationJson: string,
  payload: Record<string, unknown>,
): string {
  const { clientName } = webPremiumIntakeStrings(payload as Parameters<typeof webPremiumIntakeStrings>[0]);
  const files = buildLandingPageFiles(contentGenerationJson, designProposalJson, clientName);
  for (const key of LANDING_REQUIRED_FILES) {
    if (!files[key]) throw new Error(`landingPageBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`landingPageBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ pages: ["index.html"], assets: ["assets/styles.css"], brandName: clientName });
}

export async function publishLandingZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: LandingFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "landing", ...options });
}

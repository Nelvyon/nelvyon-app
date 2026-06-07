/**
 * Phase H — staging HTML renderer aligned with landing_builder_service block schema.
 * Isolated static export (no DB, no CDN deploy).
 */

export interface LandingBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  responsive?: { hideOnMobile?: boolean; orderMobile?: number };
}

export interface LandingStagingRenderInput {
  brief: Record<string, unknown>;
  copy: Record<string, unknown>;
  design: Record<string, unknown>;
  blocks: LandingBlock[];
  meta?: { title?: string; description?: string; schema?: Record<string, unknown> };
}

export function renderLandingStagingHtml(input: LandingStagingRenderInput): string {
  const { brief, blocks, meta } = input;
  const title = meta?.title ?? `${String(brief.company_name ?? "Restaurante")} — Reserva`;
  const description = meta?.description ?? String(brief.value_proposition ?? "").slice(0, 160);
  const locale = String(brief.locale ?? "es").slice(0, 2);
  const company = String(brief.company_name ?? "Restaurante");
  const ctaLabel = String(
    (input.copy.hero as { cta_label?: string })?.cta_label ?? brief.primary_cta ?? "Reservar mesa",
  );
  const reservationHref = `#reservar`;

  const navLinks = [
    { href: "#hero", label: "Inicio" },
    { href: "#oferta", label: "Oferta" },
    { href: "#opiniones", label: "Opiniones" },
    { href: "#ubicacion", label: "Ubicación" },
    { href: reservationHref, label: ctaLabel },
  ];

  const body = blocks.map((block) => renderBlock(block, { company, ctaLabel, reservationHref })).join("\n");

  const schema = meta?.schema ?? {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: company,
    address: (brief.location as { address?: string })?.address,
  };

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>${STAGING_CSS}</style>
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="#hero">${escapeHtml(company)}</a>
      <nav class="main-nav" data-nav aria-label="Principal">
        ${navLinks.map((l) => `<a href="${escapeAttr(l.href)}" data-nav-link>${escapeHtml(l.label)}</a>`).join("")}
      </nav>
    </div>
  </header>
  <main>
${body}
  </main>
  <footer class="site-footer">
    <div class="container">
      <p>Información orientativa. Consulta alérgenos en el local. Servicio +18 donde aplique.</p>
      <p class="muted">${escapeHtml(company)} — preview staging autonomous</p>
    </div>
  </footer>
</body>
</html>`;
}

function renderBlock(
  block: LandingBlock,
  ctx: { company: string; ctaLabel: string; reservationHref: string },
): string {
  const props = block.props ?? {};
  switch (block.type) {
    case "hero":
      return renderHero(props, ctx);
    case "text":
      return `<section class="section text-block" id="oferta" data-section="offer"><div class="container"><p>${escapeHtml(String(props.content ?? ""))}</p></div></section>`;
    case "testimonials":
      return renderTestimonials(props);
    case "image":
      return renderGallery(props);
    case "cta":
      return renderCta(props, ctx);
    case "faq":
      return renderLocation(props);
    default:
      return "";
  }
}

function renderHero(
  props: Record<string, unknown>,
  ctx: { ctaLabel: string; reservationHref: string },
): string {
  const headline = String(props.headline ?? "");
  const sub = String(props.subheadline ?? "");
  const img = String(props.imageUrl ?? "");
  const bg = String(props.backgroundColor ?? "#1C1917");
  const imgHtml = img
    ? `<img class="hero-img" src="${escapeAttr(img)}" alt="${escapeAttr(String(props.headline ?? ""))}" fetchpriority="high" />`
    : "";
  return `<section class="hero" id="hero" data-section="hero" style="--hero-bg:${escapeAttr(bg)}">
  ${imgHtml}
  <div class="hero-overlay"></div>
  <div class="container hero-content">
    <h1>${escapeHtml(headline)}</h1>
    <p class="sub">${escapeHtml(sub)}</p>
    <a class="cta btn-primary" href="${escapeAttr(ctx.reservationHref)}" data-cta data-primary-link>${escapeHtml(ctx.ctaLabel)}</a>
  </div>
</section>`;
}

function renderTestimonials(props: Record<string, unknown>): string {
  const items = (props.items as Array<{ quote?: string; author?: string }>) ?? [];
  const cards = items
    .map(
      (t) =>
        `<blockquote class="testimonial"><p>${escapeHtml(String(t.quote ?? ""))}</p><footer>— ${escapeHtml(String(t.author ?? ""))}</footer></blockquote>`,
    )
    .join("");
  return `<section class="section" id="opiniones" data-section="testimonials"><div class="container"><h2 class="section-title">Opiniones</h2><div class="grid-2">${cards}</div></div></section>`;
}

function renderGallery(props: Record<string, unknown>): string {
  const url = String(props.imageUrl ?? "");
  if (!url) return "";
  return `<section class="section gallery" data-section="gallery"><div class="container">${`<img src="${escapeAttr(url)}" alt="${escapeAttr(String(props.alt ?? ""))}" loading="lazy" class="gallery-img" />`}</div></section>`;
}

function renderCta(props: Record<string, unknown>, ctx: { ctaLabel: string; reservationHref: string }): string {
  const headline = String(props.headline ?? "Reserva directa");
  const sub = String(props.subheadline ?? "");
  const btn = String(props.buttonText ?? ctx.ctaLabel);
  const href = String(props.buttonUrl ?? ctx.reservationHref);
  return `<section class="section cta-band" id="reservar" data-section="cta"><div class="container cta-inner">
  <h2>${escapeHtml(headline)}</h2>
  <p>${escapeHtml(sub)}</p>
  <a class="cta btn-primary" href="${escapeAttr(href)}" data-cta>${escapeHtml(btn)}</a>
</div></section>`;
}

function renderLocation(props: Record<string, unknown>): string {
  const items = (props.items as Array<{ question?: string; answer?: string }>) ?? [];
  const rows = items
    .map(
      (i) =>
        `<div class="location-row"><strong>${escapeHtml(String(i.question ?? ""))}</strong><p>${escapeHtml(String(i.answer ?? ""))}</p></div>`,
    )
    .join("");
  return `<section class="section" id="ubicacion" data-section="location"><div class="container"><h2 class="section-title">Ubicación</h2>${rows}</div></section>`;
}

const STAGING_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;line-height:1.55;color:#1C1917;background:#FFFBEB}
.container{max-width:720px;margin:0 auto;padding:0 1.25rem}
.site-header{position:sticky;top:0;z-index:10;background:rgba(255,251,235,.95);border-bottom:1px solid #E7E5E4;padding:.75rem 0}
.header-inner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem}
.brand{font-weight:700;color:#1C1917;text-decoration:none}
.main-nav{display:flex;flex-wrap:wrap;gap:.75rem 1rem}
.main-nav a{color:#57534E;text-decoration:none;font-size:.9rem;font-weight:500}
.hero{position:relative;min-height:min(70vh,560px);display:flex;align-items:center;color:#FFFBEB;overflow:hidden}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(28,25,23,.35),rgba(28,25,23,.82));z-index:1}
.hero-content{position:relative;z-index:2;padding:3rem 0}
.hero h1{font-size:clamp(1.85rem,5vw,2.75rem);margin-bottom:.75rem}
.hero .sub{font-size:1.05rem;max-width:36rem;margin-bottom:1.25rem;color:rgba(255,251,235,.92)}
.btn-primary{display:inline-flex;align-items:center;min-height:48px;padding:.85rem 1.5rem;border-radius:.5rem;background:#B45309;color:#FFFBEB;font-weight:600;text-decoration:none;border:none;cursor:pointer}
.section{padding:2.5rem 0}
.section-title{font-size:1.35rem;margin-bottom:1rem}
.grid-2{display:grid;gap:1rem}
@media(min-width:768px){.grid-2{grid-template-columns:1fr 1fr}}
.testimonial{border:1px solid #E7E5E4;border-radius:.75rem;padding:1rem;background:#fff}
.gallery-img{width:100%;max-height:280px;object-fit:cover;border-radius:.5rem}
.cta-band{text-align:center;background:#1C1917;color:#FFFBEB;border-radius:1rem;margin:0 1.25rem 2rem;max-width:696px;margin-left:auto;margin-right:auto}
.cta-inner{padding:2rem 1.25rem}
.cta-band h2{margin-bottom:.5rem}
.cta-band .btn-primary{margin-top:1rem}
.location-row{margin-bottom:1rem}
.site-footer{padding:1.5rem 0;font-size:.8rem;color:#78716C;text-align:center;border-top:1px solid #E7E5E4;background:#FAFAF9}
.muted{margin-top:.35rem;font-size:.75rem}
@media(min-width:1280px){.container{max-width:960px}}
`.trim();

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

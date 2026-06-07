/** Phase F — static HTML preview from landing artifacts (mock builder output) */

export interface LandingPreviewInput {
  brief: Record<string, unknown>;
  copy: Record<string, unknown>;
  design: Record<string, unknown>;
}

export function renderLandingPreviewHtml(input: LandingPreviewInput): string {
  const { brief, copy, design } = input;
  const hero = copy.hero as { headline?: string; subheadline?: string; cta_label?: string } | undefined;
  const meta = copy.meta as { title?: string; description?: string } | undefined;
  const tokens = (design.tokens as { primary?: string; secondary?: string }) ?? {};
  const primary = tokens.primary ?? (brief.brand as { primary_color?: string })?.primary_color ?? "#B45309";
  const secondary = tokens.secondary ?? (brief.brand as { secondary_color?: string })?.secondary_color ?? "#1C1917";
  const company = String(brief.company_name ?? "Restaurante");
  const title = meta?.title ?? `${company} — Reserva tu mesa`;
  const description =
    meta?.description ?? String(brief.value_proposition ?? "").slice(0, 160);
  const headline = hero?.headline ?? company;
  const subheadline = hero?.subheadline ?? String(brief.value_proposition ?? "");
  const cta = hero?.cta_label ?? String(brief.primary_cta ?? "Reservar");
  const location = brief.location as { address?: string; city?: string } | undefined;
  const offer = brief.offer as { promotion?: string } | undefined;
  const photos = (brief.photos_placeholder as Array<{ url?: string; alt?: string }>) ?? [];
  const heroImg = photos[0];

  return `<!DOCTYPE html>
<html lang="${String(brief.locale ?? "es").slice(0, 2)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; color: ${secondary}; background: #FFFBEB; line-height: 1.5; }
    .hero { padding: 2rem 1.25rem; max-width: 720px; margin: 0 auto; }
    h1 { font-size: clamp(1.75rem, 5vw, 2.5rem); margin-bottom: 0.75rem; color: ${secondary}; }
    .sub { font-size: 1.05rem; margin-bottom: 1.25rem; color: #44403C; }
    .cta {
      display: inline-block; padding: 0.85rem 1.5rem; background: ${primary}; color: #FFFBEB;
      border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;
    }
    .offer { margin-top: 1rem; font-size: 0.95rem; color: #57534E; }
    .location { margin-top: 1.5rem; font-size: 0.9rem; }
    img.hero-img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem; }
    footer { padding: 1rem; font-size: 0.75rem; color: #78716C; text-align: center; }
  </style>
</head>
<body>
  <main>
    <section class="hero" data-section="hero">
      ${heroImg?.url ? `<img class="hero-img" src="${escapeAttr(heroImg.url)}" alt="${escapeAttr(heroImg.alt ?? "")}" />` : ""}
      <h1>${escapeHtml(headline)}</h1>
      <p class="sub">${escapeHtml(subheadline)}</p>
      <button type="button" class="cta" data-cta>${escapeHtml(cta)}</button>
      ${offer?.promotion ? `<p class="offer">${escapeHtml(offer.promotion)}</p>` : ""}
      ${location?.address ? `<p class="location">${escapeHtml(location.address)}, ${escapeHtml(location.city ?? "")}</p>` : ""}
    </section>
  </main>
  <footer>Información orientativa. Consulta alérgenos en el local.</footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

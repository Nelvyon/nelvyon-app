import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { eliteAdsIntakeStrings } from "../agents/elitePayloadStrings";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type AdsBundleFileMap = Record<string, string>;

const PLATFORMS = ["meta", "google", "tiktok"] as const;
const FORMATS = ["feed", "story", "banner"] as const;

function creativeShell(title: string, brand: string, inner: string, tokens: ReturnType<typeof extractDesignTokens>): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — ${escapeHtml(brand)}</title>
  <style>
    body { margin:0; font-family:system-ui,sans-serif; background:#0f172a; color:#f8fafc; padding:1.5rem; }
    .ad { max-width:420px; margin:0 auto; border-radius:12px; overflow:hidden; background:#fff; color:#1e293b; box-shadow:0 20px 50px rgba(0,0,0,.35); }
    .ad-header { background:${tokens.primary}; color:#fff; padding:0.75rem 1rem; font-weight:700; font-size:0.875rem; }
    .ad-body { padding:1.25rem; }
    .ad-body h1 { margin:0 0 0.5rem; font-size:1.25rem; color:${tokens.primary}; }
    .ad-body p { margin:0 0 1rem; font-size:0.95rem; line-height:1.5; }
    .cta { display:inline-block; background:${tokens.accent}; color:#fff; padding:0.65rem 1.25rem; border-radius:6px; text-decoration:none; font-weight:700; }
    .format-tag { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; opacity:0.7; }
  </style>
</head>
<body>
  <p class="format-tag">${escapeHtml(title)}</p>
  <article class="ad">${inner}</article>
</body>
</html>`;
}

function renderCreative(
  platform: string,
  format: string,
  headline: string,
  description: string,
  cta: string,
  brand: string,
  tokens: ReturnType<typeof extractDesignTokens>,
): string {
  const isStory = format === "story";
  const inner = `<div class="ad-header">${escapeHtml(brand)} · ${escapeHtml(platform)}</div>
<div class="ad-body" style="${isStory ? "min-height:320px;display:flex;flex-direction:column;justify-content:flex-end;" : ""}">
  <h1>${escapeHtml(headline)}</h1>
  <p>${escapeHtml(description)}</p>
  <a class="cta" href="#">${escapeHtml(cta)}</a>
</div>`;
  return creativeShell(`${platform} ${format}`, brand, inner, tokens);
}

export function buildAdsBundleFiles(creativeJson: string, payload: Record<string, unknown>): AdsBundleFileMap {
  const intake = eliteAdsIntakeStrings(payload as Parameters<typeof eliteAdsIntakeStrings>[0]);
  const brand = intake.clientName;
  const tokens = extractDesignTokens("{}", brand);

  const parsed = parseLooseJson<Record<string, unknown>>(creativeJson, {});
  const headlines = Array.isArray(parsed.headlines)
    ? parsed.headlines.map((h) => String(h)).filter(Boolean)
    : ["Resultados que puedes medir"];
  const descriptions = Array.isArray(parsed.descriptions)
    ? parsed.descriptions.map((d) => String(d)).filter(Boolean)
    : ["Descubre cómo escalar con NELVYON OS."];
  const ctaSet = Array.isArray(parsed.ctaSet) ? parsed.ctaSet.map((c) => String(c)).filter(Boolean) : ["Más información"];
  const cta = ctaSet[0] ?? "Más información";

  const files: AdsBundleFileMap = {
    "README.txt": `Creatividades paid — ${brand}\nOrganizadas por plataforma (meta, google, tiktok) y formato (feed, story, banner).\n`,
  };

  PLATFORMS.forEach((platform, pIdx) => {
    FORMATS.forEach((format, fIdx) => {
      const hi = (pIdx * FORMATS.length + fIdx) % headlines.length;
      const di = (pIdx + fIdx) % descriptions.length;
      const path = `${platform}/${format}.html`;
      files[path] = renderCreative(platform, format, headlines[hi]!, descriptions[di]!, cta, brand, tokens);
    });
  });

  const galleryCards = PLATFORMS.flatMap((platform) =>
    FORMATS.map(
      (format) =>
        `<li><a href="${platform}/${format}.html"><strong>${escapeHtml(platform)}</strong> · ${escapeHtml(format)}</a></li>`,
    ),
  ).join("");

  const indexCss = buildStylesCss(tokens);
  files["index.html"] = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Creatividades — ${escapeHtml(brand)}</title>
  <link rel="stylesheet" href="assets/gallery.css">
</head>
<body>
  <header class="gallery-header"><h1>${escapeHtml(brand)} — Creatividades paid</h1><p>Vista previa de todos los formatos por plataforma.</p></header>
  <ul class="gallery-list">${galleryCards}</ul>
</body>
</html>`;
  files["assets/gallery.css"] = `${indexCss}
body { max-width:56rem; margin:0 auto; padding:2rem 1.5rem; }
.gallery-header h1 { margin:0 0 0.5rem; }
.gallery-list { list-style:none; padding:0; display:grid; gap:0.75rem; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); }
.gallery-list a { display:block; padding:1rem; border-radius:var(--radius); background:color-mix(in srgb, var(--color-accent) 10%, var(--color-bg)); text-decoration:none; color:var(--color-text); border:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.gallery-list a:hover { border-color:var(--color-accent); }
`;

  return files;
}

export function runAdsCodegen(creativeJson: string, payload: Record<string, unknown>): string {
  const files = buildAdsBundleFiles(creativeJson, payload);
  const htmlFiles = Object.keys(files).filter((k) => k.endsWith(".html"));
  for (const key of htmlFiles) {
    if (!isValidHtmlDocument(files[key]!)) {
      throw new Error(`adsBundleBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ creatives: htmlFiles, platforms: PLATFORMS });
}

export async function publishAdsBundleZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: AdsBundleFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "ads-bundle", ...options });
}

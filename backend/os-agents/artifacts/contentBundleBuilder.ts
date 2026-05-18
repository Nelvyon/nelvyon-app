import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { eliteLote2CommonVars } from "../agents/lote2PromptUtils";
import type { OsJobPayload } from "../types";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type ContentBundleFileMap = Record<string, string>;

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

function designJsonFromPayload(payload: Record<string, unknown>): string {
  const b = eliteLote2CommonVars(payload as OsJobPayload);
  return JSON.stringify({
    colorPalette: { primary: b.PRIMARY_COLOR, secondary: b.SECONDARY_COLOR, accent: "#7c3aed" },
  });
}

type ContentPiece = { type: string; title: string; hook: string; outline: string; cta: string };

function normalizePieces(raw: unknown): ContentPiece[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      type: String(o.type ?? "artículo"),
      title: String(o.title ?? `Pieza ${idx + 1}`),
      hook: String(o.hook ?? ""),
      outline: String(o.outline ?? ""),
      cta: String(o.cta ?? "Saber más"),
    };
  });
}

function pieceDocument(piece: ContentPiece, brand: string): string {
  const outlineBlocks = piece.outline
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(piece.title)}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <article class="piece">
    <p class="piece-type">${escapeHtml(piece.type)}</p>
    <h1>${escapeHtml(piece.title)}</h1>
    <p class="brand-ref">${escapeHtml(brand)}</p>
    ${piece.hook ? `<p class="hook">${escapeHtml(piece.hook)}</p>` : ""}
    <div class="outline">${outlineBlocks || `<p>${escapeHtml("Contenido listo para revisión editorial.")}</p>`}</div>
    <p class="cta-line"><strong>CTA:</strong> ${escapeHtml(piece.cta)}</p>
  </article>
</body>
</html>`;
}

export function buildContentBundleFiles(executionJson: string, payload: Record<string, unknown>): ContentBundleFileMap {
  const vars = eliteLote2CommonVars(payload as OsJobPayload);
  const brand = vars.CLIENT_NAME || "NELVYON";
  const tokens = extractDesignTokens(designJsonFromPayload(payload), brand);

  const parsed = parseLooseJson<Record<string, unknown>>(executionJson, {});
  let pieces = normalizePieces(parsed.pieces);

  if (pieces.length === 0) {
    pieces = [
      { type: "blog", title: "Guía estratégica", hook: "Aprende el framework en 10 minutos", outline: "Intro\nDesarrollo\nConclusión", cta: "Descargar PDF" },
      { type: "landing", title: "Copy web hero", hook: "Propuesta de valor clara", outline: "Headline\nSubhead\nBullets", cta: "Agendar demo" },
      { type: "video", title: "Guión Reel 30s", hook: "Pattern interrupt", outline: "Hook 3s\nValor 20s\nCTA 7s", cta: "Seguir" },
    ];
  }

  const files: ContentBundleFileMap = {
    "README.txt": `Bundle de contenido — ${brand}\n${pieces.length} piezas HTML.\n`,
  };

  const indexItems = pieces
    .map(
      (p, i) =>
        `<li><a href="pieces/piece-${padIndex(i + 1)}.html"><span class="type">${escapeHtml(p.type)}</span> ${escapeHtml(p.title)}</a></li>`,
    )
    .join("");

  files["index.html"] = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Índice de contenidos — ${escapeHtml(brand)}</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <header class="doc-header">
    <h1>Índice de contenidos</h1>
    <p>${escapeHtml(brand)} · ${pieces.length} piezas</p>
  </header>
  <main class="doc-main">
    <ul class="index-list">${indexItems}</ul>
  </main>
</body>
</html>`;

  pieces.forEach((piece, idx) => {
    files[`pieces/piece-${padIndex(idx + 1)}.html`] = pieceDocument(piece, brand);
  });

  files["assets/styles.css"] = `${buildStylesCss(tokens)}
.doc-header { padding: 2rem 1.5rem; border-bottom: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.doc-main { max-width: 48rem; margin: 0 auto; padding: 2rem 1.5rem; }
.index-list { list-style: none; padding: 0; }
.index-list li { margin-bottom: 0.75rem; }
.index-list a { text-decoration: none; color: var(--color-text); padding: 0.75rem 1rem; display: block; border-radius: var(--radius); border: 1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent); }
.index-list a:hover { border-color: var(--color-accent); }
.index-list .type { text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.06em; color: var(--color-accent); margin-right: 0.5rem; }
.piece { max-width: 40rem; margin: 2rem auto; padding: 1.5rem; }
.piece-type { text-transform: uppercase; font-size: 0.75rem; color: var(--color-accent); margin: 0 0 0.5rem; }
.hook { font-size: 1.125rem; font-weight: 600; }
.cta-line { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
`;

  return files;
}

export function runContentCodegen(executionJson: string, payload: Record<string, unknown>): string {
  const files = buildContentBundleFiles(executionJson, payload);
  if (!isValidHtmlDocument(files["index.html"]!)) {
    throw new Error("contentBundleBuilder: invalid index.html");
  }
  const pieceFiles = Object.keys(files).filter((k) => k.startsWith("pieces/"));
  return JSON.stringify({ index: "index.html", pieces: pieceFiles, count: pieceFiles.length });
}

export async function publishContentBundleZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: ContentBundleFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "content-bundle", ...options });
}

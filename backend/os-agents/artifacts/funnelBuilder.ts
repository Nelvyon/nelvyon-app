import { buildStylesCss, extractDesignTokens } from "../agents/webStaticBuilder";
import { webPremiumIntakeStrings } from "../agents/webPremiumPrompts";
import { publishArtifactZip, type PublishArtifactResult } from "./artifactPublisher";
import { escapeHtml, isValidHtmlDocument, parseLooseJson } from "./htmlUtils";

export type FunnelFileMap = {
  "paso1.html": string;
  "paso2.html": string;
  "paso3.html": string;
  "assets/styles.css": string;
  "assets/funnel.js": string;
};

export const FUNNEL_REQUIRED_FILES: (keyof FunnelFileMap)[] = [
  "paso1.html",
  "paso2.html",
  "paso3.html",
  "assets/styles.css",
  "assets/funnel.js",
];

type FunnelStep = { title: string; headline: string; body: string; cta: string };

function funnelNav(current: 1 | 2 | 3): string {
  const step = (n: number, label: string) =>
    `<span class="step${current === n ? " is-active" : ""}" data-step="${n}">${n}. ${escapeHtml(label)}</span>`;
  return `<nav class="funnel-progress" aria-label="Progreso del funnel">${step(1, "Captura")}${step(2, "Oferta")}${step(3, "Cierre")}</nav>`;
}

function funnelPage(
  step: 1 | 2 | 3,
  brand: string,
  data: FunnelStep,
  nextHref: string | null,
): string {
  const nextLink = nextHref
    ? `<a class="btn btn-primary" href="${nextHref}">${escapeHtml(data.cta)}</a>`
    : `<button class="btn btn-primary" type="button" disabled>${escapeHtml(data.cta)}</button>`;
  const back =
    step > 1 ? `<a class="btn btn-secondary" href="paso${step - 1}.html">Atrás</a>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)} — ${escapeHtml(brand)}</title>
  <link rel="stylesheet" href="assets/styles.css">
  <script src="assets/funnel.js" defer></script>
</head>
<body data-funnel-step="${step}">
  <header class="funnel-header"><span class="brand">${escapeHtml(brand)}</span></header>
  ${funnelNav(step)}
  <main class="funnel-main">
    <h1>${escapeHtml(data.headline)}</h1>
    <p class="lead">${escapeHtml(data.body)}</p>
    <div class="funnel-actions">${back}${nextLink}</div>
  </main>
</body>
</html>`;
}

function normalizeStages(raw: unknown): FunnelStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      title: String(o.name ?? o.stage ?? `Paso ${idx + 1}`),
      headline: String(o.headline ?? o.goal ?? o.name ?? `Paso ${idx + 1}`),
      body: String(o.copy ?? o.description ?? o.body ?? "Continúa al siguiente paso del funnel."),
      cta: String(o.cta ?? (idx < 2 ? "Continuar" : "Completar")),
    };
  });
}

function buildFunnelJs(): string {
  return `(function () {
  var step = parseInt(document.body.getAttribute("data-funnel-step") || "1", 10);
  var key = "nelvyon_funnel_step";
  try { sessionStorage.setItem(key, String(step)); } catch (e) {}
  document.querySelectorAll(".funnel-progress .step").forEach(function (el) {
    var n = parseInt(el.getAttribute("data-step") || "0", 10);
    if (n <= step) el.classList.add("is-complete");
  });
  var links = document.querySelectorAll("a[href^='paso']");
  links.forEach(function (a) {
    a.addEventListener("click", function () {
      var m = /paso(\\d)\\.html/.exec(a.getAttribute("href") || "");
      if (m) try { sessionStorage.setItem(key, m[1]); } catch (e) {}
    });
  });
})();`;
}

export function buildFunnelFiles(conversionJson: string, designJson: string, brandName: string): FunnelFileMap {
  const parsed = parseLooseJson<Record<string, unknown>>(conversionJson, {});
  let stages = normalizeStages(parsed.funnelStages ?? parsed.stages);

  if (stages.length < 3) {
    const defaults: FunnelStep[] = [
      {
        title: "Opt-in",
        headline: "Descarga la guía gratuita",
        body: "Deja tu email y recibe el recurso que convierte visitantes en leads cualificados.",
        cta: "Quiero la guía",
      },
      {
        title: "Oferta core",
        headline: "Oferta principal con garantía",
        body: "Presentamos la propuesta de valor con prueba social y urgencia ética.",
        cta: "Ver oferta",
      },
      {
        title: "Checkout",
        headline: "Completa tu compra",
        body: "Último paso: confirma datos y accede al producto o servicio.",
        cta: "Finalizar",
      },
    ];
    stages = [...stages, ...defaults].slice(0, 3);
  }

  const tokens = extractDesignTokens(designJson, brandName);
  const s1 = stages[0]!;
  const s2 = stages[1] ?? stages[0]!;
  const s3 = stages[2] ?? stages[1] ?? stages[0]!;

  const css = `${buildStylesCss(tokens)}
.funnel-header { padding:1rem 1.5rem; border-bottom:1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent); }
.funnel-progress { display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center; padding:1rem; }
.funnel-progress .step { padding:0.35rem 0.75rem; border-radius:999px; font-size:0.875rem; background:color-mix(in srgb, var(--color-secondary) 15%, transparent); }
.funnel-progress .step.is-active { background:var(--color-accent); color:#fff; font-weight:700; }
.funnel-progress .step.is-complete { border:2px solid var(--color-accent); }
.funnel-main { max-width:40rem; margin:0 auto; text-align:center; }
.funnel-actions { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; margin-top:2rem; }
`;

  return {
    "paso1.html": funnelPage(1, brandName, s1, "paso2.html"),
    "paso2.html": funnelPage(2, brandName, s2, "paso3.html"),
    "paso3.html": funnelPage(3, brandName, s3, null),
    "assets/styles.css": css,
    "assets/funnel.js": buildFunnelJs(),
  };
}

export function runFunnelCodegen(
  conversionJson: string,
  designJson: string,
  payload: Record<string, unknown>,
): string {
  const { clientName } = webPremiumIntakeStrings(payload as Parameters<typeof webPremiumIntakeStrings>[0]);
  const files = buildFunnelFiles(conversionJson, designJson, clientName);
  for (const key of FUNNEL_REQUIRED_FILES) {
    if (!files[key]) throw new Error(`funnelBuilder: missing ${key}`);
    if (key.endsWith(".html") && !isValidHtmlDocument(files[key])) {
      throw new Error(`funnelBuilder: invalid HTML in ${key}`);
    }
  }
  return JSON.stringify({ steps: ["paso1.html", "paso2.html", "paso3.html"], brandName: clientName });
}

export async function publishFunnelZip(options: {
  clientId: string;
  tenantId: string;
  jobId: string;
  serviceId: string;
  files: FunnelFileMap;
}): Promise<PublishArtifactResult> {
  return publishArtifactZip({ kind: "funnel", ...options });
}

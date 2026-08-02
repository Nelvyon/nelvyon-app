/**
 * Certificación contenido: EN real restante (no falsos positivos ES).
 */
import fs from "node:fs";
import path from "node:path";

const WWW = path.join(process.cwd(), "apps", "web", "public", "www");
const REQUIRED = [
  "index.html",
  "home-ai-startup.html",
  "home-ai-startup-op.html",
  "home-ai-chatbot.html",
  "home-ai-chatbot-op.html",
  "home-ai-writer-tool.html",
  "home-ai-writer-tool-op.html",
  "home-business-intelligence.html",
  "home-business-intelligence-op.html",
  "home-ai-agent.html",
  "home-ai-agent-op.html",
  "home-productivity-tools.html",
  "home-productivity-tools-op.html",
  "home-ai-chatbot-tool.html",
  "home-ai-chatbot-tool-op.html",
  "home-cloud-based-saas.html",
  "home-cloud-based-saas-op.html",
  "home-saas-product-showcase.html",
  "home-saas-product-showcase-op.html",
  "about.html",
  "blog.html",
  "blog-details.html",
  "cases.html",
  "case-studies.html",
  "case-studies-2.html",
  "case-studies-details.html",
  "contact.html",
  "error.html",
  "faq.html",
  "features.html",
  "integrations.html",
  "pricing.html",
  "team.html",
  "team-details.html",
  "testimonial.html",
  "typography.html",
];

const FORBIDDEN =
  /\bAIOR\b|Aiorchat|Aiorbot|themehour|themeforest|mail\.php|lorem ipsum|example\.com|Zipchat|Planora|Arsturn|EmbedAI|Leadwayz|Aurix|Bridal Makeup|Message credits|Jems Colin|Sara Lin|Mark Rivas|Contact Us|Active Users|Benefites|Cookis Policy/i;

const FN =
  /\b(the|and|with|your|our|you|we|this|that|from|into|are|was|were|have|has|been|will|can|don't|it's|you're|we're|let's|their|them|they|those|these|than|then|also|just|only|every|each|some|any|many|most|other|very|really|actually|easily|quickly|without|among|becomes|ensuring|allows|assign|facilitates|crafts|aligns|streamlines|forecasts|managing|multiple|effortless|overwhelm|things|done|minutes|newsletter|submit|now|free|trial|sign|login|watch|book|request|learn|explore|discover|subscribe|deliver|train|maximize|instant|customer|platform|solution|pricing|chatbot|support|team|how|what|why|need|want|make|using|used|best|here|about)\b/i;

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
}

const pages = [];
const allEn = [];
const forbidHits = [];
let dollar = 0;
let robotsOk = 0;
let canonOk = 0;

for (const file of REQUIRED) {
  const p = path.join(WWW, file);
  if (!fs.existsSync(p)) {
    pages.push({ file, status: "MISSING" });
    continue;
  }
  const raw = fs.readFileSync(p, "utf8");
  const html = strip(raw);
  dollar += (raw.match(/dollar">\$/g) || []).length;
  const hasNoindex = /robots" content="noindex/i.test(raw);
  const hasCanonWww = /rel="canonical" href="https:\/\/nelvyon\.com\/www\//i.test(raw);
  if (hasNoindex) robotsOk++;
  if (hasCanonWww) canonOk++;
  if (FORBIDDEN.test(html)) forbidHits.push(file);

  const en = [];
  for (const m of html.matchAll(/<(?:h[1-6]|p|li|a|button|label|option)[^>]*>([^<]{8,240})</gi)) {
    const t = m[1].replace(/\s+/g, " ").trim();
    if (/[áéíóúñ¿¡]/i.test(t)) continue;
    if (/NELVYON|Agencia|SaaS|Demo|Contacto|Hechos|plataforma|presupuesto|preguntas|Privacidad|Starter|Growth|Elite|Workflow|CRM|WhatsApp|Automat|Producto|Inbox|Módulos|Solicitar|Reservar|Empezar|Entrar|Registrarse|Packs|tenant|operaci|cualifique|capturas|Sin inventar|Acceso|Conecta|Organice|Elija|Escriba|Genere|Puesta|Soporte|Canales|Facturación|Integracion|Reporting|Analytics|onboarding|Funciones|Equipo|Negocio|Tecnología|Experiencia|Objetivos|Proyectos|Soluciones|Comunicación|Protección|Importación|Preparación|Inteligencia|Insights|accionables|analytics|beneficios/i.test(t) && !FN.test(t.replace(/NELVYON|SaaS|CRM|WhatsApp|Starter|Growth|Elite|Agencia|Demo|Inbox|Workflows?/gi, " "))) {
      continue;
    }
    // require >=2 function-word hits OR clear EN marketing Title Case with function word
    const hits = (t.match(new RegExp(FN.source, "gi")) || []).length;
    if (hits >= 2 || (hits >= 1 && /\b(the|your|our|with|from|into|without|among|becomes|ensuring|allows|managing)\b/i.test(t))) {
      en.push(t);
      allEn.push({ file, text: t });
    }
  }
  pages.push({
    file,
    status: "OK",
    enCount: en.length,
    noindex: hasNoindex,
    canonicalWww: hasCanonWww,
    sampleEn: [...new Set(en)].slice(0, 8),
  });
}

const uniqueEn = [...new Set(allEn.map((x) => x.text))].sort();
const report = {
  reviewedPages: REQUIRED.length,
  present: pages.filter((p) => p.status === "OK").length,
  missing: pages.filter((p) => p.status === "MISSING").map((p) => p.file),
  uniqueEnglishRemaining: uniqueEn.length,
  uniqueEnglish: uniqueEn,
  forbiddenFiles: forbidHits,
  dollarSpansLeft: dollar,
  pagesWithNoindex: robotsOk,
  pagesWithTempCanonical: canonOk,
  perPage: pages,
  ok:
    pages.every((p) => p.status === "OK") &&
    uniqueEn.length === 0 &&
    forbidHits.length === 0 &&
    dollar === 0 &&
    robotsOk === REQUIRED.length &&
    canonOk === REQUIRED.length,
};
const out = path.join("docs/evidence/public-web-aior-nelvyon/content-certification-final.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      reviewedPages: report.reviewedPages,
      uniqueEnglishRemaining: report.uniqueEnglishRemaining,
      forbiddenFiles: report.forbiddenFiles.length,
      dollarSpansLeft: report.dollarSpansLeft,
      pagesWithNoindex: report.pagesWithNoindex,
      pagesWithTempCanonical: report.pagesWithTempCanonical,
    },
    null,
    2
  )
);
if (uniqueEn.length) console.log(uniqueEn.join("\n"));
console.log("Wrote", out);
process.exit(report.ok ? 0 : 1);

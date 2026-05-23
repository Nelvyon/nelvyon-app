import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const inv = JSON.parse(fs.readFileSync(path.join(root, "tools/inventory.json"), "utf8"));

const GENERATIVE_PREMIUM = new Set([
  "fotografia_producto_premium",
  "voz_premium",
  "video_multimedia_premium",
  "3d_contenido_inmersivo_premium",
  "diseno_grafico_creatividades_premium",
]);
const PREVIEW_ONLY = new Set(inv.premIds); // previews are static; execution is (A)

const EXTERNAL_NAME_HINTS = [
  "google",
  "meta",
  "semrush",
  "klaviyo",
  "shopify",
  "woocommerce",
  "prestashop",
  "zapier",
  "slack",
  "apollo",
  "bingads",
  "pinterest",
  "youtube",
  "tiktok",
  "linkedin",
  "twilio",
  "whatsapp",
  "telegram",
];

function sectorAgentStatus(sector, className) {
  const low = `${sector}/${className}`.toLowerCase();
  if (sector === "integracionesnativas") return { s: "C", tech: "Prompt LLM que describe integraciones; no llama APIs de plataformas." };
  if (className.includes("Logo") && sector === "branding")
    return { s: "A", tech: "Genera concepto de logo y paleta vía OpenAI (texto JSON); no genera archivo gráfico." };
  if (className === "SuperiorContentAIImageAgent")
    return { s: "B", tech: "Puede usar GenerativeClient/DALL·E si OPENAI_API_KEY; si no, placeholder." };
  if (low.includes("voice") && (low.includes("clonado") || low.includes("voz")))
    return { s: "A", tech: "Prompt LLM sobre voz/Whisper/ElevenLabs; ElevenLabs real solo en VozPremiumAgent/GenerativeClient, no aquí." };
  if (EXTERNAL_NAME_HINTS.some((h) => low.includes(h)))
    return { s: "A", tech: `Nombre sugiere plataforma externa; implementación = prompt OpenAI + persistencia en DB sector ${sector}, sin API ${sector}.` };
  return { s: "A", tech: `POST /api/os/agents/${sector} o /api/os/execute → OpenAI chat → JSON guardado en tabla ${sector}_results.` };
}

function premiumStatus(id, className) {
  if (className === "StubPremiumAgent") return { s: "D", tech: "Agente stub de prueba; no pipeline productivo." };
  if (GENERATIVE_PREMIUM.has(id))
    return {
      s: "B",
      tech: `Pipeline multi-paso OpenAI + paso generativo opcional (DALL·E/ElevenLabs/Runway/Meshy) si hay API key; si no, placeholder/mock.`,
    };
  return {
    s: "A",
    tech: `POST /api/os/execute serviceId=${id} → varios pasos LlmClient (OpenAI) → artefactos/bundle en storage/DB.`,
  };
}

let md = `# INVENTARIO COMPLETO NELVYON (generado desde código)\n\n`;
md += `Fecha: ${new Date().toISOString().slice(0, 10)}\n\n`;
md += `## LISTA 1 — NELVYON OS (${inv.premIds.length} premium + ${inv.sectorAgents.length} agentes sectoriales)\n\n`;
md += `Leyenda: **(A)** OpenAI real | **(B)** API externa real (condicional) | **(C)** Código sin conectar | **(D)** Mock/placeholder\n\n`;

md += `### Servicios Premium OS\n\n`;
const PREM_CLASS = {
  web_premium: "WebPremiumAgent",
  ecommerce_premium: "EcommercePremiumAgent",
  seo_premium: "SeoPremiumAgent",
  ads_premium: "AdsPremiumAgent",
  branding_premium: "BrandingPremiumAgent",
  voz_premium: "VozPremiumAgent",
  bots_premium: "BotsPremiumAgent",
  personal_digital_premium: "PersonalDigitalPremiumAgent",
  advisor_empresarial_premium: "AdvisorEmpresarialPremiumAgent",
  canales_comunicaciones_premium: "ComunicacionesPremiumAgent",
  social_media_premium: "SocialMediaPremiumAgent",
  email_marketing_premium: "EmailMarketingPremiumAgent",
  contenido_copywriting_premium: "ContenidoCopywritingPremiumAgent",
  video_multimedia_premium: "VideoMultimediaPremiumAgent",
  "3d_contenido_inmersivo_premium": "TresDInmersivoPremiumAgent",
  fotografia_producto_premium: "FotografiaProductoPremiumAgent",
  diseno_grafico_creatividades_premium: "DisenoGraficoPremiumAgent",
  consultoria_automatizacion_premium: "ConsultoriaAutomatizacionPremiumAgent",
  integraciones_apis_premium: "IntegracionesApisPremiumAgent",
  mantenimiento_web_premium: "MantenimientoWebPremiumAgent",
  reputacion_online_orm_premium: "ReputacionOrmPremiumAgent",
  formacion_capacitacion_digital_premium: "FormacionCapacitacionPremiumAgent",
  influencer_marketing_premium: "InfluencerMarketingPremiumAgent",
  landing_premium: "LandingPremiumAgent",
  funnel_premium: "FunnelPremiumAgent",
};

for (const id of inv.premIds) {
  const found = PREM_CLASS[id] ?? `${id}PremiumAgent`;
  const { s, tech } = premiumStatus(id, found);
  md += `- **${id}** | Clase: \`${found}\` | ${tech} | **${s}**\n`;
}

md += `\n### Endpoints sector API (router Pages — 193 sectores)\n\n`;
for (const id of inv.sectorIds) {
  md += `- **/api/os/agents/${id}** | POST ejecuta agentes del sector \`${id}\` vía OpenAI; persiste en \`${id}_results\`. | **A**\n`;
}

const standalone = fs
  .readdirSync(path.join(root, "backend/os-agents"))
  .filter((f) => f.endsWith("Agent.ts"));
if (standalone.length) {
  md += `\n### Agentes sueltos (fuera de sectors/)\n\n`;
  for (const f of standalone) {
    const cls = f.replace(/\.ts$/, "");
    md += `- **${cls}** | Agente standalone en backend/os-agents. | **A**\n`;
  }
}

md += `\n### Agentes sectoriales (${inv.sectorAgents.length} clases)\n\n`;
for (const { sector, className } of inv.sectorAgents) {
  const agentId = className.replace(/Agent$/, "");
  const { s, tech } = sectorAgentStatus(sector, className);
  md += `- **${sector} / ${className}** (agentId API: \`${sector}-${agentId}\` aprox.) | ${tech} | **${s}**\n`;
}

md += `\n## LISTA 2 — NELVYON SaaS\n\n`;
md += `Criterio prod: Railway despliega solo \`apps/web\` (Next). Rutas \`/api/v1/*\` requieren FastAPI en \`NEXT_PUBLIC_API_BASE_URL\`.\n\n`;

function pageStatus(route) {
  if (route.startsWith("/(marketing)")) return { s: "B", tech: "Landing estática Next; sin backend (git: puede no estar commiteado)." };
  if (route.startsWith("/saas/dashboard") || route === "/saas/onboarding")
    return { s: "A", tech: "UI + API Next (/api/saas/*) + Postgres." };
  if (route.startsWith("/saas/crm") || route.startsWith("/saas/campanias") || route.startsWith("/saas/workflows"))
    return { s: "A", tech: "UI Next + API en /api/saas/* (verificar DB); no FastAPI." };
  if (route.startsWith("/crm/") || route.startsWith("/campaigns") || route.startsWith("/inbox/"))
    return { s: "B", tech: "UI Next; datos vía apiClient → FastAPI /api/v1/entities/* (no en Docker Railway)." };
  if (route.startsWith("/os/") && route.includes("/preview"))
    return { s: "D", tech: "Preview estático demo; no ejecuta pipeline." };
  if (route.startsWith("/os/"))
    return { s: "A", tech: "UI autenticada; ejecución vía /api/os/* en Next." };
  if (route === "/auth/forgot-password" || route.includes("forgot"))
    return { s: "C", tech: "UI sin API de reset password." };
  if (route === "/sign-in")
    return { s: "C", tech: "Pegar JWT manual para staging FastAPI." };
  if (route.startsWith("/billing"))
    return { s: "A", tech: "Stripe checkout/portal (Next o FastAPI según página)." };
  if (route.startsWith("/login") || route.startsWith("/register") || route.startsWith("/auth/"))
    return { s: "A", tech: "Auth email/password Next JWT cookie." };
  if (route.startsWith("/admin/"))
    return { s: "A", tech: "Admin Next /api/admin/* con rol." };
  if (route.startsWith("/dashboard") || route === "/")
    return { s: "B", tech: "Workspace hub; depende módulos enlazados." };
  if (route.startsWith("/app/"))
    return { s: "B", tech: "Módulos app internos; mix Next + posible FastAPI." };
  if (route.startsWith("/legal") || route.startsWith("/help") || route.startsWith("/roadmap"))
    return { s: "A", tech: "Contenido estático o API lectura simple." };
  return { s: "B", tech: "Página Next; verificar API concreta al usar." };
}

md += `### Páginas apps/web (App Router)\n\n`;
for (const r of inv.pages) {
  const route = r === "/" ? "/" : r;
  const { s, tech } = pageStatus(route);
  md += `- **${route}** | ${tech} | **${s}**\n`;
}

md += `\n### API Routes Next (app/api)\n\n`;
for (const r of inv.nextApiApp) {
  let s = "A";
  let tech = "Route handler Next.js.";
  if (r.includes("webhooks/paddle")) {
    s = "D";
    tech = "Devuelve 410 Gone; Paddle deshabilitado.";
  } else if (r.includes("webhooks/stripe")) {
    tech = "Webhook Stripe real → actualiza subscriptions en Postgres.";
  } else if (r.startsWith("/api/saas/")) {
    tech = "SaaS backend TypeScript + Postgres.";
  } else if (r.startsWith("/api/os/")) {
    tech = "Orquestación OS/agents/jobs.";
  } else if (r.startsWith("/api/integrations/")) {
    s = "B";
    tech = "Integración OAuth/API externa real si credenciales del usuario.";
  } else if (r.startsWith("/api/oauth/")) {
    s = "B";
    tech = "Flujo OAuth Google/Meta/LinkedIn/TikTok.";
  }
  md += `- **${r}** | ${tech} | **${s}**\n`;
}

md += `\n### API Routes pages/api (legacy Pages router)\n\n`;
for (const r of inv.pagesApiRoutes) {
  let s = "A";
  let tech = "Pages API Next.";
  if (r.startsWith("/api/os/agents/")) {
    tech = "Ejecuta agente sectorial OpenAI + guarda resultado.";
  } else if (r.startsWith("/api/integrations/")) {
    s = "B";
    tech = "API externa (Semrush, Twilio, Meta Ads, etc.) con credenciales.";
  } else if (r.startsWith("/api/saas/")) {
    tech = "Feature SaaS en Next (cold-email, booking, etc.).";
  } else if (r.startsWith("/api/admin/")) {
    tech = "Admin analytics/ops.";
  }
  md += `- **${r}** | ${tech} | **${s}**\n`;
}

md += `\n### Páginas frontend/ Vite (legacy, no Railway)\n\n`;
for (const r of inv.frontendPages) {
  md += `- **frontend/${r}** | SPA Vite; llama FastAPI :8000; muchas con MOCK_* | **B**\n`;
}

const outPath = path.join(root, "tools/INVENTARIO_OS_SAAS_COMPLETO.md");
fs.writeFileSync(outPath, md);
console.log("Wrote", outPath, "bytes", fs.statSync(outPath).size);

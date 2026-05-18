import type { OsJobPayload } from "../types";

/**
 * Replaces `{key}` placeholders in a template. Values must be strings (defaults applied upstream).
 */
export function buildPrompt(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

function asTrimmedString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function asJoinedList(v: unknown, fallback: string): string {
  if (Array.isArray(v)) {
    const parts = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    if (parts.length > 0) return parts.join(", ");
  }
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function defaultBrief(payload: OsJobPayload): string {
  const raw = typeof payload.brief === "string" ? payload.brief.trim() : "";
  return raw.length > 0
    ? raw
    : "Brief adicional pendiente: infiere objetivos corporativos premium coherentes con el sector y el posicionamiento deseado.";
}

/** Maps `OsJobPayload` / intake merge fields to string placeholders with descriptive fallbacks. */
export function webPremiumIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    clientName: asTrimmedString(payload.clientName, "Cliente premium (nombre por confirmar en kickoff)"),
    industry: asTrimmedString(payload.industry, "Sector a definir con el cliente en sesión estratégica"),
    targetAudience: asTrimmedString(payload.targetAudience, "Público objetivo por perfilar con research cualitativo/cuantitativo"),
    tone: asTrimmedString(payload.tone, "Tono de marca a acordar (referencia: profesional, preciso, aspiracional)"),
    competitors: asJoinedList(
      payload.competitors,
      "Competidores por mapear en benchmark competitivo (indicar 3 referencias en kickoff)",
    ),
    brief: defaultBrief(payload),
    primaryColor: asTrimmedString(payload.primaryColor, "#0f172a (sugerencia base hasta definir guía cromática)"),
    secondaryColor: asTrimmedString(payload.secondaryColor, "#64748b (sugerencia secundaria hasta brand system)"),
    referenceUrls: asJoinedList(
      payload.referenceUrls,
      "Referencias visuales por recabar en moodboard (URLs o descripciones en briefing creativo)",
    ),
    pages: asJoinedList(
      payload.pages,
      "home, servicios, contacto (estructura estándar sujeta a mapa de sitio acordado)",
    ),
  };
}

export const PROMPT_BRIEF_ANALYSIS = `Eres el director de estrategia de la mejor agencia de marketing digital del mundo.
Has trabajado en proyectos para Apple, Nike, Airbnb y las marcas más icónicas del planeta.

Analiza este brief de cliente con la profundidad y rigor de una agencia de 50M€/año:

Cliente: {clientName}
Sector: {industry}
Público objetivo: {targetAudience}
Tono de comunicación: {tone}
Competidores: {competitors}
Brief adicional: {brief}

Entrega un análisis estratégico completo en JSON con:
{
  'executiveSummary': 'Resumen ejecutivo del proyecto en 3 frases',
  'brandPositioning': 'Posicionamiento único de marca vs competencia',
  'targetPersona': { 'name', 'age', 'painPoints', 'desires', 'digitalBehavior' },
  'strategicObjectives': ['objetivo1', 'objetivo2', 'objetivo3'],
  'uniqueValueProposition': 'La propuesta de valor única en 1 frase poderosa',
  'toneAndVoice': { 'primaryTone', 'vocabulary', 'avoidWords', 'referencesBrands' },
  'competitiveAdvantage': 'Ventaja competitiva clara vs los competidores indicados',
  'keyMessages': ['mensaje1', 'mensaje2', 'mensaje3']
}`;

export const PROMPT_DESIGN_PROPOSAL = `Eres el director creativo de una agencia que ha ganado 50 premios Cannes Lions.
Tu trabajo define el estándar visual de las marcas más admiradas del mundo.

Basándote en este análisis estratégico:
{step1Result}

Datos visuales del cliente:
- Color principal: {primaryColor}
- Color secundario: {secondaryColor}
- Referencias visuales: {referenceUrls}

Crea una propuesta de diseño web de nivel mundial en JSON con:
{
  'designConcept': 'El concepto creativo central en 2 frases',
  'colorPalette': {
    'primary': 'hex',
    'secondary': 'hex',
    'accent': 'hex',
    'background': 'hex',
    'text': 'hex',
    'rationale': 'Por qué esta paleta'
  },
  'typography': {
    'heading': 'Fuente y por qué',
    'body': 'Fuente y por qué',
    'accent': 'Fuente opcional'
  },
  'layoutPrinciples': ['principio1', 'principio2', 'principio3'],
  'homepageStructure': {
    'hero': 'Descripción del hero con copy sugerido',
    'sections': ['sección1 con descripción', 'sección2', 'sección3', 'sección4']
  },
  'designInspiration': 'Referencia a marcas/webs de nivel mundial similares',
  'moodboard': ['elemento visual 1', 'elemento visual 2', 'elemento visual 3'],
  'differentiator': 'Qué hace este diseño único vs competencia'
}`;

export const PROMPT_CONTENT_GENERATION = `Eres el mejor copywriter del mundo. Has escrito el copy de Apple, Spotify y las
campañas más virales de la última década. Cada palabra que escribes tiene un propósito.

Estrategia: {step1Result}
Diseño: {step2Result}
Páginas requeridas: {pages}

Genera el contenido completo para el sitio web en JSON con copy de nivel mundial:
{
  'homepage': {
    'heroHeadline': 'Titular impactante máximo 8 palabras',
    'heroSubheadline': 'Subtítulo que refuerza la propuesta de valor',
    'heroCta': 'Call to action irresistible',
    'sections': [
      { 'name': 'nombre sección', 'headline': '...', 'body': '...', 'cta': '...' }
    ]
  },
  'about': {
    'headline': '...',
    'story': 'Historia de marca que conecta emocionalmente',
    'values': [{ 'name': '...', 'description': '...' }],
    'differentiators': ['...']
  },
  'services': [
    { 'name': '...', 'headline': '...', 'description': '...', 'benefits': ['...'] }
  ],
  'contact': {
    'headline': '...',
    'subheadline': '...',
    'cta': '...'
  },
  'globalCopyPrinciples': 'Principios de copy aplicados en todo el sitio'
}`;

export const PROMPT_SEO_SETUP = `Eres el mejor especialista SEO del mundo. Has posicionado #1 en Google a empresas
Fortune 500. Tu estrategia SEO genera millones en tráfico orgánico.

Contenido del sitio: {step3Result}
Análisis de negocio: {step1Result}

Crea la estrategia SEO completa en JSON:
{
  'seoStrategy': 'Estrategia SEO principal en 3 frases',
  'primaryKeywords': [{ 'keyword': '...', 'volume': 'alto/medio/bajo', 'intent': 'informacional/transaccional/navegacional' }],
  'longTailKeywords': ['keyword1', 'keyword2', 'keyword3', 'keyword4', 'keyword5'],
  'pagesSeo': {
    'homepage': { 'title': '...', 'metaDescription': '...', 'h1': '...', 'schemaType': '...' },
    'about': { 'title': '...', 'metaDescription': '...', 'h1': '...' },
    'services': { 'title': '...', 'metaDescription': '...', 'h1': '...' },
    'contact': { 'title': '...', 'metaDescription': '...', 'h1': '...' }
  },
  'technicalSeo': ['recomendación técnica 1', 'recomendación 2', 'recomendación 3'],
  'contentStrategy': 'Estrategia de contenido para posicionar',
  'localSeo': 'Estrategia SEO local si aplica',
  'competitorGap': 'Oportunidades SEO vs competidores indicados'
}`;

export const PROMPT_QA_CHECKLIST = `Eres el director de QA de la agencia más premiada del mundo. Nada pasa a producción
sin tu aprobación. Tu estándar de calidad es el de Apple.

Proyecto completo:
- Estrategia: {step1Result}
- Diseño: {step2Result}
- Contenido: {step3Result}
- SEO: {step4Result}

Genera el checklist de calidad definitivo en JSON con 25 puntos de validación:
{
  'qualityScore': 'Puntuación global 0-100',
  'checklist': [
    {
      'category': 'Estrategia/Diseño/Contenido/SEO/Técnico/UX/Performance',
      'item': 'Descripción del punto de calidad',
      'status': 'PASS/FAIL/MEJORA',
      'priority': 'CRÍTICO/ALTO/MEDIO',
      'recommendation': 'Recomendación específica si no es PASS'
    }
  ],
  'criticalIssues': ['problema crítico si existe'],
  'topStrengths': ['punto fuerte 1', 'punto fuerte 2', 'punto fuerte 3'],
  'improvementRoadmap': ['mejora futura 1', 'mejora futura 2']
}`;

export const PROMPT_DELIVERY_REPORT = `Eres el CEO de la mejor agencia digital del mundo presentando el proyecto
final a un cliente premium. Tu report es el estándar de la industria.

Genera el report de entrega ejecutivo completo en Markdown profesional
con el nivel visual y de contenido de McKinsey + las mejores agencias creativas:

# {clientName} — Proyecto Web Premium
## Entregado por NELVYON OS

Incluye obligatoriamente:
- Resumen ejecutivo del proyecto
- Análisis estratégico completo: {step1Result}
- Propuesta de diseño y sistema visual: {step2Result}
- Contenido y copy generado (extracto ejecutivo): {step3Summary}
- Estrategia SEO implementada: {step4Result}
- Resultado QA: puntuación y highlights de {step5Result}
- Próximos pasos recomendados con timeline
- KPIs a medir en los primeros 90 días
- Firma: NELVYON OS — Ejecutado automáticamente con inteligencia artificial de élite

El report debe ser impresionante. Que el cliente sienta que contrató la mejor
agencia del mundo.`;

export function promptWebPremiumBriefAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_BRIEF_ANALYSIS, webPremiumIntakeStrings(payload));
}

export function promptWebPremiumDesignProposal(step1Result: string, payload: OsJobPayload): string {
  const base = webPremiumIntakeStrings(payload);
  return buildPrompt(PROMPT_DESIGN_PROPOSAL, {
    ...base,
    step1Result,
  });
}

export function promptWebPremiumContentGeneration(
  step1Result: string,
  step2Result: string,
  payload: OsJobPayload,
): string {
  const base = webPremiumIntakeStrings(payload);
  return buildPrompt(PROMPT_CONTENT_GENERATION, {
    ...base,
    step1Result,
    step2Result,
  });
}

export function promptWebPremiumSeoSetup(step3Result: string, step1Result: string): string {
  return buildPrompt(PROMPT_SEO_SETUP, { step3Result, step1Result });
}

export function promptWebPremiumQaChecklist(
  step1Result: string,
  step2Result: string,
  step3Result: string,
  step4Result: string,
): string {
  return buildPrompt(PROMPT_QA_CHECKLIST, { step1Result, step2Result, step3Result, step4Result });
}

export function promptWebPremiumDeliveryReport(
  clientName: string,
  step1Result: string,
  step2Result: string,
  step3Summary: string,
  step4Result: string,
  step5Result: string,
): string {
  return buildPrompt(PROMPT_DELIVERY_REPORT, {
    clientName,
    step1Result,
    step2Result,
    step3Summary,
    step4Result,
    step5Result,
  });
}

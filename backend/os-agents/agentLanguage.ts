/** OS agent language helpers — detect locale from payload and localize step prompts. */

export type AgentLocale = "es" | "en" | "fr" | "pt" | "de" | "it";

const LOCALE_HINTS: Record<AgentLocale, RegExp> = {
  es: /\b(hola|gracias|necesito|empresa|servicio)\b/i,
  en: /\b(hello|thanks|please|company|service|need)\b/i,
  fr: /\b(bonjour|merci|besoin|entreprise|service)\b/i,
  pt: /\b(olá|obrigado|preciso|empresa|serviço)\b/i,
  de: /\b(hallo|danke|brauche|unternehmen|service)\b/i,
  it: /\b(ciao|grazie|bisogno|azienda|servizio)\b/i,
};

export function detectLanguageFromText(text: string, fallback: AgentLocale = "es"): AgentLocale {
  const sample = (text || "").trim();
  if (!sample) return fallback;
  for (const [loc, re] of Object.entries(LOCALE_HINTS) as [AgentLocale, RegExp][]) {
    if (re.test(sample)) return loc;
  }
  return fallback;
}

export function localizedPrompt(basePrompt: string, locale: AgentLocale): string {
  const labels: Record<AgentLocale, string> = {
    es: "español",
    en: "English",
    fr: "français",
    pt: "português",
    de: "Deutsch",
    it: "italiano",
  };
  return (
    `You are a NELVYON OS agent. ALWAYS write output in ${labels[locale]} (${locale}).\n\n` +
    basePrompt.trim()
  );
}

export function resolveAgentLocale(
  payload: Record<string, unknown>,
  profileLanguage?: string | null,
): AgentLocale {
  const supported: AgentLocale[] = ["es", "en", "fr", "pt", "de", "it"];
  if (profileLanguage && supported.includes(profileLanguage as AgentLocale)) {
    return profileLanguage as AgentLocale;
  }
  const brief = String(payload.brief ?? payload.prompt ?? payload.message ?? "");
  return detectLanguageFromText(brief);
}

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type SupportedLanguageCode = "es" | "en" | "fr" | "de" | "pt" | "it" | "nl" | "pl" | "ru" | "zh";
export type LanguagePreferenceCode = SupportedLanguageCode | "auto";

export type SupportedLanguageItem = {
  code: SupportedLanguageCode;
  name: string;
  flag: string;
  llmName: string;
};

const SUPPORTED_LANGUAGES: ReadonlyArray<SupportedLanguageItem> = [
  { code: "es", name: "Español", flag: "🇪🇸", llmName: "Spanish" },
  { code: "en", name: "English", flag: "🇬🇧", llmName: "English" },
  { code: "fr", name: "Français", flag: "🇫🇷", llmName: "French" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", llmName: "German" },
  { code: "pt", name: "Português", flag: "🇵🇹", llmName: "Portuguese" },
  { code: "it", name: "Italiano", flag: "🇮🇹", llmName: "Italian" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", llmName: "Dutch" },
  { code: "pl", name: "Polski", flag: "🇵🇱", llmName: "Polish" },
  { code: "ru", name: "Русский", flag: "🇷🇺", llmName: "Russian" },
  { code: "zh", name: "中文", flag: "🇨🇳", llmName: "Chinese" },
];

const SUPPORTED_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

const KEYWORDS: Record<SupportedLanguageCode, readonly string[]> = {
  es: [" el ", " la ", " de ", " para ", "hola", "gracias", "necesito", "quiero"],
  en: [" the ", " and ", " with ", "hello", "thanks", "please", "need", "want"],
  fr: [" le ", " la ", " de ", "bonjour", "merci", "avec", "pour", "vous"],
  de: [" der ", " die ", " und ", "danke", "bitte", "nicht", "ich", "mit"],
  pt: [" olá ", " obrigado", " para ", " com ", " de ", " você ", "preciso"],
  it: [" ciao ", " grazie", " per ", " con ", " il ", " la ", " vorrei "],
  nl: [" hallo ", " dank", " met ", " voor ", " de ", " het ", " ik "],
  pl: [" cześć ", " dziękuję", " i ", " nie ", " jestem ", " oraz ", " potrzebuję "],
  ru: [" и ", " не ", " это ", " спасибо", " привет", " пожалуйста"],
  zh: ["你好", "谢谢", "我们", "你们", "可以", "需要", "请"],
};

function normalizeText(input: string): string {
  return ` ${input.toLowerCase()} `.replace(/\s+/g, " ");
}

function detectFromScript(input: string): SupportedLanguageCode | null {
  if (/[\u4e00-\u9fff]/.test(input)) return "zh";
  if (/[\u0400-\u04FF]/.test(input)) return "ru";
  return null;
}

function scoreByKeywords(text: string): { lang: SupportedLanguageCode; score: number } {
  let best: SupportedLanguageCode = "en";
  let bestScore = 0;
  for (const lang of SUPPORTED_LANGUAGES) {
    const terms = KEYWORDS[lang.code];
    const score = terms.reduce((acc, term) => (text.includes(term) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      best = lang.code;
      bestScore = score;
    }
  }
  return { lang: best, score: bestScore };
}

export type AgentLanguageServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class AgentLanguageService {
  constructor(private readonly deps: AgentLanguageServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  detectLanguage(text: string): SupportedLanguageCode {
    const raw = text.trim();
    if (!raw) return "en";
    const byScript = detectFromScript(raw);
    if (byScript) return byScript;
    const normalized = normalizeText(raw);
    const scored = scoreByKeywords(normalized);
    return scored.score > 0 ? scored.lang : "en";
  }

  getLanguagePromptInstruction(langCode: SupportedLanguageCode): string {
    const item = SUPPORTED_LANGUAGES.find((v) => v.code === langCode);
    const llmName = item?.llmName ?? "English";
    return `Respond exclusively in ${llmName}. All output must be in ${llmName}.`;
  }

  async setUserLanguagePreference(userId: string, langCode: LanguagePreferenceCode): Promise<LanguagePreferenceCode> {
    if (langCode !== "auto" && !SUPPORTED_SET.has(langCode)) throw new Error("Unsupported language");
    const tenantRows = await this.db.query<{ tenant_id: string }>(`SELECT tenant_id FROM nelvyon_users WHERE user_id = $1 LIMIT 1`, [userId]);
    const tenantId = tenantRows[0]?.tenant_id;
    if (!tenantId) throw new Error("User not found");
    await this.db.query(
      `INSERT INTO saas_client_profiles (user_id, tenant_id, language, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         language = EXCLUDED.language,
         updated_at = NOW()`,
      [userId, tenantId, langCode],
    );
    return langCode;
  }

  async getUserLanguagePreference(userId: string): Promise<LanguagePreferenceCode> {
    const rows = await this.db.query<{ language: string | null }>(
      `SELECT language
       FROM saas_client_profiles
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId],
    );
    const v = (rows[0]?.language ?? "").toLowerCase();
    if (v === "auto") return "auto";
    if (SUPPORTED_SET.has(v as SupportedLanguageCode)) return v as SupportedLanguageCode;
    return "auto";
  }

  buildMultilingualSystemPrompt(basePrompt: string, langCode: LanguagePreferenceCode): string {
    const base = basePrompt.trim();
    if (langCode === "auto") return base;
    return `${base}\n\n${this.getLanguagePromptInstruction(langCode)}`;
  }

  getSupportedLanguages(): ReadonlyArray<SupportedLanguageItem> {
    return SUPPORTED_LANGUAGES;
  }
}

let cachedAgentLanguageService: AgentLanguageService | undefined;

export function getAgentLanguageService(): AgentLanguageService {
  if (!cachedAgentLanguageService) cachedAgentLanguageService = new AgentLanguageService();
  return cachedAgentLanguageService;
}

export function resetAgentLanguageServiceForTests(): void {
  cachedAgentLanguageService = undefined;
}

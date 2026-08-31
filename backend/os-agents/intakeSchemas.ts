/**
 * Client intake payloads (elite brief) — normalized before Stripe and passed to OS agents as job payload.
 */

export interface BaseIntakeSchema {
  clientName: string;
  industry: string;
  targetAudience: string;
  tone: string;
  competitors: string[];
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  referenceUrls: string[];
  budget?: string;
  deadline?: string;
  additionalNotes?: string;

  /**
   * EN QUÉ IDIOMA HABLA EL CLIENTE CON LOS SUYOS. ISO 639-1: `es`, `de`, `en`…
   *
   * POR QUÉ SE AÑADE. El dato existe desde la entrada —`os_clients.language`—
   * y `importarDesdeOsClients.ts` lo copia al cerebro de negocio como
   * `preferencias.idioma`. Pero **nadie lo leía de vuelta**: el brief no tenía
   * dónde guardarlo, `packOrchestrator` fijaba `locale: "es-ES"` a mano y
   * `resolveAgentLocale` acababa adivinando el idioma a partir del texto del
   * encargo.
   *
   * El dato entraba por la puerta y se perdía antes de llegar al trabajo. Para
   * una agencia que vende SEO internacional y `hreflang`, eso significa no
   * poder entregar en el idioma del cliente aunque se lo haya preguntado.
   *
   * ES OPCIONAL A PROPÓSITO. Sin él todo se comporta exactamente como hoy: el
   * `locale` cae a `es-ES` y el idioma se adivina. Así el campo entra sin
   * migrar nada y sin cambiar el resultado de ningún encargo existente.
   */
  language?: string;

  /**
   * DÓNDE VENDE. ISO 3166-1 alfa-2: `ES`, `DE`, `BR`…
   *
   * No es lo mismo que `targetAudience` ni que la ciudad: un cliente alemán
   * puede vender en Italia, y ésa es justo la decisión que cambia la estrategia
   * —y el `hreflang`—. Opcional por la misma razón que `language`.
   */
  country?: string;
}

export interface WebIntakeSchema extends BaseIntakeSchema {
  pages: string[];
  hasExistingContent: boolean;
  preferredPlatform?: string;
}

export interface SeoIntakeSchema extends BaseIntakeSchema {
  targetKeywords: string[];
  currentWebsiteUrl?: string;
  mainGoal: string;
}

export interface AdsIntakeSchema extends BaseIntakeSchema {
  platforms: string[];
  monthlyBudget: number;
  campaignGoal: string;
}

export interface SocialMediaIntakeSchema extends BaseIntakeSchema {
  platforms: string[];
  postFrequency: string;
  contentStyle: string;
}

/** Snapshot stored on `OsJob.intake` (service-specific keys allowed). */
export type StoredClientIntake = BaseIntakeSchema & Record<string, unknown>;

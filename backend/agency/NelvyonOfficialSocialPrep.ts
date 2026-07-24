/**
 * NELVYON official brand social prep (ADR-052 extension).
 * Builds NELVYON's own social package using the same OsSocialNetworksService patterns
 * used for clients: strategy, calendar, formats, copies, QA rubric, analytics plan.
 *
 * publish_authorized=false always · oauth=OFF · paid=PREPARED_OFF · mass_dm forbidden.
 * This module never connects to a real platform and never writes secrets — it only
 * documents what Daniel (CEO) must create/connect and tracks status as PENDING_CEO.
 */

import { OS_QA_MIN_SCORE } from "./OsCapabilityRegistry";
import {
  buildSocialIntegralBundle,
  type SocialIntegralBundle,
  type SocialPlatformId,
} from "./OsSocialNetworksService";

export const NELVYON_OFFICIAL_SOCIAL_QA_SCORE = OS_QA_MIN_SCORE + 5;

export type NelvyonSocialAccountStatus = "PENDING_CEO";

export type NelvyonSocialAccountChecklistItem = {
  platform: SocialPlatformId;
  accountLabel: string;
  status: NelvyonSocialAccountStatus;
  actionRequired: string;
  requiredSecretsEnvVars: string[];
  oauthNote: string;
};

/**
 * Exact accounts Daniel must open/connect for the official NELVYON brand.
 * No real secrets — only env var names the platform will eventually require.
 */
export function listNelvyonSocialAccountsChecklist(): NelvyonSocialAccountChecklistItem[] {
  return [
    {
      platform: "tiktok",
      accountLabel: "TikTok — @nelvyon (cuenta Business)",
      status: "PENDING_CEO",
      actionRequired:
        "Crear cuenta TikTok Business a nombre de NELVYON (email corporativo), verificar teléfono, activar TikTok for Business Suite.",
      requiredSecretsEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_ACCESS_TOKEN"],
      oauthNote: "OAuth2 vía TikTok for Developers — permanece OFF hasta autorización CEO explícita y revisión legal de publicación.",
    },
    {
      platform: "instagram_posts",
      accountLabel: "Instagram Business — @nelvyon",
      status: "PENDING_CEO",
      actionRequired:
        "Crear/convertir cuenta Instagram a Business, vincular a la Facebook Page de NELVYON, activar Instagram Graph API en Meta for Developers.",
      requiredSecretsEnvVars: ["META_APP_ID", "META_APP_SECRET", "META_PAGE_ACCESS_TOKEN", "IG_BUSINESS_ACCOUNT_ID"],
      oauthNote: "OAuth2 Meta Graph API — permanece OFF hasta CEO conecte la app en Meta Business Suite.",
    },
    {
      platform: "facebook",
      accountLabel: "Facebook Page — NELVYON",
      status: "PENDING_CEO",
      actionRequired:
        "Crear Facebook Page oficial NELVYON en Meta Business Suite, asignar admin, vincular con Instagram Business.",
      requiredSecretsEnvVars: ["META_APP_ID", "META_APP_SECRET", "META_PAGE_ACCESS_TOKEN", "FB_PAGE_ID"],
      oauthNote: "Mismo flujo Meta OAuth que Instagram — comparte app; permanece OFF hasta autorización CEO.",
    },
    {
      platform: "youtube_shorts",
      accountLabel: "YouTube — Canal NELVYON",
      status: "PENDING_CEO",
      actionRequired:
        "Crear canal de YouTube con la cuenta corporativa de Google Workspace de NELVYON, habilitar YouTube Data API v3 en Google Cloud Console.",
      requiredSecretsEnvVars: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN", "YOUTUBE_CHANNEL_ID"],
      oauthNote: "OAuth2 Google — permanece OFF hasta que CEO complete el consent screen y verifique el canal.",
    },
    {
      platform: "linkedin",
      accountLabel: "LinkedIn Company Page — NELVYON",
      status: "PENDING_CEO",
      actionRequired:
        "Crear página de empresa NELVYON en LinkedIn, verificar dominio nelvyon.com, registrar app en LinkedIn Developer Portal (Marketing Developer Platform).",
      requiredSecretsEnvVars: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_ACCESS_TOKEN", "LINKEDIN_ORG_URN"],
      oauthNote: "OAuth2 LinkedIn — acceso Marketing API requiere revisión de LinkedIn; permanece OFF hasta aprobación CEO + LinkedIn.",
    },
    {
      platform: "x",
      accountLabel: "X (Twitter) — @nelvyon",
      status: "PENDING_CEO",
      actionRequired:
        "Crear cuenta @nelvyon en X, solicitar acceso de desarrollador (X API v2), crear proyecto/app.",
      requiredSecretsEnvVars: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
      oauthNote: "OAuth1.0a/2.0 X API — permanece OFF hasta que CEO apruebe el plan de API (de pago) y conecte credenciales.",
    },
    {
      platform: "pinterest",
      accountLabel: "Pinterest Business — NELVYON",
      status: "PENDING_CEO",
      actionRequired:
        "Convertir/crear cuenta Pinterest Business, verificar dominio nelvyon.com, registrar app en Pinterest Developers.",
      requiredSecretsEnvVars: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET", "PINTEREST_ACCESS_TOKEN"],
      oauthNote: "OAuth2 Pinterest — permanece OFF hasta autorización CEO explícita.",
    },
    {
      platform: "google_business_profile",
      accountLabel: "Google Business Profile — NELVYON",
      status: "PENDING_CEO",
      actionRequired:
        "Crear/reclamar ficha Google Business Profile para NELVYON, verificar dirección/servicio remoto, habilitar Google Business Profile API.",
      requiredSecretsEnvVars: ["GBP_CLIENT_ID", "GBP_CLIENT_SECRET", "GBP_REFRESH_TOKEN", "GBP_ACCOUNT_ID", "GBP_LOCATION_ID"],
      oauthNote: "OAuth2 Google — permanece OFF hasta verificación de la ficha por Google y autorización CEO.",
    },
  ];
}

export type NelvyonOfficialSocialPackage = SocialIntegralBundle & {
  brand: "NELVYON";
  publish_authorized: false;
  mass_dm_forbidden: true;
  accounts_checklist: NelvyonSocialAccountChecklistItem[];
};

/**
 * Builds the official NELVYON brand social package: strategy, calendar, formats,
 * copies, QA rubric and analytics plan — reusing `buildSocialIntegralBundle`.
 * Never publishes, never connects OAuth, paid stays PREPARED_OFF, mass DM forbidden.
 */
export function buildNelvyonOfficialSocialPackage(): NelvyonOfficialSocialPackage {
  const bundle = buildSocialIntegralBundle(
    {
      business_name: "NELVYON",
      sector: "agencia_ia_marketing_saas",
      city: "Remoto / Global",
      value_proposition: "Agencia de marketing 100% operada por IA + SaaS B2B para agencias y negocios",
      primary_cta: "Solicitar demo NELVYON",
    },
    NELVYON_OFFICIAL_SOCIAL_QA_SCORE,
  );

  return {
    ...bundle,
    brand: "NELVYON",
    publish_authorized: false,
    mass_dm_forbidden: true,
    accounts_checklist: listNelvyonSocialAccountsChecklist(),
  };
}

export function assertNelvyonOfficialSocialIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const pkg = buildNelvyonOfficialSocialPackage();
  if (pkg.publish_authorized !== false) violations.push("publish_must_be_false");
  if (pkg.oauth_status !== "OFF") violations.push("oauth_must_be_off");
  if (pkg.paid_social_status !== "PREPARED_OFF") violations.push("paid_must_be_prepared_off");
  if (!pkg.mass_dm_forbidden) violations.push("mass_dm_must_be_forbidden");
  if ((pkg.community_playbook as { auto_reply_sensitive?: boolean }).auto_reply_sensitive) {
    violations.push("auto_reply_sensitive_must_be_off");
  }
  const checklist = pkg.accounts_checklist;
  if (checklist.length !== 8) violations.push(`expected_8_accounts_got_${checklist.length}`);
  if (checklist.some((a) => a.status !== "PENDING_CEO")) violations.push("all_accounts_must_be_pending_ceo");
  if (checklist.some((a) => a.requiredSecretsEnvVars.length === 0)) {
    violations.push("every_account_needs_secret_env_var_names");
  }
  if (checklist.some((a) => a.requiredSecretsEnvVars.some((v) => /^[A-Z0-9_]+$/.test(v) === false))) {
    violations.push("secret_env_var_names_must_look_like_env_vars_not_values");
  }
  return { ok: violations.length === 0, violations };
}

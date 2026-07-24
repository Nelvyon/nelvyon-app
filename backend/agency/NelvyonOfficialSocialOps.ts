/**
 * NELVYON official brand social — full technical ops package (ADR-055 closure).
 * Extends `NelvyonOfficialSocialPrep` with profiles, a draft content library, a
 * versioned brand asset library (no CDN), an analytics metrics schema, a
 * permissions matrix, and a manual publish pathway that fails closed unless
 * BOTH an OAuth-connected flag AND a CEO approval token are present.
 *
 * Still 100% PREPARED_OFF: no OAuth is ever connected here, no real HTTP call is
 * ever made, no paid spend, no mass DM. The only "publish" this module can ever
 * produce is a single in-memory simulation gated by both control tokens — never
 * a real network request. A real post always waits for Daniel (CEO).
 */

import {
  buildNelvyonOfficialSocialPackage,
  listNelvyonSocialAccountsChecklist,
  type NelvyonOfficialSocialPackage,
  type NelvyonSocialAccountChecklistItem,
} from "./NelvyonOfficialSocialPrep";
import { SOCIAL_PLATFORM_SPECS, type SocialPlatformId } from "./OsSocialNetworksService";

export type NelvyonOfficialSocialProfile = {
  platform: SocialPlatformId;
  handle: string;
  displayName: string;
  bioDraft: string;
  avatarAssetRef: string;
  bannerAssetRef: string | null;
  linkInBio: string;
  /** Never a real account state — purely draft metadata until Daniel creates/connects it. */
  status: "SYNTHETIC_DRAFT";
};

export type NelvyonOfficialSocialContentDraft = {
  id: string;
  platform: SocialPlatformId;
  format: string;
  week: 1 | 2 | 3 | 4;
  hook: string;
  body: string;
  cta: string;
  status: "draft_ready";
};

export type NelvyonBrandAssetType =
  | "logo"
  | "color_palette"
  | "typography"
  | "template_post"
  | "watermark";

export type NelvyonBrandAssetVersion = {
  version: string;
  assetType: NelvyonBrandAssetType;
  /** Local repo-relative reference name only — never a CDN URL. */
  ref: string;
  note: string;
};

export type NelvyonBrandLibrary = {
  versions: NelvyonBrandAssetVersion[];
  currentVersion: string;
  cdn: "NONE";
};

export type NelvyonAnalyticsMetricSchema = {
  metric: string;
  unit: "count" | "percent" | "rate";
  source: "synthetic_placeholder";
};

export type NelvyonSocialAnalyticsPlan = {
  metrics: NelvyonAnalyticsMetricSchema[];
  cadence: "weekly";
  note: string;
};

export type NelvyonSocialPermissionRole =
  | "account_manager"
  | "creative_director"
  | "social_strategist"
  | "ceo_ops";

export type NelvyonSocialPermissionAction = "draft" | "approve" | "publish_manual";

export type NelvyonSocialPermissionsMatrix = Record<
  NelvyonSocialPermissionRole,
  NelvyonSocialPermissionAction[]
>;

export type NelvyonManualPublishRequest = {
  platform: SocialPlatformId;
  contentId: string;
  /** Defaults false — real OAuth is never connected by this module. */
  oauthConnected?: boolean;
  /** Defaults absent — must be a non-empty CEO-issued token, per platform+content. */
  ceoApprovalToken?: string;
};

export type NelvyonManualPublishDenialCode =
  | "BOTH_MISSING"
  | "OAUTH_NOT_CONNECTED"
  | "CEO_APPROVAL_MISSING"
  | "TEST_POST_ALREADY_USED";

export type NelvyonManualPublishDenial = {
  ok: false;
  code: NelvyonManualPublishDenialCode;
  message: string;
};

export type NelvyonManualPublishSimulation = {
  ok: true;
  mode: "single_test_post_simulation_in_memory";
  network_call: false;
  platform: SocialPlatformId;
  contentId: string;
  simulatedAt: string;
  note: string;
};

export type NelvyonManualPublishResult = NelvyonManualPublishDenial | NelvyonManualPublishSimulation;

export type NelvyonOfficialSocialOpsPackage = {
  strategyPackage: NelvyonOfficialSocialPackage;
  profiles: NelvyonOfficialSocialProfile[];
  contents: NelvyonOfficialSocialContentDraft[];
  ceoApprovalGate: { ceoApprovalRequired: true; ceoApproved: false };
  brandLibrary: NelvyonBrandLibrary;
  analyticsPlan: NelvyonSocialAnalyticsPlan;
  permissionsMatrix: NelvyonSocialPermissionsMatrix;
  rollbackPlan: string[];
  singleTestPostProtocol: {
    allowed: true;
    requiresBoth: ["oauthConnected", "ceoApprovalToken"];
    simulationOnly: true;
    realPostWaitsFor: "Daniel (CEO)";
    note: string;
  };
  accountsChecklist: NelvyonSocialAccountChecklistItem[];
};

/** In-memory only — tracks which platform+token pairs already used their ONE test post. */
const usedTestPostTokens = new Set<string>();

export function resetNelvyonOfficialSocialOpsStateForTests(): void {
  usedTestPostTokens.clear();
}

const HANDLE_BY_PLATFORM: Record<SocialPlatformId, string> = {
  tiktok: "@nelvyon",
  instagram_reels: "@nelvyon",
  instagram_stories: "@nelvyon",
  instagram_posts: "@nelvyon",
  facebook: "NELVYON",
  youtube_shorts: "NELVYON",
  youtube_long: "NELVYON",
  linkedin: "NELVYON",
  x: "@nelvyon",
  pinterest: "NELVYON",
  google_business_profile: "NELVYON",
};

const OPS_PLATFORMS: SocialPlatformId[] = [
  "tiktok",
  "instagram_posts",
  "facebook",
  "youtube_shorts",
  "linkedin",
  "x",
  "pinterest",
  "google_business_profile",
];

export function buildNelvyonOfficialSocialProfiles(): NelvyonOfficialSocialProfile[] {
  return OPS_PLATFORMS.map((platform) => {
    const spec = SOCIAL_PLATFORM_SPECS.find((p) => p.id === platform);
    return {
      platform,
      handle: HANDLE_BY_PLATFORM[platform],
      displayName: "NELVYON",
      bioDraft:
        "Agencia de marketing 100% operada por IA + SaaS B2B para agencias y negocios. Demo: nelvyon.com".slice(
          0,
          spec?.maxCaptionChars ?? 150,
        ),
      avatarAssetRef: "brand/nelvyon-logo-mark-v1.png",
      bannerAssetRef: spec?.supportsVideo ? null : "brand/nelvyon-cover-1200x630-v1.png",
      linkInBio: "https://nelvyon.com",
      status: "SYNTHETIC_DRAFT",
    };
  });
}

export function buildNelvyonOfficialSocialContentDrafts(): NelvyonOfficialSocialContentDraft[] {
  const drafts: NelvyonOfficialSocialContentDraft[] = [];
  let seq = 0;
  for (const platform of OPS_PLATFORMS) {
    const spec = SOCIAL_PLATFORM_SPECS.find((p) => p.id === platform);
    const format = spec?.formats[0] ?? "feed";
    for (const week of [1, 2, 3, 4] as const) {
      seq += 1;
      drafts.push({
        id: `nelvyon-${platform}-w${week}`,
        platform,
        format,
        week,
        hook:
          week === 1
            ? "NELVYON: la agencia que nunca duerme"
            : week === 2
              ? "Cómo montamos un pack de crecimiento en 24h"
              : week === 3
                ? "Detrás del OS: equipos IA reales, no humo"
                : "Resultados reales, sin promesas absolutas",
        body: `Contenido borrador #${seq} para ${platform} — pendiente de revisión de marca antes de cualquier publicación.`,
        cta: "Solicitar demo NELVYON",
        status: "draft_ready",
      });
    }
  }
  return drafts;
}

export function buildNelvyonBrandLibrary(): NelvyonBrandLibrary {
  const versions: NelvyonBrandAssetVersion[] = [
    { version: "v1", assetType: "logo", ref: "brand/nelvyon-logo-mark-v1.png", note: "Logotipo principal" },
    { version: "v1", assetType: "color_palette", ref: "brand/nelvyon-palette-v1.json", note: "Paleta oficial" },
    { version: "v1", assetType: "typography", ref: "brand/nelvyon-type-v1.json", note: "Familia tipográfica" },
    {
      version: "v1",
      assetType: "template_post",
      ref: "brand/nelvyon-template-feed-v1.psd",
      note: "Plantilla post feed",
    },
    { version: "v1", assetType: "watermark", ref: "brand/nelvyon-watermark-v1.png", note: "Marca de agua vídeo" },
  ];
  return { versions, currentVersion: "v1", cdn: "NONE" };
}

export function buildNelvyonSocialAnalyticsPlan(): NelvyonSocialAnalyticsPlan {
  return {
    metrics: [
      { metric: "reach", unit: "count", source: "synthetic_placeholder" },
      { metric: "engagement_rate", unit: "percent", source: "synthetic_placeholder" },
      { metric: "follower_growth", unit: "count", source: "synthetic_placeholder" },
      { metric: "profile_visits", unit: "count", source: "synthetic_placeholder" },
      { metric: "link_clicks", unit: "count", source: "synthetic_placeholder" },
      { metric: "demo_requests_assisted", unit: "count", source: "synthetic_placeholder" },
    ],
    cadence: "weekly",
    note:
      "Placeholders sintéticos — sin conexión OAuth no hay métricas reales que reportar. " +
      "Se sustituyen por datos reales solo tras autorización CEO y conexión de cada cuenta.",
  };
}

export function buildNelvyonSocialPermissionsMatrix(): NelvyonSocialPermissionsMatrix {
  return {
    social_strategist: ["draft"],
    creative_director: ["draft"],
    account_manager: ["draft", "approve"],
    ceo_ops: ["draft", "approve", "publish_manual"],
  };
}

const ROLLBACK_PLAN: string[] = [
  "Mantener todas las variables OAuth de las 8 redes sin definir/vacías en Railway",
  "No emitir ningún ceoApprovalToken salvo autorización explícita de Daniel",
  "Si algún token fue emitido por error: revocarlo y purgar de cualquier almacén (nunca se persiste fuera de memoria)",
  "publish_authorized permanece false en el paquete de estrategia (NelvyonOfficialSocialPrep)",
  "Ante cualquier duda, bloquear con ambos flags oauthConnected=false y ceoApprovalToken ausente",
];

/**
 * Fail-closed manual publish pathway. Requires BOTH an OAuth-connected flag
 * AND a CEO approval token — both default false/absent. Even when both are
 * present, allows only ONE approved test-post simulation per platform+token,
 * entirely in-memory, and NEVER performs a real network call.
 */
export function attemptNelvyonManualPublish(
  req: NelvyonManualPublishRequest,
): NelvyonManualPublishResult {
  const oauthConnected = req.oauthConnected === true;
  const ceoApprovalToken = req.ceoApprovalToken?.trim() || "";
  const hasCeoApproval = ceoApprovalToken.length > 0;

  if (!oauthConnected && !hasCeoApproval) {
    return {
      ok: false,
      code: "BOTH_MISSING",
      message: "OAuth no conectado y sin token de aprobación CEO — publish bloqueado por diseño.",
    };
  }
  if (!oauthConnected) {
    return {
      ok: false,
      code: "OAUTH_NOT_CONNECTED",
      message: "Falta OAuth conectado para esta red — Daniel debe conectar la cuenta primero.",
    };
  }
  if (!hasCeoApproval) {
    return {
      ok: false,
      code: "CEO_APPROVAL_MISSING",
      message: "Falta token de aprobación explícita del CEO para este contenido.",
    };
  }

  const key = `${req.platform}:${req.contentId}:${ceoApprovalToken}`;
  if (usedTestPostTokens.has(key)) {
    return {
      ok: false,
      code: "TEST_POST_ALREADY_USED",
      message: "Ya se usó el único test post permitido para este par plataforma+token.",
    };
  }
  usedTestPostTokens.add(key);

  return {
    ok: true,
    mode: "single_test_post_simulation_in_memory",
    network_call: false,
    platform: req.platform,
    contentId: req.contentId,
    simulatedAt: new Date().toISOString(),
    note:
      "Simulación en memoria únicamente — cero llamada de red real. El post real de verdad " +
      "espera confirmación explícita de Daniel fuera de este módulo.",
  };
}

export function buildNelvyonOfficialSocialOpsPackage(): NelvyonOfficialSocialOpsPackage {
  return {
    strategyPackage: buildNelvyonOfficialSocialPackage(),
    profiles: buildNelvyonOfficialSocialProfiles(),
    contents: buildNelvyonOfficialSocialContentDrafts(),
    ceoApprovalGate: { ceoApprovalRequired: true, ceoApproved: false },
    brandLibrary: buildNelvyonBrandLibrary(),
    analyticsPlan: buildNelvyonSocialAnalyticsPlan(),
    permissionsMatrix: buildNelvyonSocialPermissionsMatrix(),
    rollbackPlan: ROLLBACK_PLAN,
    singleTestPostProtocol: {
      allowed: true,
      requiresBoth: ["oauthConnected", "ceoApprovalToken"],
      simulationOnly: true,
      realPostWaitsFor: "Daniel (CEO)",
      note:
        "Tras OAuth + aprobación CEO se permite UNA simulación de test post en memoria " +
        "(sin red real). El primer post real de verdad espera confirmación explícita de Daniel.",
    },
    accountsChecklist: listNelvyonSocialAccountsChecklist(),
  };
}

export function assertNelvyonOfficialSocialOpsIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const pkg = buildNelvyonOfficialSocialOpsPackage();

  if (pkg.ceoApprovalGate.ceoApprovalRequired !== true) violations.push("ceo_approval_required_must_be_true");
  if (pkg.ceoApprovalGate.ceoApproved !== false) violations.push("ceo_approved_must_default_false");
  if (pkg.brandLibrary.cdn !== "NONE") violations.push("brand_library_must_not_use_cdn");
  if (pkg.profiles.length !== 8) violations.push(`expected_8_profiles_got_${pkg.profiles.length}`);
  if (pkg.profiles.some((p) => p.status !== "SYNTHETIC_DRAFT")) {
    violations.push("all_profiles_must_be_synthetic_draft");
  }
  if (pkg.contents.length < 8) violations.push("content_library_too_small");
  if (pkg.contents.some((c) => c.status !== "draft_ready")) {
    violations.push("all_contents_must_be_draft_ready");
  }
  if (!pkg.permissionsMatrix.ceo_ops.includes("publish_manual")) {
    violations.push("only_ceo_ops_should_hold_publish_manual");
  }
  if (
    pkg.permissionsMatrix.social_strategist.includes("publish_manual") ||
    pkg.permissionsMatrix.creative_director.includes("publish_manual") ||
    pkg.permissionsMatrix.account_manager.includes("publish_manual")
  ) {
    violations.push("only_ceo_ops_may_hold_publish_manual");
  }
  if (pkg.rollbackPlan.length === 0) violations.push("rollback_plan_must_not_be_empty");
  if (!pkg.singleTestPostProtocol.simulationOnly) violations.push("test_post_must_be_simulation_only");

  const denyBoth = attemptNelvyonManualPublish({ platform: "tiktok", contentId: "check-integrity" });
  if (denyBoth.ok !== false || denyBoth.code !== "BOTH_MISSING") {
    violations.push("manual_publish_must_deny_by_default");
  }
  const denyOauthOnly = attemptNelvyonManualPublish({
    platform: "tiktok",
    contentId: "check-integrity-2",
    oauthConnected: true,
  });
  if (denyOauthOnly.ok !== false || denyOauthOnly.code !== "CEO_APPROVAL_MISSING") {
    violations.push("manual_publish_must_require_ceo_approval_even_with_oauth");
  }
  const denyCeoOnly = attemptNelvyonManualPublish({
    platform: "tiktok",
    contentId: "check-integrity-3",
    ceoApprovalToken: "tok",
  });
  if (denyCeoOnly.ok !== false || denyCeoOnly.code !== "OAUTH_NOT_CONNECTED") {
    violations.push("manual_publish_must_require_oauth_even_with_ceo_approval");
  }

  return { ok: violations.length === 0, violations };
}

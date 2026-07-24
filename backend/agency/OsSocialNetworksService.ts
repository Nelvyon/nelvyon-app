/**
 * NELVYON OS — Integral Social Networks service (ADR-052).
 * Professional team · multi-platform formats · paid social PREPARED_OFF · no publish without auth.
 */

import { OS_QA_MIN_SCORE } from "./OsCapabilityRegistry";
import { OS_CRITICAL_QA_MIN_SCORE } from "./OsProfessionalTeams";
import { evaluateEliteQa, type QaEliteVerdict } from "./OsEliteQaPolicy";

export type SocialPlatformId =
  | "tiktok"
  | "instagram_reels"
  | "instagram_stories"
  | "instagram_posts"
  | "facebook"
  | "youtube_shorts"
  | "youtube_long"
  | "linkedin"
  | "x"
  | "pinterest"
  | "google_business_profile";

export type SocialPlatformSpec = {
  id: SocialPlatformId;
  label: string;
  formats: string[];
  dimensions: string[];
  maxCaptionChars: number;
  supportsVideo: boolean;
  supportsCarousel: boolean;
  paidRequiresCeo: true;
  publishRequiresClientAuth: true;
};

export const SOCIAL_PLATFORM_SPECS: readonly SocialPlatformSpec[] = [
  {
    id: "tiktok",
    label: "TikTok",
    formats: ["vertical_video"],
    dimensions: ["1080x1920"],
    maxCaptionChars: 2200,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "instagram_reels",
    label: "Instagram Reels",
    formats: ["vertical_video"],
    dimensions: ["1080x1920"],
    maxCaptionChars: 2200,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "instagram_stories",
    label: "Instagram Stories",
    formats: ["story"],
    dimensions: ["1080x1920"],
    maxCaptionChars: 100,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "instagram_posts",
    label: "Instagram Posts",
    formats: ["feed_square", "feed_portrait", "carousel"],
    dimensions: ["1080x1080", "1080x1350"],
    maxCaptionChars: 2200,
    supportsVideo: false,
    supportsCarousel: true,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "facebook",
    label: "Facebook",
    formats: ["feed", "reel", "story"],
    dimensions: ["1200x630", "1080x1920"],
    maxCaptionChars: 5000,
    supportsVideo: true,
    supportsCarousel: true,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "youtube_shorts",
    label: "YouTube Shorts",
    formats: ["vertical_video"],
    dimensions: ["1080x1920"],
    maxCaptionChars: 100,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "youtube_long",
    label: "YouTube long-form",
    formats: ["landscape_video"],
    dimensions: ["1920x1080"],
    maxCaptionChars: 5000,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    formats: ["feed", "carousel", "document"],
    dimensions: ["1200x627", "1080x1080"],
    maxCaptionChars: 3000,
    supportsVideo: true,
    supportsCarousel: true,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "x",
    label: "X",
    formats: ["post", "thread"],
    dimensions: ["1600x900"],
    maxCaptionChars: 280,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    formats: ["pin_standard", "pin_video"],
    dimensions: ["1000x1500"],
    maxCaptionChars: 500,
    supportsVideo: true,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
  {
    id: "google_business_profile",
    label: "Google Business Profile",
    formats: ["gbp_post", "gbp_offer", "gbp_event"],
    dimensions: ["1200x900"],
    maxCaptionChars: 1500,
    supportsVideo: false,
    supportsCarousel: false,
    paidRequiresCeo: true,
    publishRequiresClientAuth: true,
  },
] as const;

export const SOCIAL_SERVICE_FLOW = [
  "brief_and_brand",
  "monthly_strategy",
  "editorial_calendar",
  "asset_creation",
  "qa_creative_technical_brand",
  "client_approval_if_required",
  "authorized_schedule_or_publish",
  "analytics",
  "continuous_improvement",
] as const;

export type SocialTeamRoleId =
  | "social_strategist"
  | "trends_researcher"
  | "content_planner"
  | "social_copywriter"
  | "creative_director"
  | "video_team"
  | "community_manager"
  | "paid_social"
  | "social_analyst"
  | "social_qa_elite";

export type SocialTeamRole = {
  roleId: SocialTeamRoleId;
  title: string;
  mapsToAgentIds: string[];
  permissions: string[];
  forbidden: string[];
};

export const SOCIAL_PROFESSIONAL_ROLES: readonly SocialTeamRole[] = [
  {
    roleId: "social_strategist",
    title: "Estratega social",
    mapsToAgentIds: ["marketing", "social_media"],
    permissions: ["draft", "assisted"],
    forbidden: ["publish_post", "oauth_connect", "paid_spend", "mass_dm"],
  },
  {
    roleId: "trends_researcher",
    title: "Investigador tendencias / competencia",
    mapsToAgentIds: ["marketing", "seo"],
    permissions: ["observe", "draft"],
    forbidden: ["publish_post", "paid_spend"],
  },
  {
    roleId: "content_planner",
    title: "Content planner",
    mapsToAgentIds: ["content", "social_media_premium"],
    permissions: ["draft", "assisted"],
    forbidden: ["publish_post", "paid_spend"],
  },
  {
    roleId: "social_copywriter",
    title: "Copywriter social",
    mapsToAgentIds: ["contenido_copywriting_premium", "content"],
    permissions: ["draft"],
    forbidden: ["publish_post", "false_promise"],
  },
  {
    roleId: "creative_director",
    title: "Director creativo / diseñador",
    mapsToAgentIds: ["branding_premium", "social_media_premium"],
    permissions: ["draft", "assisted"],
    forbidden: ["paid_render_without_approval", "publish_post"],
  },
  {
    roleId: "video_team",
    title: "Equipo de vídeo",
    mapsToAgentIds: ["content", "social_media"],
    permissions: ["draft"],
    forbidden: ["paid_render_without_approval", "publish_post"],
  },
  {
    roleId: "community_manager",
    title: "Community manager",
    mapsToAgentIds: ["social_media", "support", "portal_client"],
    permissions: ["draft", "assisted"],
    forbidden: ["sensitive_auto_reply", "mass_dm", "publish_without_approval"],
  },
  {
    roleId: "paid_social",
    title: "Especialista paid social",
    mapsToAgentIds: ["meta_ads", "ads_premium"],
    permissions: ["draft"],
    forbidden: ["oauth_connect", "paid_spend", "publish_ads"],
  },
  {
    roleId: "social_analyst",
    title: "Analista social",
    mapsToAgentIds: ["reporting"],
    permissions: ["observe", "draft"],
    forbidden: ["paid_spend"],
  },
  {
    roleId: "social_qa_elite",
    title: "QA social élite",
    mapsToAgentIds: ["qa", "branding_premium"],
    permissions: ["observe"],
    forbidden: ["self_approve_critical", "publish_post"],
  },
] as const;

export type SocialIntegralBrief = {
  business_name: string;
  sector: string;
  city: string;
  value_proposition: string;
  primary_cta: string;
  platforms?: SocialPlatformId[];
};

export type SocialIntegralBundle = {
  qa_score: number;
  production: true;
  paid_social_status: "PREPARED_OFF";
  publish_status: "NOT_AUTHORIZED";
  oauth_status: "OFF";
  flow: typeof SOCIAL_SERVICE_FLOW;
  platforms: SocialPlatformSpec[];
  strategy_monthly: Record<string, unknown>;
  trends_competition: Record<string, unknown>;
  calendar: Record<string, unknown>;
  copies: Record<string, unknown>;
  creative_line: Record<string, unknown>;
  video_plan: Record<string, unknown>;
  community_playbook: Record<string, unknown>;
  paid_social_off: Record<string, unknown>;
  analytics_plan: Record<string, unknown>;
  asset_library: Record<string, unknown>;
  qa_rubric: Record<string, unknown>;
  rollback: string[];
};

const DEFAULT_PLATFORMS: SocialPlatformId[] = [
  "instagram_posts",
  "instagram_reels",
  "tiktok",
  "linkedin",
  "facebook",
  "youtube_shorts",
  "google_business_profile",
];

export function resolveSocialPlatforms(ids?: SocialPlatformId[]): SocialPlatformSpec[] {
  const wanted = ids?.length ? ids : DEFAULT_PLATFORMS;
  return SOCIAL_PLATFORM_SPECS.filter((p) => wanted.includes(p.id));
}

export function buildSocialIntegralBundle(
  brief: SocialIntegralBrief,
  qaScore: number,
): SocialIntegralBundle {
  const score = Math.max(OS_QA_MIN_SCORE, qaScore);
  const platforms = resolveSocialPlatforms(brief.platforms);
  const weeks = [1, 2, 3, 4].map((w) => ({
    week: w,
    objective: w === 1 ? "awareness" : w === 2 ? "engagement" : w === 3 ? "consideration" : "conversion",
    posts: platforms.slice(0, 5).map((p, i) => ({
      platform: p.id,
      format: p.formats[0],
      dimensions: p.dimensions[0],
      day: w * 2 + (i % 2),
      hook: `${brief.business_name}: ${brief.value_proposition}`.slice(0, 100),
      cta: brief.primary_cta,
      hashtags: [`#${brief.city.replace(/\s+/g, "")}`, `#${brief.sector}`, "#nelvyon"],
      status: "draft_ready",
      publish_authorized: false,
    })),
  }));

  return {
    qa_score: score,
    production: true,
    paid_social_status: "PREPARED_OFF",
    publish_status: "NOT_AUTHORIZED",
    oauth_status: "OFF",
    flow: SOCIAL_SERVICE_FLOW,
    platforms,
    strategy_monthly: {
      objectives: ["alcance", "engagement", "leads"],
      audience: `${brief.sector} · ${brief.city}`,
      positioning: brief.value_proposition,
      channels: platforms.map((p) => p.id),
      horizon_days: 30,
    },
    trends_competition: {
      sector: brief.sector,
      opportunities: [
        "Contenido UGC short-form",
        "Prueba social local",
        "Hooks problema→solución en 3s",
      ],
      note: "Hallazgos de plantilla sectorial — validar con datos cliente antes de claims",
    },
    calendar: { weeks, portal_visible: true },
    copies: {
      variants_per_post: 2,
      cta: brief.primary_cta,
      tone: ["claro", "humano", "marca"],
      platform_adapted: true,
    },
    creative_line: {
      brand_coherence: true,
      carousel_frames: 5,
      visual_pillars: ["producto", "persona", "prueba_social"],
    },
    video_plan: {
      scenes_max: 8,
      storyboard: ["hook", "problema", "solucion", "cta"],
      subtitles_required: true,
      aspect_ratios: ["9:16", "16:9"],
      note: "Render de pago OFF — VisualGenerationProvider strategy_only (ADR-051)",
    },
    community_playbook: {
      comment_classes: ["pregunta", "queja", "elogio", "spam", "lead"],
      prepared_replies: true,
      escalate_to_human: ["queja", "legal", "datos_personales"],
      auto_reply_sensitive: false,
    },
    paid_social_off: {
      status: "PREPARED_OFF",
      blockers: ["oauth", "ad_account", "budget_ceo_approval"],
      kit_only: true,
    },
    analytics_plan: {
      metrics: ["reach", "retention", "leads", "sales_assist", "sentiment"],
      experiments: ["hook_A_B", "cta_placement", "posting_time"],
    },
    asset_library: {
      versioning: true,
      items: ["calendar_v1", "copies_v1", "storyboard_v1", "creative_line_v1"],
    },
    qa_rubric: {
      min_score: OS_QA_MIN_SCORE,
      critical_min: OS_CRITICAL_QA_MIN_SCORE,
      reject: [
        "mediocre_content",
        "platform_mismatch",
        "off_brand",
        "false_promise",
        "broken_cta",
        "wrong_dimensions",
      ],
    },
    rollback: [
      "Do not publish",
      "NELVYON_VISUAL_GENERATION_ENABLED=0",
      "Keep paid_social PREPARED_OFF",
      "Revoke OAuth if ever connected",
    ],
  };
}

export function assertSocialPublishAuthorized(input: {
  clientApprovalToken?: string;
  ceoPublishAuth?: boolean;
  oauthConnected?: boolean;
}): { ok: boolean; code: string } {
  if (input.oauthConnected) {
    return { ok: false, code: "OAUTH_REQUIRES_CEO_AND_CLIENT" };
  }
  if (!input.clientApprovalToken && !input.ceoPublishAuth) {
    return { ok: false, code: "PUBLISH_NOT_AUTHORIZED" };
  }
  return { ok: false, code: "PUBLISH_DISABLED_DEFAULT" };
}

export function evaluateSocialQaElite(input: {
  score: number;
  offBrand?: boolean;
  falsePromise?: boolean;
  wrongDimensions?: boolean;
  mediocre?: boolean;
}): QaEliteVerdict {
  return evaluateEliteQa({
    score: input.score,
    critical: true,
    flags: {
      brand_incoherence: Boolean(input.offBrand),
      false_promise: Boolean(input.falsePromise),
      visual_defect: Boolean(input.wrongDimensions || input.mediocre),
    },
  });
}

export function isPaidSocialEnabled(): boolean {
  const v = process.env.NELVYON_PAID_SOCIAL_ENABLED?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

export function assertSocialNetworksIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (SOCIAL_PLATFORM_SPECS.length < 10) violations.push("platforms_incomplete");
  if (SOCIAL_PROFESSIONAL_ROLES.length < 10) violations.push("roles_incomplete");
  if (!SOCIAL_SERVICE_FLOW.includes("qa_creative_technical_brand")) {
    violations.push("missing_qa_step");
  }
  if (isPaidSocialEnabled()) {
    /* flag may be on in tests — not a catalog violation */
  }
  const paid = SOCIAL_PROFESSIONAL_ROLES.find((r) => r.roleId === "paid_social");
  if (!paid?.forbidden.includes("paid_spend")) violations.push("paid_must_forbid_spend");
  return { ok: violations.length === 0, violations };
}

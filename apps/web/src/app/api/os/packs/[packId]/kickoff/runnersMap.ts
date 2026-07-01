/**
 * Pack runner registry — shared between the kickoff route and SaasBriefToLaunchService.
 * Extracted from route.ts so backend services can import without pulling in Next.js route boilerplate.
 */
import {
  runEcommerceGrowthPack,
  validateEcommerceGrowthIntake,
} from "@/lib/packs/ecommerceGrowthPack";
import {
  runLocalBusinessGrowthPack,
  validateLocalGrowthIntake,
} from "@/lib/packs/localBusinessGrowthPack";
import {
  runSaasB2bGrowthPack,
  validateSaasB2bGrowthIntake,
} from "@/lib/packs/saasB2bGrowthPack";
import {
  runSocialCalendarPack, validateSocialCalendarIntake,
  runContentStrategyPack, validateContentStrategyIntake,
  runCroAuditPack, validateCroAuditIntake,
  runAnalyticsSetupPack, validateAnalyticsSetupIntake,
  runBrandVoicePack, validateBrandVoiceIntake,
} from "@/lib/packs/betaPacksRunners";
import type { PackRunRecord } from "@/lib/packs/types";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
  SOCIAL_CALENDAR_PACK_ID,
  CONTENT_STRATEGY_PACK_ID,
  CRO_AUDIT_PACK_ID,
  ANALYTICS_SETUP_PACK_ID,
  BRAND_VOICE_PACK_ID,
} from "@/lib/packs/types";

export type PackRunner = (params: {
  workspaceId: number;
  userId: string;
  intake: never;
}) => Promise<PackRunRecord>;

export type PackRunnerEntry = {
  validate: (body: unknown) => unknown;
  run: PackRunner;
};

export const RUNNERS: Record<string, PackRunnerEntry> = {
  [LOCAL_GROWTH_PACK_ID]: {
    validate: validateLocalGrowthIntake,
    run: runLocalBusinessGrowthPack as PackRunner,
  },
  [ECOMMERCE_GROWTH_PACK_ID]: {
    validate: validateEcommerceGrowthIntake,
    run: runEcommerceGrowthPack as PackRunner,
  },
  [SAAS_B2B_GROWTH_PACK_ID]: {
    validate: validateSaasB2bGrowthIntake,
    run: runSaasB2bGrowthPack as PackRunner,
  },
  [SOCIAL_CALENDAR_PACK_ID]: {
    validate: validateSocialCalendarIntake,
    run: runSocialCalendarPack as PackRunner,
  },
  [CONTENT_STRATEGY_PACK_ID]: {
    validate: validateContentStrategyIntake,
    run: runContentStrategyPack as PackRunner,
  },
  [CRO_AUDIT_PACK_ID]: {
    validate: validateCroAuditIntake,
    run: runCroAuditPack as PackRunner,
  },
  [ANALYTICS_SETUP_PACK_ID]: {
    validate: validateAnalyticsSetupIntake,
    run: runAnalyticsSetupPack as PackRunner,
  },
  [BRAND_VOICE_PACK_ID]: {
    validate: validateBrandVoiceIntake,
    run: runBrandVoicePack as PackRunner,
  },
  /** Alias — analytics-insights → analytics-setup-pack */
  "analytics-insights": {
    validate: validateAnalyticsSetupIntake,
    run: runAnalyticsSetupPack as PackRunner,
  },
  "analytics-insights-pack": {
    validate: validateAnalyticsSetupIntake,
    run: runAnalyticsSetupPack as PackRunner,
  },
};

import { NextResponse } from "next/server";

import {
  runEcommerceGrowthPack,
  validateEcommerceGrowthIntake,
} from "@/lib/packs/ecommerceGrowthPack";
import {
  runLocalBusinessGrowthPack,
  validateLocalGrowthIntake,
} from "@/lib/packs/localBusinessGrowthPack";
import { getPackMeta } from "@/lib/packs/packRegistry";
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
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type PackRunner = (params: {
  workspaceId: number;
  userId: string;
  intake: never;
}) => Promise<PackRunRecord>;

const RUNNERS: Record<string, { validate: (body: unknown) => unknown; run: PackRunner }> = {
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
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ packId: string }> },
) {
  const { packId } = await ctx.params;
  const meta = getPackMeta(packId);
  const runner = RUNNERS[packId];

  if (!meta || !runner) {
    return NextResponse.json({ error: `Pack desconocido: ${packId}` }, { status: 404 });
  }

  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json(
      { error: "Growth Pack requiere DATABASE_URL en el entorno web" },
      { status: 503 },
    );
  }

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intake = runner.validate(body);
  if (!intake) {
    return NextResponse.json(
      { error: `Brief inválido para ${meta.name}. Revisa los campos obligatorios.` },
      { status: 400 },
    );
  }

  try {
    const run = await runner.run({
      workspaceId,
      userId: claims.userId,
      intake: intake as never,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Pack execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

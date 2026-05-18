import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createLogger } from "@/lib/serverLogger";
import { OsAgentError } from "@nelvyon/os-agents";

import { MetaAdsExecutor } from "../../../../../../../../backend/integrations/meta/MetaAdsExecutor";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const logger = createLogger("meta_ads");

interface LaunchBody {
  adAccountId?: string;
  pageId?: string;
  campaignName?: string;
  dailyBudgetEuros?: number;
  primaryText?: string;
  headline?: string;
  websiteUrl?: string;
  countries?: string[];
  ageMin?: number;
  ageMax?: number;
  optimizationGoal?: string;
  ctaType?: string;
}

function validateBody(body: LaunchBody): string | null {
  if (!body.adAccountId?.trim()) return "adAccountId is required";
  if (!body.pageId?.trim()) return "pageId is required";
  if (!body.campaignName?.trim()) return "campaignName is required";
  if (!body.primaryText?.trim()) return "primaryText is required";
  if (!body.headline?.trim()) return "headline is required";
  if (!body.websiteUrl?.trim()) return "websiteUrl is required";
  if (typeof body.dailyBudgetEuros !== "number" || body.dailyBudgetEuros <= 0) {
    return "dailyBudgetEuros must be a positive number";
  }
  return null;
}

export async function POST(req: Request) {
  let userId: string;
  try {
    const claims = await authenticate(req);
    userId = claims.userId;
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }

  let body: LaunchBody;
  try {
    body = (await req.json()) as LaunchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const adAccountId = body.adAccountId!.trim();
  const dailyBudgetCents = Math.round(body.dailyBudgetEuros! * 100);
  const campaignName = body.campaignName!.trim();
  const executor = MetaAdsExecutor.instance();

  try {
    const { campaignId } = await executor.createCampaign(userId, adAccountId, {
      name: campaignName,
    });
    const { adSetId } = await executor.createAdSet(userId, adAccountId, {
      name: `${campaignName} — Ad set`,
      campaignId,
      dailyBudgetCents,
      optimizationGoal: body.optimizationGoal,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      countries: body.countries,
    });
    const { creativeId } = await executor.createAdCreative(userId, adAccountId, {
      name: `${campaignName} — Creative`,
      pageId: body.pageId!.trim(),
      primaryText: body.primaryText!.trim(),
      headline: body.headline!.trim(),
      websiteUrl: body.websiteUrl!.trim(),
      ctaType: body.ctaType,
    });
    const { adId } = await executor.createAd(userId, adAccountId, {
      name: `${campaignName} — Ad`,
      adSetId,
      creativeId,
    });

    logger.info("meta_ads_launch_complete", { userId, adAccountId, campaignId, adSetId, adId });
    return NextResponse.json({ campaignId, adSetId, adId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logger.error("meta_ads_launch_failed", { userId, message });
    return NextResponse.json({ error: "Failed to launch Meta Ads campaign" }, { status: 500 });
  }
}

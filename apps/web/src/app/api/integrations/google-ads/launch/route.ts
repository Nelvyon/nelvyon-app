import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { createLogger } from "@/lib/serverLogger";
import { OsAgentError } from "@nelvyon/os-agents";

import { GoogleAdsExecutor } from "../../../../../../../../backend/integrations/google/GoogleAdsExecutor";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const logger = createLogger("google_ads");

interface LaunchBody {
  customerId?: string;
  campaignName?: string;
  dailyBudgetEuros?: number;
  keywords?: string[];
  headlines?: string[];
  descriptions?: string[];
  finalUrl?: string;
  channelType?: string;
}

function validateBody(body: LaunchBody): string | null {
  if (!body.customerId?.trim()) return "customerId is required";
  if (!body.campaignName?.trim()) return "campaignName is required";
  if (!body.finalUrl?.trim()) return "finalUrl is required";
  if (!Array.isArray(body.keywords) || body.keywords.length < 1) {
    return "keywords must contain at least one entry";
  }
  if (!Array.isArray(body.headlines) || body.headlines.length < 3) {
    return "headlines must contain at least three entries";
  }
  if (!Array.isArray(body.descriptions) || body.descriptions.length < 2) {
    return "descriptions must contain at least two entries";
  }
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

  const customerId = body.customerId!.trim();
  const dailyBudgetMicros = Math.round(body.dailyBudgetEuros! * 1_000_000);
  const executor = GoogleAdsExecutor.instance();

  try {
    const { budgetResourceName } = await executor.createBudget(userId, customerId, dailyBudgetMicros);
    const { campaignId, resourceName: campaignResourceName } = await executor.createCampaign(
      userId,
      customerId,
      {
        name: body.campaignName!.trim(),
        channelType: body.channelType,
        budgetResourceName,
      },
    );
    const { adGroupId, resourceName: adGroupResourceName } = await executor.createAdGroup(
      userId,
      customerId,
      {
        name: `${body.campaignName!.trim()} — Ad group`,
        campaignResourceName,
      },
    );
    await executor.addKeywords(userId, customerId, adGroupResourceName, body.keywords!);
    await executor.createResponsiveSearchAd(userId, customerId, {
      adGroupResourceName,
      headlines: body.headlines!,
      descriptions: body.descriptions!,
      finalUrl: body.finalUrl!.trim(),
    });

    logger.info("google_ads_launch_complete", { userId, customerId, campaignId, adGroupId });
    return NextResponse.json({ campaignId, adGroupId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    logger.error("google_ads_launch_failed", { userId, message });
    return NextResponse.json({ error: "Failed to launch Google Ads campaign" }, { status: 500 });
  }
}

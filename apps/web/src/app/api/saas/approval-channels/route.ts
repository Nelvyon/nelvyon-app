export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasApprovalCardsService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const settings = await getSaasApprovalCardsService().getSettings(ctx.tenant.id);
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as {
      channel?: string;
      slackChannelId?: string;
      slackTeamId?: string;
      teamsWebhookUrl?: string;
      packApproveEnabled?: boolean;
    };
    if (body.channel !== "slack" && body.channel !== "teams") {
      return NextResponse.json({ error: "channel must be slack or teams" }, { status: 400 });
    }
    const settings = await getSaasApprovalCardsService().upsertSettings(ctx.tenant.id, {
      channel: body.channel,
      slackChannelId: body.slackChannelId ?? null,
      slackTeamId: body.slackTeamId ?? null,
      teamsWebhookUrl: body.teamsWebhookUrl ?? null,
      packApproveEnabled: body.packApproveEnabled,
    });
    return NextResponse.json(settings);
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

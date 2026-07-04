export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import {
  buildDeliverableSocialProofPost,
  buildMockSocialPost,
  getSaasSocialProofService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const drafts = await getSaasSocialProofService().list(ctx.tenant.id);
    return NextResponse.json({ drafts });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — social post draft from topic or deliverable (0€) */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json().catch(() => ({}))) as {
      topic?: string;
      platform?: string;
      deliverableId?: string;
      title?: string;
      qaScore?: number;
      packName?: string;
      save?: boolean;
    };

    if (body.deliverableId || body.title) {
      const draft = body.save
        ? await getSaasSocialProofService().createFromDeliverable(ctx.tenant.id, body)
        : buildDeliverableSocialProofPost(body);
      return NextResponse.json({ draft, template: true });
    }

    const topic = body.topic?.trim();
    if (!topic) {
      return NextResponse.json({ error: "topic es obligatorio (o deliverableId/title)" }, { status: 400 });
    }

    const draft = buildMockSocialPost({ topic, platform: body.platform });
    return NextResponse.json({ draft, template: true });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status === 401 ? 401 : saasErrorStatus(e);
    return NextResponse.json(saasErrorBody(e), { status });
  }
}

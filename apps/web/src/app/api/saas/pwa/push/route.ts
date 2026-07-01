import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasPwaService,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/saas/pwa/push — VAPID public key + subscription status */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = (ctx as { user?: { id: string } }).user?.id ?? null;
    const svc = getSaasPwaService();
    const subscribed = (await svc.countPushSubscriptions(ctx.tenant.id, userId)) > 0;
    return NextResponse.json({
      vapidPublicKey: svc.getVapidPublicKey(),
      subscribed,
      pushConfigured: Boolean(svc.getVapidPublicKey()),
    });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** POST /api/saas/pwa/push — save Web Push subscription */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const userId = (ctx as { user?: { id: string } }).user?.id ?? null;
    const body = (await req.json().catch(() => ({}))) as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    };
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }
    const svc = getSaasPwaService();
    const result = await svc.savePushSubscription(ctx.tenant.id, {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** DELETE /api/saas/pwa/push — remove subscription by endpoint */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
    if (!body.endpoint?.trim()) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    await getSaasPwaService().removePushSubscription(ctx.tenant.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

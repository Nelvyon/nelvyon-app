import { NextResponse } from "next/server";
import { PostHog } from "posthog-node";

export const runtime = "nodejs";

let serverClient: PostHog | null = null;

function getServerPostHog(): PostHog | null {
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.trim().length === 0) return null;
  if (!serverClient) {
    serverClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
    });
  }
  return serverClient;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(req: Request) {
  const client = getServerPostHog();
  if (!client) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const event = body.event;
  const distinctId = body.distinctId;
  if (typeof event !== "string" || event.length === 0) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }
  if (typeof distinctId !== "string" || distinctId.length === 0) {
    return NextResponse.json({ error: "distinctId is required" }, { status: 400 });
  }

  const properties = isRecord(body.properties) ? body.properties : undefined;

  client.capture({
    distinctId,
    event,
    properties,
  });

  return NextResponse.json({ ok: true });
}

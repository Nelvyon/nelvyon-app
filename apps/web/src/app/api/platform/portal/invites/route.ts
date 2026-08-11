import { NextResponse } from "next/server";

import { createPortalInviteBff, listPortalInvitesBff } from "@/lib/portal/portalInviteStore";
import { requirePlatformContext } from "@/lib/platformBffAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Listar invitaciones revela a quién se dio acceso externo: misma autoridad
  // que crearlas.
  const gate = await requirePlatformContext(req, "partners.portal.invite");
  if (gate instanceof NextResponse) return gate;
  const { workspaceId } = gate;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required for portal invites" }, { status: 503 });
  }

  const clientId = new URL(req.url).searchParams.get("client_id")?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "client_id query param required" }, { status: 400 });
  }

  try {
    const result = await listPortalInvitesBff({ workspaceId, clientId });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "list invites failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Conceder acceso al portal a un tercero: owner/admin.
  const gate = await requirePlatformContext(req, "partners.portal.invite");
  if (gate instanceof NextResponse) return gate;
  const { claims, workspaceId } = gate;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required for portal invites" }, { status: 503 });
  }

  let body: { client_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientId = body.client_id?.trim();
  const email = body.email?.trim();
  if (!clientId || !email) {
    return NextResponse.json({ error: "client_id and email required" }, { status: 400 });
  }

  try {
    const result = await createPortalInviteBff({
      workspaceId,
      clientId,
      email,
      createdByUserId: claims.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "invite failed";
    const status = message.includes("not found") || message.includes("already exists") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Email click tracking redirect.
 * Increments clicked_count and redirects to the original URL.
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "../../../../../../../../../backend/email/trackingToken";
import { DbClient } from "../../../../../../../../../backend/db/DbClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const result = verifyTrackingToken(token);

  if (!result.ok || result.payload.t !== "c" || !result.payload.url) {
    // Invalid token — redirect to homepage rather than showing an error
    return NextResponse.redirect("https://nelvyon.com", { status: 302 });
  }

  const { tid, cid, rid, url } = result.payload;
  const db = DbClient.getInstance();

  await db.query(
    `UPDATE saas_campania_recipients
     SET status = CASE WHEN status IN ('sent','opened') THEN 'clicked' ELSE status END,
         clicked_at = COALESCE(clicked_at, NOW())
     WHERE tenant_id = $1 AND campania_id = $2 AND contact_id = $3`,
    [tid, cid, rid],
  ).catch(() => null);

  await db.query(
    `UPDATE saas_campanias
     SET clicked_count = clicked_count + 1, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2`,
    [tid, cid],
  ).catch(() => null);

  // Validate the destination URL is http/https before redirecting
  let destination: URL;
  try {
    destination = new URL(url);
    if (!["http:", "https:"].includes(destination.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.redirect("https://nelvyon.com", { status: 302 });
  }

  return NextResponse.redirect(destination.toString(), { status: 302 });
}

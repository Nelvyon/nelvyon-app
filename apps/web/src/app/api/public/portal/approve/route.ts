export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  verifyPortalApprovalToken,
  hashApprovalToken,
} from "../../../../../../../../backend/saas/PortalApprovalTokenService";
import {
  approvePortalDeliverableBff,
  rejectPortalDeliverableBff,
} from "@/lib/portal/portalDeliverablesStore";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

/** GET /api/public/portal/approve?token=... — preview deliverable for one-click approval */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const verified = verifyPortalApprovalToken(token);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }
  const { did, wid, cid, act } = verified.payload;
  const db = DbClient.getInstance();
  const rows = await db.query<{ title: string; status: string; client_id: string }>(
    `SELECT title, status, client_id::text FROM os_deliverables WHERE id = $1::uuid AND workspace_id = $2 LIMIT 1`,
    [did, wid],
  );
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (rows[0].client_id !== cid) {
    return NextResponse.json({ error: "invalid token scope" }, { status: 403 });
  }
  return NextResponse.json({
    deliverableId: did,
    title: rows[0].title,
    status: rows[0].status,
    action: act,
    clientId: cid,
  });
}

/** POST /api/public/portal/approve — execute one-click approve/reject */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string; feedback?: string };
    const token = String(body.token ?? "");
    const verified = verifyPortalApprovalToken(token);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    const hash = hashApprovalToken(token);
    const db = DbClient.getInstance();

    // Atomic single-use claim before any side effects
    const claimed = await db.query<{ id: string }>(
      `UPDATE os_deliverable_approval_tokens
       SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING id`,
      [hash],
    );
    if (!claimed[0]) {
      return NextResponse.json({ error: "token already used or invalid" }, { status: 410 });
    }

    const { did, wid, cid, act } = verified.payload;

    const delRows = await db.query<{ client_id: string }>(
      `SELECT client_id::text FROM os_deliverables WHERE id = $1::uuid AND workspace_id = $2 LIMIT 1`,
      [did, wid],
    );
    if (!delRows[0] || delRows[0].client_id !== cid) {
      return NextResponse.json({ error: "invalid token scope" }, { status: 403 });
    }

    const feedback =
      body.feedback != null ? String(body.feedback).slice(0, 2000) : undefined;
    const portalUserId = "token-approval";

    const result =
      act === "approve"
        ? await approvePortalDeliverableBff({
            workspaceId: wid,
            clientId: cid,
            portalUserId,
            deliverableId: did,
            feedback,
          })
        : await rejectPortalDeliverableBff({
            workspaceId: wid,
            clientId: cid,
            portalUserId,
            deliverableId: did,
            feedback: feedback ?? "Rejected via one-click link",
          });

    if (act === "approve") {
      void (async () => {
        try {
          const metaRows = await db.query<{ title: string; qa_score: number | null; pack_name: string | null }>(
            `SELECT d.title,
                    (d.metadata->>'qa_score')::int AS qa_score,
                    d.metadata->'pack_report'->>'pack_name' AS pack_name
             FROM os_deliverables d WHERE d.id = $1::uuid LIMIT 1`,
            [did],
          );
          const tenantRows = await db.query<{ id: string }>(
            `SELECT id FROM saas_tenants WHERE workspace_id = $1 LIMIT 1`,
            [wid],
          );
          const tenantId = tenantRows[0]?.id;
          if (!tenantId) return;
          const { getSaasSocialProofService } = await import("@nelvyon/saas");
          await getSaasSocialProofService().createFromDeliverable(tenantId, {
            deliverableId: did,
            title: metaRows[0]?.title,
            qaScore: metaRows[0]?.qa_score ?? undefined,
            packName: metaRows[0]?.pack_name ?? undefined,
          });
        } catch {
          /* best-effort social proof draft */
        }
      })();
    }

    return NextResponse.json({ ok: true, action: act, deliverable: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

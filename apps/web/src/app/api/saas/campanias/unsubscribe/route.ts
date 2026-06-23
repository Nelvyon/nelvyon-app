import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const campaniaId = searchParams.get("cid");
  const contactId = searchParams.get("rid");
  const tenantId = searchParams.get("tid");

  if (!campaniaId || !contactId || !tenantId) {
    return new NextResponse("Enlace de baja inválido.", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  try {
    const db = DbClient.getInstance();
    await db.query(
      `UPDATE saas_campania_recipients
       SET status = 'unsubscribed'
       WHERE campania_id = $1 AND contact_id = $2 AND tenant_id = $3`,
      [campaniaId, contactId, tenantId],
    );
    // Mark contact as unsubscribed so future campaigns skip them
    await db.query(
      `UPDATE saas_contacts SET tags = array_append(COALESCE(tags, '{}'), 'unsubscribed')
       WHERE id = $1 AND tenant_id = $2 AND NOT (COALESCE(tags, '{}') @> ARRAY['unsubscribed'])`,
      [contactId, tenantId],
    );
  } catch {
    // Don't expose DB errors to the user
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Baja confirmada — NELVYON</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
.box{text-align:center;max-width:400px;padding:48px 32px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);}
h1{font-size:22px;color:#0f172a;margin:0 0 12px;}p{color:#64748b;font-size:15px;line-height:1.6;margin:0;}
.badge{display:inline-block;background:#dcfce7;color:#16a34a;font-size:13px;font-weight:600;padding:4px 12px;border-radius:99px;margin-bottom:24px;}</style>
</head>
<body>
<div class="box">
  <div class="badge">✓ Baja confirmada</div>
  <h1>Te has dado de baja</h1>
  <p>No volverás a recibir esta campaña. Si fue un error, contacta con el remitente.</p>
</div>
</body>
</html>`;

  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

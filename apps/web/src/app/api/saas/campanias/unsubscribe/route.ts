import { NextResponse } from "next/server";

import { verifyTrackingToken } from "../../../../../../../../backend/email/trackingToken";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function invalidLinkHtml(): NextResponse {
  return new NextResponse("Enlace de baja inválido o expirado.", {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function failureHtml(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>No se pudo procesar la baja — NELVYON</title>
<style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;}
.box{text-align:center;max-width:400px;padding:48px 32px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);}
h1{font-size:22px;color:#0f172a;margin:0 0 12px;}p{color:#64748b;font-size:15px;line-height:1.6;margin:0;}
.badge{display:inline-block;background:#fee2e2;color:#b91c1c;font-size:13px;font-weight:600;padding:4px 12px;border-radius:99px;margin-bottom:24px;}</style>
</head>
<body>
<div class="box">
  <div class="badge">No confirmada</div>
  <h1>No se pudo procesar la baja</h1>
  <p>Hubo un problema técnico. Vuelve a intentar en unos minutos o contacta con el remitente. No asumas que la baja quedó registrada.</p>
</div>
</body>
</html>`;
  return new NextResponse(html, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return invalidLinkHtml();
  }

  const verified = verifyTrackingToken(token);
  if (!verified.ok || verified.payload.t !== "u") {
    return invalidLinkHtml();
  }

  const { tid: tenantId, cid: campaniaId, rid: contactId } = verified.payload;

  try {
    const db = DbClient.getInstance();
    await db.query(
      `UPDATE saas_campania_recipients
       SET status = 'unsubscribed'
       WHERE campania_id = $1 AND contact_id = $2 AND tenant_id = $3`,
      [campaniaId, contactId, tenantId],
    );
    await db.query(
      `UPDATE saas_contacts SET tags = array_append(COALESCE(tags, '{}'), 'unsubscribed')
       WHERE id = $1 AND tenant_id = $2 AND NOT (COALESCE(tags, '{}') @> ARRAY['unsubscribed'])`,
      [contactId, tenantId],
    );
  } catch {
    return failureHtml();
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

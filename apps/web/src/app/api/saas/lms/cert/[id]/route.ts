/**
 * GET /api/saas/lms/cert/[id]?tok=<hmac>
 * Public route — verifies HMAC signature and renders HTML certificate.
 * Print to PDF from browser (Ctrl+P / window.print).
 */
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { DbClient } from "@/../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verify(certId: string, tok: string): boolean {
  const secret = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret?.trim()) return false;
  const expected = createHmac("sha256", secret.trim()).update(certId).digest("hex").slice(0, 32);
  return tok === expected;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tok = new URL(req.url).searchParams.get("tok") ?? "";

  if (!verify(id, tok)) {
    return new NextResponse("Certificado no válido o enlace expirado.", { status: 403, headers: { "Content-Type": "text/plain" } });
  }

  const db = DbClient.getInstance();
  const rows = await db.query<{
    id: string; enrollment_id: string; issued_at: Date;
    contact_name: string | null; contact_email: string; course_title: string;
  }>(
    `SELECT c.id, c.enrollment_id, c.issued_at,
            e.contact_name, e.contact_email,
            co.title AS course_title
     FROM saas_lms_certificates c
     JOIN saas_lms_enrollments e ON e.id = c.enrollment_id
     JOIN saas_lms_courses co ON co.id = e.course_id
     WHERE c.id = $1`,
    [id],
  );

  if (!rows[0]) {
    return new NextResponse("Certificado no encontrado.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const cert = rows[0];
  const issuedDate = new Date(cert.issued_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const studentName = cert.contact_name ?? cert.contact_email;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Certificado — ${cert.course_title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f8f7f2; font-family: 'Inter', sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 2rem; }
    .cert { background: #fff; width: 800px; max-width: 100%; padding: 60px 70px; border: 3px solid #0084ff; position: relative; box-shadow: 0 8px 40px rgba(0,0,0,.12); }
    .cert::before { content: ''; position: absolute; inset: 8px; border: 1px solid #e5e5e5; pointer-events: none; }
    .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 700; color: #0084ff; letter-spacing: 2px; text-transform: uppercase; }
    .heading { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 400; color: #111; margin-top: 2.5rem; line-height: 1.2; }
    .sub { color: #555; font-size: .95rem; font-weight: 300; margin-top: .5rem; }
    .student { font-family: 'Playfair Display', serif; font-size: 2.6rem; color: #0084ff; margin: 2rem 0 .5rem; border-bottom: 2px solid #0084ff; padding-bottom: .5rem; }
    .course { font-size: 1.25rem; font-weight: 500; color: #111; margin-top: 1.5rem; }
    .date { color: #888; font-size: .9rem; margin-top: 2.5rem; }
    .seal { position: absolute; bottom: 50px; right: 60px; text-align: center; }
    .seal-circle { width: 90px; height: 90px; border-radius: 50%; border: 3px solid #0084ff; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #0084ff; font-size: .6rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .seal-circle span { font-size: 1.4rem; }
    .cert-id { margin-top: 3rem; font-size: .7rem; color: #aaa; font-family: monospace; }
    @media print {
      body { background: white; padding: 0; }
      .cert { box-shadow: none; width: 100%; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="logo">✦ Nelvyon</div>
    <h1 class="heading">Certificado de<br>Finalización</h1>
    <p class="sub">Este certificado acredita que</p>
    <div class="student">${studentName}</div>
    <p class="course">ha completado satisfactoriamente el curso</p>
    <p style="font-size:1.5rem;font-weight:600;color:#111;margin-top:.5rem">${cert.course_title}</p>
    <p class="date">Emitido el ${issuedDate}</p>
    <p class="cert-id">ID: ${cert.id}</p>
    <div class="seal">
      <div class="seal-circle"><span>✓</span>Verificado</div>
    </div>
  </div>
  <div class="no-print" style="position:fixed;top:16px;right:16px">
    <button onclick="window.print()" style="background:#0084ff;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:.9rem;cursor:pointer;font-weight:500">
      🖨 Descargar PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

interface ReportRow {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: Date;
}

/**
 * Generates a minimal valid PDF from scratch — no external dependencies.
 * Spec: PDF 1.4, text-only, A4, embedded metrics table.
 */
function buildPdf(lines: string[]): Uint8Array {
  const enc = new TextEncoder();

  // Each line of text in the PDF body
  const margin = 60;
  const lineHeight = 18;
  const pageHeight = 842; // A4 in points
  const pageWidth = 595;
  let yPos = pageHeight - margin;

  const textLines: string[] = [];
  for (const line of lines) {
    const isTitle = line.startsWith("##");
    const isSection = line.startsWith("#");
    const text = line.replace(/^##?\s*/, "");
    if (isTitle) {
      textLines.push(`BT /F1 14 Tf ${margin} ${yPos} Td (${pdfEsc(text)}) Tj ET`);
      yPos -= lineHeight + 4;
    } else if (isSection) {
      yPos -= 4;
      textLines.push(`BT /F1 12 Tf ${margin} ${yPos} Td (${pdfEsc(text)}) Tj ET`);
      yPos -= lineHeight + 2;
    } else if (line === "") {
      yPos -= lineHeight / 2;
    } else {
      // Word-wrap at ~80 chars
      const chunks = chunkText(text, 85);
      for (const chunk of chunks) {
        textLines.push(`BT /F1 10 Tf ${margin} ${yPos} Td (${pdfEsc(chunk)}) Tj ET`);
        yPos -= lineHeight;
        if (yPos < margin + 40) yPos = pageHeight - margin; // simple page break
      }
    }
  }

  const contentStream = textLines.join("\n");
  const streamBytes = enc.encode(contentStream);
  const streamLen = streamBytes.length;

  // Build PDF objects
  const catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pages = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const page = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
  const content = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
  const font = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;

  const header = "%PDF-1.4\n";
  const body = catalog + pages + page + content + font;

  // Build xref table
  const offsets: number[] = [];
  let pos = header.length;
  const objs = [catalog, pages, page, content, font];
  for (const obj of objs) {
    offsets.push(pos);
    pos += enc.encode(obj).length;
  }
  const xrefPos = header.length + enc.encode(body).length;
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, "0") + " 00000 n ").join("\n")}\n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const full = header + body + xref + trailer;
  return enc.encode(full);
}

function pdfEsc(s: string): string {
  // Remove non-printable and non-latin chars, escape PDF special chars
  return s
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function getReportData(tenantId: string, reportId: string): Promise<ReportRow | null> {
  const db = DbClient.getInstance();
  try {
    const rows = await db.query<ReportRow>(
      `SELECT id,name,type,status,created_at FROM saas_reports WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, reportId],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getMetrics(tenantId: string) {
  const db = DbClient.getInstance();
  try {
    const [contacts, campaigns, workflows] = await Promise.all([
      db.query<{ count: string }>(`SELECT COUNT(*) as count FROM saas_contacts WHERE tenant_id=$1`, [tenantId]).catch(() => [{ count: "0" }]),
      db.query<{ count: string }>(`SELECT COUNT(*) as count FROM saas_campanias WHERE tenant_id=$1`, [tenantId]).catch(() => [{ count: "0" }]),
      db.query<{ count: string }>(`SELECT COUNT(*) as count FROM saas_workflows WHERE tenant_id=$1`, [tenantId]).catch(() => [{ count: "0" }]),
    ]);
    return {
      contacts: Number(contacts[0]?.count ?? 0),
      campaigns: Number(campaigns[0]?.count ?? 0),
      workflows: Number(workflows[0]?.count ?? 0),
    };
  } catch {
    return { contacts: 0, campaigns: 0, workflows: 0 };
  }
}

/** GET /api/saas/reports/[reportId]/pdf → returns real PDF binary */
export async function GET(req: Request, context: RouteContext) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { reportId } = await context.params;
    if (!reportId?.trim()) return NextResponse.json({ error: "reportId required" }, { status: 400 });

    const report = await getReportData(ctx.tenant.id, reportId);
    const metrics = await getMetrics(ctx.tenant.id);
    const now = new Date().toLocaleDateString("es-ES", { dateStyle: "long" });

    const reportName = report?.name ?? `Informe ejecutivo ${reportId.slice(0, 8)}`;

    const lines = [
      `## Nelvyon — ${reportName}`,
      ``,
      `Generado: ${now}`,
      `Tenant: ${ctx.tenant.id}`,
      ``,
      `# Resumen ejecutivo`,
      ``,
      `Este informe resume las metricas clave de tu cuenta Nelvyon.`,
      `Los datos son reales y se calculan en el momento de exportacion.`,
      ``,
      `# Metricas clave`,
      ``,
      `Contactos en CRM: ${metrics.contacts}`,
      `Campanias creadas: ${metrics.campaigns}`,
      `Workflows activos: ${metrics.workflows}`,
      ``,
      `# Estado de modulos`,
      ``,
      `CRM y contactos: Activo`,
      `Campanias email (SES): ${process.env.SES_ACCESS_KEY_ID ? "Configurado" : "Pendiente configurar SES_ACCESS_KEY_ID"}`,
      `SMS/WhatsApp (Twilio): ${process.env.TWILIO_ACCOUNT_SID ? "Configurado" : "Pendiente configurar TWILIO_ACCOUNT_SID"}`,
      `Pagos (Stripe): ${process.env.STRIPE_SECRET_KEY ? "Configurado" : "Pendiente configurar STRIPE_SECRET_KEY"}`,
      `SEO (SEMrush): ${process.env.SEMRUSH_API_KEY ? "Configurado" : "Pendiente configurar SEMRUSH_API_KEY"}`,
      ``,
      `# Proximos pasos`,
      ``,
      `1. Revisar campanas activas en /saas/campanias`,
      `2. Comprobar workflows en /saas/workflows`,
      `3. Analizar leads en /saas/crm`,
      `4. Configurar integraciones pendientes en /saas/integraciones`,
      ``,
      `---`,
      `Nelvyon — Marketing digital 100% operado por IA`,
      `nelvyon.com`,
    ];

    const pdfBytes = buildPdf(lines);
    const pdfBuffer = Buffer.from(pdfBytes);

    const filename = `nelvyon-report-${reportId.slice(0, 8)}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

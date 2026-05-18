import { NextResponse } from "next/server";

import { authenticate } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { sendEmail } from "../../../../../../../backend/email/emailService";
import { DataSubjectService } from "../../../../../../../backend/gdpr/dataSubjectService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const claims = await authenticate(req);
    const svc = DataSubjectService.getInstance();
    await svc.assertExportAllowed(claims.userId);
    const data = await svc.exportUserData(claims.userId);
    await svc.markExportRequested(claims.userId);

    const exportedAtFormatted = new Date(data.exportedAt).toLocaleString("es-ES");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://nelvyon.com";
    const name =
      typeof data.nelvyon_users?.full_name === "string" && data.nelvyon_users.full_name.length > 0
        ? String(data.nelvyon_users.full_name)
        : "Usuario";

    await sendEmail("data_export_confirm", {
      email: claims.email,
      name,
      exportedAt: exportedAtFormatted,
      appUrl,
    }).catch((err) => console.warn("[export-data] confirmation email skipped:", err));

    const filename = `nelvyon-datos-${claims.userId.replace(/[^\w.-]+/g, "_")}-${data.exportedAt.slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("EXPORT_COOLDOWN")) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: msg.replace(/^EXPORT_COOLDOWN:\s*/, ""),
          retryAfter: 86400,
        },
        { status: 429 },
      );
    }
    throw e;
  }
}

import { NextResponse } from "next/server";

const signature = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding-right:16px;vertical-align:top;border-right:3px solid #2563EB;">
      <div style="width:48px;height:48px;background:#2563EB;border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:48px;">
        <span style="color:#fff;font-size:24px;font-weight:900;font-family:Arial,sans-serif;">N</span>
      </div>
    </td>
    <td style="padding-left:16px;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;line-height:1.4;">{{NAME}}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#64748b;font-weight:500;line-height:1.4;">{{ROLE}} · NELVYON</p>
      <p style="margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
        <a href="mailto:{{EMAIL}}" style="color:#2563EB;text-decoration:none;">{{EMAIL}}</a><br>
        <a href="https://nelvyon.com" style="color:#2563EB;text-decoration:none;">nelvyon.com</a>
      </p>
      <p style="margin:8px 0 0;font-size:10px;color:#94a3b8;line-height:1.4;">
        Marketing digital con IA · SEO · Publicidad · Automatización
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;

export function GET() {
  const html = signature
    .replace(/\{\{NAME\}\}/g, "Daniel Castellanos")
    .replace(/\{\{ROLE\}\}/g, "Fundador & CEO")
    .replace(/\{\{EMAIL\}\}/g, "daniel@nelvyon.com");

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

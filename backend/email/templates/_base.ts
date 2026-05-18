export const EMAIL_BASE_STYLES = {
  bg: "#0A0A0F",
  text: "#FFFFFF",
  accent: "#6C63FF",
};

export function renderBaseEmail(title: string, intro: string, contentHtml: string, ctaLabel?: string, ctaUrl?: string): string {
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin: 28px 0 0; text-align:center;">
         <a href="${ctaUrl}" style="display:inline-block; background:${EMAIL_BASE_STYLES.accent}; color:${EMAIL_BASE_STYLES.text}; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">
           ${ctaLabel}
         </a>
       </p>`
    : "";
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:${EMAIL_BASE_STYLES.bg}; color:${EMAIL_BASE_STYLES.text}; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BASE_STYLES.bg};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background:#12121A; border:1px solid #232336; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:20px 24px; border-bottom:1px solid #232336; text-align:center; color:${EMAIL_BASE_STYLES.accent}; font-weight:700; letter-spacing:1px;">
                NELVYON
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:${EMAIL_BASE_STYLES.text};">${title}</h1>
                <p style="margin:0 0 16px; color:#D1D5DB; line-height:1.6;">${intro}</p>
                ${contentHtml}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px; border-top:1px solid #232336; color:#9CA3AF; font-size:12px; text-align:center;">
                © 2026 NELVYON
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

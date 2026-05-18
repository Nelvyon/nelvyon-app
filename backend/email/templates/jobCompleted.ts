import { renderBaseEmail } from "./_base";

function truncateSummary(summary: string): string {
  const t = summary.trim();
  return t.length <= 300 ? t : `${t.slice(0, 300)}...`;
}

export function jobCompletedTemplate(name: string, serviceId: string, jobId: string, summary: string, jobUrl: string): string {
  return renderBaseEmail(
    `Tu servicio ${serviceId} esta listo`,
    `Hola ${name}, NELVYON OS ha completado tu servicio.`,
    `<p style="margin:0 0 10px; color:#D1D5DB;">Resumen:</p>
     <div style="background:#171726; border:1px solid #2A2A3D; border-radius:8px; padding:12px; color:#E5E7EB; font-size:14px; line-height:1.5;">
       ${truncateSummary(summary)}
     </div>
     <p style="margin:12px 0 0; color:#9CA3AF; font-size:12px;">Job ID: ${jobId}</p>`,
    "Ver resultado",
    jobUrl,
  );
}

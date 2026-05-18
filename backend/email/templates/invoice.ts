import { renderBaseEmail } from "./_base";

export function invoiceTemplate(name: string, plan: string, amount: number, invoiceUrl: string): string {
  const today = new Date().toLocaleDateString("es-ES");
  return renderBaseEmail(
    `Factura NELVYON - Plan ${plan}`,
    `Hola ${name}, aqui tienes el detalle de tu factura.`,
    `<ul style="margin:0; padding-left:18px; color:#D1D5DB; line-height:1.6;">
       <li>Plan: ${plan}</li>
       <li>Importe: €${amount.toFixed(2)}</li>
       <li>Fecha: ${today}</li>
     </ul>`,
    "Ver factura",
    invoiceUrl,
  );
}

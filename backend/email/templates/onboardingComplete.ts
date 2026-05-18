import { renderBaseEmail } from "./_base";

export function onboardingCompleteTemplate(name: string, companyName: string, dashboardUrl: string): string {
  return renderBaseEmail(
    `${companyName} esta lista en NELVYON`,
    `Hola ${name}, tu empresa ${companyName} esta configurada. El OS esta listo para trabajar.`,
    `<p style="margin:0; color:#D1D5DB;">Ya puedes lanzar servicios, flujos y campanas desde tu panel.</p>`,
    "Ir al dashboard",
    dashboardUrl,
  );
}

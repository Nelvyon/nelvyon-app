import { renderBaseEmail } from "./_base";

export function welcomeTemplate(name: string, companyName: string, onboardingUrl: string): string {
  return renderBaseEmail(
    `Bienvenido a NELVYON, ${name}`,
    `Tu cuenta en ${companyName} esta activa. Completa tu onboarding para empezar.`,
    `<p style="margin:0; color:#D1D5DB;">Activa tu espacio y configura tus primeros servicios premium.</p>`,
    "Ir al onboarding",
    onboardingUrl,
  );
}

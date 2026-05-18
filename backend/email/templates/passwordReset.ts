import { renderBaseEmail } from "./_base";

export function passwordResetTemplate(name: string, resetUrl: string): string {
  return renderBaseEmail(
    "Restablece tu contrasena NELVYON",
    `Hola ${name}, has solicitado restablecer tu contrasena.`,
    `<p style="margin:0; color:#D1D5DB;">Este enlace expira en 1 hora.</p>`,
    "Restablecer contrasena",
    resetUrl,
  );
}

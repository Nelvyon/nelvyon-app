import type { OsClientCreateInput } from "@/features/os-shell/clients/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClientForm(form: OsClientCreateInput): string | null {
  if (!form.business_name?.trim()) return "El nombre del negocio es obligatorio.";
  const email = form.contact_email?.trim();
  if (email && !EMAIL_RE.test(email)) return "El email de contacto no es válido.";
  const web = form.website_url?.trim();
  if (web && !/^https?:\/\/.+/i.test(web) && !web.includes(".")) {
    return "La URL web debe ser válida (https://…).";
  }
  return null;
}

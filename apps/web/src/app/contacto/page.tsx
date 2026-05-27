import type { Metadata } from "next";

import { NelvyonContactoPage } from "@/components/nelvyon-marketing/pages/contacto-page";

export const metadata: Metadata = {
  title: "Contacto — NELVYON",
  description: "Contacta con NELVYON. Respuesta en menos de 24h. soporte@nelvyon.com — Madrid, España.",
};

export default function ContactoRoutePage() {
  return <NelvyonContactoPage />;
}

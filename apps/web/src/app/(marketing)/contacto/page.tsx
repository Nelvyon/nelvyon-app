import type { Metadata } from "next";

import { ContactFull } from "@/components/pa/marketing/contact-full";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contacto | NELVYON",
  description:
    "Formulario, email, WhatsApp y calendario. Contacta con NELVYON para servicios o plan SaaS.",
};

export default function ContactoPage() {
  return <ContactFull />;
}

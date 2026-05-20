import type { Metadata } from "next";

import { ContactPageContent } from "@/components/marketing/premium/ContactPageContent";
import { getAppBaseUrl } from "@/lib/appUrl";

const base = getAppBaseUrl();

export const metadata: Metadata = {
  title: "Contacto — NELVYON",
  description: "Habla con el equipo NELVYON. Respondemos en menos de 24 horas laborables.",
  openGraph: {
    url: `${base}/contacto`,
    title: "Contacto — NELVYON",
    description: "Habla con el equipo NELVYON.",
  },
};

export default function ContactoPage() {
  return <ContactPageContent />;
}

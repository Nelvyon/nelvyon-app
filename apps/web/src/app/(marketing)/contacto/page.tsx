import type { Metadata } from "next";

import { NvContactoPage } from "@/components/nelvyon-marketing/pages/contacto-page";

export const metadata: Metadata = {
  title: "Contacto | NELVYON",
  description: "Contacta con NELVYON para estructurar marketing, ventas, automatización y reporting.",
};

export default function ContactoPage() {
  return <NvContactoPage />;
}

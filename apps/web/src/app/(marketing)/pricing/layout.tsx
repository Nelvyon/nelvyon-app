import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getAppBaseUrl } from "@/lib/appUrl";

const base = getAppBaseUrl();

const desc =
  "Planes desde 47€/mes. Starter, Pro y Agency con IA para marketing automatizado. Precios early adopter disponibles hasta el lanzamiento.";

export const metadata: Metadata = {
  title: "Precios — NELVYON",
  description: desc,
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: `${base}/pricing`,
    siteName: "NELVYON",
    title: "Precios — NELVYON",
    description: desc,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "NELVYON — Precios" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Precios — NELVYON",
    description: desc,
    images: ["/og-image.png"],
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/agenforce/footer";
import { Navbar } from "@/components/navbar";
import { getAppBaseUrl } from "@/lib/appUrl";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Marketing operativo para empresas exigentes",
  description:
    "Plataforma operativa de marketing, ventas y automatización con servicios profesionales y agentes expertos. Centraliza campañas, CRM, contenidos y reporting.",
  openGraph: {
    title: "NELVYON — Plataforma operativa de marketing",
    description:
      "Donde nace tu imperio, crece tu marca y se impone tu legado. Servicios profesionales, SaaS y agentes expertos para operar con orden y continuidad.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: "NELVYON — Plataforma operativa de marketing",
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Plataforma operativa de marketing",
    description: "Marketing operativo con agentes expertos. Servicios y plataforma SaaS.",
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('DOMContentLoaded',function(){const els=document.querySelectorAll('.fade-in');const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible')}),{threshold:0.1});els.forEach(el=>obs.observe(el))});",
        }}
      />
    </>
  );
}

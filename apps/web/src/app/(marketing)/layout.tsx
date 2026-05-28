import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/agenforce/footer";
import { Navbar } from "@/components/navbar";
import { getAppBaseUrl } from "@/lib/appUrl";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Donde nace tu imperio",
  description:
    "Donde nace tu imperio, crece tu marca y se impone tu legado. Sistema autónomo de marketing con IA: SEO, publicidad, contenido, email, branding y social media.",
  openGraph: {
    title: "NELVYON — Marketing autónomo con IA",
    description:
      "Donde nace tu imperio, crece tu marca y se impone tu legado. Plataforma SaaS premium de marketing con agentes IA.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: "NELVYON — Marketing IA Autónomo",
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Marketing IA Autónomo",
    description: "Marketing IA autónomo. Planes desde 95€/mes.",
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

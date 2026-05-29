import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NvFooter } from "@/components/nelvyon-marketing/footer";
import { NvNavbar } from "@/components/nelvyon-marketing/navbar";
import { getAppBaseUrl } from "@/lib/appUrl";

import "@/styles/nelvyon-marketing.css";

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — Plataforma operativa de marketing y automatización",
  description:
    "Centraliza marketing, ventas, automatización y operación digital con NELVYON. Plataforma SaaS y servicios profesionales.",
  openGraph: {
    title: "NELVYON — Plataforma operativa de marketing",
    description:
      "Centraliza marketing, ventas, automatización y operación digital con NELVYON.",
    url: canonicalBase,
    siteName: "NELVYON",
    images: [
      {
        url: ogImageAbs,
        width: 1200,
        height: 630,
        alt: "NELVYON",
      },
    ],
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "NELVYON — Plataforma operativa de marketing",
    description: "Marketing, ventas y automatización en un entorno centralizado.",
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
    <div className="nv-mkt">
      <NvNavbar />
      {children}
      <NvFooter />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('DOMContentLoaded',function(){const sel='.nv-fade,.fade-in';const els=document.querySelectorAll(sel);const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible')}),{threshold:0.08});els.forEach(el=>obs.observe(el))});",
        }}
      />
    </div>
  );
}

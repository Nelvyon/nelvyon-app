import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Mono, Geist_Mono, Inter } from "next/font/google";

import { MarketingChrome } from "@/components/marketing/MarketingChrome";
import { getAppBaseUrl } from "@/lib/appUrl";

import "@/styles/nelvyon-enterprise.css";
import "@/styles/productized-agency.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["300", "400", "500"] });

const canonicalBase = getAppBaseUrl();
const ogImageAbs = `${canonicalBase}/og-image.png`;

export const metadata: Metadata = {
  title: "NELVYON — OS de marketing + packs autónomos",
  description:
    "Plataforma enterprise de marketing autónomo: packs listos para el cliente y un sistema operativo interno que ejecuta SEO, ads, funnels y entregables a escala.",
  openGraph: {
    title: "NELVYON — SaaS, marketing, automatización e IA",
    description:
      "SaaS, marketing, automatización e IA en un sistema operativo para negocios modernos.",
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
    description: "SaaS, marketing, automatización e IA para crecer con orden.",
    images: [ogImageAbs],
    creator: "@nelvyon",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingRouteLayout({ children }: { children: ReactNode }) {
  return (
    <section lang="es" className={`${inter.variable} ${geistMono.variable} ${dmMono.variable} nelvyon-enterprise-theme`}>
      <MarketingChrome>{children}</MarketingChrome>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('DOMContentLoaded',function(){const sel='.fade-in,.nv-fade';const els=document.querySelectorAll(sel);const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible')}),{threshold:0.08});els.forEach(el=>obs.observe(el))});",
        }}
      />
    </section>
  );
}

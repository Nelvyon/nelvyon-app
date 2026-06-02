import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Mono, Geist_Mono, Inter } from "next/font/google";

import { Footer } from "@/components/pa/footer";
import { Navbar } from "@/components/pa/navbar";
import { getAppBaseUrl } from "@/lib/appUrl";

import "@/styles/productized-agency.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["300", "400", "500"] });

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

export default function MarketingRouteLayout({ children }: { children: ReactNode }) {
  return (
    <section lang="es" className={`${inter.variable} ${geistMono.variable} ${dmMono.variable} pa-theme`}>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('DOMContentLoaded',function(){const sel='.fade-in,.nv-fade';const els=document.querySelectorAll(sel);const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible')}),{threshold:0.08});els.forEach(el=>obs.observe(el))});",
        }}
      />
    </section>
  );
}

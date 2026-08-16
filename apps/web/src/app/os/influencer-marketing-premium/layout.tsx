import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const plusJakarta = localFont({
  src: "../../../fonts/plus-jakarta-sans-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-influencer-marketing-premium",
});

export default function OsInfluencerMarketingPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${plusJakarta.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const playfair = localFont({
  src: "../../../fonts/playfair-display-latin-variable.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--font-fotografia-producto-premium",
});

export default function OsFotografiaProductoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${playfair.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

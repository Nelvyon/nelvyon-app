import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const newsreader = localFont({
  src: "../../../fonts/newsreader-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-contenido-copywriting-premium",
});

export default function OsContenidoCopywritingPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${newsreader.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

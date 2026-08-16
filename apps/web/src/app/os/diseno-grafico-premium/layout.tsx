import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const outfit = localFont({
  src: "../../../fonts/outfit-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-diseno-grafico-premium",
});

export default function OsDisenoGraficoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${outfit.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

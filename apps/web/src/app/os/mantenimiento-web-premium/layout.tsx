import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const manrope = localFont({
  src: "../../../fonts/manrope-latin-variable.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--font-mantenimiento-web-premium",
});

export default function OsMantenimientoWebPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${manrope.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const ibmPlexSans = localFont({
  src: "../../../fonts/ibm-plex-sans-latin-variable.woff2",
  weight: "100 700",
  style: "normal",
  display: "swap",
  variable: "--font-consultoria-automatizacion-premium",
});

export default function OsConsultoriaAutomatizacionPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${ibmPlexSans.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

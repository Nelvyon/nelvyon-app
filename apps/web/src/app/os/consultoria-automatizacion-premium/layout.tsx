import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

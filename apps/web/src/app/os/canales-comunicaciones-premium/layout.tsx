import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const sora = localFont({
  src: "../../../fonts/sora-latin-variable.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-canales-comunicaciones-premium",
});

export default function OsCanalesComunicacionesPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${sora.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

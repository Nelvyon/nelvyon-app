import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const jetbrainsMono = localFont({
  src: "../../../fonts/jetbrains-mono-latin-variable.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-integraciones-apis-premium",
});

export default function OsIntegracionesApisPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${jetbrainsMono.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

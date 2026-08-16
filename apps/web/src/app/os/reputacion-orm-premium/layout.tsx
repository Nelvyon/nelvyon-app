import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const lora = localFont({
  src: "../../../fonts/lora-latin-variable.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-reputacion-orm-premium",
});

export default function OsReputacionOrmPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${lora.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

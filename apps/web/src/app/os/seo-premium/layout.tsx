import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const sourceSans = localFont({
  src: "../../../fonts/source-sans-3-latin-variable.woff2",
  weight: "200 900",
  style: "normal",
  display: "swap",
  variable: "--font-seo-premium",
});

export default function OsSeoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${sourceSans.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

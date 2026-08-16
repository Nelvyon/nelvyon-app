import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const figtree = localFont({
  src: "../../../fonts/figtree-latin-variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-bots-premium",
});

export default function OsBotsPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${figtree.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const exo2 = localFont({
  src: "../../../fonts/exo-2-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-3d-inmersivo-premium",
});

export default function Os3dInmersivoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${exo2.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

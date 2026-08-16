import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const inter = localFont({
  src: "../../../fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-web-premium",
});

/** Scoped typography for premium marketing previews under /os/web-premium. */
export default function OsWebPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${inter.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

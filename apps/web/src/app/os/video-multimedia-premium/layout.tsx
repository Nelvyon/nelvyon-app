import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Autoalojada: el build no debe depender de que Google sirva la fuente. Ver
// `src/fonts/README.md`.
const spaceGrotesk = localFont({
  src: "../../../fonts/space-grotesk-latin-variable.woff2",
  weight: "300 700",
  style: "normal",
  display: "swap",
  variable: "--font-video-multimedia-premium",
});

export default function OsVideoMultimediaPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${spaceGrotesk.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import type { ReactNode } from "react";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-contenido-copywriting-premium",
});

export default function OsContenidoCopywritingPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${newsreader.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fotografia-producto-premium",
});

export default function OsFotografiaProductoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${playfair.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

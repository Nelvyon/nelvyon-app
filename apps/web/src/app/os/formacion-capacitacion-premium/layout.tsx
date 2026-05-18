import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import type { ReactNode } from "react";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-formacion-capacitacion-premium",
});

export default function OsFormacionCapacitacionPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${figtree.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

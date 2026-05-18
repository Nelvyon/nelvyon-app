import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-personal-digital-premium",
});

export default function OsPersonalDigitalPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${outfit.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

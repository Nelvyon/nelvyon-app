import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ads-premium",
});

export default function OsAdsPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${outfit.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
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

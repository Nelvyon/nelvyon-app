import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ecommerce-premium",
});

export default function OsEcommercePremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${dmSans.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

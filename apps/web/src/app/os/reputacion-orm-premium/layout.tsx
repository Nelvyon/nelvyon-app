import type { Metadata } from "next";
import { Lora } from "next/font/google";
import type { ReactNode } from "react";

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-reputacion-orm-premium",
});

export default function OsReputacionOrmPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${lora.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

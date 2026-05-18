import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
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

import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import type { ReactNode } from "react";

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-social-media-premium",
});

export default function OsSocialMediaPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${lexend.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

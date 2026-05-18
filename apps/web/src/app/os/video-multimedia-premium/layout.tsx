import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-video-multimedia-premium",
});

export default function OsVideoMultimediaPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${spaceGrotesk.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

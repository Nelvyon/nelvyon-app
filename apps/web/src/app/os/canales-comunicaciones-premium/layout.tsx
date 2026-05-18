import type { Metadata } from "next";
import { Sora } from "next/font/google";
import type { ReactNode } from "react";

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-canales-comunicaciones-premium",
});

export default function OsCanalesComunicacionesPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${sora.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

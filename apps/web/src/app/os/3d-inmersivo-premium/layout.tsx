import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import type { ReactNode } from "react";

const exo2 = Exo_2({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-3d-inmersivo-premium",
});

export default function Os3dInmersivoPremiumLayout({ children }: { children: ReactNode }) {
  return <div className={`${exo2.className}`}>{children}</div>;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

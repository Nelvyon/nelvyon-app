import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SaasPwaInstallPrompt } from "@/features/saas-shell/components/SaasPwaInstallPrompt";

export const metadata: Metadata = {
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Nelvyon",
    "mobile-web-app-capable": "yes",
  },
};

export default function SaasLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="manifest" href="/manifest-saas.json" />
      <meta name="theme-color" content="#0084ff" />
      {children}
      <SaasPwaInstallPrompt />
    </>
  );
}

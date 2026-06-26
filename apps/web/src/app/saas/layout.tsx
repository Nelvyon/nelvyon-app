import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SaasPwaInstallPrompt } from "@/features/saas-shell/components/SaasPwaInstallPrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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
      {/* Dynamic white-label manifest; static file remains as fallback target */}
      <link rel="manifest" href="/api/saas/pwa/manifest" />
      <meta name="theme-color" content="#0084ff" />
      <ServiceWorkerRegister />
      {children}
      <SaasPwaInstallPrompt />
    </>
  );
}

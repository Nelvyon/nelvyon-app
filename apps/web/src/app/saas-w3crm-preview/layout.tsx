/**
 * Fase 0 — ruta aislada para validar la plantilla oficial W3CRM sobre
 * Next 15 + React 19. NO toca ninguna ruta /saas existente.
 *
 * El CSS de W3CRM (`/w3crm/css/style.css`) trae Bootstrap 5 compilado dentro y
 * choca con el preflight de Tailwind. Se carga con <link> en lugar de `import`
 * para que solo afecte a este árbol y no entre en el bundle global.
 */
import type { Metadata } from "next";

import ThemeContextProvider from "@/features/saas-w3crm/context/ThemeContext";
import Layout from "@/features/saas-w3crm/layouts/Layout";

export const metadata: Metadata = {
  title: "W3CRM · prueba de compatibilidad — NELVYON",
  robots: { index: false, follow: false },
};

export default function W3crmPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/style.css" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/comman.css" />
      <div className="w3crm-scope">
        <ThemeContextProvider>
          <Layout>{children}</Layout>
        </ThemeContextProvider>
      </div>
    </>
  );
}

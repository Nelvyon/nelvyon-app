/**
 * Fase 1 — ruta de validación del shell W3CRM con la navegación REAL de NELVYON.
 * NO sustituye todavía ninguna página de /saas.
 *
 * El CSS de W3CRM (`/w3crm/css/style.css`) trae Bootstrap 5 compilado dentro y
 * choca con el preflight de Tailwind. Se carga con <link> en lugar de `import`
 * para que solo afecte a este árbol y no entre en el bundle global.
 */
import type { Metadata } from "next";

import ThemeContextProvider from "@/features/saas-w3crm/context/ThemeContext";
import Layout from "@/features/saas-w3crm/layouts/Layout";
import { buildNelvyonMenu } from "@/features/saas-w3crm/layouts/nav/nelvyonMenu";

export const metadata: Metadata = {
  title: "W3CRM · validación de shell — NELVYON",
  robots: { index: false, follow: false },
};

export default function W3crmPreviewLayout({ children }: { children: React.ReactNode }) {
  // Navegación real desde saasNav.ts. Sin filtro de permisos aquí: esta ruta no
  // vive bajo el proveedor de sesión; el filtrado se conecta al migrar /saas/*.
  const menuList = buildNelvyonMenu();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/style.css" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/comman.css" />
      <div className="w3crm-scope">
        <ThemeContextProvider>
          <Layout menuList={menuList}>{children}</Layout>
        </ThemeContextProvider>
      </div>
    </>
  );
}

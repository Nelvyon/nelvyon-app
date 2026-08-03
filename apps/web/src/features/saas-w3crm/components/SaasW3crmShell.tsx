"use client";

/**
 * Shell SaaS sobre la plantilla oficial W3CRM.
 *
 * Sustituye a `SaasShellLayout` + `SaasSidebar` como capa VISUAL, conservando
 * intacta la lógica de NELVYON:
 *   - sesión y tenant → `useSaasPermissions`
 *   - permisos / RBAC → `filterSaasNavForPermissions` (misma función que usaba
 *     `SaasSidebar`, así que un usuario ve exactamente los mismos módulos)
 *   - i18n            → `useTranslations`, con las mismas claves
 *     `items.<id>` y `groups.<id>` y los mismos textos por defecto
 *   - navegación      → `saasNav.ts` sigue siendo la única fuente de verdad
 *
 * El marcado y las clases son los de la plantilla; aquí solo se le inyectan datos.
 */
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { filterSaasNavForPermissions, SAAS_NAV_ITEMS, type SaasNavItem } from "@/features/saas-shell/saasNav";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import ThemeContextProvider from "@/features/saas-w3crm/context/ThemeContext";
import Layout from "@/features/saas-w3crm/layouts/Layout";
import { buildNelvyonMenu } from "@/features/saas-w3crm/layouts/nav/nelvyonMenu";

export function SaasW3crmShell({ children }: { children: React.ReactNode }) {
  // Mismo namespace que usaba SaasSidebar: las claves son saas.nav.items.* / saas.nav.groups.*
  const t = useTranslations("saas.nav");
  const { permissions, loading } = useSaasPermissions();

  // `useSaasPermissions` devuelve un array nuevo en cada render cuando aun no
  // hay datos, asi que se memoiza sobre una clave estable. Sin esto el menu se
  // reconstruia en cada render y el efecto del SideBar que abre el grupo activo
  // se reejecutaba en bucle, perdiendo el estado.
  const clavePermisos = permissions.join("|");

  const menuList = useMemo(() => {
    // Mientras carga la sesión no se adelantan módulos: mismo criterio que
    // `SaasSidebar`, que espera a `permissions` antes de filtrar.
    const items: readonly SaasNavItem[] = loading
      ? SAAS_NAV_ITEMS
      : filterSaasNavForPermissions(permissions);

    return buildNelvyonMenu({
      items,
      translateItem: (item) => t(`items.${item.id}`, { defaultMessage: item.label }),
      translateGroup: (groupId) => t(`groups.${groupId}`, { defaultMessage: groupId }),
    });
  }, [loading, clavePermisos, t]);

  return (
    <>
      {/* El CSS de W3CRM trae Bootstrap 5 dentro; se carga con <link> para que
          no entre en el bundle global ni lo pise el preflight de Tailwind. */}
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

export default SaasW3crmShell;

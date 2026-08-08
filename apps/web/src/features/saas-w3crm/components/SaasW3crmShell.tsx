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

import { PlatformHealthBanner } from "@/features/saas-shell/components/PlatformHealthBanner";
import { SaasVoiceCommand } from "@/features/saas-shell/components/SaasVoiceCommand";
import { filterSaasNavForPermissions, type SaasNavItem } from "@/features/saas-shell/saasNav";
import { useSaasPermissions } from "@/features/saas-shell/useSaasPermissions";
import ThemeContextProvider from "@/features/saas-w3crm/context/ThemeContext";
import Layout from "@/features/saas-w3crm/layouts/Layout";
import { buildNelvyonMenu } from "@/features/saas-w3crm/layouts/nav/nelvyonMenu";

// Convivencia Tailwind v4 / Bootstrap 5 dentro del scope (ver el propio fichero).
import "@/features/saas-w3crm/w3crmScope.css";

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
    /**
     * Mientras carga la sesión NO se revela ningún módulo.
     *
     * Antes se pintaba `SAAS_NAV_ITEMS` entero durante la carga y solo después
     * se filtraba, así que un usuario con permisos parciales veía durante unos
     * milisegundos los 59 módulos —incluidos los que no tiene autorizados— y
     * luego desaparecían. Medido: 52 enlaces con permisos completos, 40 con
     * parciales y 25 sin sesión; esa diferencia era exactamente lo que se
     * filtraba a la vista.
     *
     * La lista vacía es el único estado que no puede revelar nada. No duplica
     * RBAC ni codifica permisos: `saasNav.ts` sigue siendo la única fuente de
     * verdad y `filterSaasNavForPermissions` la única autoridad. Tampoco añade
     * CLS: el sidebar es `position: fixed` con su anchura fijada por CSS, así
     * que su contenido no empuja al contenido principal.
     */
    const items: readonly SaasNavItem[] = loading
      ? []
      : filterSaasNavForPermissions(permissions);

    return buildNelvyonMenu({
      items,
      translateItem: (item) => t(`items.${item.id}`, { defaultMessage: item.label }),
      translateGroup: (groupId) => t(`groups.${groupId}`, { defaultMessage: groupId }),
    });
  }, [loading, clavePermisos, t]);

  return (
    <>
      {/*
        El CSS de W3CRM trae Bootstrap 5 dentro; se carga con <link> para que no
        entre en el bundle global ni lo pise el preflight de Tailwind.

        `precedence` es lo que impide que estas hojas se reinserten. Sin él, al
        intercambiar React el subárbol transmitido (medido: `.w3crm-scope` pasa
        de 2 a 1 hacia los 390 ms) los `<link>` se eliminaban y se volvían a
        añadir, de modo que el navegador dejaba de aplicar la hoja durante ~350
        ms: `.deznav` perdía su `position:absolute; width:15rem` y medía 1440 px,
        y `.content-body` perdía su `margin-left`. Al volver la hoja,
        `transition: all .2s ease` (style.css:13416) ANIMABA la corrección, y
        cada fotograma era un layout-shift de un elemento del tamaño del
        viewport: ~15 shifts encadenados y CLS ≈ 2,2 en las 77 páginas del shell.

        Con `precedence`, React 19 las eleva a <head>, las deduplica y las
        mantiene estables durante todo el streaming. Ambas siguen cargándose
        DESPUÉS del bundle de Tailwind, así que el orden relativo de la cascada
        no cambia: lo único que desaparece es el hueco sin hoja.
      */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/style.css" precedence="w3crm" />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/w3crm/css/comman.css" precedence="w3crm" />
      <div className="w3crm-scope">
        <ThemeContextProvider>
          <Layout menuList={menuList}>
            {/* Dos piezas que `SaasShellLayout` montaba en TODAS las paginas
                SaaS y que este shell se habia dejado por el camino: el banner
                de salud de plataforma y el FAB global de comando de voz
                (`aria-label="Comando de voz"`, que exige
                `saas-voice-command.spec.ts:61`). Sin ellas los modulos ya
                migrados perdian ambas funciones; ningun test lo detectaba
                porque el unico que las cubre apunta a `/saas/voice`, que
                seguia sin migrar. La capa visual es W3CRM, pero NELVYON tiene
                que seguir completo por dentro. */}
            <PlatformHealthBanner />
            {children}
            <SaasVoiceCommand />
          </Layout>
        </ThemeContextProvider>
      </div>
    </>
  );
}

export default SaasW3crmShell;

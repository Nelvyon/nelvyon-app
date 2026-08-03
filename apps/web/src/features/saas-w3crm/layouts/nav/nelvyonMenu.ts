/**
 * Adaptador: navegación real de NELVYON → estructura de menú de W3CRM.
 *
 * No toca el marcado de la plantilla. `SideBar` sigue siendo el original;
 * aquí solo se le entregan los datos en la forma que ya espera (`W3crmMenuItem`).
 *
 * La fuente de verdad sigue siendo `saasNav.ts`: mismos ids, mismas rutas,
 * mismos permisos y el mismo orden de grupos que usa `SaasSidebar`.
 */
import { SVGICON } from "@/features/saas-w3crm/constant/theme";
import type { W3crmMenuItem } from "@/features/saas-w3crm/layouts/nav/Menu";
import { SAAS_NAV_ITEMS, type SaasNavItem } from "@/features/saas-shell/saasNav";

/** Mismo orden que `SaasSidebar` para no alterar la jerarquía conocida. */
export const NELVYON_GROUP_ORDER = [
  "principal",
  "comunicacion",
  "captacion",
  "gestion",
  "ia",
  "cuenta",
] as const;

/** Etiqueta por defecto de cada grupo (i18n las sobrescribe cuando hay proveedor). */
const GROUP_LABEL: Record<string, string> = {
  principal: "Principal",
  comunicacion: "Comunicación",
  captacion: "Captación",
  gestion: "Gestión",
  ia: "IA NELVYON",
  cuenta: "Cuenta",
};

/** Icono de la plantilla asignado a cada grupo (iconos originales de W3CRM). */
const GROUP_ICON: Record<string, unknown> = {
  principal: SVGICON.Home,
  comunicacion: SVGICON.Message,
  captacion: SVGICON.Performance,
  gestion: SVGICON.Apps,
  ia: SVGICON.AikitSvg,
  cuenta: SVGICON.User,
};

export type BuildMenuOptions = {
  /** Ítems ya filtrados por permisos (`filterSaasNavForPermissions`). */
  items?: readonly SaasNavItem[];
  /** Traductor opcional; si falta se usa el `label` del propio item. */
  translateItem?: (item: SaasNavItem) => string;
  translateGroup?: (groupId: string) => string;
};

/**
 * Construye el `MenuList` de W3CRM a partir de la navegación de NELVYON.
 * Cada grupo se convierte en un desplegable `mm-collapse`, que es el patrón
 * que la propia plantilla usa para sus secciones.
 */
export function buildNelvyonMenu(options: BuildMenuOptions = {}): W3crmMenuItem[] {
  const items = options.items ?? SAAS_NAV_ITEMS;
  const etiquetaItem = options.translateItem ?? ((i: SaasNavItem) => i.label);
  const etiquetaGrupo = options.translateGroup ?? ((g: string) => GROUP_LABEL[g] ?? g);

  const porGrupo = new Map<string, SaasNavItem[]>();
  for (const item of items) {
    const g = item.group ?? "principal";
    const lista = porGrupo.get(g);
    if (lista) lista.push(item);
    else porGrupo.set(g, [item]);
  }

  const menu: W3crmMenuItem[] = [{ title: "NELVYON", classsChange: "menu-title" }];

  for (const grupo of NELVYON_GROUP_ORDER) {
    const deGrupo = porGrupo.get(grupo);
    if (!deGrupo?.length) continue;
    menu.push({
      title: etiquetaGrupo(grupo),
      classsChange: "mm-collapse",
      iconStyle: GROUP_ICON[grupo] as W3crmMenuItem["iconStyle"],
      content: deGrupo.map((item) => ({
        title: etiquetaItem(item),
        to: item.href,
      })),
    });
  }

  // Grupos que aparezcan en saasNav pero no estén en el orden conocido:
  // se añaden al final en vez de perderse silenciosamente.
  for (const [grupo, deGrupo] of porGrupo) {
    if ((NELVYON_GROUP_ORDER as readonly string[]).includes(grupo)) continue;
    menu.push({
      title: etiquetaGrupo(grupo),
      classsChange: "mm-collapse",
      iconStyle: SVGICON.Apps as W3crmMenuItem["iconStyle"],
      content: deGrupo.map((item) => ({ title: etiquetaItem(item), to: item.href })),
    });
  }

  return menu;
}

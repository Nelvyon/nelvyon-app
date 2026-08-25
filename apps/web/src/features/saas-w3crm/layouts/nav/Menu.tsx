import type { ReactNode } from "react";

/** Forma real de la estructura de menu de W3CRM (heterogenea por diseno). */
export type W3crmMenuItem = {
  title: string;
  classsChange?: string;
  iconStyle?: ReactNode;
  to?: string;
  hasMenu?: boolean;
  update?: string;
  content?: W3crmMenuItem[];
};

/*
 * Aqui vivia `MenuList`: 536 lineas con el menu de DEMOSTRACION de la
 * plantilla W3CRM (Dashboard, Profile 1, Add Role, /app-profile...). Solo lo
 * usaba `SideBar` como valor por defecto, y ese defecto ya no existe: el menu
 * real lo construye `buildNelvyonMenu` desde `saasNav.ts`, que es la unica
 * fuente de verdad de la navegacion.
 *
 * Se quita entero. `SideBar` importaba el VALOR, asi que ese array de otro
 * producto viajaba en el bundle de las 75 pantallas del panel.
 */

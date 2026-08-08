"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

import { AIOR_NELVYON_ROUTES } from "@/features/public-web/aiorNelvyonRoutes";

/**
 * Enlace de la web publica.
 *
 * Buena parte de las rutas limpias no las sirve el router de Next: acaban en
 * una pagina estatica del pack AIOR (`/www/*.html`), por rewrite en el caso de
 * `/` o por redireccion en el resto. `next/link` las prefetchea igualmente y
 * recibe HTML donde espera un payload RSC, asi que cada pagina que las
 * enlazaba emitia en consola "Failed to fetch RSC payload ... Falling back to
 * browser navigation". La navegacion funcionaba, pero ensuciaba la consola y
 * gastaba una peticion inutil por enlace.
 *
 * Para esas rutas se renderiza un `<a>` normal, que es lo semanticamente
 * correcto: desde el punto de vista del router son documentos externos. El
 * resto sigue usando `next/link` y conserva su prefetch.
 */

/** Rutas cuyo destino final es una pagina estatica del pack. */
const RUTAS_DEL_PACK: ReadonlySet<string> = new Set<string>([
  ...AIOR_NELVYON_ROUTES.map((r) => r.source),
  // Alias y slugs que encadenan hasta el mismo destino estatico.
  "/plataforma",
  "/pricing",
  "/enterprise",
  "/agencia-ia",
  "/agencia/contenido",
  "/producto/ia",
  "/producto/agentes",
  "/producto/cloud",
]);

export function esRutaDelPack(href: string): boolean {
  const limpio = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  return RUTAS_DEL_PACK.has(limpio) || limpio.startsWith("/www/");
}

type Props = ComponentProps<typeof NextLink>;

export function EnlacePublico({
  href,
  children,
  prefetch,
  replace,
  scroll,
  ...resto
}: Props) {
  const destino = typeof href === "string" ? href : null;

  // Las props exclusivas del router (`prefetch`, `replace`, `scroll`) no se
  // reenvian al `<a>`: no son atributos HTML validos.
  if (destino && esRutaDelPack(destino)) {
    return (
      <a href={destino} {...resto}>
        {children}
      </a>
    );
  }

  return (
    <NextLink href={href} prefetch={prefetch} replace={replace} scroll={scroll} {...resto}>
      {children}
    </NextLink>
  );
}

export default EnlacePublico;

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Lo unico que este manejador necesita de una respuesta.
 *
 * Se declara asi, y no como `NextApiResponse`, porque es LA VERDAD: solo pone
 * un codigo y escribe un cuerpo. `NextApiResponse` es una `ServerResponse` de
 * Node entera —decenas de miembros, sockets incluidos— y exigirla obligaba a
 * las pruebas a convertir su doble a la fuerza para poder llamar a la ruta.
 *
 * No se pierde nada: `NextApiResponse` cumple esta forma, asi que Next sigue
 * pudiendo invocar el manejador igual que antes.
 */
export type RespuestaMinima = {
  status(codigo: number): { json(cuerpo: unknown): unknown };
};

/**
 * Handler for deprecated pages/api/saas routes.
 * All SaaS API surface has moved to /api/saas/* (Next.js App Router).
 */
export function deprecatedRoute(appRouterPath: string) {
  return function handler(_req: NextApiRequest, res: RespuestaMinima) {
    return res.status(410).json({
      error: "Deprecated. Use /api/saas/...",
      migration: appRouterPath,
    });
  };
}

/** Next.js pages typegen expects a default export for files under pages/api. */
const manejadorPorDefecto: (req: NextApiRequest, res: NextApiResponse) => unknown =
  deprecatedRoute("/api/saas");
export default manejadorPorDefecto;

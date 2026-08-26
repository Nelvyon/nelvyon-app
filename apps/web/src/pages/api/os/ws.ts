import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

import { getWsNotifierSingleton, initOsNotifier, osEventBus } from "@nelvyon/os-agents";

export const config = { api: { bodyParser: false } };

type AugmentedServer = HttpServer & {
  __nelvyonOsWss?: WebSocketServer;
  __nelvyonOsWsUpgradePrepended?: boolean;
};

const COOKIE_SESION = "nelvyon_token";

/**
 * Lee la cookie por su nombre EXACTO.
 *
 * Con un `includes`, `nelvyon_token_x` y `xnelvyon_token` pasarían por la buena.
 * Es el mismo criterio que en `AuthMiddleware`, reescrito aquí porque el oyente
 * de `upgrade` no recibe un `Request`, sino una petición de Node en crudo.
 */
function tokenDeLaCookie(cabecera: string | undefined): string | null {
  for (const trozo of (cabecera ?? "").split(";")) {
    const igual = trozo.indexOf("=");
    if (igual < 0) continue;
    if (trozo.slice(0, igual).trim() !== COOKIE_SESION) continue;
    const valor = trozo.slice(igual + 1).trim();
    return valor.length ? valor : null;
  }
  return null;
}

export type ResolucionWs = { ok: true; clientId: string } | { ok: false; motivo: string };

/**
 * ¿Puede esta petición escuchar el canal en vivo que pide?
 *
 * Vive fuera del oyente de `upgrade` a propósito: una defensa que no se puede
 * llamar desde una prueba es una defensa que no se puede certificar.
 *
 * ANTES NO EXISTÍA. La subida de conexión cogía `clientId` de la barra de
 * direcciones y registraba el socket: sin cookie, sin token, sin comprobar nada.
 * Y `clientId` **es el identificador del inquilino** —lo pasa el propio
 * frontend—, así que cualquiera que conociera el id de un cliente recibía todos
 * sus eventos de ejecución. Peor aún: `registerClient` cierra la conexión
 * anterior del mismo `clientId`, de modo que el atacante además echaba a la
 * víctima de su propio canal y se quedaba con él.
 *
 * El WebSocket es del MISMO ORIGEN, así que el navegador manda la cookie de
 * sesión en la subida de conexión aunque sea `sameSite: "strict"`. No hace falta
 * inventar un ticket aparte.
 */
export async function resolverClienteDeWs(
  rawUrl: string,
  cookies: string | undefined,
): Promise<ResolucionWs> {
  if (!rawUrl.startsWith("/api/os/ws")) return { ok: false, motivo: "otra ruta" };

  let clientId = "";
  try {
    clientId = (new URL(rawUrl, "http://localhost").searchParams.get("clientId") ?? "").trim();
  } catch {
    return { ok: false, motivo: "url invalida" };
  }
  if (!clientId || clientId === "undefined" || clientId === "null") {
    return { ok: false, motivo: "sin clientId" };
  }

  const token = tokenDeLaCookie(cookies);
  if (!token) return { ok: false, motivo: "sin sesion" };

  try {
    const { getAuthService } = await import("@nelvyon/auth");
    const claims = await getAuthService().verifyToken(token);
    if (!claims?.tenantId) return { ok: false, motivo: "sesion sin inquilino" };
    // El canal que se pide tiene que ser el del inquilino de la sesión. Cierre
    // en falso: sin coincidencia no hay canal, y no se cae al propio en
    // silencio — una caída silenciosa haría creer al atacante que ha fallado
    // mientras el defecto sigue ahí.
    if (claims.tenantId !== clientId) return { ok: false, motivo: "inquilino ajeno" };
    return { ok: true, clientId };
  } catch {
    return { ok: false, motivo: "token invalido" };
  }
}

function ensureWssAttached(server: HttpServer): WebSocketServer {
  const s = server as AugmentedServer;
  if (!s.__nelvyonOsWss) {
    s.__nelvyonOsWss = new WebSocketServer({ noServer: true });
  }
  if (!s.__nelvyonOsWsUpgradePrepended) {
    s.__nelvyonOsWsUpgradePrepended = true;
    s.prependListener("upgrade", (req, socket, head) => {
      const rawUrl = req.url ?? "";
      if (!rawUrl.startsWith("/api/os/ws")) {
        return;
      }
      const wss = s.__nelvyonOsWss;
      if (!wss) {
        socket.destroy();
        return;
      }
      void resolverClienteDeWs(rawUrl, req.headers.cookie).then((r) => {
        if (!r.ok) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          initOsNotifier(osEventBus);
          getWsNotifierSingleton().registerClient(r.clientId, ws);
          ws.on("close", () => {
            getWsNotifierSingleton().unregisterClient(r.clientId);
          });
        });
      });
    });
  }
  return s.__nelvyonOsWss;
}

/**
 * Warm-up: registers the HTTP `upgrade` listener once so browser WebSockets to `/api/os/ws` work.
 * Next.js App Router GET on the same path would terminate upgrades; this handler lives in Pages API.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  const srv = (res.socket as unknown as { server?: HttpServer } | null | undefined)?.server;
  if (!srv) {
    res.status(500).json({ error: "Server unavailable" });
    return;
  }
  ensureWssAttached(srv);
  res.status(200).json({ ok: true });
}

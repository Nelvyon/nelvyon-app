import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HttpServer } from "node:http";
import { WebSocketServer } from "ws";

import { getWsNotifierSingleton, initOsNotifier, osEventBus } from "@nelvyon/os-agents";

export const config = { api: { bodyParser: false } };

type AugmentedServer = HttpServer & {
  __nelvyonOsWss?: WebSocketServer;
  __nelvyonOsWsUpgradePrepended?: boolean;
};

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
      const host = `http://${req.headers.host ?? "localhost"}`;
      let clientId = "";
      try {
        clientId = new URL(rawUrl, host).searchParams.get("clientId") ?? "";
      } catch {
        socket.destroy();
        return;
      }
      if (!clientId) {
        socket.destroy();
        return;
      }
      const wss = s.__nelvyonOsWss;
      if (!wss) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        initOsNotifier(osEventBus);
        getWsNotifierSingleton().registerClient(clientId, ws);
        ws.on("close", () => {
          getWsNotifierSingleton().unregisterClient(clientId);
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

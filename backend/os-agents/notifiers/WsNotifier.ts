import WebSocket from "ws";

import type { IWsNotifier, OsNotifierEvent, OsWsPeer } from "../types";

/** `ws` library: `WebSocket.OPEN` (RFC 6455 open state). */
const WS_OPEN = WebSocket.OPEN;

/**
 * Tracks one WebSocket per clientId and pushes JSON OsNotifierEvent payloads to connected dashboards.
 * Exists to decouple OS events from transport; uses the `ws` WebSocket implementation (Node has no first-party server WS).
 * Depends on `ws` types only at compile time; runtime `WebSocket` instances come from the HTTP upgrade handler.
 */
export class WsNotifier implements IWsNotifier {
  private readonly sockets = new Map<string, OsWsPeer>();

  registerClient(clientId: string, ws: OsWsPeer): void {
    const prev = this.sockets.get(clientId);
    if (prev && prev !== ws) {
      try {
        prev.close();
      } catch {
        /* ignore */
      }
    }
    this.sockets.set(clientId, ws);
  }

  unregisterClient(clientId: string): void {
    this.sockets.delete(clientId);
  }

  send(clientId: string, event: OsNotifierEvent): void {
    const ws = this.sockets.get(clientId);
    if (!ws || ws.readyState !== WS_OPEN) {
      console.info(`[WsNotifier] client offline, skip ws (clientId=${clientId})`);
      return;
    }
    ws.send(JSON.stringify(event));
  }
}

let wsSingleton: WsNotifier | undefined;

export function getWsNotifierSingleton(): WsNotifier {
  if (!wsSingleton) {
    wsSingleton = new WsNotifier();
  }
  return wsSingleton;
}

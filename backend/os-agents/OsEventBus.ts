import { EventEmitter } from "node:events";

import type {
  OsJobCompletedPayload,
  OsJobCreatedPayload,
  OsJobFailedPayload,
  OsJobProgressPayload,
  OsWorkerFailedPayload,
  OsWorkerProcessedPayload,
} from "./types";

type OsBusListenerMap = {
  "job:created": (payload: OsJobCreatedPayload) => void;
  "job:progress": (payload: OsJobProgressPayload) => void;
  "job:completed": (payload: OsJobCompletedPayload) => void;
  "job:failed": (payload: OsJobFailedPayload) => void;
  "worker:processed": (payload: OsWorkerProcessedPayload) => void;
  "worker:failed": (payload: OsWorkerFailedPayload) => void;
};

export type OsBusEventName = keyof OsBusListenerMap;

/**
 * Typed event bus for OS job lifecycle (WebSocket bridge in v2).
 */
export class OsEventBus extends EventEmitter {
  override on<K extends OsBusEventName>(event: K, listener: OsBusListenerMap[K]): this {
    return super.on(event, listener);
  }

  override once<K extends OsBusEventName>(event: K, listener: OsBusListenerMap[K]): this {
    return super.once(event, listener);
  }

  override off<K extends OsBusEventName>(event: K, listener: OsBusListenerMap[K]): this {
    return super.off(event, listener);
  }

  override emit<K extends OsBusEventName>(event: K, payload: Parameters<OsBusListenerMap[K]>[0]): boolean {
    return super.emit(event, payload);
  }

  subscribe<K extends OsBusEventName>(event: K, listener: OsBusListenerMap[K]): () => void {
    this.on(event, listener);
    return () => {
      this.off(event, listener);
    };
  }
}

export const osEventBus = new OsEventBus();

/**
 * Pub/sub for app toasts. `ToastProvider` subscribes and renders a portal stack;
 * features call `emitToast` or helpers in `toastFeedback.ts`.
 */

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastPayload {
  id: string;
  tone: ToastTone;
  message: string;
  title?: string;
}

type Listener = (payload: ToastPayload) => void;

const listeners = new Set<Listener>();

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitToast(payload: ToastPayload): void {
  listeners.forEach((fn) => {
    fn(payload);
  });
}

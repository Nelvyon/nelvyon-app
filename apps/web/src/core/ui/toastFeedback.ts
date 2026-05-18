import { emitToast, type ToastTone } from "@/core/ui/toastEvents";

function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function push(tone: ToastTone, message: string, title?: string): void {
  emitToast({ id: nextId(), tone, message, title });
}

export function toastSuccess(message: string, title?: string): void {
  push("success", message, title);
}

export function toastError(message: string, title?: string): void {
  push("error", message, title);
}

export function toastInfo(message: string, title?: string): void {
  push("info", message, title);
}

"use client";

import React, { useCallback, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { subscribeToasts, type ToastPayload } from "@/core/ui/toastEvents";
import { ToastItem } from "@/core/ui/ToastItem";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useLayoutEffect(() => {
    setMounted(true);
    return subscribeToasts((payload) => {
      setToasts((prev) => [...prev, payload]);
    });
  }, []);

  const stack =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-label="Notifications"
            className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 p-1"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} onDismiss={dismiss} toast={t} />
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {children}
      {stack}
    </>
  );
}

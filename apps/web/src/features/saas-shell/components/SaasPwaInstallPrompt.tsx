"use client";

import React, { useEffect, useState } from "react";

const LS_KEY = "saas-pwa-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function SaasPwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Never show in standalone mode
    if (isStandalone()) return;

    try {
      if (localStorage.getItem(LS_KEY) === "1") return;
    } catch {
      /* storage unavailable */
    }

    if (isIosSafari()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Instalar aplicación"
      className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 lg:left-auto lg:right-6 lg:inset-x-auto"
    >
      <div className="mx-auto max-w-sm rounded-2xl border border-white/[0.10] bg-[#020817]/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-[#0084ff]/20 flex items-center justify-center text-lg" aria-hidden="true">
              📱
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Instalar Nelvyon</p>
              {iosHint ? (
                <p className="text-xs text-white/55 mt-0.5">
                  Safari: Compartir → Añadir a pantalla de inicio
                </p>
              ) : (
                <p className="text-xs text-white/55 mt-0.5">
                  Accede al CRM como app nativa, sin navegador
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={dismiss}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            ✕
          </button>
        </div>
        {!iosHint && deferred && (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-3 w-full rounded-xl bg-[#0084ff] hover:bg-[#0073e0] active:bg-[#005fbb] text-white text-sm font-semibold py-2.5 transition-colors min-h-[44px]"
          >
            Instalar Nelvyon
          </button>
        )}
      </div>
    </div>
  );
}

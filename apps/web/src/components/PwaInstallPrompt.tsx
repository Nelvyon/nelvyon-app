"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/core/ui/button";

const LS_KEY = "nelvyon.pwa.install.dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    if (window.matchMedia("(display-mode: standalone)").matches) return;

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
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-border bg-card p-4 shadow-lg lg:bottom-6 lg:left-auto lg:right-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold">Instalar NELVYON en tu dispositivo</p>
          {iosHint ? (
            <p className="mt-1 text-sm text-muted-foreground">
              En Safari: pulsa Compartir → Añadir a pantalla de inicio.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Accede más rápido al dashboard como app nativa.
            </p>
          )}
        </div>
        <button aria-label="Cerrar" className="text-muted-foreground hover:text-foreground" onClick={dismiss} type="button">
          <X className="h-5 w-5" />
        </button>
      </div>
      {!iosHint && deferred ? (
        <Button className="mt-3 w-full" onClick={install}>
          <Download className="mr-2 h-4 w-4" /> Instalar NELVYON en tu dispositivo
        </Button>
      ) : null}
    </div>
  );
}

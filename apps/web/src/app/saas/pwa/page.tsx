"use client";

import { useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type { PwaStatus } from "@nelvyon/saas";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectPlatform(): "ios" | "android" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
  return "unknown";
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

export default function PwaInstallHub() {
  const [status, setStatus] = useState<PwaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    setInstalled(isStandalone());
    void (async () => {
      try {
        const res = await fetch("/api/saas/pwa/status");
        if (res.ok) setStatus((await res.json()) as PwaStatus);
      } finally {
        setLoading(false);
      }
    })();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function recordInstall() {
    try {
      await fetch("/api/saas/pwa/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: detectPlatform(), displayMode: "standalone" }),
      });
    } catch { /* best-effort */ }
  }

  async function install() {
    if (!deferred) {
      showToast("Usa el menú del navegador para instalar");
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      void recordInstall();
      showToast("¡App instalada!");
      setInstalled(true);
    }
    setDeferred(null);
  }

  const appName = status?.appName ?? "Nelvyon";

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="pwa" />}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📲 Instalar {appName}</h1>
          <p className="text-white/50 text-sm mt-1">
            Accede a tu panel como app nativa, con icono propio y modo offline.
          </p>
        </div>

        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando…</div>
        ) : (
          <>
            {/* Status card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3 max-w-lg">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Estado</span>
                {installed ? (
                  <NelvyonDsBadge tone="success">Instalada</NelvyonDsBadge>
                ) : (
                  <NelvyonDsBadge tone="warning">No instalada</NelvyonDsBadge>
                )}
              </div>
              {status?.whiteLabel && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Marca</span>
                  <span className="text-white/80">{appName} (white-label)</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Color de tema</span>
                <span className="inline-flex items-center gap-2 text-white/80">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: status?.themeColor ?? "#0084ff" }} />
                  {status?.themeColor}
                </span>
              </div>

              {installed ? (
                <p className="text-green-400 text-xs">Ya estás usando la app instalada. ✅</p>
              ) : isIosSafari() ? (
                <div className="rounded-lg bg-black/30 p-3 text-xs text-white/60">
                  En iPhone/iPad (Safari): pulsa <strong className="text-white/80">Compartir</strong> →{" "}
                  <strong className="text-white/80">Añadir a pantalla de inicio</strong>.
                </div>
              ) : (
                <button
                  onClick={() => void install()}
                  className="w-full rounded-xl bg-[#0084ff] px-4 py-2.5 text-sm text-white font-semibold hover:bg-[#0070dd] min-h-[44px]"
                >
                  {deferred ? "Instalar app" : "Instalar desde el menú del navegador"}
                </button>
              )}
            </div>

            {/* Install stats */}
            {status && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
                <KpiCard label="Instalaciones" value={status.stats.total} />
                <KpiCard label="iOS" value={status.stats.byPlatform.ios ?? 0} />
                <KpiCard label="Android" value={status.stats.byPlatform.android ?? 0} />
              </div>
            )}

            <p className="text-white/30 text-[11px] max-w-lg">
              Si el manifiesto dinámico falla, la app usa <code>/manifest-saas.json</code> como respaldo.
            </p>
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}

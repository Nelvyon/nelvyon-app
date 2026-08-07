"use client";

/**
 * /saas/pwa sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: instalación, push y estadísticas -> `W3crmContentBox`; los contadores
 * -> `W3crmKpiTile`; los estados -> `badge` de la plantilla. Sin componentes
 * nuevos.
 *
 * CONTRATO — `saas-pwa-install.spec.ts`, que es estricto en cuatro puntos:
 *   - `getByRole("heading", { name: /Instalar/ })` ÚNICO: el único encabezado
 *     con esa palabra es el `mainTitle`. Ningún `W3crmEmptyState` —que también
 *     pinta un `<h5>`— puede llevarla, y el breadcrumb dice "PWA".
 *   - `getByText("Estado")` ÚNICO: por eso NINGUNA caja se titula "Estado"; el
 *     título de `W3crmContentBox` es texto y contaría como segunda coincidencia.
 *   - `getByText("Instalaciones")` y `getByText(/manifest-saas\.json/)`.
 *   - `getByRole("link", { name: /Instalar App/i })` VISIBLE: lo aporta el
 *     sidebar del shell, que despliega el grupo del módulo activo.
 *
 * Nada del Service Worker cambia: el registro de `/sw.js`, su `update()`, la
 * suscripción con `applicationServerKey`, la conversión VAPID base64→Uint8Array,
 * el `unsubscribe()` y el borrado por `endpoint` quedan exactamente igual, igual
 * que la detección de plataforma, `display-mode: standalone`, el rescate de iOS
 * Safari y el evento `beforeinstallprompt` con su `preventDefault`.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/pwa/status`,
 * `GET/POST/DELETE /api/saas/pwa/push` y `POST /api/saas/pwa/install`.
 */
import { useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";
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

function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
/** Los contadores sin dato se pintan "—", no 0. */
function cuenta(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("es-ES") : "—";
}

export default function PwaInstallHub() {
  const [status, setStatus] = useState<PwaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);

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
        const pushRes = await fetch("/api/saas/pwa/push");
        if (pushRes.ok) {
          const p = (await pushRes.json()) as { subscribed?: boolean; pushConfigured?: boolean };
          setPushSubscribed(Boolean(p.subscribed));
          setPushConfigured(Boolean(p.pushConfigured));
        }
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

  function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function subscribePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      showToast("Push no soportado en este navegador");
      return;
    }
    setPushBusy(true);
    try {
      const cfgRes = await fetch("/api/saas/pwa/push");
      const cfg = (await cfgRes.json()) as { vapidPublicKey?: string | null };
      if (!cfg.vapidPublicKey) {
        showToast("Configura VAPID_PUBLIC_KEY en el servidor");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        showToast("Permiso de notificaciones denegado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.update();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey) as BufferSource,
      });
      const json = sub.toJSON();
      await fetch("/api/saas/pwa/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: json }),
      });
      setPushEndpoint(sub.endpoint);
      setPushSubscribed(true);
      showToast("Notificaciones push activadas");
    } catch {
      showToast("No se pudo activar push");
    } finally {
      setPushBusy(false);
    }
  }

  async function unsubscribePush() {
    if (!("serviceWorker" in navigator)) {
      showToast("Este navegador no soporta service workers");
      return;
    }
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      const endpoint = sub?.endpoint ?? pushEndpoint;
      if (!endpoint && !sub) {
        setPushSubscribed(false);
        setPushEndpoint(null);
        showToast("No hay suscripción push activa en este dispositivo");
        return;
      }
      if (sub) await sub.unsubscribe();
      if (endpoint) {
        const res = await fetch("/api/saas/pwa/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
      }
      setPushSubscribed(false);
      setPushEndpoint(null);
      showToast("Push desactivado");
    } catch {
      showToast("Error al desactivar push");
    } finally {
      setPushBusy(false);
    }
  }

  const appName = txt(status?.appName) || "Nelvyon";
  const tema = txt(status?.themeColor) || "#0084ff";
  const porPlataforma = (status?.stats?.byPlatform ?? {}) as Record<string, unknown>;

  return (
    <SaasW3crmShell>
      {/* Único encabezado con "Instalar": ver contrato. */}
      <W3crmPageTitle mainTitle={`📲 Instalar ${appName}`} parentTitle="Cuenta" pageTitle="PWA" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Accede a tu panel como app nativa, con icono propio y modo offline.
            </p>
          </div>

          {loading ? (
            <div className="col-xl-12"><W3crmCargando texto="Cargando…" /></div>
          ) : (
            <>
              <div className="col-xl-6">
                {/* NUNCA titular esta caja "Estado": duplicaría el texto. */}
                <W3crmContentBox titulo="Instalación en este dispositivo" icono="fa-solid fa-mobile-screen">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fs-14">Estado</span>
                    <span className={`badge ${installed ? "badge-success" : "badge-warning"}`}>
                      {installed ? "Instalada" : "No instalada"}
                    </span>
                  </div>
                  {status?.whiteLabel && (
                    <div className="d-flex align-items-center justify-content-between fs-12 mb-2">
                      <span className="text-muted">Marca</span>
                      <span>{appName} (white-label)</span>
                    </div>
                  )}
                  <div className="d-flex align-items-center justify-content-between fs-12 mb-3">
                    <span className="text-muted">Color de tema</span>
                    <span className="d-inline-flex align-items-center gap-2">
                      <span className="d-inline-block rounded-circle" aria-hidden="true"
                        style={{ width: 12, height: 12, backgroundColor: tema }} />
                      {tema}
                    </span>
                  </div>

                  {installed ? (
                    <p className="text-success fs-12 mb-0">Ya estás usando la app instalada. ✅</p>
                  ) : isIosSafari() ? (
                    <div className="alert alert-secondary py-2 fs-12 mb-0" role="note">
                      En iPhone/iPad (Safari): pulsa <strong>Compartir</strong> →{" "}
                      <strong>Añadir a pantalla de inicio</strong>.
                    </div>
                  ) : (
                    <button type="button" className="btn btn-primary w-100"
                      style={{ minHeight: 44 }} onClick={() => void install()}>
                      {deferred ? "Instalar app" : "Instalar desde el menú del navegador"}
                    </button>
                  )}
                </W3crmContentBox>
              </div>

              <div className="col-xl-6">
                <W3crmContentBox titulo="Notificaciones push" icono="fa-solid fa-bell">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fs-14">Suscripción</span>
                    <span className={`badge ${pushSubscribed ? "badge-success" : "badge-secondary"}`}>
                      {pushSubscribed ? "Activas" : "Inactivas"}
                    </span>
                  </div>
                  <p className="fs-12 text-muted">
                    Recibe alertas de inbox, leads y entregables aunque la app esté cerrada.
                    {!pushConfigured && " Requiere VAPID_PUBLIC_KEY en producción."}
                  </p>
                  {pushSubscribed ? (
                    <button type="button" className="btn btn-primary light w-100" disabled={pushBusy}
                      onClick={() => void unsubscribePush()}>
                      {pushBusy ? "…" : "Desactivar push"}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary w-100" disabled={pushBusy}
                      style={{ minHeight: 44 }} onClick={() => void subscribePush()}>
                      {pushBusy ? "Activando…" : "Activar notificaciones push"}
                    </button>
                  )}
                </W3crmContentBox>
              </div>

              {status && (
                <>
                  <div className="col-xl-4 col-sm-4">
                    <W3crmKpiTile icon="📥" label="Instalaciones" value={cuenta(status.stats?.total)} accent />
                  </div>
                  <div className="col-xl-4 col-sm-4">
                    <W3crmKpiTile icon="🍎" label="iOS" value={cuenta(porPlataforma.ios)} />
                  </div>
                  <div className="col-xl-4 col-sm-4">
                    <W3crmKpiTile icon="🤖" label="Android" value={cuenta(porPlataforma.android)} />
                  </div>
                </>
              )}

              <div className="col-xl-12">
                <p className="fs-12 text-muted">
                  Si el manifiesto dinámico falla, la app usa <code>/manifest-saas.json</code> como respaldo.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="alert alert-primary position-fixed shadow" role="status"
          style={{ bottom: 24, right: 24, zIndex: 1050, marginBottom: 0 }}>
          {toast}
        </div>
      )}
    </SaasW3crmShell>
  );
}

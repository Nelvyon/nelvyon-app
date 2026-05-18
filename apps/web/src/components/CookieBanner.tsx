"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";

import {
  type ConsentPreferences,
  CONSENT_UPDATED_EVENT,
  hasConsented,
  setConsent,
} from "@/lib/cookieConsent";

function subscribeConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_UPDATED_EVENT, callback);
  return () => window.removeEventListener(CONSENT_UPDATED_EVENT, callback);
}

function getConsentSnapshot(): boolean {
  return hasConsented();
}

function getServerConsentSnapshot(): boolean {
  return true;
}

function applyPostHogConsent(analytics: boolean): void {
  if (analytics) {
    window.__posthog?.opt_in_capturing?.();
  } else {
    window.__posthog?.opt_out_capturing?.();
  }
}

function saveConsent(prefs: ConsentPreferences): void {
  setConsent(prefs);
  applyPostHogConsent(prefs.analytics);
}

export function CookieBanner() {
  const consented = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
    setCustomizeOpen(false);
  }, []);

  const acceptNecessaryOnly = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
    setCustomizeOpen(false);
  }, []);

  const saveCustom = useCallback(() => {
    saveConsent({ necessary: true, analytics: analyticsOn, marketing: marketingOn });
    setCustomizeOpen(false);
  }, [analyticsOn, marketingOn]);

  const openCustomize = useCallback(() => {
    setAnalyticsOn(false);
    setMarketingOn(false);
    setCustomizeOpen(true);
  }, []);

  if (consented) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-[100] border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-4 backdrop-blur-md md:px-6"
        role="dialog"
        aria-label="Preferencias de cookies"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-relaxed text-zinc-300">
            Usamos cookies propias y de terceros para el funcionamiento del sitio, analítica y marketing. Puedes
            aceptar todas, solo las necesarias o personalizar tu elección. Más información en nuestra{" "}
            <Link href="/privacy" className="text-indigo-400 underline hover:text-indigo-300">
              política de privacidad
            </Link>
            .
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptNecessaryOnly}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={openCustomize}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
            >
              Personalizar
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Aceptar todo
            </button>
          </div>
        </div>
      </div>

      {customizeOpen ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
            role="dialog"
            aria-labelledby="cookie-modal-title"
          >
            <h2 id="cookie-modal-title" className="text-lg font-semibold text-zinc-100">
              Preferencias de cookies
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Las cookies necesarias son imprescindibles y no se pueden desactivar.
            </p>

            <ul className="mt-6 space-y-4">
              <li className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Necesarias</p>
                  <p className="text-xs text-zinc-500">Sesión, seguridad y preferencias básicas</p>
                </div>
                <span className="text-xs font-medium text-emerald-400">Siempre activas</span>
              </li>
              <li className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Analítica</p>
                  <p className="text-xs text-zinc-500">Medición de uso anónima (PostHog)</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={analyticsOn}
                    onChange={(e) => setAnalyticsOn(e.target.checked)}
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-700 peer-checked:bg-indigo-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </li>
              <li className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Marketing</p>
                  <p className="text-xs text-zinc-500">Personalización y campañas</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={marketingOn}
                    onChange={(e) => setMarketingOn(e.target.checked)}
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-700 peer-checked:bg-indigo-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCustom}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

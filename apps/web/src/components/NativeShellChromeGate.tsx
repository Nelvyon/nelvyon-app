"use client";

import { type ReactNode, useEffect, useState } from "react";

/**
 * Hides marketing chrome (cookie banner, site chat) inside Capacitor WebView.
 * Native shell already loads authenticated SaaS; overlays block login/forms.
 */
export function NativeShellChromeGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (typeof cap?.isNativePlatform === "function" && cap.isNativePlatform()) {
      setShow(false);
    }
  }, []);

  if (!show) return null;
  return children;
}

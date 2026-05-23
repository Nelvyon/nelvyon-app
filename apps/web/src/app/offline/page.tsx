"use client";

import { useEffect } from "react";

export default function OfflinePage() {
  useEffect(() => {
    const t = setInterval(() => {
      if (navigator.onLine) {
        window.location.href = "/dashboard";
      }
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center text-white">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
        N
      </div>
      <h1 className="text-2xl font-bold">NELVYON</h1>
      <p className="mt-4 max-w-sm text-zinc-400">Sin conexión — reconectando…</p>
      <p className="mt-2 text-xs text-zinc-500">Comprobando cada 10 segundos</p>
    </div>
  );
}

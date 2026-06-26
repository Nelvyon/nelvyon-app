"use client";

import { useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type { VoiceCatalogItem, VoiceCommandLog, VoiceActionType } from "@nelvyon/saas";

const TYPE_TONE: Record<VoiceActionType, "primary" | "success" | "warning" | "neutral"> = {
  navigate: "primary",
  action: "success",
  query: "warning",
  unknown: "neutral",
};

const TYPE_LABEL: Record<VoiceActionType, string> = {
  navigate: "Navegar",
  action: "Acción",
  query: "Consulta",
  unknown: "—",
};

export default function VoicePage() {
  const [catalog, setCatalog] = useState<VoiceCatalogItem[]>([]);
  const [history, setHistory] = useState<VoiceCommandLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/voice");
        if (res.ok) {
          const d = (await res.json()) as { catalog: VoiceCatalogItem[]; history: VoiceCommandLog[] };
          setCatalog(d.catalog ?? []);
          setHistory(d.history ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = {
    navigate: catalog.filter((c) => c.actionType === "navigate"),
    action: catalog.filter((c) => c.actionType === "action"),
    query: catalog.filter((c) => c.actionType === "query"),
  };

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="voice" />}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🎙️ Comandos de voz</h1>
          <p className="text-white/50 text-sm mt-1">
            Pulsa el micrófono flotante y di un comando. Gratis, sin coste de API (Web Speech).
          </p>
        </div>

        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando comandos…</div>
        ) : (
          <>
            {/* Available commands */}
            {(["navigate", "action", "query"] as const).map((group) => (
              grouped[group].length > 0 && (
                <div key={group} className="space-y-2">
                  <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wide">{TYPE_LABEL[group]}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grouped[group].map((item) => (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-sm font-medium">{item.description}</p>
                          <NelvyonDsBadge tone={TYPE_TONE[item.actionType]}>{TYPE_LABEL[item.actionType]}</NelvyonDsBadge>
                        </div>
                        <p className="text-white/40 text-xs mt-1">
                          Di: «{item.phrases[0]}»{item.phrases[1] ? ` o «${item.phrases[1]}»` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {/* History */}
            <div className="space-y-2">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wide">Historial reciente</h2>
              {history.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center">
                  <div className="text-3xl mb-2">🎙️</div>
                  <p className="text-white/40 text-sm">
                    Aún no has usado comandos de voz. Di «ir a CRM» o «lanzar pack» con el micrófono flotante.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 divide-y divide-white/5">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="text-white/80 text-xs truncate">«{h.transcript}»</p>
                        <p className="text-white/30 text-[10px]">{new Date(h.createdAt).toLocaleString()}</p>
                      </div>
                      <NelvyonDsBadge tone={h.success ? "success" : "neutral"}>
                        {h.success ? "ok" : "no reconocido"}
                      </NelvyonDsBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SaasShellLayout>
  );
}

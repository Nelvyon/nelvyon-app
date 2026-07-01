"use client";

import { useState } from "react";
import { NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import {
  listEmailElitePresets,
  buildSaasCampaniaFromPreset,
  type EmailElitePreset,
} from "@/lib/eliteTemplates/emailTemplates";

const GROUPS = [
  { id: "all", label: "Todas" },
  { id: "local", label: "Local" },
  { id: "ecommerce", label: "Ecommerce" },
  { id: "saas_b2b", label: "SaaS B2B" },
] as const;

export function CampaniaTemplateQuickLaunch({ onCreated }: { onCreated: () => void }) {
  const [group, setGroup] = useState<"all" | "local" | "ecommerce" | "saas_b2b">("all");
  const [importing, setImporting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const presets = group === "all" ? listEmailElitePresets() : listEmailElitePresets(group);

  async function importPreset(preset: EmailElitePreset) {
    setImporting(preset.id);
    try {
      const payload = buildSaasCampaniaFromPreset(preset);
      const res = await fetch("/api/saas/campanias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.ok) onCreated();
    } finally {
      setImporting(null);
    }
  }

  return (
    <NelvyonDsCard className="mb-4 overflow-hidden border-[#0084ff]/20">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded((v) => !v)}>
        <div>
          <p className="text-sm font-semibold text-white">Plantillas campaña email</p>
          <p className="text-xs text-white/50">HubSpot/GHL — importa en 1 clic ({presets.length})</p>
        </div>
        <span className="text-white/40">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGroup(g.id)}
                className={`rounded-full px-3 py-1 text-xs ${group === g.id ? "bg-[#0084ff]/30 text-[#0084ff]" : "text-white/50 border border-white/10"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{p.tagline}</p>
                <NelvyonDsButton className="mt-2 w-full" size="sm" disabled={importing === p.id}
                  onClick={() => void importPreset(p)}>
                  {importing === p.id ? "…" : "Usar plantilla"}
                </NelvyonDsButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </NelvyonDsCard>
  );
}

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
    <NelvyonDsCard className="overflow-hidden border-primary/20">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded((v) => !v)}>
        <div>
          <p className="text-sm font-semibold text-foreground">Plantillas campaña Nelvyon</p>
          <p className="text-xs text-muted-foreground">Importa en 1 clic ({presets.length} plantillas)</p>
        </div>
        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGroup(g.id)}
                className={`rounded-full px-3 py-1 text-xs ${group === g.id ? "bg-primary/20 text-primary" : "border border-border text-muted-foreground"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{p.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.tagline}</p>
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

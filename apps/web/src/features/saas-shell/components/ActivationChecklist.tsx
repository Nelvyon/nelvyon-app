"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NelvyonDsCard } from "@/design-system/components";

interface Steps {
  profile: boolean;
  contact: boolean;
  campaign: boolean;
  workflow: boolean;
  social: boolean;
  billing: boolean;
}

const CHECKLIST = [
  { key: "profile" as keyof Steps, label: "Completa tu perfil", href: "/saas/settings", desc: "Añade el nombre de tu empresa e industria" },
  { key: "contact" as keyof Steps, label: "Importa tus primeros contactos", href: "/saas/crm", desc: "Sube un CSV o añade contactos manualmente" },
  { key: "campaign" as keyof Steps, label: "Crea tu primera campaña de email", href: "/saas/campanias", desc: "Envía tu primer email a tus contactos" },
  { key: "workflow" as keyof Steps, label: "Activa un workflow de automatización", href: "/saas/workflows", desc: "Automatiza el seguimiento de nuevos leads" },
  { key: "social" as keyof Steps, label: "Publica en redes sociales", href: "/saas/social", desc: "Conecta tus perfiles y programa un post" },
  { key: "billing" as keyof Steps, label: "Activa tu plan", href: "/saas/billing", desc: "Elige el plan que mejor se adapta a ti" },
];

export function ActivationChecklist({ onDismiss }: { onDismiss?: () => void }) {
  const [steps, setSteps] = useState<Steps | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packDone, setPackDone] = useState(false);

  useEffect(() => {
    fetch("/api/saas/activation")
      .then(r => r.json())
      .then((d: { steps?: Steps }) => { if (d.steps) setSteps(d.steps); })
      .catch(() => {});
  }, []);

  if (dismissed || !steps) return null;

  const done = Object.values(steps).filter(Boolean).length;
  const total = CHECKLIST.length;
  const allDone = done === total;

  if (allDone) return null;

  function dismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  async function markDone(key: keyof Steps) {
    const next = { ...steps!, [key]: true };
    setSteps(next);
    await fetch("/api/saas/activation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: true }),
    }).catch(() => {});
  }

  const pct = Math.round((done / total) * 100);

  async function installStarterPack() {
    setPackLoading(true);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      if (res.ok) {
        setPackDone(true);
        await markDone("workflow");
      }
    } finally {
      setPackLoading(false);
    }
  }

  return (
    <NelvyonDsCard className="p-5 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground text-sm">Configura tu cuenta</p>
          <p className="text-xs text-muted-foreground">{done} de {total} pasos completados</p>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground text-xs">Ocultar</button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {!packDone && !steps.workflow && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
          <p className="text-sm font-medium text-foreground">⚡ Pack GHL + HubSpot Starter</p>
          <p className="text-xs text-muted-foreground mt-1">6 workflows + 4 secuencias drip en 1 clic</p>
          <button
            type="button"
            disabled={packLoading}
            onClick={() => void installStarterPack()}
            className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {packLoading ? "Instalando…" : "Instalar automatizaciones"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {CHECKLIST.map(item => {
          const isDone = steps[item.key];
          return (
            <div key={item.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isDone ? "opacity-50" : "hover:bg-primary/5"}`}>
              <button
                onClick={() => void markDone(item.key)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isDone ? "border-green-500 bg-green-500 text-white" : "border-border hover:border-primary"}`}
              >
                {isDone && <span className="text-xs">✓</span>}
              </button>
              <Link href={item.href} className={`flex-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </Link>
              {!isDone && (
                <Link href={item.href} className="shrink-0 text-xs font-medium text-primary hover:underline">
                  Ir →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </NelvyonDsCard>
  );
}

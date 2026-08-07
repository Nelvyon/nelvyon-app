"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// Marcado de tarjeta de W3CRM: este componente lo renderizan /saas/dashboard
// y /saas/setup, ambas ya en el shell nuevo, así que seguir en el
// design-system antiguo dejaba una isla oscura dentro del shell claro.
// Solo cambia la capa visual: endpoints, estados y acciones intactos.

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
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    fetch("/api/saas/activation", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ steps?: Steps; error?: string }>;
      })
      .then((d) => {
        if (cancelled) return;
        if (d.steps) setSteps(d.steps);
        else setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  if (dismissed) return null;

  if (loadError && !steps) {
    return (
      <div className="alert alert-warning" role="alert">
        <h6 className="mb-1">No se pudo cargar la guía de activación</h6>
        <p className="fs-12 mb-2">Revisa tu sesión o reintenta en unos segundos.</p>
        <button type="button" className="btn btn-primary light btn-sm"
          onClick={() => setRetryTick((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!steps) return null;

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
    <div className="card border mb-3">
      <div className="card-body">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div>
          <p className="fw-bold mb-0">Configura tu cuenta</p>
          <p className="text-muted fs-12 mb-0">{done} de {total} pasos completados</p>
        </div>
        <button type="button" className="btn btn-primary light btn-sm" onClick={dismiss}>Ocultar</button>
      </div>

      <div className="progress mb-3" style={{ height: 6 }}>
        <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${pct}%` }}
          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          aria-label="Progreso de activación" />
      </div>

      {!packDone && !steps.workflow && (
        <div className="alert alert-primary py-2 mb-3" role="note">
          <p className="fw-bold mb-1">⚡ Kit de arranque Nelvyon</p>
          <p className="fs-12 mb-2">6 workflows + 4 secuencias oficiales en 1 clic</p>
          <button type="button" className="btn btn-primary btn-sm w-100"
            disabled={packLoading} onClick={() => void installStarterPack()}>
            {packLoading ? "Instalando…" : "Instalar automatizaciones"}
          </button>
        </div>
      )}

      <ul className="list-group list-group-flush">
        {CHECKLIST.map(item => {
          const isDone = steps[item.key];
          return (
            <li key={item.key} className={`list-group-item d-flex align-items-center gap-2 px-0 ${isDone ? "opacity-50" : ""}`}>
              <button type="button" className={`btn btn-sm ${isDone ? "btn-success" : "btn-primary light"}`}
                aria-pressed={isDone}
                aria-label={`Marcar como hecho: ${item.label}`}
                onClick={() => void markDone(item.key)}>
                {isDone ? "✓" : "○"}
              </button>
              <Link href={item.href} className="flex-grow-1 text-decoration-none">
                <span className={`d-block fw-bold ${isDone ? "text-decoration-line-through text-muted" : ""}`}>{item.label}</span>
                <span className="d-block text-muted fs-12">{item.desc}</span>
              </Link>
              {!isDone && (
                <Link href={item.href} className="text-primary fs-12 fw-bold">Ir →</Link>
              )}
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}

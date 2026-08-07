"use client";

/**
 * /saas/setup sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: cada bloque del centro de configuración -> `W3crmContentBox`; la salud
 * global y el avance del onboarding -> `W3crmKpiTile`; los estados de cada
 * comprobación -> `badge` de la plantilla. Sin componentes nuevos.
 *
 * CONTRATO:
 *   - `dashboard.spec.ts` solo exige que el sidebar exponga
 *     `a[href="/saas/setup"]`; lo aporta el shell, no esta pantalla.
 *   - `saas-nav-full-coverage.spec.ts` exige que la ruta cargue sin
 *     "Internal Server Error": por eso ningún dato de la API llega crudo a
 *     `.reduce`, `.map`, `.slice` ni a una comparación numérica.
 *
 * Dos componentes compartidos se conservan a propósito:
 *   - `ActivationChecklist` ya se renderiza dentro de /saas/dashboard, que está
 *     migrado y certificado; reutilizarlo mantiene una sola implementación.
 *   - `FeaturedEnvatoTemplateCard` se ha portado a W3CRM en este mismo bloque,
 *     porque sus dos únicos consumidores (esta pantalla y /saas/web-builder) ya
 *     están en el shell nuevo y dejarla en la capa antigua era mezcla visual.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/platform-health` con su redirect a
 * `/auth/login?next=/saas/setup` ante un 401 —que es el punto de sesión de la
 * pantalla—, `GET /api/saas/web-builder/templates`, `GET/PATCH /api/saas/setup`
 * (con `setupStep` y `autonomyMode`), `GET/POST /api/saas/memory`,
 * `POST /api/saas/starter-pack` y `POST /api/saas/geo-visibility`, incluido el
 * `cache: "no-store"` de cada lectura y el auto-marcado de `health_ok` cuando la
 * salud llega a 90.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FeaturedEnvatoTemplateCard,
  type FeaturedTemplateMeta,
} from "@/features/saas-web-builder/components/FeaturedEnvatoTemplateCard";
import { ActivationChecklist } from "@/features/saas-shell/components/ActivationChecklist";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

type HealthItem = {
  id: string;
  label: string;
  category: string;
  status: "ok" | "warning" | "missing";
  configured: boolean;
  href: string;
  detail: string;
  actionable: boolean;
};

type HealthReport = {
  score: number;
  status: "healthy" | "degraded" | "critical";
  items: HealthItem[];
  activation: { done: number; total: number; percent: number };
  summary: { platformReady: boolean; productReady: boolean; missingCount: number };
};

const CATEGORY_LABELS: Record<string, string> = {
  platform: "Plataforma",
  payments: "Pagos",
  comms: "Comunicación",
  integrations: "Integraciones",
  product: "Uso del producto",
};

const STATUS_ICON: Record<string, string> = { ok: "✓", warning: "◐", missing: "○" };
/** Estados con las clases de badge de la plantilla, con salida por defecto. */
const STATUS_BADGE: Record<string, string> = {
  ok: "badge-success",
  warning: "badge-warning",
  missing: "badge-danger",
};

/** Sin dato es "—", no 0: la salud global no se inventa. */
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function corta(v: unknown, max: number): string {
  const s = txt(v);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
/** Un `href` vacío dejaría un enlace sin destino. */
function ruta(v: unknown): string {
  const s = txt(v).trim();
  return s || "/saas/dashboard";
}

export default function SaasSetupPage() {
  const router = useRouter();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [packLoading, setPackLoading] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);
  const [featuredTemplate, setFeaturedTemplate] = useState<FeaturedTemplateMeta | null>(null);
  const [autonomyMode, setAutonomyMode] = useState<"draft" | "propose" | "execute">("propose");
  const [memoryChunks, setMemoryChunks] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [memoryInput, setMemoryInput] = useState("");
  const [eliteSaving, setEliteSaving] = useState(false);
  const [setupProgress, setSetupProgress] = useState<Record<string, boolean>>({});
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const SETUP_STEPS = [
    { id: "starter_pack", label: "Kit de arranque", done: setupProgress.starter_pack },
    { id: "autonomy", label: "Autonomía IA", done: setupProgress.autonomy },
    { id: "memory", label: "Memoria IA", done: setupProgress.memory },
    { id: "geo", label: "Auditoría GEO", done: setupProgress.geo },
    { id: "health_ok", label: "Salud ≥90%", done: setupProgress.health_ok },
  ] as const;
  const setupDone = SETUP_STEPS.filter((s) => s.done).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/platform-health", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/auth/login?next=/saas/setup");
        return;
      }
      if (res.ok) setReport((await res.json()) as HealthReport);
      const tplRes = await fetch("/api/saas/web-builder/templates", { cache: "no-store" });
      if (tplRes.ok) {
        const tpl = (await tplRes.json()) as { templates: FeaturedTemplateMeta[] };
        setFeaturedTemplate(Array.isArray(tpl.templates) ? tpl.templates[0] ?? null : null);
      }
      const eliteRes = await fetch("/api/saas/setup", { cache: "no-store" });
      if (eliteRes.ok) {
        const elite = (await eliteRes.json()) as {
          elite?: { autonomyMode?: string; setupProgress?: Record<string, boolean> };
        };
        if (elite.elite?.autonomyMode === "draft" || elite.elite?.autonomyMode === "propose" || elite.elite?.autonomyMode === "execute") {
          setAutonomyMode(elite.elite.autonomyMode);
        }
        if (elite.elite?.setupProgress) {
          setSetupProgress(elite.elite.setupProgress);
        }
      }
      const memRes = await fetch("/api/saas/memory", { cache: "no-store" });
      if (memRes.ok) {
        const mem = (await memRes.json()) as { chunks?: Array<{ id: string; title: string; content: string }> };
        setMemoryChunks(Array.isArray(mem.chunks) ? mem.chunks : []);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const salud = opt(report?.score);

  useEffect(() => {
    if (report && num(report.score) >= 90 && !setupProgress.health_ok) {
      void fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStep: "health_ok" }),
      }).then(() => setSetupProgress((p) => ({ ...p, health_ok: true })));
    }
  }, [report, setupProgress.health_ok]);

  async function installStarterPack() {
    setPackLoading(true);
    setPackMsg(null);
    try {
      const res = await fetch("/api/saas/starter-pack", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { error?: string; totalWorkflows?: number; totalSequences?: number };
      if (!res.ok) {
        setPackMsg(d.error ?? "Error al instalar");
        return;
      }
      setPackMsg(`✅ Kit instalado: ${d.totalWorkflows ?? 6} workflows + ${d.totalSequences ?? 4} secuencias`);
      await fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStep: "starter_pack" }),
      });
      setSetupProgress((p) => ({ ...p, starter_pack: true }));
      await load();
    } finally {
      setPackLoading(false);
    }
  }

  async function analizarGeo() {
    setGeoLoading(true);
    setGeoMsg(null);
    try {
      const res = await fetch("/api/saas/geo-visibility", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { run?: { score: number | null; domain: string; id: string }; error?: string };
      if (!res.ok) {
        setGeoMsg(d.error ?? "Error al analizar");
        return;
      }
      setGeoMsg(`✅ Score ${d.run?.score ?? 0}/100 — ${d.run?.domain ?? ""}`);
      await fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupStep: "geo" }),
      });
      setSetupProgress((p) => ({ ...p, geo: true }));
    } finally {
      setGeoLoading(false);
    }
  }

  async function guardarAutonomia(mode: "draft" | "propose" | "execute") {
    setEliteSaving(true);
    try {
      await fetch("/api/saas/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autonomyMode: mode, setupStep: "autonomy" }),
      });
      setAutonomyMode(mode);
      setSetupProgress((p) => ({ ...p, autonomy: true }));
    } finally {
      setEliteSaving(false);
    }
  }

  async function guardarMemoria() {
    setEliteSaving(true);
    try {
      const res = await fetch("/api/saas/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: memoryInput }),
      });
      if (res.ok) {
        setMemoryInput("");
        await fetch("/api/saas/setup", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setupStep: "memory" }),
        });
        setSetupProgress((p) => ({ ...p, memory: true }));
        const mem = (await fetch("/api/saas/memory").then((r) => r.json())) as { chunks?: typeof memoryChunks };
        setMemoryChunks(Array.isArray(mem.chunks) ? mem.chunks : []);
      }
    } finally {
      setEliteSaving(false);
    }
  }

  // `items` podía no ser array y reventaba `.reduce`.
  const items = report && Array.isArray(report.items) ? report.items : [];
  const grouped = Object.entries(
    items.reduce<Record<string, HealthItem[]>>((acc, item) => {
      (acc[txt(item.category) || "otros"] ??= []).push(item);
      return acc;
    }, {}),
  );
  const activacion = opt(report?.activation?.percent);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle
        mainTitle="Perfecciona tu cuenta Nelvyon"
        parentTitle="Centro de configuración"
        pageTitle="Configuración"
      />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile
              icon="🩺"
              label="Salud global"
              value={salud === null ? "—" : `${salud}%`}
              accent
            />
          </div>
          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile
              icon="🎯"
              label="Pasos elite completados"
              value={`${setupDone}/${SETUP_STEPS.length}`}
            />
          </div>
          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile
              icon="🚀"
              label="Activación del producto"
              value={activacion === null ? "—" : `${activacion}%`}
            />
          </div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Estado en tiempo real de email, pagos, comunicación e integraciones. Objetivo: 100% operativo.
            </p>

            {loading ? (
              <W3crmCargando texto="Analizando configuración…" />
            ) : !report ? (
              <W3crmContentBox titulo="Estado de la cuenta" icono="fa-solid fa-gear">
                <W3crmEmptyState
                  title="No se ha podido leer el estado de la plataforma"
                  description="Vuelve a intentarlo en unos segundos."
                />
              </W3crmContentBox>
            ) : (
              <>
                <W3crmContentBox titulo="🎯 Onboarding productizado" icono="fa-solid fa-list-check">
                  <p className="fs-14 text-muted">
                    {setupDone}/{SETUP_STEPS.length} pasos elite completados ·{" "}
                    {Math.round((setupDone / SETUP_STEPS.length) * 100)}%
                  </p>
                  <div className="row">
                    {SETUP_STEPS.map((step) => (
                      <div className="col-xl col-sm-4 mb-2" key={step.id}>
                        <div className={`card border mb-0 ${step.done ? "border-primary" : ""}`}>
                          <div className="card-body py-2 px-3">
                            <span className={`fs-14 ${step.done ? "text-success fw-bold" : "text-muted"}`}>
                              {step.done ? "✓" : "○"} {step.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="🌐 GEO / AI Visibility" icono="fa-solid fa-globe">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <p className="fs-14 text-muted mb-1">
                        Schema.org, FAQ, llms.txt — informe PDF vendible (0€ LLM)
                      </p>
                      {geoMsg && <p className="text-success fs-12 mb-0">{geoMsg}</p>}
                    </div>
                    <button type="button" className="btn btn-primary" disabled={geoLoading}
                      onClick={() => void analizarGeo()}>
                      {geoLoading ? "Analizando…" : "Analizar GEO"}
                    </button>
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="⚡ Kit de arranque oficial Nelvyon" icono="fa-solid fa-bolt">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      <p className="fs-14 text-muted mb-1">6 workflows + 4 secuencias — importación en 1 clic</p>
                      {packMsg && <p className="text-success fs-12 mb-0">{packMsg}</p>}
                    </div>
                    <button type="button" className="btn btn-primary" disabled={packLoading}
                      onClick={() => void installStarterPack()}>
                      {packLoading ? "Instalando…" : "Instalar kit"}
                    </button>
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="🎚 Autonomía IA (elite)" icono="fa-solid fa-sliders">
                  <p className="fs-14 text-muted">
                    Borrador → solo genera · Propuesta → confirma tú · Ejecutar → auto-acciones
                  </p>
                  <div className="d-flex flex-wrap gap-2" role="group" aria-label="Modo de autonomía">
                    {(["draft", "propose", "execute"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        disabled={eliteSaving}
                        aria-pressed={autonomyMode === mode}
                        className={`btn btn-sm ${autonomyMode === mode ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => void guardarAutonomia(mode)}
                      >
                        {mode === "draft" ? "Borrador" : mode === "propose" ? "Propuesta" : "Ejecutar"}
                      </button>
                    ))}
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="🧠 Memoria IA compartida" icono="fa-solid fa-brain">
                  <p className="fs-14 text-muted">Contexto Moso-style para inbox, agentes y packs</p>
                  <div className="input-group mb-3">
                    <input
                      id="setup-memoria"
                      className="form-control"
                      aria-label="Nuevo contexto de memoria"
                      placeholder="Ej: Somos clínica dental en Madrid, tono cercano…"
                      value={memoryInput}
                      onChange={(e) => setMemoryInput(e.target.value)}
                    />
                    <button type="button" className="btn btn-primary"
                      disabled={!memoryInput.trim() || eliteSaving}
                      onClick={() => void guardarMemoria()}>
                      Guardar
                    </button>
                  </div>
                  {memoryChunks.length === 0 ? (
                    <W3crmEmptyState title="Sin contexto guardado todavía" />
                  ) : (
                    <ul className="list-group list-group-flush" style={{ maxHeight: 200, overflowY: "auto" }}>
                      {memoryChunks.slice(0, 8).map((c) => (
                        <li key={c.id} className="list-group-item px-0 text-muted fs-12">
                          {corta(c.content, 120) || "—"}
                        </li>
                      ))}
                    </ul>
                  )}
                </W3crmContentBox>

                {featuredTemplate && (
                  <W3crmContentBox titulo="Landing premium Nelvyon" icono="fa-solid fa-star">
                    <FeaturedEnvatoTemplateCard template={featuredTemplate} onImported={load} />
                  </W3crmContentBox>
                )}

                {grouped.map(([category, lista]) => (
                  <W3crmContentBox
                    key={category}
                    titulo={`${CATEGORY_LABELS[category] ?? category} (${lista.length})`}
                    icono="fa-solid fa-circle-check"
                  >
                    <div className="row">
                      {lista.map((item) => (
                        <div className="col-xl-6 mb-3" key={item.id}>
                          <div className="card border mb-0 h-100">
                            <div className="card-body d-flex gap-3">
                              <span className={`badge ${STATUS_BADGE[item.status] ?? "badge-secondary"}`}>
                                {STATUS_ICON[item.status] ?? "•"}
                              </span>
                              <div className="flex-grow-1">
                                <p className="fw-bold mb-1">{txt(item.label) || "—"}</p>
                                <p className="text-muted fs-12 mb-2">{txt(item.detail)}</p>
                                <Link href={ruta(item.href)} className="text-primary fs-12 fw-bold">
                                  {item.actionable ? "Configurar →" : "Ver módulo →"}
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </W3crmContentBox>
                ))}

                <W3crmContentBox
                  titulo={`Activación del producto (${activacion === null ? "—" : `${activacion}%`})`}
                  icono="fa-solid fa-rocket"
                >
                  {/* Compartido con /saas/dashboard, ya migrado: una sola implementación. */}
                  <ActivationChecklist />
                </W3crmContentBox>

                {num(report.score) >= 90 && (
                  <div className="alert alert-success" role="status">
                    <h5 className="mb-1">✓ Cuenta en estado óptimo</h5>
                    <p className="fs-14 mb-2">Tu Nelvyon está listo para operar a escala.</p>
                    <Link href="/saas/dashboard" className="text-primary fs-14 fw-bold">
                      Ir al dashboard →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}

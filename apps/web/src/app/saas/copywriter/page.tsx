"use client";

/**
 * /saas/copywriter sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: selector de tipo, formulario y resultados -> `W3crmContentBox`; el
 * vacio -> `W3crmEmptyState`; la espera -> `W3crmCargando`. Sin componentes
 * nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Sin textos-contrato.
 *
 * Colisiones de accesibilidad revisadas: `W3crmContentBox` emite un toggle
 * `<Link role="button" aria-label={`Plegar ${titulo}`}>`, asi que ningun
 * titulo de caja repite el texto de un boton o etiqueta de esta pantalla.
 *
 * Logica de NELVYON intacta: `GET /api/saas/ai-copy` con `credentials:
 * "same-origin"` (solo lee `openai_configured`) y el `POST` con
 * `{ type, context, tone, variations }`; los ocho tipos de copy con su icono y
 * su placeholder; los cuatro tonos; el rango de 1 a 5 variaciones; el reset de
 * contexto y resultados al cambiar de tipo; el contador de caracteres para
 * asuntos y la barra de 160 para SMS; el copiado con aviso de 2 s; el bloqueo
 * de generacion cuando OpenAI no esta configurado.
 */
import { useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

type CopyType =
  | "email_subject" | "email_body" | "sms_message" | "social_post"
  | "ad_copy" | "landing_headline" | "cta_button" | "blog_intro";
type Tone = "formal" | "casual" | "urgente" | "inspirador";

const COPY_TYPES: { id: CopyType; label: string; icon: string; placeholder: string }[] = [
  { id: "email_subject", label: "Asunto de email", icon: "fa-solid fa-envelope", placeholder: "Campaña de reactivación para clientes que no compran hace 3 meses. Ofrecemos 20% descuento." },
  { id: "email_body", label: "Cuerpo de email", icon: "fa-solid fa-file-lines", placeholder: "Email de bienvenida para nuevos clientes de nuestro plan Pro. Incluir próximos pasos y soporte." },
  { id: "sms_message", label: "SMS Marketing", icon: "fa-solid fa-comment-sms", placeholder: "Oferta flash de 48h: 30% descuento en todos nuestros servicios. Solo para clientes existentes." },
  { id: "social_post", label: "Post Redes Sociales", icon: "fa-solid fa-hashtag", placeholder: "Lanzamiento de nuestra nueva función de IA para automatizar campañas de email marketing." },
  { id: "ad_copy", label: "Anuncio Digital", icon: "fa-solid fa-bullhorn", placeholder: "Software de marketing todo en uno para pymes. Prueba gratis 14 días." },
  { id: "landing_headline", label: "Titular Landing Page", icon: "fa-solid fa-rocket", placeholder: "Plataforma SaaS de marketing digital con IA para empresas que quieren crecer sin contratar." },
  { id: "cta_button", label: "Texto CTA / Botón", icon: "fa-solid fa-bullseye", placeholder: "Botón para empezar prueba gratuita de nuestro software de marketing." },
  { id: "blog_intro", label: "Intro de Blog", icon: "fa-solid fa-pen-nib", placeholder: "Artículo sobre cómo las pymes pueden usar IA para automatizar su marketing y ahorrar tiempo." },
];

const TONES: { id: Tone; label: string }[] = [
  { id: "casual", label: "Cercano" },
  { id: "formal", label: "Formal" },
  { id: "urgente", label: "Urgente" },
  { id: "inspirador", label: "Inspirador" },
];

/** La API puede devolver entradas nulas o no-texto dentro de `copies`. */
function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function SaasCopywriterPage() {
  const [type, setType] = useState<CopyType>("email_subject");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState<Tone>("casual");
  const [variations, setVariations] = useState(3);
  const [loading, setLoading] = useState(false);
  const [copies, setCopies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/ai-copy", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { openai_configured?: boolean };
        setOpenaiConfigured(data.openai_configured ?? false);
      } catch {
        setOpenaiConfigured(false);
      }
    })();
  }, []);

  // Un tipo fuera de catalogo dejaba `selectedType` en undefined y el `!`
  // reventaba al leer el placeholder.
  const selectedType = COPY_TYPES.find((t) => t.id === type) ?? COPY_TYPES[0]!;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!context.trim()) { setError("Describe qué quieres comunicar"); return; }
    setLoading(true);
    setError(null);
    setCopies([]);
    try {
      const res = await fetch("/api/saas/ai-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context: context.trim(), tone, variations }),
      });
      const data = (await res.json().catch(() => ({}))) as { copies?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error generando copy");
      // `copies` podia no ser array, y sus entradas no ser texto.
      setCopies(Array.isArray(data.copies) ? data.copies.map(texto).filter((c) => c.length > 0) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, idx: number) {
    // En contextos sin permiso el objeto `clipboard` ni siquiera existe.
    void navigator.clipboard?.writeText(text);
    setCopied(idx);
    window.setTimeout(() => setCopied((cur) => (cur === idx ? null : cur)), 2000);
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Copywriter IA" parentTitle="Inteligencia" pageTitle="Copywriter" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">Genera textos de marketing persuasivos en segundos con IA</p>

            {openaiConfigured === false && (
              <div className="alert alert-warning" role="alert">
                OpenAI no está configurado (<code>OPENAI_API_KEY</code>). La generación IA estará
                disponible cuando se configure en Railway.
              </div>
            )}
          </div>

          <div className="col-xl-6">
            <W3crmContentBox titulo="Tipo de contenido" icono="fa-solid fa-list">
              <div className="row">
                {COPY_TYPES.map((t) => (
                  <div className="col-sm-6" key={t.id}>
                    <button
                      type="button"
                      aria-pressed={type === t.id}
                      className={`btn btn-sm w-100 text-start mb-2 ${type === t.id ? "btn-primary" : "btn-primary light"}`}
                      onClick={() => { setType(t.id); setContext(""); setCopies([]); }}
                    >
                      <i className={`${t.icon} me-2`} />
                      {t.label}
                    </button>
                  </div>
                ))}
              </div>
            </W3crmContentBox>

            <W3crmContentBox titulo="Instrucciones" icono="fa-solid fa-wand-magic-sparkles">
              <form onSubmit={(e) => void generate(e)}>
                <div className="form-group mb-3">
                  <label htmlFor="cw-context" className="text-black font-w600">
                    ¿Qué quieres comunicar? <span className="required">*</span>
                  </label>
                  <textarea id="cw-context" className="form-control" rows={4}
                    placeholder={selectedType.placeholder}
                    value={context} onChange={(e) => setContext(e.target.value)} />
                </div>

                <div className="form-group mb-3">
                  <p className="text-black font-w600 mb-2">Tono</p>
                  <div role="group" aria-label="Tono del copy">
                    {TONES.map((t) => (
                      <button key={t.id} type="button" aria-pressed={tone === t.id}
                        className={`btn btn-sm me-1 mb-1 ${tone === t.id ? "btn-primary" : "btn-primary light"}`}
                        onClick={() => setTone(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="cw-variaciones" className="text-black font-w600">
                    Variaciones: {variations}
                  </label>
                  <input id="cw-variaciones" className="form-range" type="range" min={1} max={5}
                    value={variations} onChange={(e) => setVariations(parseInt(e.target.value) || 1)} />
                </div>

                {error && <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div>}

                <div className="text-end">
                  <button type="submit" className="btn btn-primary"
                    disabled={loading || !context.trim() || openaiConfigured === false}>
                    {loading ? "Generando con IA…" : `Generar ${variations} variaciones`}
                  </button>
                </div>
              </form>
            </W3crmContentBox>
          </div>

          <div className="col-xl-6">
            <W3crmContentBox
              titulo={copies.length > 0 ? `${copies.length} variaciones generadas` : "Resultados"}
              icono="fa-solid fa-lightbulb"
            >
              {loading ? (
                <W3crmCargando texto="Generando con IA…" />
              ) : copies.length === 0 ? (
                <W3crmEmptyState
                  title="Sin resultados todavía"
                  description={`Describe tu mensaje y la IA generará ${variations} versiones optimizadas para conversión.`}
                />
              ) : (
                copies.map((copy, i) => (
                  <div className="card border mb-3" key={i}>
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div className="flex-grow-1">
                          <p className="text-muted fs-12 mb-1">Variación {i + 1}</p>
                          <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{copy}</p>
                        </div>
                        <button type="button" className="btn btn-primary light btn-sm flex-shrink-0"
                          aria-label={`Copiar variación ${i + 1}`}
                          onClick={() => copyToClipboard(copy, i)}>
                          {copied === i ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                      {type === "email_subject" && (
                        <p className="text-muted fs-12 mt-2 mb-0">{copy.length} caracteres</p>
                      )}
                      {type === "sms_message" && (
                        <div className="d-flex align-items-center gap-2 mt-2">
                          <div className="progress flex-grow-1" style={{ height: 4 }}>
                            <div className={`progress-bar ${copy.length > 160 ? "bg-danger" : "bg-success"}`}
                              role="progressbar"
                              aria-valuenow={Math.min(copy.length, 160)}
                              aria-valuemin={0} aria-valuemax={160}
                              aria-label={`Longitud de la variación ${i + 1}`}
                              style={{ width: `${Math.min((copy.length / 160) * 100, 100)}%` }} />
                          </div>
                          <span className={`fs-12 ${copy.length > 160 ? "text-danger" : "text-muted"}`}>
                            {copy.length}/160
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}

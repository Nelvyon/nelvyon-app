"use client";

/**
 * /saas/chat sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: hilo de mensajes, sugerencias y compositor -> `W3crmContentBox`
 * (`card-body` con scroll propio). Sin componentes nuevos.
 *
 * Inventario: sin `data-testid`. Lo cubre `capture-marketing-shots.spec.ts:47`,
 * que espera texto visible que case con `/Chat|IA|convers|mensaje/i`: lo
 * satisfacen el titulo "Asistente IA" y el boton "Nueva conversación", ambos
 * conservados. Tambien `saas-nav-full-coverage`.
 *
 * Logica de NELVYON intacta: `GET /api/saas/chat` con `credentials:
 * "same-origin"` (historial + `openai_configured`), el `POST` que reenvia el
 * hilo COMPLETO en `messages` y el `DELETE` que lo borra; el saludo inicial,
 * las seis sugerencias, el auto-scroll al final, Enter para enviar y
 * Shift+Enter para nueva linea, y el bloqueo del envio cuando OpenAI no esta
 * configurado.
 *
 * Unico cambio de comportamiento: el `window.confirm()` pasa al dialogo de
 * sweetalert2 que ya usa el resto del SaaS migrado.
 */
import { useEffect, useRef, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Cómo creo una campaña de email para reactivar clientes inactivos?",
  "¿Qué agente IA me recomiendas para mejorar mis ventas B2B?",
  "Analiza qué debo mejorar en mi estrategia de SEO",
  "¿Cómo configuro un workflow para dar la bienvenida a nuevos contactos?",
  "¿Qué diferencia hay entre SMS y WhatsApp para marketing?",
  "Crea un plan de contenido para redes sociales este mes",
];

const GREETING: Message = {
  role: "assistant",
  content:
    "Hola 👋 Soy tu asistente de marketing IA. Puedo ayudarte con CRM, campañas, SEO, publicidad, redes sociales, workflows, agentes IA y mucho más. ¿En qué empezamos?",
};

/** Un `role` fuera de catalogo se trata como del asistente, no rompe el hilo. */
function esUsuario(role: unknown): boolean {
  return role === "user";
}

export default function SaasChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(null);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/chat", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          openai_configured?: boolean;
          messages?: { role: "user" | "assistant"; content: string }[];
        };
        setOpenaiConfigured(data.openai_configured ?? false);
        // Un `messages` que no sea array reventaba el `.length`/`.map`.
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              role: esUsuario(m?.role) ? "user" : "assistant",
              content: String(m?.content ?? ""),
            })),
          );
        }
      } catch {
        setOpenaiConfigured(false);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, []);

  async function handleNewConversation() {
    const r = await Alert.fire({
      title: "¿Borrar todo el historial de esta conversación?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Borrar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    setClearing(true);
    try {
      await fetch("/api/saas/chat", { method: "DELETE", credentials: "same-origin" });
      setMessages([GREETING]);
    } finally {
      setClearing(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/saas/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? data.error ?? "Error al responder." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "No pude conectar con el asistente. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Asistente IA" parentTitle="Inteligencia" pageTitle="Chat" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Tu experto en marketing digital disponible 24/7 — historial guardado por usuario
            </p>

            {openaiConfigured === false && (
              <div className="alert alert-warning" role="alert">
                OpenAI no está configurado en el servidor (<code>OPENAI_API_KEY</code>). El chat estará
                disponible cuando el administrador active la integración.
              </div>
            )}

            <W3crmContentBox
              titulo="Conversación"
              icono="fa-solid fa-comments"
              acciones={
                messages.length > 1 ? (
                  <button type="button" className="btn btn-primary light btn-sm me-2" disabled={clearing}
                    onClick={() => void handleNewConversation()}>
                    {clearing ? "Borrando…" : "Nueva conversación"}
                  </button>
                ) : undefined
              }
            >
              {/* El hilo se desborda dentro de su propia caja, nunca en la pagina. */}
              <div className="overflow-auto mb-3" style={{ maxHeight: "50vh" }}>
                {historyLoading && <p className="text-center text-muted fs-12">Cargando historial…</p>}
                {messages.map((m, i) => {
                  const usuario = esUsuario(m.role);
                  return (
                    <div key={i} className={`d-flex gap-3 mb-3 ${usuario ? "flex-row-reverse" : ""}`}>
                      <span
                        className={`avatar avatar-sm rounded-circle d-inline-flex align-items-center justify-content-center text-white ${usuario ? "bg-secondary" : "bg-primary"}`}
                        style={{ width: 36, height: 36, flex: "0 0 36px" }}
                        aria-hidden="true"
                      >
                        {usuario ? "Tú" : "N"}
                      </span>
                      <div
                        className={`rounded p-3 ${usuario ? "bg-primary text-white" : "bg-light"}`}
                        style={{ maxWidth: "80%" }}
                      >
                        <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="d-flex gap-3 mb-3">
                    <span
                      className="avatar avatar-sm rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36, flex: "0 0 36px" }}
                      aria-hidden="true"
                    >
                      N
                    </span>
                    <div className="rounded bg-light p-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Escribiendo…</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {messages.length === 1 && (
                <div className="border-top pt-3 mb-3">
                  <p className="text-black font-w600 fs-14">Sugerencias:</p>
                  <div className="d-flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="btn btn-primary light btn-sm"
                        onClick={() => void send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-top pt-3">
                <div className="form-group mb-2">
                  <label htmlFor="chat-input" className="text-black font-w600">Tu mensaje</label>
                  <textarea
                    id="chat-input"
                    className="form-control"
                    rows={2}
                    placeholder="Pregunta cualquier cosa sobre marketing, SEO, publicidad, agentes IA… (Enter para enviar)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                  />
                </div>
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="text-muted fs-12">Shift+Enter para nueva línea</span>
                  <button type="button" className="btn btn-primary"
                    disabled={!input.trim() || loading || openaiConfigured === false}
                    onClick={() => void send()}>
                    {loading ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </div>
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}

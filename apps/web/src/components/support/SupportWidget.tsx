"use client";

import { useCallback, useEffect, useState } from "react";

type View = "home" | "new_ticket" | "my_tickets";

type SupportCategory = "billing" | "technical" | "feature_request" | "other";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  subject: string;
  body: string;
  category: SupportCategory;
  status: TicketStatus;
  priority: string;
  templateUsed: string | null;
  autoResponse: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  category: SupportCategory;
  title: string;
  description: string;
  autoResponse: string;
}

const CATEGORY_META: { id: SupportCategory; label: string; icon: string }[] = [
  { id: "billing", label: "Facturación", icon: "€" },
  { id: "technical", label: "Técnico", icon: "⚙" },
  { id: "feature_request", label: "Sugerencia", icon: "💡" },
  { id: "other", label: "Otro", icon: "⋯" },
];

function statusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-amber-100 text-amber-900";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "closed":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export interface SupportCenterBodyProps {
  /** Full-page layout: wider container, no fixed panel chrome */
  embedded?: boolean;
  onRequestClose?: () => void;
}

export function SupportCenterBody({ embedded, onRequestClose }: SupportCenterBodyProps) {
  const [view, setView] = useState<View>("home");
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [extraBody, setExtraBody] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ ticketId: string; autoResponse: string | null } | null>(null);

  const loadTemplates = useCallback(async (cat: SupportCategory) => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch(`/api/support/templates?category=${encodeURIComponent(cat)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
      const data = (await res.json()) as { templates: Template[] };
      setTemplates(data.templates ?? []);
    } catch (e: unknown) {
      setTemplatesError(e instanceof Error ? e.message : "Error");
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const res = await fetch("/api/support/tickets", { credentials: "same-origin", cache: "no-store" });
      if (res.status === 401) throw new Error("Sesión requerida");
      if (!res.ok) throw new Error("No se pudieron cargar los tickets");
      const data = (await res.json()) as { tickets: Ticket[] };
      setTickets(data.tickets ?? []);
    } catch (e: unknown) {
      setTicketsError(e instanceof Error ? e.message : "Error");
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "new_ticket" && category) {
      void loadTemplates(category);
    }
  }, [view, category, loadTemplates]);

  useEffect(() => {
    if (view === "my_tickets") {
      void loadTickets();
    }
  }, [view, loadTickets]);

  const goHome = () => {
    setView("home");
    setCategory(null);
    setSelectedTemplate(null);
    setSubject("");
    setExtraBody("");
    setSuccess(null);
    setSubmitError(null);
    setTemplatesError(null);
    setTicketsError(null);
  };

  const pickCategory = (cat: SupportCategory) => {
    setCategory(cat);
    setSelectedTemplate(null);
    setSubject("");
    setExtraBody("");
    setSuccess(null);
    setSubmitError(null);
    setView("new_ticket");
  };

  const pickTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setSubject(t.title);
    setExtraBody("");
    setSuccess(null);
    setSubmitError(null);
  };

  const submitTicket = async () => {
    if (!category || !subject.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const bodyParts = [selectedTemplate?.description ? `Contexto: ${selectedTemplate.description}` : "", extraBody.trim()]
        .filter(Boolean)
        .join("\n\n");
      const finalBody = bodyParts.length > 0 ? bodyParts : "(sin detalle adicional)";
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: finalBody,
          category,
          priority: "normal",
          templateId: selectedTemplate?.id,
        }),
      });
      if (res.status === 401) throw new Error("Sesión requerida");
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Error al enviar");
      }
      const data = (await res.json()) as { ticketId: string; autoResponse: string | null };
      setSuccess({ ticketId: data.ticketId, autoResponse: data.autoResponse });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const closeRemoteTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok && res.status !== 204) throw new Error("No se pudo cerrar");
      await loadTickets();
      setExpandedId(null);
    } catch {
      /* best-effort */
    }
  };

  const headerRow = (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 className="text-lg font-semibold text-slate-900">Soporte</h2>
      <div className="flex gap-2">
        {view !== "home" ? (
          <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={goHome}>
            Inicio
          </button>
        ) : null}
        {onRequestClose ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onRequestClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );

  const inner = (
    <div className={embedded ? "space-y-4" : "flex max-h-[600px] flex-col"}>
      {!embedded ? headerRow : null}
      <div className={`space-y-4 px-4 py-3 ${embedded ? "" : "min-h-0 flex-1 overflow-y-auto"}`}>
        {success ? (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Ticket creado</p>
            <p>
              ID: <span className="font-mono">{success.ticketId}</span>
            </p>
            {success.autoResponse ? (
              <div className="rounded-md bg-white/80 p-3 text-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">Respuesta automática</p>
                <p className="mt-1 whitespace-pre-wrap">{success.autoResponse}</p>
              </div>
            ) : null}
            <button
              type="button"
              className="w-full rounded-lg bg-[#01696F] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              onClick={() => {
                setSuccess(null);
                goHome();
                onRequestClose?.();
              }}
            >
              Cerrar
            </button>
          </div>
        ) : null}

        {!success && view === "home" ? (
          <>
            <p className="text-base font-medium text-slate-800">¿Cómo podemos ayudarte?</p>
            <ul className="space-y-2">
              {CATEGORY_META.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm shadow-sm transition hover:border-[#01696F]/40 hover:bg-slate-50"
                    onClick={() => pickCategory(c.id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#01696F]/10 text-[#01696F]">
                      {c.icon}
                    </span>
                    <span className="font-medium text-slate-900">{c.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={() => {
                setView("my_tickets");
                setSuccess(null);
              }}
            >
              Mis tickets anteriores
            </button>
          </>
        ) : null}

        {!success && view === "new_ticket" && category ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Categoría: <span className="font-medium text-slate-900">{CATEGORY_META.find((x) => x.id === category)?.label}</span>
            </p>
            {templatesLoading ? <p className="text-sm text-slate-500">Cargando plantillas…</p> : null}
            {templatesError ? <p className="text-sm text-red-600">{templatesError}</p> : null}
            {!templatesLoading && !templatesError ? (
              <ul className="space-y-2">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedTemplate?.id === t.id
                          ? "border-[#01696F] bg-[#01696F]/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                      onClick={() => pickTemplate(t)}
                    >
                      <span className="block font-medium text-slate-900">{t.title}</span>
                      <span className="mt-1 block text-xs text-slate-600">{t.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedTemplate ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">Asunto</label>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="text-xs font-semibold uppercase text-amber-800">Respuesta automática</p>
                  <p className="mt-1 whitespace-pre-wrap">{selectedTemplate.autoResponse}</p>
                </div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Detalle adicional (opcional)</label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={extraBody}
                  onChange={(e) => setExtraBody(e.target.value)}
                  placeholder="Añade contexto o capturas descritas aquí…"
                />
              </div>
            ) : null}
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            <button
              type="button"
              disabled={!selectedTemplate || submitting || !subject.trim()}
              className="w-full rounded-lg bg-[#01696F] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void submitTicket()}
            >
              {submitting ? "Enviando…" : "Enviar ticket"}
            </button>
          </div>
        ) : null}

        {!success && view === "my_tickets" ? (
          <div className="space-y-3">
            {ticketsLoading ? <p className="text-sm text-slate-500">Cargando…</p> : null}
            {ticketsError ? <p className="text-sm text-red-600">{ticketsError}</p> : null}
            {!ticketsLoading && tickets.length === 0 ? <p className="text-sm text-slate-500">No hay tickets aún.</p> : null}
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm"
                    onClick={() => setExpandedId((id) => (id === t.id ? null : t.id))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{t.subject}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(t.createdAt)}</span>
                  </button>
                  {expandedId === t.id ? (
                    <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap">{t.body}</p>
                      {t.autoResponse ? (
                        <div className="rounded border border-amber-100 bg-amber-50/80 p-2 text-xs text-amber-950">
                          <span className="font-semibold">Auto: </span>
                          {t.autoResponse}
                        </div>
                      ) : null}
                      {t.status !== "closed" && t.status !== "resolved" ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-[#01696F] underline"
                          onClick={() => void closeRemoteTicket(t.id)}
                        >
                          Cerrar ticket
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm">{inner}</div>;
  }

  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-white shadow-xl">{inner}</div>
  );
}

export function SupportWidget() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (!cancelled) setAuthed(res.ok);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authed !== true) return null;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#01696F] text-2xl font-bold text-white shadow-lg hover:opacity-95"
        aria-label="Ayuda"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-4 sm:items-center sm:justify-end sm:p-8"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <SupportCenterBody onRequestClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

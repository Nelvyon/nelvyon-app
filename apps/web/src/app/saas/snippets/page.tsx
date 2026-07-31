"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type SnippetChannel = "email" | "sms" | "whatsapp" | "social" | "call";

interface Snippet {
  id: string;
  name: string;
  content: string;
  channels: string[];
  variables: string[];
  shortcut: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<SnippetChannel, { label: string; icon: string; color: string }> = {
  email: { label: "Email", icon: "📧", color: "bg-primary/10 text-primary border-primary/20" },
  sms: { label: "SMS", icon: "💬", color: "bg-success/10 text-success border-success/20" },
  whatsapp: { label: "WhatsApp", icon: "📱", color: "bg-success/10 text-success border-success/20" },
  social: { label: "Redes Sociales", icon: "📣", color: "bg-warning/10 text-warning border-warning/20" },
  call: { label: "Llamada", icon: "📞", color: "bg-muted text-muted-foreground border-border" },
};

function primaryChannel(s: Snippet): SnippetChannel {
  const c = s.channels[0];
  if (c === "email" || c === "sms" || c === "whatsapp" || c === "social" || c === "call") return c;
  return "email";
}

function SnippetModal({ snippet, onClose }: { snippet?: Snippet; onClose: () => void }) {
  const [name, setName] = useState(snippet?.name ?? "");
  const [type, setType] = useState<SnippetChannel>(snippet ? primaryChannel(snippet) : "email");
  const [content, setContent] = useState(snippet?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function detectVariables(text: string) {
    return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!))];
  }

  const variables = detectVariables(content);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: snippet?.id,
        name: name.trim(),
        content,
        channels: [type],
        variables,
      };
      const res = await fetch("/api/saas/snippets", {
        method: snippet ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function copyContent() {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{snippet ? "Editar snippet" : "Nuevo snippet"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={(e) => void save(e)} className="space-y-4 p-6">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Bienvenida lead frío"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Canal</label>
              <select value={type} onChange={e => setType(e.target.value as SnippetChannel)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {(Object.keys(TYPE_CONFIG) as SnippetChannel[]).map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Contenido * — usa {"{{variable}}"} para personalizar</label>
              <button type="button" onClick={copyContent} className="text-xs text-primary hover:underline">{copied ? "✓ Copiado" : "Copiar"}</button>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
              placeholder="Hola {{nombre}}, gracias por..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none font-mono" />
          </div>
          {variables.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Variables detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => <span key={v} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">{`{{${v}}}`}</span>)}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Guardar snippet"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasSnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Snippet | undefined>();
  const [filterType, setFilterType] = useState<SnippetChannel | "all">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/snippets");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json()) as { snippets?: Snippet[] };
      setSnippets(d.snippets ?? []);
    } catch (e) {
      setSnippets([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function copySnippet(s: Snippet) {
    void navigator.clipboard.writeText(s.content);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = snippets.filter(s => {
    if (filterType !== "all" && primaryChannel(s) !== filterType) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="snippets" />}>
      <div className="flex flex-col gap-6 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Snippets" subtitle="Biblioteca de textos reutilizables para email, SMS, WhatsApp y llamadas" />
              <NelvyonDsButton onClick={() => { setEditing(undefined); setShowModal(true); }}>+ Nuevo snippet</NelvyonDsButton>
            </div>

            {loadError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
                {loadError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiTile icon="✂️" label="Total snippets" value={snippets.length} />
              <KpiTile icon="📡" label="Canales" value={new Set(snippets.flatMap(s => s.channels)).size} accent />
              <KpiTile icon="🧩" label="Con variables" value={snippets.filter(s => (s.variables?.length ?? 0) > 0).length} />
            </div>

            <div className="flex flex-wrap gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar snippet..."
                className="h-9 flex-1 min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setFilterType("all")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>Todos</button>
                {(Object.keys(TYPE_CONFIG) as SnippetChannel[]).map(t => (
                  <button type="button" key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                    {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : filtered.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="mt-4 text-lg font-semibold text-foreground">Sin snippets</p>
                <p className="mt-2 text-sm text-muted-foreground">Crea textos reutilizables para ahorrar tiempo en tus comunicaciones</p>
                <NelvyonDsButton className="mt-5" onClick={() => { setEditing(undefined); setShowModal(true); }}>+ Primer snippet</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map(s => {
                  const cfg = TYPE_CONFIG[primaryChannel(s)];
                  return (
                    <NelvyonDsCard key={s.id} className="flex flex-col gap-3 p-4 transition-colors hover:border-primary/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg border px-2 py-1 text-xs font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                          {(s.variables?.length ?? 0) > 0 && <span className="text-xs text-muted-foreground">{s.variables.length} var.</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => copySnippet(s)} className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                            {copiedId === s.id ? "✓" : "⎘"}
                          </button>
                          <button type="button" onClick={() => { setEditing(s); setShowModal(true); }} className="rounded p-1 text-xs text-muted-foreground transition-colors hover:text-primary">✎</button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="mt-1 line-clamp-3 font-mono text-xs text-muted-foreground">{s.content}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                        <span>{s.channels.join(", ") || "sin canal"}</span>
                        <span>{new Date(s.updatedAt).toLocaleDateString("es-ES")}</span>
                      </div>
                    </NelvyonDsCard>
                  );
                })}
              </div>
            )}
      {showModal && <SnippetModal snippet={editing} onClose={() => { setShowModal(false); void load(); }} />}
      </div>
    </SaasShellLayout>
  );
}

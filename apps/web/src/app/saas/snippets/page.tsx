"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type SnippetType = "email" | "sms" | "whatsapp" | "social" | "call";

interface Snippet {
  id: string;
  name: string;
  type: SnippetType;
  content: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<SnippetType, { label: string; icon: string; color: string }> = {
  email: { label: "Email", icon: "📧", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  sms: { label: "SMS", icon: "💬", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  whatsapp: { label: "WhatsApp", icon: "📱", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  social: { label: "Redes Sociales", icon: "📣", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  call: { label: "Llamada", icon: "📞", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};


function SnippetModal({ snippet, onClose }: { snippet?: Snippet; onClose: () => void }) {
  const [name, setName] = useState(snippet?.name ?? "");
  const [type, setType] = useState<SnippetType>(snippet?.type ?? "email");
  const [content, setContent] = useState(snippet?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function detectVariables(text: string) {
    return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
  }

  const variables = detectVariables(content);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/saas/snippets", {
        method: snippet ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: snippet?.id, name, type, content }),
      });
      onClose();
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
        <form onSubmit={save} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Bienvenida lead frío"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Canal</label>
              <select value={type} onChange={e => setType(e.target.value as SnippetType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {(Object.keys(TYPE_CONFIG) as SnippetType[]).map(t => (
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
  const [filterType, setFilterType] = useState<SnippetType | "all">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/snippets");
      if (res.ok) {
        const d = (await res.json()) as { snippets?: Snippet[] };
        setSnippets(d.snippets ?? []);
      } else setSnippets([]);
    } catch { setSnippets([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function copySnippet(s: Snippet) {
    void navigator.clipboard.writeText(s.content);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const filtered = snippets.filter(s => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUsage = snippets.reduce((s, sn) => s + sn.usageCount, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="snippets" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Snippets" subtitle="Biblioteca de textos reutilizables para email, SMS, WhatsApp y llamadas" />
              <NelvyonDsButton onClick={() => { setEditing(undefined); setShowModal(true); }}>+ Nuevo snippet</NelvyonDsButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total snippets", value: snippets.length },
                { label: "Usos totales", value: totalUsage },
                { label: "Canales", value: new Set(snippets.map(s => s.type)).size },
                { label: "Con variables", value: snippets.filter(s => s.variables.length > 0).length },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar snippet..."
                className="h-9 flex-1 min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setFilterType("all")} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>Todos</button>
                {(Object.keys(TYPE_CONFIG) as SnippetType[]).map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                    {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : filtered.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-5xl">✂️</p>
                <p className="mt-4 text-lg font-semibold text-foreground">Sin snippets</p>
                <p className="mt-2 text-sm text-muted-foreground">Crea textos reutilizables para ahorrar tiempo en tus comunicaciones</p>
                <NelvyonDsButton className="mt-5" onClick={() => { setEditing(undefined); setShowModal(true); }}>+ Primer snippet</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map(s => {
                  const cfg = TYPE_CONFIG[s.type];
                  return (
                    <NelvyonDsCard key={s.id} className="flex flex-col gap-3 p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg border px-2 py-1 text-xs font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                          {s.variables.length > 0 && <span className="text-xs text-muted-foreground">{s.variables.length} var.</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => copySnippet(s)} className="rounded p-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            {copiedId === s.id ? "✓" : "⎘"}
                          </button>
                          <button onClick={() => { setEditing(s); setShowModal(true); }} className="rounded p-1 text-xs text-muted-foreground hover:text-primary transition-colors">✎</button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-3 font-mono">{s.content}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                        <span>{s.usageCount} usos</span>
                        <span>{new Date(s.updatedAt).toLocaleDateString("es-ES")}</span>
                      </div>
                    </NelvyonDsCard>
                  );
                })}
              </div>
            )}
      {showModal && <SnippetModal snippet={editing} onClose={() => { setShowModal(false); void load(); }} />}
    </SaasShellLayout>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface ProspectFilter {
  industry: string;
  country: string;
  minEmployees: number;
  maxEmployees: number;
  jobTitle: string;
  keywords: string;
}

interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  country: string;
  employees: number;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  enriched: boolean;
  addedToCrm: boolean;
}

interface ProspectingList {
  id: string;
  name: string;
  filter: ProspectFilter;
  prospects: number;
  enriched: number;
  createdAt: string;
  status: "running" | "done" | "paused";
}


const STATUS_CONFIG: Record<ProspectingList["status"], { label: string; color: string; icon: string }> = {
  running: { label: "Buscando…", color: "text-yellow-400", icon: "⟳" },
  done: { label: "Completada", color: "text-green-400", icon: "✓" },
  paused: { label: "Pausada", color: "text-muted-foreground", icon: "‖" },
};

const INDUSTRIES = ["Todos", "Tecnología", "Marketing", "Retail", "Finanzas", "Salud", "Educación", "Inmobiliaria", "Turismo"];
const COUNTRIES = ["Todos", "ES", "MX", "AR", "CO", "US", "UK"];

export default function SaasProspectingPage() {
  const [lists, setLists] = useState<ProspectingList[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"lists" | "search">("lists");
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProspectFilter>({ industry: "Todos", country: "Todos", minEmployees: 1, maxEmployees: 10000, jobTitle: "", keywords: "" });
  const [searching, setSearching] = useState(false);
  const [listName, setListName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/prospecting");
      if (res.ok) {
        const d = (await res.json()) as { lists?: ProspectingList[]; results?: ProspectingList[] };
        setLists(d.lists ?? d.results ?? []);
      } else setLists([]);
    } catch { setLists([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!listName.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/saas/prospecting/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName, filter }),
      });
      if (res.ok) {
        const d = (await res.json()) as { prospects?: Prospect[] };
        setProspects(d.prospects ?? []);
      } else setProspects([]);
    } catch { setProspects([]); }
    finally { setSearching(false); }
  }

  function addToCrm(ids: string[]) {
    setProspects(prev => prev.map(p => ids.includes(p.id) ? { ...p, addedToCrm: true } : p));
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="prospecting" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Prospección" subtitle="Encuentra y enriquece contactos B2B para tus campañas outbound" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(["lists", "search"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {t === "lists" ? "Mis listas" : "Nueva búsqueda"}
                </button>
              ))}
            </div>

            {tab === "lists" ? (
              loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />)}</div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Total prospectos", value: lists.reduce((s, l) => s + l.prospects, 0).toLocaleString("es-ES") },
                      { label: "Enriquecidos", value: lists.reduce((s, l) => s + l.enriched, 0).toLocaleString("es-ES") },
                      { label: "Listas activas", value: lists.filter(l => l.status !== "paused").length },
                    ].map(({ label, value }) => (
                      <NelvyonDsCard key={label} className="p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                      </NelvyonDsCard>
                    ))}
                  </div>

                  {lists.map(list => {
                    const st = STATUS_CONFIG[list.status];
                    const enrichedPct = list.prospects > 0 ? Math.round((list.enriched / list.prospects) * 100) : 0;
                    return (
                      <NelvyonDsCard key={list.id} className="p-4">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground">{list.name}</h3>
                              <span className={`text-xs font-medium ${st.color}`}>{st.icon} {st.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {list.filter.industry !== "Todos" && <span className="rounded-md bg-muted/30 px-2 py-0.5">{list.filter.industry}</span>}
                              {list.filter.country !== "Todos" && <span className="rounded-md bg-muted/30 px-2 py-0.5">{list.filter.country}</span>}
                              {list.filter.jobTitle && <span className="rounded-md bg-muted/30 px-2 py-0.5">{list.filter.jobTitle}</span>}
                              <span className="rounded-md bg-muted/30 px-2 py-0.5">{list.filter.minEmployees}–{list.filter.maxEmployees} emp.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${enrichedPct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{enrichedPct}% enriquecidos</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-foreground">{list.prospects.toLocaleString("es-ES")}</p>
                            <p className="text-xs text-muted-foreground">prospectos</p>
                            <NelvyonDsButton variant="ghost" className="mt-2 text-xs" onClick={() => { setSelectedList(list.id); setTab("lists"); }}>
                              Ver prospectos →
                            </NelvyonDsButton>
                          </div>
                        </div>
                        {selectedList === list.id && (
                          <div className="mt-4 border-t border-border pt-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-medium text-foreground">Prospectos</p>
                              <NelvyonDsButton className="text-xs" onClick={() => addToCrm(prospects.filter(p => !p.addedToCrm).map(p => p.id))}>
                                Añadir todos al CRM
                              </NelvyonDsButton>
                            </div>
                            <div className="space-y-2">
                              {prospects.map(p => (
                                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/10 transition-colors">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{p.name[0]}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.title} · {p.company}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.email && <span className="text-xs text-green-400">✉</span>}
                                    {p.phone && <span className="text-xs text-green-400">☎</span>}
                                    {p.linkedinUrl && <span className="text-xs text-blue-400">in</span>}
                                    {p.addedToCrm ? (
                                      <span className="text-xs text-muted-foreground">En CRM</span>
                                    ) : (
                                      <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => addToCrm([p.id])}>+ CRM</NelvyonDsButton>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </NelvyonDsCard>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                {/* Search form */}
                <div>
                  <NelvyonDsCard className="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-foreground">Filtros de búsqueda</h3>
                    <form onSubmit={search} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de la lista *</label>
                        <input value={listName} onChange={e => setListName(e.target.value)} placeholder="Ej: CMOs Tech España"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Cargo / Título</label>
                        <input value={filter.jobTitle} onChange={e => setFilter(f => ({ ...f, jobTitle: e.target.value }))} placeholder="CEO, CMO, Director…"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Industria</label>
                        <select value={filter.industry} onChange={e => setFilter(f => ({ ...f, industry: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                          {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">País</label>
                        <select value={filter.country} onChange={e => setFilter(f => ({ ...f, country: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Empleados mín.</label>
                          <input type="number" min={1} value={filter.minEmployees} onChange={e => setFilter(f => ({ ...f, minEmployees: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Empleados máx.</label>
                          <input type="number" min={1} value={filter.maxEmployees} onChange={e => setFilter(f => ({ ...f, maxEmployees: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Palabras clave</label>
                        <input value={filter.keywords} onChange={e => setFilter(f => ({ ...f, keywords: e.target.value }))} placeholder="SaaS, ecommerce, startup…"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                      </div>
                      <NelvyonDsButton type="submit" disabled={searching || !listName.trim()} className="w-full">
                        {searching ? "Buscando…" : "🔍 Buscar prospectos"}
                      </NelvyonDsButton>
                    </form>
                  </NelvyonDsCard>
                </div>

                {/* Results */}
                <div>
                  {prospects.length === 0 ? (
                    <NelvyonDsCard className="p-16 text-center">
                      <p className="text-5xl">🔍</p>
                      <p className="mt-4 text-lg font-semibold text-foreground">Configura tus filtros</p>
                      <p className="mt-2 text-sm text-muted-foreground">Define el perfil ideal de tu prospecto y haz clic en Buscar</p>
                    </NelvyonDsCard>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{prospects.length} prospectos encontrados</p>
                        <NelvyonDsButton className="text-xs" onClick={() => addToCrm(prospects.filter(p => !p.addedToCrm).map(p => p.id))}>
                          Añadir todos al CRM
                        </NelvyonDsButton>
                      </div>
                      {prospects.map(p => (
                        <NelvyonDsCard key={p.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{p.name[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start gap-2">
                                <div>
                                  <p className="font-semibold text-foreground">{p.name}</p>
                                  <p className="text-xs text-muted-foreground">{p.title} · {p.company} · {p.employees} emp.</p>
                                </div>
                                {p.enriched && <NelvyonDsBadge tone="success">Enriquecido</NelvyonDsBadge>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {p.email && <span className="flex items-center gap-1"><span className="text-green-400">✉</span>{p.email}</span>}
                                {p.phone && <span className="flex items-center gap-1"><span className="text-green-400">☎</span>{p.phone}</span>}
                                {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline"><span>in</span> LinkedIn</a>}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {p.addedToCrm ? (
                                <span className="text-xs text-muted-foreground">✓ En CRM</span>
                              ) : (
                                <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => addToCrm([p.id])}>+ CRM</NelvyonDsButton>
                              )}
                            </div>
                          </div>
                        </NelvyonDsCard>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
    </SaasShellLayout>
  );
}

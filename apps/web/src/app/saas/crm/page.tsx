"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/core/ui/utils";

type ContactStatus = "lead" | "prospect" | "client" | "churned";
type PipelineStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type ActivityType = "note" | "call" | "email" | "meeting" | "task";

type SaasContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: ContactStatus;
  pipelineStage: PipelineStage;
  value: number;
  notes: string | null;
  tags: string[];
};

type ContactActivity = {
  id: string;
  activityType: ActivityType;
  description: string;
  createdAt: string;
};

type PipelineSummaryItem = { stage: PipelineStage; count: number; totalValue: number };

const NAV = ["Dashboard", "Servicios", "CRM", "Workflows", "Campanas", "Configuracion"] as const;
const STAGES: PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export default function SaasCrmPage() {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<"contacts" | "pipeline">("contacts");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<SaasContact[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummaryItem[]>([]);
  const [selected, setSelected] = useState<SaasContact | null>(null);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContactStatus>("");
  const [stageFilter, setStageFilter] = useState<"" | PipelineStage>("");
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newValue, setNewValue] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [activityDesc, setActivityDesc] = useState("");
  const [tenantPlan, setTenantPlan] = useState<"starter" | "pro" | "enterprise">("starter");
  const [tenantCompany, setTenantCompany] = useState("");

  async function loadContacts() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (stageFilter) params.set("stage", stageFilter);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/saas/crm/contacts?${params.toString()}`, { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/crm")}`);
      return;
    }
    if (!res.ok) throw new Error(t("common.error"));
    const body = (await res.json()) as { contacts: SaasContact[] };
    setContacts(body.contacts ?? []);
  }

  async function loadPipeline() {
    const res = await fetch("/api/saas/crm/pipeline", { credentials: "same-origin" });
    if (!res.ok) throw new Error(t("common.error"));
    const body = (await res.json()) as { pipeline: PipelineSummaryItem[] };
    setPipeline(body.pipeline ?? []);
  }

  async function loadTenant() {
    const res = await fetch("/api/saas/dashboard", { credentials: "same-origin" });
    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/saas/crm")}`);
      return;
    }
    if (!res.ok) return;
    const body = (await res.json()) as { tenant: { companyName: string; plan: "starter" | "pro" | "enterprise"; onboardingCompleted: boolean } };
    if (!body?.tenant?.onboardingCompleted) {
      router.replace("/saas/onboarding");
      return;
    }
    setTenantCompany(body.tenant.companyName);
    setTenantPlan(body.tenant.plan);
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTenant(), loadContacts(), loadPipeline()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, stageFilter]);

  async function openContact(c: SaasContact) {
    setSelected(c);
    const res = await fetch(`/api/saas/crm/contacts/${c.id}/activities`, { credentials: "same-origin" });
    if (!res.ok) return;
    const body = (await res.json()) as { activity: ContactActivity[] };
    setActivities(body.activity ?? []);
  }

  async function createContact() {
    if (!newName.trim()) return;
    const res = await fetch("/api/saas/crm/contacts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        company: newCompany || null,
        email: newEmail || null,
        value: Number(newValue || "0"),
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewCompany("");
      setNewEmail("");
      setNewValue("");
      await refreshAll();
    }
  }

  async function addActivity() {
    if (!selected || !activityDesc.trim()) return;
    const res = await fetch(`/api/saas/crm/contacts/${selected.id}/activities`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityType, description: activityDesc }),
    });
    if (res.ok) {
      setActivityDesc("");
      await openContact(selected);
    }
  }

  async function moveStage(c: SaasContact, dir: -1 | 1) {
    const idx = STAGES.indexOf(c.pipelineStage);
    const next = STAGES[idx + dir];
    if (!next) return;
    const res = await fetch(`/api/saas/crm/contacts/${c.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: next }),
    });
    if (res.ok) {
      await refreshAll();
    }
  }

  const byStage = useMemo(() => {
    const m = new Map<PipelineStage, SaasContact[]>();
    for (const s of STAGES) m.set(s, []);
    for (const c of contacts) (m.get(c.pipelineStage) as SaasContact[]).push(c);
    return m;
  }, [contacts]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <NelvyonDsCard className="space-y-4">
            <div className="text-lg font-semibold text-foreground">NELVYON</div>
            <LanguageSelector />
            <div className="space-y-2">
              {NAV.map((item) => (
                <div key={item} className={cn("rounded-md px-3 py-2 text-sm", item === "CRM" ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-sm font-medium text-foreground">{tenantCompany || "Empresa"}</p>
              <NelvyonDsBadge tone={tenantPlan === "enterprise" ? "warning" : tenantPlan === "pro" ? "success" : "primary"}>{tenantPlan}</NelvyonDsBadge>
            </div>
            <NelvyonDsButton
              variant="secondary"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
                router.replace("/auth/login");
              }}
            >
              Cerrar sesion
            </NelvyonDsButton>
          </NelvyonDsCard>
        </aside>

        <main className="space-y-6">
          <NelvyonDsSectionHeader eyebrow="SaaS CRM" title={t("crm.title")} subtitle="Gestiona contactos, pipeline y actividades de venta." />

          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton variant={tab === "contacts" ? "primary" : "secondary"} onClick={() => setTab("contacts")}>
              {t("crm.contacts")}
            </NelvyonDsButton>
            <NelvyonDsButton variant={tab === "pipeline" ? "primary" : "secondary"} onClick={() => setTab("pipeline")}>
              {t("crm.pipeline")}
            </NelvyonDsButton>
          </div>

          {loading ? (
            <NelvyonDsCard title="Cargando">
              <p className="text-sm text-muted-foreground">Obteniendo datos del CRM…</p>
            </NelvyonDsCard>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!loading && tab === "contacts" ? (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <NelvyonDsCard title="Contactos">
                <div className="mb-3 grid gap-2 sm:grid-cols-4">
                  <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Buscar nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | ContactStatus)}>
                    <option value="">Estado</option>
                    <option value="lead">lead</option>
                    <option value="prospect">prospect</option>
                    <option value="client">client</option>
                    <option value="churned">churned</option>
                  </select>
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={stageFilter} onChange={(e) => setStageFilter(e.target.value as "" | PipelineStage)}>
                    <option value="">Stage</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <NelvyonDsButton onClick={() => void createContact()}>Nuevo contacto</NelvyonDsButton>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-4">
                  <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nombre *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Empresa" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
                  <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                </div>

                {contacts.length === 0 ? (
                  <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
                    {t("crm.no_contacts")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="pb-2">Nombre</th><th className="pb-2">Empresa</th><th className="pb-2">Email</th><th className="pb-2">Status</th><th className="pb-2">Stage</th><th className="pb-2">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contacts.map((c) => (
                          <tr key={c.id} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => void openContact(c)}>
                            <td className="py-2">{c.name}</td>
                            <td className="py-2">{c.company ?? "-"}</td>
                            <td className="py-2">{c.email ?? "-"}</td>
                            <td className="py-2"><NelvyonDsBadge tone="neutral">{c.status}</NelvyonDsBadge></td>
                            <td className="py-2"><NelvyonDsBadge tone="primary">{c.pipelineStage}</NelvyonDsBadge></td>
                            <td className="py-2">{c.value.toFixed(2)} EUR</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </NelvyonDsCard>

              <NelvyonDsCard title={selected ? `Detalle: ${selected.name}` : "Detalle contacto"}>
                {!selected ? (
                  <p className="text-sm text-muted-foreground">Selecciona un contacto para ver detalle y actividad.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <p className="text-sm"><span className="text-muted-foreground">Empresa:</span> {selected.company ?? "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Email:</span> {selected.email ?? "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Status:</span> {selected.status}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Actividad</h4>
                      {activities.length === 0 ? <p className="text-sm text-muted-foreground">Sin actividades.</p> : null}
                      <ul className="space-y-2">
                        {activities.map((a) => (
                          <li key={a.id} className="flex items-start gap-2 text-sm">
                            <NelvyonDsStatusDot status="ok" label={a.activityType} />
                            <div>
                              <p className="font-medium text-foreground">{a.description}</p>
                              <p className="text-muted-foreground">{a.activityType} · {new Date(a.createdAt).toLocaleString("es-ES")}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid gap-2">
                      <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)}>
                        <option value="note">note</option>
                        <option value="call">call</option>
                        <option value="email">email</option>
                        <option value="meeting">meeting</option>
                        <option value="task">task</option>
                      </select>
                      <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nueva actividad" value={activityDesc} onChange={(e) => setActivityDesc(e.target.value)} />
                      <NelvyonDsButton onClick={() => void addActivity()}>Agregar actividad</NelvyonDsButton>
                    </div>
                  </div>
                )}
              </NelvyonDsCard>
            </section>
          ) : null}

          {!loading && tab === "pipeline" ? (
            <section className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
              {STAGES.map((s) => {
                const stats = pipeline.find((p) => p.stage === s) ?? { stage: s, count: 0, totalValue: 0 };
                const cards = byStage.get(s) ?? [];
                return (
                  <NelvyonDsCard key={s} title={s}>
                    <p className="mb-2 text-xs text-muted-foreground">{stats.count} · {stats.totalValue.toFixed(2)} EUR</p>
                    <div className="space-y-2">
                      {cards.length === 0 ? <p className="text-xs text-muted-foreground">Sin contactos</p> : null}
                      {cards.map((c) => (
                        <div key={c.id} className="rounded-md border border-border bg-card p-2 text-xs">
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-muted-foreground">{c.company ?? "-"}</p>
                          <p className="text-muted-foreground">{c.value.toFixed(2)} EUR</p>
                          <div className="mt-2 flex gap-1">
                            <NelvyonDsButton size="sm" variant="secondary" onClick={() => void moveStage(c, -1)}>◀</NelvyonDsButton>
                            <NelvyonDsButton size="sm" variant="secondary" onClick={() => void moveStage(c, 1)}>▶</NelvyonDsButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </section>
          ) : null}

          <div className="flex gap-2">
            <NelvyonDsButton asChild variant="secondary"><Link href="/saas/dashboard">Volver a Dashboard</Link></NelvyonDsButton>
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader, NelvyonDsStatusDot } from "@/design-system/components";
import { cn } from "@/core/ui/utils";
import { ContactDealsContextPanel } from "@/features/saas-deals/components/ContactDealsContextPanel";
import { DealDetailPanel } from "@/features/saas-deals/components/DealDetailPanel";
import { DealFormModal } from "@/features/saas-deals/components/DealFormModal";
import { DealsKanban } from "@/features/saas-deals/components/DealsKanban";
import { DealsKpiRow } from "@/features/saas-deals/components/DealsKpiRow";
import { SaasEmptyState, SAAS_EMPTY_DESCRIPTION, SAAS_EMPTY_TITLE } from "@/features/saas-shell/components/SaasEmptyState";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import {
  useChangeDealStage,
  useSaasContactDetail,
  useSaasDealMetrics,
  useSaasDeals,
} from "@/features/saas-deals/hooks";
import type { DealStage, SaasDeal } from "@/features/saas-deals/types";

type ContactStatus = "lead" | "prospect" | "client" | "churned";
type PipelineStage = DealStage;
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

const STAGES: PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export default function SaasCrmPage() {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<"contacts" | "pipeline">("contacts");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<SaasContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [changingDealId, setChangingDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [dealFormMode, setDealFormMode] = useState<"create" | "edit">("create");
  const [editingDeal, setEditingDeal] = useState<SaasDeal | null>(null);
  const [presetContactId, setPresetContactId] = useState<string | null>(null);

  const dealsQuery = useSaasDeals();
  const metricsQuery = useSaasDealMetrics();
  const changeStageMutation = useChangeDealStage();
  const contactDetailQuery = useSaasContactDetail(selectedId);

  const selected = useMemo((): SaasContact | null => {
    const fromList = contacts.find((c) => c.id === selectedId);
    if (fromList) return fromList;
    const fromDetail = contactDetailQuery.data?.contact;
    return fromDetail ? { ...fromDetail, tags: fromDetail.tags ?? [] } : null;
  }, [contacts, selectedId, contactDetailQuery.data?.contact]);

  const contactsById = useMemo(
    () => new Map(contacts.map((c) => [c.id, { name: c.name, company: c.company }])),
    [contacts],
  );

  const contactOptions = useMemo(
    () => contacts.map((c) => ({ id: c.id, name: c.name, company: c.company })),
    [contacts],
  );

  const selectedDeal = useMemo(
    () => (dealsQuery.data?.deals ?? []).find((d) => d.id === selectedDealId) ?? null,
    [dealsQuery.data?.deals, selectedDealId],
  );

  function openCreateDeal(contactId?: string | null) {
    setDealFormMode("create");
    setEditingDeal(null);
    setPresetContactId(contactId ?? null);
    setDealFormOpen(true);
  }

  function openEditDeal(deal: SaasDeal) {
    setDealFormMode("edit");
    setEditingDeal(deal);
    setPresetContactId(deal.contactId);
    setDealFormOpen(true);
  }

  function openDealFromContact(deal: SaasDeal) {
    setTab("pipeline");
    setSelectedDealId(deal.id);
  }

  function handleDealFormSuccess(deal: SaasDeal) {
    setSelectedDealId(deal.id);
    void contactDetailQuery.refetch();
  }

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

  async function refreshContacts() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadTenant(), loadContacts()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "pipeline") {
      setTab("pipeline");
    }
  }, []);

  useEffect(() => {
    void refreshContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, stageFilter]);

  async function openContact(c: SaasContact) {
    setSelectedId(c.id);
    const res = await fetch(`/api/saas/crm/contacts/${c.id}/activities`, { credentials: "same-origin" });
    if (!res.ok) {
      setActivities([]);
      return;
    }
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
      await refreshContacts();
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
      void contactDetailQuery.refetch();
    }
  }

  async function handleMoveDealStage(deal: { id: string; stage: DealStage }, nextStage: DealStage) {
    setChangingDealId(deal.id);
    try {
      await changeStageMutation.mutateAsync({ dealId: deal.id, stage: nextStage });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setChangingDealId(null);
    }
  }

  const pipelineEnabled = tab === "pipeline";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SaasSidebar
          activeId={tab === "pipeline" ? "pipeline" : "crm"}
          tenantCompany={tenantCompany || undefined}
          tenantPlan={tenantPlan}
          showLanguageSelector
        />

        <main className="space-y-6">
          <NelvyonDsSectionHeader
            eyebrow="SaaS CRM"
            title={t("crm.title")}
            subtitle="Gestiona contactos, pipeline de deals y actividades de venta."
          />

          <div className="flex flex-wrap gap-2">
            <NelvyonDsButton variant={tab === "contacts" ? "primary" : "secondary"} onClick={() => setTab("contacts")}>
              {t("crm.contacts")}
            </NelvyonDsButton>
            <NelvyonDsButton variant={tab === "pipeline" ? "primary" : "secondary"} onClick={() => setTab("pipeline")}>
              {t("crm.pipeline")}
            </NelvyonDsButton>
          </div>

          {loading && tab === "contacts" ? (
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
                    <option value="">Stage (contacto)</option>
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
                  <SaasEmptyState
                    title={SAAS_EMPTY_TITLE}
                    description={SAAS_EMPTY_DESCRIPTION}
                    action={<NelvyonDsButton onClick={() => void createContact()}>Crear primer contacto</NelvyonDsButton>}
                  />
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
                  <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Selecciona un contacto para ver detalle y actividad." />
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <p className="text-sm"><span className="text-muted-foreground">Empresa:</span> {selected.company ?? "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Email:</span> {selected.email ?? "-"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Status:</span> {selected.status}</p>
                    </div>

                    <ContactDealsContextPanel
                      dealsContext={contactDetailQuery.data?.dealsContext}
                      isLoading={contactDetailQuery.isLoading}
                      error={contactDetailQuery.error}
                      onNewDeal={() => openCreateDeal(selected.id)}
                      onSelectDeal={openDealFromContact}
                    />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Actividad</h4>
                      {activities.length === 0 ? (
                        <SaasEmptyState title={SAAS_EMPTY_TITLE} description="Registra la primera actividad para este contacto." className="p-4" />
                      ) : null}
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

          {pipelineEnabled ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Pipeline oficial basado en <strong className="text-foreground">saas_deals</strong>
                </p>
                <NelvyonDsButton onClick={() => openCreateDeal()}>Nuevo deal</NelvyonDsButton>
              </div>
              <DealsKpiRow
                metrics={metricsQuery.data?.metrics}
                isLoading={metricsQuery.isLoading}
                error={metricsQuery.error}
              />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <DealsKanban
                  deals={dealsQuery.data?.deals ?? []}
                  metrics={metricsQuery.data?.metrics}
                  contactsById={contactsById}
                  isLoading={dealsQuery.isLoading}
                  error={dealsQuery.error}
                  changingDealId={changingDealId}
                  selectedDealId={selectedDealId}
                  onSelectDeal={(deal) => setSelectedDealId(deal.id)}
                  onMoveStage={(deal, stage) => void handleMoveDealStage(deal, stage)}
                />
                <DealDetailPanel
                  deal={selectedDeal}
                  contactsById={contactsById}
                  onEdit={openEditDeal}
                  onDeleted={() => {
                    setSelectedDealId(null);
                    void contactDetailQuery.refetch();
                  }}
                  onClose={() => setSelectedDealId(null)}
                />
              </div>
            </section>
          ) : null}

          <DealFormModal
            open={dealFormOpen}
            mode={dealFormMode}
            deal={editingDeal}
            presetContactId={presetContactId}
            contacts={contactOptions}
            onClose={() => setDealFormOpen(false)}
            onSuccess={handleDealFormSuccess}
          />

          <div className="flex gap-2">
            <NelvyonDsButton asChild variant="secondary"><Link href="/saas/dashboard">Volver a Dashboard</Link></NelvyonDsButton>
          </div>
        </main>
      </div>
    </div>
  );
}

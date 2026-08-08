"use client";

/**
 * /saas/pipeline sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: `QuoteModal` y `PlaybookModal` -> `W3crmModal`; forecast, playbooks,
 * presupuestos y contratos -> `W3crmContentBox` + `W3crmDataTable`; las barras
 * por etapa -> el `progress` de Bootstrap que trae la plantilla; las cinco
 * pestañas -> `nav nav-tabs`.
 *
 * Se conservan intactos los `data-testid` que ya verifica la suite
 * (`pipeline-tabs`, `pipeline-tab-*`, `pipeline-loading`, `contract-number-*`)
 * y los componentes ya probados `DealsKanban`, `DealFormModal` y
 * `DealDetailPanel`, que no se tocan.
 *
 * Logica de NELVYON intacta: `/api/saas/deals`, `/api/saas/deals/[id]/stage`,
 * `/api/saas/playbooks` (y sus `?resource=forecast`, `forecast-by-rep`,
 * `forecast-scenarios`), `/api/saas/quotes`, `/api/saas/quotes/[id]/pdf`,
 * `/api/saas/contracts`, `/api/saas/contracts/[id]` y
 * `/api/saas/crm/contacts`; `load` con su carga en paralelo, `contactsById`,
 * `dealsMetrics`, `handleMoveStage`, `deletePlaybook`, `updateQuoteStatus`, el
 * calculo de subtotal/descuento/IVA/total del presupuesto y sus validaciones.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { DealsKanban } from "@/features/saas-deals/components/DealsKanban";
import { DealFormModal } from "@/features/saas-deals/components/DealFormModal";
import { DealDetailPanel } from "@/features/saas-deals/components/DealDetailPanel";
import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type DealStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
type PlaybookActionType = "task" | "email" | "call" | "note" | "wait";

interface Deal {
  id: string; tenantId: string; contactId: string | null; title: string; value: number;
  currency: string; stage: DealStage; probability: number;
  expectedCloseDate: string | null; source: string | null; ownerUserId: string | null;
  notes: string | null; createdAt: string; updatedAt: string;
}
interface ForecastStage { stage: DealStage; count: number; value: number; weightedValue: number; probability: number }
interface Forecast { weightedTotal: number; bestCase: number; committed: number; byStage: ForecastStage[] }
interface PlaybookAction { id: string; actionType: PlaybookActionType; title: string; description: string | null; template: string | null; waitDays: number | null; sortOrder: number }
interface Playbook { id: string; name: string; stage: DealStage; description: string | null; active: boolean; actions: PlaybookAction[] }
interface QuoteItem { description: string; quantity: number; unitPrice: number; subtotal: number }
interface Quote { id: string; quoteNumber: string; title: string; clientName: string; clientEmail: string | null; currency: string; subtotal: number; discountPct: number; taxPct: number; taxAmount: number; total: number; status: QuoteStatus; dealId: string | null; validUntil: string | null; items: QuoteItem[]; createdAt: string }

interface Contract {
  id: string; contractNumber: string; title: string;
  clientName: string; clientEmail: string;
  currency: string; amount: number; status: string;
  createdAt: string; signedAt: string | null;
}
interface ContactLite { id: string; name: string; company: string | null }

const STAGE_LABELS: Record<DealStage, string> = { new: "Nuevo", contacted: "Contactado", qualified: "Calificado", proposal: "Propuesta", won: "Ganado", lost: "Perdido" };
const STAGE_BADGE: Record<DealStage, string> = { new: "badge-primary", contacted: "badge-info", qualified: "badge-secondary", proposal: "badge-warning", won: "badge-success", lost: "badge-danger" };
const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aceptado", rejected: "Rechazado", expired: "Expirado" };
const QUOTE_BADGE: Record<QuoteStatus, string> = { draft: "badge-primary", sent: "badge-warning", accepted: "badge-success", rejected: "badge-danger", expired: "badge-danger" };
const ACTION_ICON: Record<PlaybookActionType, string> = { task: "✅", email: "📧", call: "📞", note: "📝", wait: "⏳" };
const CONTRACT_BADGE: Record<string, string> = { active: "badge-success", signed: "badge-primary", sent: "badge-warning", draft: "badge-secondary", expired: "badge-danger", cancelled: "badge-danger" };
const CONTRACT_LABEL: Record<string, string> = { draft: "Borrador", sent: "Enviado", signed: "Firmado", active: "Activo", expired: "Vencido", cancelled: "Cancelado" };

/** Valores que pueden llegar nulos o como texto desde el backend. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `fmt` nunca debe reventar por una moneda o un importe invalidos. */
const fmt = (n: unknown, currency = "EUR") => {
  const valor = num(n);
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: currency || "EUR" }).format(valor);
  } catch {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(valor);
  }
};
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}
/** Catalogos que pueden crecer sin dejar la pantalla en blanco. */
function etiquetaEtapa(s: DealStage | string) { return STAGE_LABELS[s as DealStage] ?? String(s || "—"); }
function badgeEtapa(s: DealStage | string) { return STAGE_BADGE[s as DealStage] ?? "badge-secondary"; }
function etiquetaQuote(s: QuoteStatus | string) { return QUOTE_STATUS_LABEL[s as QuoteStatus] ?? String(s || "—"); }
function badgeQuote(s: QuoteStatus | string) { return QUOTE_BADGE[s as QuoteStatus] ?? "badge-secondary"; }
function iconoAccion(t: PlaybookActionType | string) { return ACTION_ICON[t as PlaybookActionType] ?? "•"; }

type Tab = "forecast" | "deals" | "playbooks" | "quotes" | "contratos";

// ── Presupuesto ───────────────────────────────────────────────────────────────

function QuoteModal({ deal, onClose, onCreated }: { deal?: Deal; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(deal ? `Presupuesto — ${deal.title}` : "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [taxPct, setTaxPct] = useState(21);
  const [discountPct, setDiscountPct] = useState(0);
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() { setItems((p) => [...p, { description: "", quantity: 1, unitPrice: 0 }]); }
  function updateItem(i: number, field: string, val: string | number) {
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
  const discountAmt = subtotal * num(discountPct) / 100;
  const taxAmt = (subtotal - discountAmt) * num(taxPct) / 100;
  const total = subtotal - discountAmt + taxAmt;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) { setError("Título y nombre de cliente son obligatorios"); return; }
    if (items.some((it) => !it.description.trim())) { setError("Todos los ítems necesitan descripción"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || null, dealId: deal?.id ?? null,
          taxPct, discountPct, items,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear presupuesto"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo presupuesto" onClose={onClose} error={error} size="lg" testId="modal-presupuesto">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="q-titulo" className="text-black font-w600">Título <span className="required">*</span></label>
              <input id="q-titulo" type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="q-cliente" className="text-black font-w600">Cliente <span className="required">*</span></label>
              <input id="q-cliente" type="text" className="form-control" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="form-group mb-3">
              <label htmlFor="q-email" className="text-black font-w600">Email cliente</label>
              <input id="q-email" type="email" className="form-control" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="form-group mb-3">
              <label htmlFor="q-iva" className="text-black font-w600">IVA %</label>
              <input id="q-iva" type="number" min={0} max={100} className="form-control" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="form-group mb-3">
              <label htmlFor="q-dto" className="text-black font-w600">Descuento %</label>
              <input id="q-dto" type="number" min={0} max={100} className="form-control" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} />
            </div>
          </div>

          <div className="col-lg-12">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="text-black font-w600 mb-0">Líneas de presupuesto</label>
              <button type="button" className="btn btn-primary light btn-xs" onClick={addItem}>+ Añadir línea</button>
            </div>
            {items.map((it, i) => (
              <div className="row align-items-end mb-2" key={i}>
                <div className="col-lg-6">
                  <label className="visually-hidden" htmlFor={`q-desc-${i}`}>Descripción línea {i + 1}</label>
                  <input id={`q-desc-${i}`} type="text" className="form-control" placeholder="Descripción"
                    value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                </div>
                <div className="col-lg-2">
                  <label className="visually-hidden" htmlFor={`q-cant-${i}`}>Cantidad línea {i + 1}</label>
                  <input id={`q-cant-${i}`} type="number" min={0.01} step={0.01} className="form-control"
                    value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                </div>
                <div className="col-lg-3">
                  <label className="visually-hidden" htmlFor={`q-precio-${i}`}>Precio línea {i + 1}</label>
                  <input id={`q-precio-${i}`} type="number" min={0} step={0.01} className="form-control"
                    value={it.unitPrice} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
                </div>
                <div className="col-lg-1">
                  <button type="button" className="btn btn-danger btn-sm content-icon"
                    aria-label={`Quitar línea ${i + 1}`} onClick={() => removeItem(i)}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="col-lg-12">
            <div className="border-top pt-3 text-end">
              <p className="mb-1 fs-14 text-muted">Subtotal: <strong>{fmt(subtotal)}</strong></p>
              {num(discountPct) > 0 && (
                <p className="mb-1 fs-14 text-muted">Descuento ({discountPct}%): <strong className="text-danger">-{fmt(discountAmt)}</strong></p>
              )}
              <p className="mb-1 fs-14 text-muted">IVA ({taxPct}%): <strong>{fmt(taxAmt)}</strong></p>
              <h4 className="mb-0">Total: {fmt(total)}</h4>
            </div>
          </div>

          <div className="col-lg-12">
            <div className="text-end mt-3">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Crear presupuesto"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Playbook ──────────────────────────────────────────────────────────────────

function PlaybookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState<DealStage>("new");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<Array<{ actionType: PlaybookActionType; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAction() { setActions((p) => [...p, { actionType: "task", title: "" }]); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), stage,
          description: description.trim() || undefined,
          actions: actions.filter((a) => a.title.trim()),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo playbook" onClose={onClose} error={error} testId="modal-playbook">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="pb-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="pb-nombre" type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="pb-etapa" className="text-black font-w600">Etapa del pipeline</label>
              <select id="pb-etapa" className="form-control" value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
                {(["new", "contacted", "qualified", "proposal"] as DealStage[]).map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="pb-descripcion" className="text-black font-w600">Descripción</label>
              <input id="pb-descripcion" type="text" className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {actions.length > 0 && (
            <div className="col-lg-12">
              <label className="text-black font-w600 d-block mb-2">Acciones</label>
              {actions.map((a, i) => (
                <div className="row align-items-end mb-2" key={i}>
                  <div className="col-lg-4">
                    <label className="visually-hidden" htmlFor={`pb-tipo-${i}`}>Tipo acción {i + 1}</label>
                    <select id={`pb-tipo-${i}`} className="form-control" value={a.actionType}
                      onChange={(e) => setActions((p) => p.map((x, j) => j === i ? { ...x, actionType: e.target.value as PlaybookActionType } : x))}>
                      {(["task", "email", "call", "note", "wait"] as PlaybookActionType[]).map((t) => (
                        <option key={t} value={t}>{ACTION_ICON[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-lg-7">
                    <label className="visually-hidden" htmlFor={`pb-titulo-${i}`}>Título acción {i + 1}</label>
                    <input id={`pb-titulo-${i}`} type="text" className="form-control" placeholder="Título de la acción"
                      value={a.title} onChange={(e) => setActions((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                  </div>
                  <div className="col-lg-1">
                    <button type="button" className="btn btn-danger btn-sm content-icon"
                      aria-label={`Quitar acción ${i + 1}`} onClick={() => setActions((p) => p.filter((_, j) => j !== i))}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="col-lg-12">
            <button type="button" className="btn btn-primary light btn-sm" onClick={addAction}>+ Añadir acción</button>
          </div>

          <div className="col-lg-12">
            <div className="text-end mt-3">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Crear playbook"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function SaasPipelinePage() {
  const [tab, setTab] = useState<Tab>("forecast");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastByRep, setForecastByRep] = useState<Array<{ ownerLabel: string; weightedTotal: number; bestCase: number; dealCount: number }>>([]);
  const [scenarios, setScenarios] = useState<{ optimistic: { weightedTotal: number }; conservative: { weightedTotal: number } } | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [quoteDeal, setQuoteDeal] = useState<Deal | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractLoading, setContractLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [changingDealId, setChangingDealId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealModal, setDealModal] = useState<{ open: boolean; mode: "create" | "edit"; deal: Deal | null }>({
    open: false, mode: "create", deal: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, forecastRes, playbooksRes, quotesRes, byRepRes, scenRes, contactsRes] = await Promise.all([
        fetch("/api/saas/deals"),
        fetch("/api/saas/playbooks?resource=forecast"),
        fetch("/api/saas/playbooks"),
        fetch("/api/saas/quotes"),
        fetch("/api/saas/playbooks?resource=forecast-by-rep"),
        fetch("/api/saas/playbooks?resource=forecast-scenarios"),
        fetch("/api/saas/crm/contacts"),
      ]);
      if (dealsRes.ok) { const d = (await dealsRes.json().catch(() => ({}))) as { deals?: Deal[] }; setDeals(Array.isArray(d.deals) ? d.deals : []); }
      if (forecastRes.ok) { const d = (await forecastRes.json().catch(() => ({}))) as { forecast?: Forecast }; setForecast(d.forecast ?? null); }
      if (byRepRes.ok) { const d = (await byRepRes.json().catch(() => ({}))) as { byRep?: typeof forecastByRep }; setForecastByRep(Array.isArray(d.byRep) ? d.byRep : []); }
      if (scenRes.ok) {
        const d = (await scenRes.json().catch(() => ({}))) as { scenarios?: { optimistic: { weightedTotal: number }; conservative: { weightedTotal: number } } };
        if (d.scenarios?.optimistic && d.scenarios?.conservative) {
          setScenarios({ optimistic: d.scenarios.optimistic, conservative: d.scenarios.conservative });
        }
      }
      if (playbooksRes.ok) { const d = (await playbooksRes.json().catch(() => ({}))) as { playbooks?: Playbook[] }; setPlaybooks(Array.isArray(d.playbooks) ? d.playbooks : []); }
      if (quotesRes.ok) { const d = (await quotesRes.json().catch(() => ({}))) as { quotes?: Quote[] }; setQuotes(Array.isArray(d.quotes) ? d.quotes : []); }
      if (contactsRes.ok) { const d = (await contactsRes.json().catch(() => ({}))) as { contacts?: ContactLite[] }; setContacts(Array.isArray(d.contacts) ? d.contacts : []); }
      const contractsRes = await fetch("/api/saas/contracts");
      if (contractsRes.ok) { const d = (await contractsRes.json().catch(() => ({}))) as { contracts?: Contract[] }; setContracts(Array.isArray(d.contracts) ? d.contracts : []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const contactsById = useMemo(
    () => new Map(contacts.map((c) => [c.id, { name: c.name, company: c.company }])),
    [contacts],
  );

  const dealsMetrics = useMemo(() => {
    const byStageMap = new Map<DealStage, { count: number; totalValue: number }>();
    for (const d of deals) {
      const cur = byStageMap.get(d.stage) ?? { count: 0, totalValue: 0 };
      cur.count += 1;
      cur.totalValue += num(d.value);
      byStageMap.set(d.stage, cur);
    }
    return {
      openCount: deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length,
      wonCount: deals.filter((d) => d.stage === "won").length,
      lostCount: deals.filter((d) => d.stage === "lost").length,
      pipelineValue: deals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + num(d.value), 0),
      wonValue: deals.filter((d) => d.stage === "won").reduce((s, d) => s + num(d.value), 0),
      forecastValue: num(forecast?.weightedTotal),
      currency: "EUR",
      byStage: Array.from(byStageMap.entries()).map(([stage, v]) => ({
        stage, count: v.count, totalValue: v.totalValue, conversionToWonPct: null,
      })),
    };
  }, [deals, forecast?.weightedTotal]);

  async function handleMoveStage(deal: Deal, stage: DealStage) {
    setChangingDealId(deal.id);
    try {
      await fetch(`/api/saas/deals/${deal.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await load();
    } finally {
      setChangingDealId(null);
    }
  }

  async function deletePlaybook(id: string) {
    await fetch("/api/saas/playbooks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    void load();
  }

  async function updateQuoteStatus(id: string, status: QuoteStatus) {
    await fetch("/api/saas/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-status", id, status }),
    });
    void load();
  }

  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const wonDeals = deals.filter((d) => d.stage === "won");
  const etapasForecast = Array.isArray(forecast?.byStage) ? forecast.byStage : [];
  const bestCase = num(forecast?.bestCase);

  const TAB_LABEL: Record<Tab, string> = {
    forecast: "Forecast",
    deals: `Deals (${deals.length})`,
    playbooks: `Playbooks (${playbooks.length})`,
    quotes: `Presupuestos (${quotes.length})`,
    contratos: `Contratos (${contracts.length})`,
  };

  return (
    <SaasW3crmShell>
      {/* El titulo conserva la copy de NELVYON ("Sales Hub — Pipeline"): es el
          nombre del modulo, no un texto de la demo de W3CRM. */}
      <W3crmPageTitle mainTitle="Sales Hub — Pipeline" parentTitle="Captación" pageTitle="Pipeline" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Deals activos" value={openDeals.length} accent /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Pipeline bruto" value={fmt(openDeals.reduce((s, d) => s + num(d.value), 0))} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Forecast weighted" value={fmt(forecast?.weightedTotal)} /></div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Won este periodo" value={wonDeals.length} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                {tab === "deals" && (
                  <li><button type="button" className="btn btn-primary" onClick={() => setDealModal({ open: true, mode: "create", deal: null })}>+ Nuevo deal</button></li>
                )}
                {tab === "quotes" && (
                  <li><button type="button" className="btn btn-primary" onClick={() => { setQuoteDeal(undefined); setShowQuoteModal(true); }}>+ Presupuesto</button></li>
                )}
                {tab === "playbooks" && (
                  <li><button type="button" className="btn btn-primary" onClick={() => setShowPlaybookModal(true)}>+ Playbook</button></li>
                )}
                {tab === "contratos" && (
                  <li>
                    <button type="button" className="btn btn-primary" onClick={() => {
                      void (async () => {
                        setContractLoading(true);
                        const r = await fetch("/api/saas/contracts");
                        if (r.ok) {
                          const d = (await r.json().catch(() => ({}))) as { contracts?: Contract[] };
                          setContracts(Array.isArray(d.contracts) ? d.contracts : []);
                        }
                        setContractLoading(false);
                      })();
                    }}>↻ Actualizar</button>
                  </li>
                )}
              </ul>
            </div>

            <ul className="nav nav-tabs mb-3" role="tablist" data-testid="pipeline-tabs">
              {(["forecast", "deals", "playbooks", "quotes", "contratos"] as Tab[]).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    data-testid={`pipeline-tab-${t}`}
                    data-active={tab === t ? "true" : "false"}
                    aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {TAB_LABEL[t]}
                  </button>
                </li>
              ))}
            </ul>

            {loading ? (
              <div data-testid="pipeline-loading">
                <W3crmContentBox titulo="Pipeline" icono="fa-solid fa-chart-line">
                  <W3crmCargando texto="Cargando pipeline…" />
                </W3crmContentBox>
              </div>
            ) : (
              <>
                {/* ── FORECAST ── */}
                {tab === "forecast" && (
                  <>
                    <div className="row">
                      {[
                        { label: "Weighted Forecast", value: fmt(forecast?.weightedTotal), sub: "Prob. ponderada" },
                        { label: "Best Case", value: fmt(forecast?.bestCase), sub: "Si todos cierran" },
                        { label: "Committed", value: fmt(forecast?.committed), sub: "Prob. ≥ 75%" },
                      ].map(({ label, value, sub }) => (
                        <div className="col-xl-4 col-sm-6 mb-3" key={label}>
                          <div className="card mb-0">
                            <div className="card-body">
                              <p className="mb-1 fs-14 text-muted">{label}</p>
                              <h3 className="mb-0">{value}</h3>
                              <p className="mb-0 fs-12 text-muted">{sub}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {scenarios && (
                      <div className="row">
                        <div className="col-xl-6 mb-3">
                          <div className="card mb-0">
                            <div className="card-body">
                              <p className="mb-1 fs-14 text-muted">Escenario optimista (+15% prob)</p>
                              <h4 className="mb-0 text-success">{fmt(scenarios.optimistic?.weightedTotal)}</h4>
                            </div>
                          </div>
                        </div>
                        <div className="col-xl-6 mb-3">
                          <div className="card mb-0">
                            <div className="card-body">
                              <p className="mb-1 fs-14 text-muted">Escenario conservador (-15% prob)</p>
                              <h4 className="mb-0 text-warning">{fmt(scenarios.conservative?.weightedTotal)}</h4>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {forecastByRep.length > 0 && (
                      <W3crmContentBox titulo="Forecast por rep" icono="fa-solid fa-user-tie">
                        <W3crmDataTable
                          filas={forecastByRep}
                          etiqueta="reps"
                          wrapperId="byrep_wrapper"
                          columnas={[{ titulo: "Rep" }, { titulo: "Deals" }, { titulo: "Weighted" }, { titulo: "Best case", alFinal: true }]}
                          render={(r) => (
                            <tr key={r.ownerLabel}>
                              <td><span className="fw-bold">{r.ownerLabel || "—"}</span></td>
                              <td>{num(r.dealCount)}</td>
                              <td>{fmt(r.weightedTotal)}</td>
                              <td className="text-end">{fmt(r.bestCase)}</td>
                            </tr>
                          )}
                        />
                      </W3crmContentBox>
                    )}

                    <W3crmContentBox titulo="Pipeline por etapa (weighted)" icono="fa-solid fa-chart-line">
                      {etapasForecast.length === 0 ? (
                        <W3crmEmptyState
                          title="Sin datos de forecast"
                          description="Crea deals en el pipeline para verlos aquí."
                        />
                      ) : (
                        <W3crmDataTable
                          filas={etapasForecast}
                          etiqueta="etapas"
                          wrapperId="forecast_wrapper"
                          porPagina={10}
                          columnas={[{ titulo: "Etapa" }, { titulo: "Deals" }, { titulo: "Prob." }, { titulo: "Valor" }, { titulo: "Weighted" }, { titulo: "Peso", alFinal: true }]}
                          render={(s) => {
                            const pct = bestCase > 0 ? Math.min(100, (num(s.weightedValue) / bestCase) * 100) : 0;
                            return (
                              <tr key={s.stage}>
                                <td><span className={`badge ${badgeEtapa(s.stage)}`}>{etiquetaEtapa(s.stage)}</span></td>
                                <td>{num(s.count)}</td>
                                <td>{num(s.probability)}%</td>
                                <td>{fmt(s.value)}</td>
                                <td><strong>{fmt(s.weightedValue)}</strong></td>
                                <td className="text-end" style={{ minWidth: 140 }}>
                                  <div className="progress" style={{ height: 6 }}>
                                    <div className="progress-bar bg-primary" style={{ width: `${pct}%` }}
                                      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} />
                                  </div>
                                </td>
                              </tr>
                            );
                          }}
                        />
                      )}
                    </W3crmContentBox>
                  </>
                )}

                {/* ── DEALS (kanban) ── */}
                {tab === "deals" && (
                  <>
                    <DealsKanban
                      deals={deals}
                      metrics={dealsMetrics}
                      contactsById={contactsById}
                      changingDealId={changingDealId}
                      selectedDealId={selectedDeal?.id ?? null}
                      onSelectDeal={(deal) => setSelectedDeal(deal)}
                      onMoveStage={(deal, stage) => void handleMoveStage(deal, stage)}
                    />
                    {selectedDeal && (
                      <div className="mt-3">
                        <DealDetailPanel
                          deal={selectedDeal}
                          contactsById={contactsById}
                          onEdit={(deal) => setDealModal({ open: true, mode: "edit", deal })}
                          onDeleted={() => { setSelectedDeal(null); void load(); }}
                          onClose={() => setSelectedDeal(null)}
                        />
                        <div className="mt-2">
                          <button type="button" className="btn btn-primary light btn-sm"
                            onClick={() => { setQuoteDeal(selectedDeal); setShowQuoteModal(true); }}>
                            + Presupuesto para este deal
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── PLAYBOOKS ── */}
                {tab === "playbooks" && (
                  <W3crmContentBox titulo="Playbooks" icono="fa-solid fa-clipboard-list">
                    {playbooks.length === 0 ? (
                      <W3crmEmptyState
                        title="Sin playbooks"
                        description="Crea templates de acciones para cada etapa del pipeline."
                      />
                    ) : (
                      <W3crmDataTable
                        filas={playbooks}
                        etiqueta="playbooks"
                        wrapperId="playbooks_wrapper"
                        columnas={[{ titulo: "Nombre" }, { titulo: "Etapa" }, { titulo: "Acciones" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                        render={(pb) => {
                          const acciones = Array.isArray(pb.actions) ? pb.actions : [];
                          return (
                            <tr key={pb.id}>
                              <td>
                                <span className="fw-bold">{pb.name || "—"}</span>
                                {pb.description ? <div className="text-muted fs-12">{pb.description}</div> : null}
                              </td>
                              <td><span className={`badge ${badgeEtapa(pb.stage)}`}>{etiquetaEtapa(pb.stage)}</span></td>
                              <td>
                                {acciones.length === 0
                                  ? <span className="text-muted">—</span>
                                  : acciones.map((a) => (
                                      <span key={a.id} className="badge badge-secondary light me-1 fs-12">
                                        {iconoAccion(a.actionType)} {a.title}
                                      </span>
                                    ))}
                              </td>
                              <td>
                                {pb.active
                                  ? <span className="badge badge-success">Activo</span>
                                  : <span className="badge badge-warning">Inactivo</span>}
                              </td>
                              <td className="text-end">
                                <button type="button" className="btn btn-danger btn-sm content-icon"
                                  aria-label={`Eliminar ${pb.name || "playbook"}`} onClick={() => void deletePlaybook(pb.id)}>
                                  <i className="fa-solid fa-trash" />
                                </button>
                              </td>
                            </tr>
                          );
                        }}
                      />
                    )}
                  </W3crmContentBox>
                )}

                {/* ── PRESUPUESTOS ── */}
                {tab === "quotes" && (
                  <W3crmContentBox titulo="Presupuestos" icono="fa-solid fa-file-invoice">
                    {quotes.length === 0 ? (
                      <W3crmEmptyState
                        title="Sin presupuestos"
                        description="Crea presupuestos profesionales vinculados a tus deals."
                      />
                    ) : (
                      <W3crmDataTable
                        filas={quotes}
                        etiqueta="presupuestos"
                        wrapperId="quotes_wrapper"
                        columnas={[{ titulo: "Presupuesto" }, { titulo: "Cliente" }, { titulo: "Detalle" }, { titulo: "Total" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                        render={(q) => {
                          const items = Array.isArray(q.items) ? q.items : [];
                          return (
                            <tr key={q.id}>
                              <td>
                                <span className="fw-bold">{q.title || "—"}</span>
                                <div className="text-muted fs-12">{q.quoteNumber}</div>
                              </td>
                              <td>
                                <span>{q.clientName || "—"}</span>
                                {q.clientEmail ? <div className="text-muted fs-12">{q.clientEmail}</div> : null}
                              </td>
                              <td>
                                <span className="text-muted fs-12">
                                  IVA {num(q.taxPct)}%{num(q.discountPct) > 0 ? ` · Dto. ${num(q.discountPct)}%` : ""} · {items.length} ítem{items.length !== 1 ? "s" : ""}
                                </span>
                                {q.validUntil ? <div className="text-muted fs-12">Válido hasta {fecha(q.validUntil)}</div> : null}
                              </td>
                              <td><strong>{fmt(q.total, q.currency)}</strong></td>
                              <td><span className={`badge ${badgeQuote(q.status)}`}>{etiquetaQuote(q.status)}</span></td>
                              <td className="text-end">
                                <a href={`/api/saas/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer"
                                  className="btn btn-primary light btn-sm me-1">Ver PDF</a>
                                {q.status === "draft" && (
                                  <button type="button" className="btn btn-primary light btn-sm me-1"
                                    onClick={() => void updateQuoteStatus(q.id, "sent")}>Marcar enviado</button>
                                )}
                                {q.status === "sent" && (
                                  <button type="button" className="btn btn-primary btn-sm"
                                    onClick={() => void updateQuoteStatus(q.id, "accepted")}>Aceptar</button>
                                )}
                              </td>
                            </tr>
                          );
                        }}
                      />
                    )}
                  </W3crmContentBox>
                )}

                {/* ── CONTRATOS ── */}
                {tab === "contratos" && (
                  <W3crmContentBox titulo="Contratos" icono="fa-solid fa-file-signature">
                    {contractLoading ? (
                      <W3crmCargando texto="Cargando contratos…" />
                    ) : contracts.length === 0 ? (
                      <W3crmEmptyState
                        title="Sin contratos"
                        description="Convierte un presupuesto aceptado en contrato para solicitar la firma."
                      />
                    ) : (
                      <W3crmDataTable
                        filas={contracts}
                        etiqueta="contratos"
                        wrapperId="contracts_wrapper"
                        columnas={[{ titulo: "Contrato" }, { titulo: "Cliente" }, { titulo: "Importe" }, { titulo: "Estado" }, { titulo: "Firmado" }, { titulo: "Gestión", alFinal: true }]}
                        render={(c) => (
                          <tr key={c.id}>
                            <td>
                              <span className="fw-bold">{c.title || "—"}</span>
                              <div className="text-muted fs-12" data-testid={`contract-number-${c.id}`}>{c.contractNumber}</div>
                            </td>
                            <td>
                              <span>{c.clientName || "—"}</span>
                              <div className="text-muted fs-12">{c.clientEmail || "—"}</div>
                            </td>
                            <td><strong>{fmt(c.amount, c.currency)}</strong></td>
                            <td>
                              <span className={`badge ${CONTRACT_BADGE[c.status] ?? "badge-secondary"}`}>
                                {CONTRACT_LABEL[c.status] ?? String(c.status || "—")}
                              </span>
                            </td>
                            <td>{fecha(c.signedAt)}</td>
                            <td className="text-end">
                              {c.status === "draft" && (
                                <button type="button" className="btn btn-primary btn-sm"
                                  aria-label={`Enviar ${c.title || "contrato"}`}
                                  onClick={() => void fetch(`/api/saas/contracts/${c.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "send" }),
                                  }).then(() => void load())}>
                                  Enviar
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      />
                    )}
                  </W3crmContentBox>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showQuoteModal && (
        <QuoteModal deal={quoteDeal} onClose={() => { setShowQuoteModal(false); setQuoteDeal(undefined); }} onCreated={() => void load()} />
      )}
      {showPlaybookModal && <PlaybookModal onClose={() => setShowPlaybookModal(false)} onCreated={() => void load()} />}
      <DealFormModal
        open={dealModal.open}
        mode={dealModal.mode}
        deal={dealModal.deal}
        contacts={contacts}
        onClose={() => setDealModal({ open: false, mode: "create", deal: null })}
        onSuccess={(deal) => { setSelectedDeal(deal); void load(); }}
      />
    </SaasW3crmShell>
  );
}

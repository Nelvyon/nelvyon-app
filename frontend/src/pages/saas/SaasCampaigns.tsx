import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone, Plus, Loader2, Search, Eye, MousePointerClick,
  DollarSign, Globe, Instagram, Facebook, Linkedin, Twitter, Youtube, Sparkles,
  Trash2, Edit, Play, Pause, CheckCircle2, Mail, Send, Users,
  BarChart3, X, Save, ArrowRight, Zap, RefreshCw, AlertCircle,
} from "lucide-react";
import {
  api,
  getApiErrorMessage,
  type NelvyonCampaign,
  type NelvyonClient,
  type NelvyonProject,
  type Campaign,
  type CampaignRecipientSegmentFilters,
  type CampaignWorkflowSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ───── Tabs ───── */
type TabKey = "ads" | "email";
const SHOW_LEGACY_NELVYON_CAMPAIGNS = false;

/* ───── Platform icons for Ads ───── */
const platformIcons: Record<string, React.ElementType> = {
  google: Globe, meta: Facebook, facebook: Facebook, instagram: Instagram,
  linkedin: Linkedin, twitter: Twitter, youtube: Youtube, tiktok: Sparkles,
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Activa", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  paused: { label: "Pausada", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  draft: { label: "Borrador", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  completed: { label: "Completada", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  sending: { label: "Enviando…", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  sent: { label: "Enviada", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Fallida", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

type CampaignSegmentFiltersState = {
  status: string;
  tags: string;
  source: string;
  score_min: string;
  score_max: string;
};

/* ═══════════════════════════════════════════════════════════════════════ */

export default function SaasCampaigns() {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("email");

  /* ── Ads state ── */
  const [adCampaigns, setAdCampaigns] = useState<NelvyonCampaign[]>([]);
  const [clients, setClients] = useState<NelvyonClient[]>([]);
  const [projects, setProjects] = useState<NelvyonProject[]>([]);
  const [adLoading, setAdLoading] = useState(true);
  const [adSearch, setAdSearch] = useState("");
  const [creatingAd, setCreatingAd] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedAd, setSelectedAd] = useState<NelvyonCampaign | null>(null);
  const [editingAd, setEditingAd] = useState(false);
  const [adEditData, setAdEditData] = useState({ name: "", budget: 0, status: "draft", platforms: "", campaign_type: "" });
  const [savingAd, setSavingAd] = useState(false);

  /* ── Email state ── */
  const [emailCampaigns, setEmailCampaigns] = useState<Campaign[]>([]);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSearch, setEmailSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Campaign | null>(null);
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailEditData, setEmailEditData] = useState({ name: "", subject: "", content: "", type: "newsletter" });
  const [savingEmail, setSavingEmail] = useState(false);
  const [segmentFilters, setSegmentFilters] = useState<CampaignSegmentFiltersState>({
    status: "",
    tags: "",
    source: "",
    score_min: "",
    score_max: "",
  });
  const [recipientPreview, setRecipientPreview] = useState<{
    total_recipients: number;
    applied_filters?: CampaignRecipientSegmentFilters;
    preview: { name: string; email: string; status?: string; source?: string; tags?: string; score?: number }[];
  } | null>(null);
  const [sendStats, setSendStats] = useState<Record<number, { open_rate: number; click_rate: number; sent_count: number; recipients_count: number }>>({});
  const [workflowSummary, setWorkflowSummary] = useState<CampaignWorkflowSummary | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /** Al cambiar de workspace: no dejar ficha de otro tenant. */
  useEffect(() => {
    setSelectedEmail(null);
    setEditingEmail(false);
    setSelectedAd(null);
    setEditingAd(false);
  }, [activeWorkspace?.id]);

  /* ── Fetch Ads ── */
  const fetchAds = useCallback(async () => {
    if (!SHOW_LEGACY_NELVYON_CAMPAIGNS) return;
    setAdLoading(true);
    try {
      const [campRes, clientRes, projRes] = await Promise.allSettled([
        api.getCampaigns(0, 200),
        api.getClients(0, 200),
        api.getProjects(0, 200),
      ]);
      if (campRes.status === "fulfilled") setAdCampaigns(campRes.value.items || []);
      if (clientRes.status === "fulfilled") setClients(clientRes.value.items || []);
      if (projRes.status === "fulfilled") setProjects(projRes.value.items || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error cargando campañas ads"));
    }
    finally { setAdLoading(false); }
  }, []);

  /* ── Fetch Email Campaigns ── */
  const fetchEmails = useCallback(async () => {
    setEmailLoading(true);
    try {
      const res = await api.getEmailCampaigns(0, 200);
      setEmailCampaigns(res.items || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error cargando campañas email"));
    }
    finally { setEmailLoading(false); }
  }, []);

  /* ── Fetch recipient preview ── */
  const buildSegmentFilters = useCallback((): CampaignRecipientSegmentFilters => {
    const f: CampaignRecipientSegmentFilters = {};
    if (segmentFilters.status.trim()) f.status = segmentFilters.status.trim();
    if (segmentFilters.tags.trim()) f.tags = segmentFilters.tags.trim();
    if (segmentFilters.source.trim()) f.source = segmentFilters.source.trim();
    if (segmentFilters.score_min.trim()) f.score_min = Number(segmentFilters.score_min);
    if (segmentFilters.score_max.trim()) f.score_max = Number(segmentFilters.score_max);
    return f;
  }, [segmentFilters]);

  const fetchRecipientPreview = useCallback(async () => {
    try {
      const preview = await api.previewCampaignRecipients(buildSegmentFilters());
      setRecipientPreview(preview);
    } catch (err) {
      setRecipientPreview(null);
      if (import.meta.env.DEV) {
        console.warn("[SaasCampaigns] preview destinatarios:", getApiErrorMessage(err));
      }
    }
  }, [buildSegmentFilters]);

  const fetchWorkflowSummary = useCallback(async () => {
    try {
      const data = await api.getCampaignWorkflowSummary();
      setWorkflowSummary(data);
    } catch (err) {
      setWorkflowSummary(null);
      toast.error(getApiErrorMessage(err, "No se pudo cargar el resumen de automatización."));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (SHOW_LEGACY_NELVYON_CAMPAIGNS && tab === "ads") fetchAds();
    else { fetchEmails(); fetchRecipientPreview(); fetchWorkflowSummary(); }
  }, [user, tab, fetchAds, fetchEmails, fetchRecipientPreview, fetchWorkflowSummary]);

  useEffect(() => {
    if (!user || tab !== "email") return;
    fetchRecipientPreview();
  }, [user, tab, segmentFilters, fetchRecipientPreview]);

  /* ═══════════ Ads Handlers ═══════════ */
  const handleCreateAd = async () => {
    if (projects.length === 0) { toast.error("Primero crea un proyecto"); return; }
    setCreatingAd(true);
    try {
      const proj = projects[0];
      const newCamp = await api.createCampaign({
        user_id: user?.sub || "", name: `Campaña ${adCampaigns.length + 1} — ${proj.name}`,
        campaign_type: "multi_platform", status: "draft", budget: 500, platforms: "google,meta,instagram,linkedin",
      });
      setAdCampaigns(prev => [newCamp, ...prev]);
      toast.success("Campaña ads creada");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error creando campaña"));
    }
    finally { setCreatingAd(false); }
  };

  const handleGenerateAds = async (projectId: number) => {
    setGenerating(projectId);
    try {
      const result = await api.generateAds(projectId, "google,meta,instagram,linkedin,tiktok,youtube,twitter");
      toast.success(`Ads generados: Score QA ${result.qa_score}`);
      await fetchAds();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error generando ads"));
    }
    finally { setGenerating(null); }
  };

  const handleDeleteAd = async (id: number) => {
    try {
      await api.deleteCampaign(id);
      setAdCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedAd?.id === id) { setSelectedAd(null); setEditingAd(false); }
      toast.success("Campaña eliminada");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error eliminando campaña"));
    }
  };

  const openAdEdit = (camp: NelvyonCampaign) => {
    setAdEditData({ name: camp.name || "", budget: camp.budget || 0, status: camp.status || "draft", platforms: camp.platforms || "", campaign_type: camp.campaign_type || "multi_platform" });
    setSelectedAd(camp); setEditingAd(true);
  };

  const handleSaveAd = async () => {
    if (!selectedAd || !adEditData.name.trim()) return;
    setSavingAd(true);
    try {
      await api.updateCampaign(selectedAd.id, { name: adEditData.name, budget: adEditData.budget, status: adEditData.status, platforms: adEditData.platforms, campaign_type: adEditData.campaign_type });
      toast.success("Campaña actualizada"); setEditingAd(false); await fetchAds();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error actualizando campaña"));
    }
    finally { setSavingAd(false); }
  };

  /* ═══════════ Email Handlers ═══════════ */
  const handleCreateEmail = async () => {
    setCreatingEmail(true);
    try {
      const newCamp = await api.createEmailCampaign({
        user_id: user?.sub || "", name: `Email Campaña ${emailCampaigns.length + 1}`,
        type: "newsletter", status: "draft", subject: "Novedades de NELVYON",
        content: "<h1>Hola!</h1><p>Tenemos novedades emocionantes para ti.</p>",
      });
      setEmailCampaigns(prev => [newCamp, ...prev]);
      toast.success("Campaña email creada");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error creando campaña email"));
    }
    finally { setCreatingEmail(false); }
  };

  const handleDeleteEmail = async (id: number) => {
    try {
      await api.updateEmailCampaign(id, { status: "draft" }); // soft-delete by resetting
      setEmailCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedEmail?.id === id) { setSelectedEmail(null); setEditingEmail(false); }
      toast.success("Campaña eliminada");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error eliminando campaña"));
    }
  };

  const handleSendEmailCampaign = async (campaignId: number) => {
    setSendingEmail(campaignId);
    try {
      const result = await api.sendCampaignEmail(campaignId, buildSegmentFilters());
      if (result.status === "sent" || result.status === "no_api_key") {
        toast.success(`Campaña enviada: ${result.sent_count}/${result.recipients_count} destinatarios`);
        if (!result.sendgrid_configured) {
          toast.info("SendGrid no configurado — emails en cola para envío posterior", { duration: 5000 });
        }
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.warning(`Estado: ${result.status}`);
      }
      // Fetch stats
      try {
        const stats = await api.getCampaignSendStats(campaignId);
        setSendStats(prev => ({ ...prev, [campaignId]: { open_rate: stats.open_rate, click_rate: stats.click_rate, sent_count: stats.sent_count, recipients_count: stats.recipients_count } }));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "No se pudieron cargar las métricas de envío."));
      }
      await fetchRecipientPreview();
      await fetchEmails();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error enviando campaña"));
    }
    finally { setSendingEmail(null); }
  };

  const openEmailEdit = (camp: Campaign) => {
    setEmailEditData({ name: camp.name || "", subject: camp.subject || "", content: camp.content || "", type: camp.type || "newsletter" });
    setSelectedEmail(camp); setEditingEmail(true);
  };

  const handleSaveEmail = async () => {
    if (!selectedEmail || !emailEditData.name.trim()) return;
    setSavingEmail(true);
    try {
      await api.updateEmailCampaign(selectedEmail.id, { name: emailEditData.name, subject: emailEditData.subject, content: emailEditData.content, type: emailEditData.type });
      toast.success("Campaña actualizada"); setEditingEmail(false); await fetchEmails();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error actualizando campaña"));
    }
    finally { setSavingEmail(false); }
  };

  /* ═══════════ Derived ═══════════ */
  const filteredAds = adCampaigns.filter(c => !adSearch || c.name?.toLowerCase().includes(adSearch.toLowerCase()));
  const filteredEmails = emailCampaigns.filter(c => !emailSearch || c.name?.toLowerCase().includes(emailSearch.toLowerCase()));
  const sortedFilteredEmails = useMemo(
    () =>
      [...filteredEmails].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      ),
    [filteredEmails],
  );

  const formatActivity = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const totalBudget = adCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const activeAds = adCampaigns.filter(c => c.status === "active").length;
  const allPlatforms = [...new Set(adCampaigns.flatMap(c => (c.platforms || "").split(",").filter(Boolean)))];
  const emailSent = emailCampaigns.filter(c => c.status === "sent").length;
  const totalRecipients = emailCampaigns.reduce((sum, c) => sum + (c.recipients_count || 0), 0);
  const activeAutomationRules = workflowSummary?.campaign_related_rules || 0;
  const recentAutomationExecutions = workflowSummary?.recent_campaign_related_executions || 0;

  /* ═══════════ RENDER ═══════════ */
  return (
    <SaasLayout
      title="Campañas"
      subtitle={
        activeWorkspace
          ? `Email en ${activeWorkspace.name} · lista, resumen y envío`
          : "Selecciona un workspace para operar con campañas aisladas"
      }
    >
      <div data-testid="campaigns-root" className="space-y-6">
      <p className="text-sm text-zinc-400 flex flex-wrap items-center gap-2">
        <Megaphone className="w-4 h-4 text-violet-400 shrink-0" aria-hidden />
        <span>Campañas de email del workspace activo (API <code className="text-[10px] text-zinc-500">entities/campaigns</code> + <code className="text-[10px] text-zinc-500">campaign-sender</code>).</span>
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-lg bg-[#111113] border border-white/[0.06] w-fit">
        {([
          { key: "email" as TabKey, label: "Campañas Operativas (Email)", icon: Mail },
          ...(SHOW_LEGACY_NELVYON_CAMPAIGNS
            ? [{ key: "ads" as TabKey, label: "Legacy Nelvyon (interno)", icon: Megaphone }]
            : []),
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
              tab === t.key ? "bg-violet-600 text-white shadow-lg" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]")}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {!SHOW_LEGACY_NELVYON_CAMPAIGNS && (
        <p className="text-[11px] text-zinc-500">
          El módulo legacy de anuncios (Nelvyon interno) está desactivado; aquí solo operamos con campañas de email del CRM.
        </p>
      )}

      {/* ═══════════ EMAIL TAB ═══════════ */}
      {tab === "email" && (
        <>
          {/* Unified flow summary */}
          <div className="rounded-xl bg-violet-500/[0.06] border border-violet-500/20 p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-violet-200">Flujo operativo unificado (Fase 1)</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-violet-300 hover:text-violet-200 hover:bg-violet-500/10"
                onClick={() => navigate("/saas/workflows")}
              >
                Ver Workflows <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <p className="text-[11px] text-zinc-300 mb-3">
              Campaña (`campaigns`) → audiencia segmentada → envío → automatización por trigger CRM → resultados mínimos.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500">Audiencia actual (preview)</p>
                <p className="text-sm font-semibold text-blue-300">{recipientPreview?.total_recipients || 0}</p>
              </div>
              <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500">Campañas enviadas</p>
                <p className="text-sm font-semibold text-emerald-300">{emailSent}</p>
              </div>
              <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500">Reglas ligadas a campañas</p>
                <p className="text-sm font-semibold text-violet-300">{activeAutomationRules}</p>
              </div>
              <div className="p-2 rounded bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-zinc-500">Ejecuciones recientes</p>
                <p className="text-sm font-semibold text-amber-300">{recentAutomationExecutions}</p>
              </div>
            </div>
          </div>

          {/* Segment filters */}
          <div className="rounded-xl bg-zinc-500/[0.06] border border-zinc-500/15 p-4 mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-zinc-200">Segmento de audiencia (workspace activo)</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-blue-300 hover:text-blue-200 hover:bg-blue-500/10"
                onClick={fetchRecipientPreview}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Actualizar preview
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <select
                value={segmentFilters.status}
                onChange={(e) => setSegmentFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="bg-[#111113] border border-white/[0.06] rounded-md px-2 py-2 text-xs text-white"
              >
                <option value="">Status: todos</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="lead">lead</option>
                <option value="customer">customer</option>
              </select>
              <Input
                value={segmentFilters.tags}
                onChange={(e) => setSegmentFilters((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags (ej: vip,b2b)"
                className="bg-[#111113] border-white/[0.06] text-white text-xs"
              />
              <Input
                value={segmentFilters.source}
                onChange={(e) => setSegmentFilters((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="Source (ej: web)"
                className="bg-[#111113] border-white/[0.06] text-white text-xs"
              />
              <Input
                type="number"
                value={segmentFilters.score_min}
                onChange={(e) => setSegmentFilters((prev) => ({ ...prev, score_min: e.target.value }))}
                placeholder="Score min"
                className="bg-[#111113] border-white/[0.06] text-white text-xs"
              />
              <Input
                type="number"
                value={segmentFilters.score_max}
                onChange={(e) => setSegmentFilters((prev) => ({ ...prev, score_max: e.target.value }))}
                placeholder="Score max"
                className="bg-[#111113] border-white/[0.06] text-white text-xs"
              />
            </div>
          </div>

          {/* Recipient preview banner */}
          {recipientPreview && (
            <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/15 p-4 mb-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">{recipientPreview.total_recipients} contactos con email disponibles</span>
              </div>
              {recipientPreview.applied_filters && (
                <p className="text-[11px] text-zinc-400 mb-2">
                  Filtros aplicados: status={recipientPreview.applied_filters.status || "todos"} · tags={recipientPreview.applied_filters.tags || "cualquiera"} · source={recipientPreview.applied_filters.source || "cualquiera"} · score={recipientPreview.applied_filters.score_min ?? "-"}..{recipientPreview.applied_filters.score_max ?? "-"}
                </p>
              )}
              {recipientPreview.preview.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipientPreview.preview.map((r, i) => (
                    <span key={i} className="px-2 py-1 rounded bg-blue-500/10 text-[10px] text-blue-300 border border-blue-500/20">
                      {r.name} &lt;{r.email}&gt; [{r.status || "—"} / {r.source || "—"} / score {r.score ?? "—"}]
                    </span>
                  ))}
                  {recipientPreview.total_recipients > 5 && (
                    <span className="px-2 py-1 rounded bg-zinc-500/10 text-[10px] text-zinc-400">+{recipientPreview.total_recipients - 5} más</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Email Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Campañas", value: emailCampaigns.length, icon: Mail, color: "text-violet-400" },
              { label: "Enviadas", value: emailSent, icon: Send, color: "text-emerald-400" },
              { label: "Destinatarios", value: totalRecipients, icon: Users, color: "text-blue-400" },
              { label: "Contactos", value: recipientPreview?.total_recipients || 0, icon: Users, color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-[#111113] border border-white/[0.06]">
                <s.icon className={cn("w-4 h-4 mb-2", s.color)} />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar campañas email..." value={emailSearch} onChange={e => setEmailSearch(e.target.value)}
                data-testid="campaigns-search"
                className="pl-10 bg-[#111113] border-white/[0.06] text-white" />
            </div>
            <Button onClick={handleCreateEmail} disabled={creatingEmail} className="bg-violet-600 hover:bg-violet-500 text-white">
              {creatingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Nueva Campaña Email
            </Button>
          </div>

          {emailLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl p-4 bg-[#111113] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 w-40 bg-white/[0.06] rounded" />
                      <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
                    </div>
                    <div className="h-3 w-3/4 bg-white/[0.04] rounded mb-2" />
                    <div className="flex gap-4 mt-3">
                      <div className="h-3 w-16 bg-white/[0.04] rounded" />
                      <div className="h-3 w-16 bg-white/[0.04] rounded" />
                      <div className="h-3 w-16 bg-white/[0.04] rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-xl p-5 bg-[#111113] border border-white/[0.06]">
                <div className="h-5 w-24 bg-white/[0.06] rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-3 bg-white/[0.04] rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Email List */}
              <div className="lg:col-span-2 space-y-3" data-testid="campaigns-email-list">
                {sortedFilteredEmails.length === 0 ? (
                  <div className="text-center py-16 rounded-xl bg-[#111113] border border-white/[0.06]">
                    <Mail className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No hay campañas email</p>
                    <p className="text-xs text-zinc-600 mt-1">Crea tu primera campaña para enviar emails a tus contactos</p>
                  </div>
                ) : (
                  <>
                  <div
                    className="hidden md:grid md:grid-cols-[minmax(0,1fr)_100px_88px_100px_96px] md:gap-2 md:items-center px-4 py-2 rounded-lg border border-white/[0.06] bg-[#0c0c0f] text-[10px] font-medium uppercase tracking-wider text-zinc-500"
                    data-testid="campaigns-list-header"
                  >
                    <span>Nombre</span>
                    <span className="text-center">Tipo</span>
                    <span className="text-center">Estado</span>
                    <span className="text-center tabular-nums">Destinatarios</span>
                    <span className="text-right tabular-nums">Actividad</span>
                  </div>
                  {sortedFilteredEmails.map(camp => {
                    const status = statusConfig[camp.status || "draft"] || statusConfig.draft;
                    const stats = sendStats[camp.id];
                    return (
                      <div
                        key={camp.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`campaigns-email-row-${camp.id}`}
                        onClick={() => { setSelectedEmail(camp); setEditingEmail(false); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedEmail(camp);
                            setEditingEmail(false);
                          }
                        }}
                        className={cn(
                          "p-5 rounded-xl bg-[#111113] border transition-all cursor-pointer hover:bg-white/[0.02] outline-none focus-visible:ring-1 focus-visible:ring-violet-500/40",
                          selectedEmail?.id === camp.id ? "border-violet-500/30" : "border-white/[0.06]",
                        )}
                      >
                        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_100px_88px_100px_96px] md:gap-2 md:items-start mb-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{camp.name}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">{camp.subject || "Sin asunto"}</p>
                          </div>
                          <span className="text-center text-[11px] text-zinc-400 pt-0.5">{camp.type || "—"}</span>
                          <span className={cn("text-[10px] px-2 py-1 rounded border font-medium text-center self-start justify-self-center", status.bg, status.color)}>
                            {status.label}
                          </span>
                          <span className="text-center text-xs text-zinc-300 tabular-nums pt-0.5">{camp.recipients_count ?? 0}</span>
                          <span className="text-right text-[11px] text-zinc-500 tabular-nums pt-0.5">{formatActivity(camp.created_at)}</span>
                        </div>
                        <div className="flex items-start justify-between mb-3 md:hidden">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{camp.name}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{camp.subject || "Sin asunto"} · {camp.type || "newsletter"}</p>
                          </div>
                          <span className={cn("text-[10px] px-2 py-1 rounded border font-medium shrink-0", status.bg, status.color)}>
                            {status.label}
                          </span>
                        </div>

                        {/* Metrics row */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-zinc-300">{camp.recipients_count || 0} dest.</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-zinc-300">{camp.sent_count || 0} enviados</span>
                          </div>
                          {(camp.open_count || 0) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs text-zinc-300">{camp.open_count} aperturas</span>
                            </div>
                          )}
                          {(camp.click_count || 0) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <MousePointerClick className="w-3.5 h-3.5 text-violet-400" />
                              <span className="text-xs text-zinc-300">{camp.click_count} clicks</span>
                            </div>
                          )}
                        </div>

                        {/* Stats bar if available */}
                        {stats && (
                          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                            <span className="text-[10px] text-emerald-400">Open: {stats.open_rate}%</span>
                            <span className="text-[10px] text-blue-400">Click: {stats.click_rate}%</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          {camp.status === "draft" && (
                            <Button size="sm" variant="ghost"
                              type="button"
                              data-testid={`campaigns-row-send-${camp.id}`}
                              className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              disabled={sendingEmail === camp.id}
                              onClick={e => { e.stopPropagation(); handleSendEmailCampaign(camp.id); }}>
                              {sendingEmail === camp.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                              Enviar
                            </Button>
                          )}
                          {camp.status === "sent" && (
                            <Button size="sm" variant="ghost"
                              type="button"
                              className="h-7 text-xs text-blue-400 hover:text-blue-300"
                              onClick={async e => {
                                e.stopPropagation();
                                try {
                                  const stats = await api.getCampaignSendStats(camp.id);
                                  setSendStats(prev => ({ ...prev, [camp.id]: { open_rate: stats.open_rate, click_rate: stats.click_rate, sent_count: stats.sent_count, recipients_count: stats.recipients_count } }));
                                  toast.success("Métricas actualizadas");
                                } catch (err) {
                                  toast.error(getApiErrorMessage(err, "Error obteniendo métricas"));
                                }
                              }}>
                              <BarChart3 className="w-3 h-3 mr-1" /> Métricas
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" type="button" className="h-7 text-xs text-zinc-400 hover:text-white"
                            onClick={e => { e.stopPropagation(); openEmailEdit(camp); }}>
                            <Edit className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" type="button" className="h-7 text-xs text-zinc-400 hover:text-red-400"
                            onClick={e => { e.stopPropagation(); handleDeleteEmail(camp.id); }}>
                            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}
              </div>

              {/* Detail / Edit Panel */}
              <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden" data-testid={selectedEmail && !editingEmail ? "campaigns-detail" : undefined}>
                {selectedEmail && editingEmail ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Editar Campaña Email</h3>
                      <Button size="sm" variant="ghost" onClick={() => setEditingEmail(false)} className="h-7 w-7 p-0 text-zinc-400"><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nombre</label>
                        <Input value={emailEditData.name} onChange={e => setEmailEditData(d => ({ ...d, name: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Asunto</label>
                        <Input value={emailEditData.subject} onChange={e => setEmailEditData(d => ({ ...d, subject: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Tipo</label>
                        <select value={emailEditData.type} onChange={e => setEmailEditData(d => ({ ...d, type: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white">
                          <option value="newsletter">Newsletter</option>
                          <option value="promotional">Promocional</option>
                          <option value="transactional">Transaccional</option>
                          <option value="drip">Drip / Secuencia</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Contenido HTML</label>
                        <Textarea value={emailEditData.content} onChange={e => setEmailEditData(d => ({ ...d, content: e.target.value }))}
                          rows={6} className="bg-white/5 border-white/10 text-white text-sm font-mono" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSaveEmail} disabled={savingEmail} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs">
                        {savingEmail ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingEmail(false)} className="border-white/10 text-zinc-400 text-xs">Cancelar</Button>
                    </div>
                  </div>
                ) : selectedEmail ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white truncate" data-testid="campaigns-detail-title">{selectedEmail.name}</h3>
                      <Button size="sm" variant="ghost" type="button" onClick={() => openEmailEdit(selectedEmail)} className="h-7 text-[10px] text-violet-400 shrink-0">
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2" data-testid="campaigns-detail-meta">
                      <span className={cn("text-[10px] px-2 py-1 rounded border font-medium", (statusConfig[selectedEmail.status || "draft"] || statusConfig.draft).bg, (statusConfig[selectedEmail.status || "draft"] || statusConfig.draft).color)} data-testid="campaigns-detail-status">
                        {(statusConfig[selectedEmail.status || "draft"] || statusConfig.draft).label}
                      </span>
                      <span className="text-[10px] px-2 py-1 rounded border border-white/[0.08] text-zinc-400">
                        {selectedEmail.type || "newsletter"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Asunto", value: selectedEmail.subject || "—" },
                        { label: "Tipo", value: selectedEmail.type || "—" },
                        { label: "Estado", value: (statusConfig[selectedEmail.status || "draft"] || statusConfig.draft).label },
                        { label: "Destinatarios", value: (selectedEmail.recipients_count || 0).toString() },
                        { label: "Enviados", value: (selectedEmail.sent_count || 0).toString() },
                        { label: "Aperturas", value: (selectedEmail.open_count || 0).toString() },
                        { label: "Clicks", value: (selectedEmail.click_count || 0).toString() },
                        { label: "Creada", value: selectedEmail.created_at ? new Date(selectedEmail.created_at).toLocaleDateString("es") : "—" },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</span>
                          <p className="text-sm text-white mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {selectedEmail.status === "draft" && (
                      <Button
                        type="button"
                        data-testid="campaigns-detail-send-cta"
                        onClick={() => handleSendEmailCampaign(selectedEmail.id)}
                        disabled={sendingEmail === selectedEmail.id}
                        className="w-full bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/30"
                      >
                        {sendingEmail === selectedEmail.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar campaña
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-8 py-16">
                    <Mail className="w-12 h-12 text-zinc-700 mb-4" />
                    <p className="text-sm text-zinc-500">Selecciona una campaña</p>
                    <p className="text-xs text-zinc-600 mt-1">para ver detalles, editar y enviar</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ ADS TAB ═══════════ */}
      {tab === "ads" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Campañas", value: adCampaigns.length, icon: Megaphone, color: "text-violet-400" },
              { label: "Activas", value: activeAds, icon: Play, color: "text-emerald-400" },
              { label: "Budget Total", value: `€${totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-blue-400" },
              { label: "Plataformas", value: allPlatforms.length || 0, icon: Globe, color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-[#111113] border border-white/[0.06]">
                <s.icon className={cn("w-4 h-4 mb-2", s.color)} />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar campañas ads..." value={adSearch} onChange={e => setAdSearch(e.target.value)}
                className="pl-10 bg-[#111113] border-white/[0.06] text-white" />
            </div>
            <Button onClick={handleCreateAd} disabled={creatingAd} className="bg-violet-600 hover:bg-violet-500 text-white">
              {creatingAd ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Nueva Campaña
            </Button>
            {projects.length > 0 && (
              <Button onClick={() => handleGenerateAds(projects[0].id)} disabled={generating !== null}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">
                {generating !== null ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generar Ads IA
              </Button>
            )}
          </div>

          {adLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl p-4 bg-[#111113] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-4 w-36 bg-white/[0.06] rounded" />
                      <div className="h-5 w-16 bg-white/[0.04] rounded-full" />
                    </div>
                    <div className="h-3 w-2/3 bg-white/[0.04] rounded mb-2" />
                    <div className="flex gap-3 mt-3">
                      <div className="h-3 w-20 bg-white/[0.04] rounded" />
                      <div className="h-3 w-20 bg-white/[0.04] rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-xl p-5 bg-[#111113] border border-white/[0.06]">
                <div className="h-5 w-24 bg-white/[0.06] rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-3 bg-white/[0.04] rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {filteredAds.length === 0 ? (
                  <div className="text-center py-16 rounded-xl bg-[#111113] border border-white/[0.06]">
                    <Megaphone className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No hay campañas ads</p>
                  </div>
                ) : (
                  filteredAds.map(camp => {
                    const client = clients.find(c => c.id === camp.client_id);
                    const status = statusConfig[camp.status || "draft"] || statusConfig.draft;
                    const platforms = (camp.platforms || "").split(",").filter(Boolean);
                    return (
                      <div key={camp.id} onClick={() => { setSelectedAd(camp); setEditingAd(false); }}
                        className={cn("p-5 rounded-xl bg-[#111113] border transition-all cursor-pointer hover:bg-white/[0.02]",
                          selectedAd?.id === camp.id ? "border-violet-500/30" : "border-white/[0.06]")}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{camp.name}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{client?.business_name || "Sin cliente"} · {camp.campaign_type || "multi_platform"}</p>
                          </div>
                          <span className={cn("text-[10px] px-2 py-1 rounded border font-medium", status.bg, status.color)}>{status.label}</span>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-zinc-300">€{(camp.budget || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {platforms.slice(0, 5).map(p => {
                              const Icon = platformIcons[p.toLowerCase()] || Globe;
                              return <Icon key={p} className="w-3.5 h-3.5 text-zinc-500" />;
                            })}
                            {platforms.length > 5 && <span className="text-[10px] text-zinc-600">+{platforms.length - 5}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-white"
                            onClick={e => { e.stopPropagation(); openAdEdit(camp); }}>
                            <Edit className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-red-400"
                            onClick={e => { e.stopPropagation(); handleDeleteAd(camp.id); }}>
                            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Ad Detail Panel */}
              <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
                {selectedAd && editingAd ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Editar Campaña</h3>
                      <Button size="sm" variant="ghost" onClick={() => setEditingAd(false)} className="h-7 w-7 p-0 text-zinc-400"><X className="w-4 h-4" /></Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nombre</label>
                        <Input value={adEditData.name} onChange={e => setAdEditData(d => ({ ...d, name: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Budget (€)</label>
                        <Input type="number" value={adEditData.budget} onChange={e => setAdEditData(d => ({ ...d, budget: Number(e.target.value) }))}
                          className="bg-white/5 border-white/10 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Estado</label>
                        <select value={adEditData.status} onChange={e => setAdEditData(d => ({ ...d, status: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white">
                          <option value="draft">Borrador</option><option value="active">Activa</option>
                          <option value="paused">Pausada</option><option value="completed">Completada</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Plataformas</label>
                        <Input value={adEditData.platforms} onChange={e => setAdEditData(d => ({ ...d, platforms: e.target.value }))}
                          placeholder="google,meta,instagram" className="bg-white/5 border-white/10 text-white text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSaveAd} disabled={savingAd} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs">
                        {savingAd ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingAd(false)} className="border-white/10 text-zinc-400 text-xs">Cancelar</Button>
                    </div>
                  </div>
                ) : selectedAd ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{selectedAd.name}</h3>
                      <Button size="sm" variant="ghost" onClick={() => openAdEdit(selectedAd)} className="h-7 text-[10px] text-violet-400">
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Tipo", value: selectedAd.campaign_type || "—" },
                        { label: "Estado", value: (statusConfig[selectedAd.status || "draft"] || statusConfig.draft).label },
                        { label: "Budget", value: `€${(selectedAd.budget || 0).toLocaleString()}` },
                        { label: "Plataformas", value: selectedAd.platforms || "—" },
                        { label: "Creada", value: selectedAd.created_at ? new Date(selectedAd.created_at).toLocaleDateString("es") : "—" },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</span>
                          <p className="text-sm text-white mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-8 py-16">
                    <Megaphone className="w-12 h-12 text-zinc-700 mb-4" />
                    <p className="text-sm text-zinc-500">Selecciona una campaña</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </SaasLayout>
  );
}
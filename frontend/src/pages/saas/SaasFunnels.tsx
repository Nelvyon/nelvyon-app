import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import SaasLayout from "@/components/SaasLayout";
import DataStateWrapper from "@/components/DataStateWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Target, Loader2, Sparkles, CheckCircle2, ArrowRight,
  Eye, DollarSign, TrendingUp, Globe, Plus, Trash2,
  ExternalLink, Copy, Rocket, BarChart3, Brain, X,
  ChevronDown, ChevronUp, Edit2
} from "lucide-react";
import { api, client, type FunnelItem } from "@/lib/api";
import { callAI } from "@/lib/ai-helper";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";
import { getAPIBaseURL } from "@/lib/config";

/* ── Types ── */
interface FunnelStage {
  name: string;
  type: string;
  headline: string;
  description: string;
  cta_text: string;
  metrics?: Record<string, string>;
}

/* ── Component ── */
export default function SaasFunnels() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { ts } = useI18n();

  // Data
  const [funnels, setFunnels] = useState<FunnelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create/Edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<FunnelItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("sales");
  const [saving, setSaving] = useState(false);

  // Publish
  const [publishing, setPublishing] = useState<number | null>(null);

  // Preview
  const [previewFunnel, setPreviewFunnel] = useState<FunnelItem | null>(null);
  const [previewStages, setPreviewStages] = useState<FunnelStage[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Expanded funnel
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // AI optimization
  const [optimizing, setOptimizing] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  /* ── Fetch ── */
  const fetchFunnels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.entities("funnel_items").list({ limit: 200, sort: "-id" });
      setFunnels(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading funnels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchFunnels();
  }, [user, fetchFunnels]);

  /* ── Create / Edit ── */
  const openCreate = () => {
    setEditingFunnel(null);
    setFormName("");
    setFormType("sales");
    setShowDialog(true);
  };

  const openEdit = (f: FunnelItem) => {
    setEditingFunnel(f);
    setFormName(f.name);
    setFormType(f.funnel_type || "sales");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      if (editingFunnel) {
        await client.entities("funnel_items").update(editingFunnel.id, {
          name: formName.trim(),
          funnel_type: formType,
        });
        toast.success("Funnel actualizado");
      } else {
        await client.entities("funnel_items").create({
          name: formName.trim(),
          funnel_type: formType,
          status: "draft",
          stages_count: 0,
          visitors: 0,
          leads: 0,
          conversions: 0,
          conversion_rate: 0,
          revenue: 0,
        });
        toast.success("Funnel creado");
      }
      setShowDialog(false);
      await fetchFunnels();
    } catch (err) {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este funnel?")) return;
    try {
      await client.entities("funnel_items").delete(id);
      toast.success("Funnel eliminado");
      await fetchFunnels();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  /* ── Publish ── */
  const handlePublish = async (funnel: FunnelItem) => {
    setPublishing(funnel.id);
    try {
      const result = await api.publishFunnel(funnel.id);
      toast.success(`¡Funnel publicado! ${result.pages_count} páginas generadas`);
      await fetchFunnels();
    } catch (err) {
      toast.error("Error al publicar");
    } finally {
      setPublishing(null);
    }
  };

  /* ── Preview ── */
  const handlePreview = async (funnel: FunnelItem) => {
    setPreviewFunnel(funnel);
    setLoadingPreview(true);
    try {
      const data = await api.getFunnelData(funnel.id);
      setPreviewStages(data.pages || []);
    } catch {
      setPreviewStages([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  /* ── Copy URL ── */
  const copyPublicUrl = (funnelId: number) => {
    const baseUrl = getAPIBaseURL();
    const url = `${baseUrl}/api/v1/funnels/${funnelId}/public`;
    navigator.clipboard.writeText(url);
    toast.success("URL pública copiada al portapapeles");
  };

  /* ── Open public URL ── */
  const openPublicUrl = (funnelId: number) => {
    const baseUrl = getAPIBaseURL();
    window.open(`${baseUrl}/api/v1/funnels/${funnelId}/public`, "_blank");
  };

  /* ── AI Optimize ── */
  const handleAIOptimize = async (funnel: FunnelItem) => {
    setOptimizing(funnel.id);
    try {
      const result = await callAI({
        prompt: `Generate optimized funnel stages for a "${funnel.funnel_type || 'sales'}" funnel named "${funnel.name}". 
Return JSON array of 4-6 stages, each with: name, type, headline, description, cta_text, metrics (object with 2-3 key-value pairs).
Make it compelling, conversion-focused, and professional. Respond ONLY with the JSON array.`,
        system: "You are a conversion rate optimization expert. Always respond in valid JSON array format.",
        maxTokens: 2048,
      });

      if (result.ok) {
        let stages: FunnelStage[] = [];
        try {
          const parsed = JSON.parse(result.text);
          stages = Array.isArray(parsed) ? parsed : [];
        } catch {
          toast.error("Error parsing AI response");
          return;
        }

        if (stages.length > 0) {
          // Save AI-generated stages to the funnel
          await client.entities("funnel_items").update(funnel.id, {
            stages_json: JSON.stringify({ stages }),
            stages_count: stages.length,
          });
          toast.success(`${stages.length} etapas generadas con IA`);
          await fetchFunnels();
        }
      } else {
        toast.error(result.error || "Error de IA");
      }
    } catch {
      toast.error("Error al optimizar");
    } finally {
      setOptimizing(null);
    }
  };

  /* ── Parse stages from funnel ── */
  const parseStages = (f: FunnelItem): FunnelStage[] => {
    if (!f.stages_json) return [];
    try {
      const parsed = JSON.parse(f.stages_json);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.stages) return parsed.stages;
      return [];
    } catch {
      return [];
    }
  };

  const isPublished = (f: FunnelItem) => f.status === "published";

  /* ── Stats ── */
  const totalFunnels = funnels.length;
  const publishedCount = funnels.filter(isPublished).length;
  const draftCount = funnels.filter(f => f.status !== "published").length;
  const totalStages = funnels.reduce((sum, f) => sum + (f.stages_count || 0), 0);

  const funnelTypes = [
    { value: "sales", label: "Ventas" },
    { value: "lead_generation", label: "Generación de Leads" },
    { value: "webinar", label: "Webinar" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "onboarding", label: "Onboarding" },
  ];

  return (
    <SaasLayout title={ts("funnels")} subtitle="Visual Builder & Publisher">
      <InlineServiceDemo serviceKey="funnels" serviceName={ts("funnels")} />

      {/* Header bar */}
      <div className="rounded-xl bg-gradient-to-r from-violet-500/[0.06] via-purple-500/[0.04] to-fuchsia-500/[0.06] border border-violet-500/10 p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-bold text-white">{ts("funnels")} — Publisher</span>
            {["CRUD", "Publicar", "Preview", "URL Pública", "IA"].map(b => (
              <span key={b} className="px-2 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-400 border border-violet-500/20">{b}</span>
            ))}
          </div>
          <Button onClick={openCreate} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5">
            <Plus className="w-3 h-3" /> Nuevo Funnel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Funnels", value: totalFunnels, icon: Target, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
          { label: "Publicados", value: publishedCount, icon: Globe, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
          { label: "Borradores", value: draftCount, icon: Edit2, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
          { label: "Etapas Totales", value: totalStages, icon: BarChart3, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Funnel List */}
      <DataStateWrapper
        loading={loading}
        error={error}
        empty={funnels.length === 0}
        emptyMessage="No hay funnels. Crea tu primer funnel para empezar."
        onRetry={fetchFunnels}
        emptyIcon={<Target className="w-8 h-8 text-zinc-500" />}
      >
        <div className="space-y-3">
          {funnels.map(funnel => {
            const stages = parseStages(funnel);
            const expanded = expandedId === funnel.id;
            const published = isPublished(funnel);

            return (
              <div key={funnel.id} className="rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-all">
                {/* Header row */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expanded ? null : funnel.id)}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      published
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                    )}>
                      {published ? <Globe className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-white truncate">{funnel.name}</h3>
                        <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0",
                          published ? "border-emerald-500/30 text-emerald-400" : "border-zinc-600 text-zinc-500"
                        )}>
                          {published ? "PUBLICADO" : "BORRADOR"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {(funnel.funnel_type || "sales").replace("_", " ")} · {funnel.stages_count || 0} etapas
                        {funnel.visitors ? ` · ${funnel.visitors.toLocaleString()} visitantes` : ""}
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {/* AI Generate Stages */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAIOptimize(funnel)}
                      disabled={optimizing === funnel.id}
                      className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-8 px-2"
                      title="Generar etapas con IA"
                    >
                      {optimizing === funnel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                    </Button>

                    {/* Preview */}
                    {stages.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreview(funnel)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Publish */}
                    <Button
                      size="sm"
                      onClick={() => handlePublish(funnel)}
                      disabled={publishing === funnel.id}
                      className={cn(
                        "text-xs gap-1 h-8",
                        published
                          ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20"
                          : "bg-violet-600 hover:bg-violet-500 text-white"
                      )}
                    >
                      {publishing === funnel.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Rocket className="w-3 h-3" />
                      )}
                      {published ? "Republicar" : "Publicar"}
                    </Button>

                    {/* Public URL actions */}
                    {published && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyPublicUrl(funnel.id)}
                          className="text-zinc-400 hover:text-white hover:bg-white/5 h-8 px-2"
                          title="Copiar URL pública"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPublicUrl(funnel.id)}
                          className="text-zinc-400 hover:text-white hover:bg-white/5 h-8 px-2"
                          title="Abrir URL pública"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(funnel)}
                      className="text-zinc-400 hover:text-white hover:bg-white/5 h-8 px-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(funnel.id)}
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: stages visualization */}
                {expanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.04]">
                    {stages.length > 0 ? (
                      <>
                        {/* Visual funnel flow */}
                        <div className="flex items-center gap-2 mt-4 mb-4 overflow-x-auto pb-2">
                          {stages.map((stage, i) => (
                            <div key={i} className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/20 transition-all">
                                <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center text-[9px] font-bold text-violet-400">
                                  {i + 1}
                                </div>
                                <div className="text-left">
                                  <span className="text-[10px] font-semibold text-white block">{stage.name}</span>
                                  <span className="text-[8px] text-zinc-600">{stage.type}</span>
                                </div>
                              </div>
                              {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-700 shrink-0" />}
                            </div>
                          ))}
                        </div>

                        {/* Stage details */}
                        <div className="space-y-2">
                          {stages.map((stage, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-medium text-white">{stage.headline || stage.name}</p>
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{stage.type}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mb-1.5">{stage.description}</p>
                                {stage.cta_text && (
                                  <span className="text-[9px] text-violet-400 font-semibold">CTA: {stage.cta_text}</span>
                                )}
                                {stage.metrics && Object.keys(stage.metrics).length > 0 && (
                                  <div className="flex gap-2 mt-1.5 flex-wrap">
                                    {Object.entries(stage.metrics).map(([k, v]) => (
                                      <span key={k} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-400">
                                        {k}: <span className="text-white font-semibold">{v}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Published URL */}
                        {published && (
                          <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] font-semibold text-emerald-400">URL Pública Activa</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="ghost" onClick={() => copyPublicUrl(funnel.id)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 h-6 px-2 text-[9px]">
                                  <Copy className="w-3 h-3 mr-1" /> Copiar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => openPublicUrl(funnel.id)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 h-6 px-2 text-[9px]">
                                  <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                                </Button>
                              </div>
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-1 font-mono truncate">
                              {getAPIBaseURL()}/api/v1/funnels/{funnel.id}/public
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Sparkles className="w-8 h-8 text-zinc-600 mb-3" />
                        <p className="text-xs text-zinc-500 mb-3">
                          Este funnel no tiene etapas definidas aún.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleAIOptimize(funnel)}
                          disabled={optimizing === funnel.id}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5"
                        >
                          {optimizing === funnel.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                          Generar Etapas con IA
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DataStateWrapper>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#0F1419] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editingFunnel ? "Editar Funnel" : "Nuevo Funnel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] text-zinc-400 mb-1.5 block">Nombre del Funnel</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Mi Funnel de Ventas"
                className="bg-white/5 border-white/10 text-white text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] text-zinc-400 mb-1.5 block">Tipo de Funnel</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F26] border-white/10">
                  {funnelTypes.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-white text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-zinc-400 text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              {editingFunnel ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFunnel} onOpenChange={open => { if (!open) setPreviewFunnel(null); }}>
        <DialogContent className="bg-[#0F1419] border-white/10 text-white max-w-4xl max-h-[85vh] overflow-hidden p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">
                Preview: {previewFunnel?.name}
              </span>
              {previewFunnel?.status === "published" && (
                <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">LIVE</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {previewFunnel?.status === "published" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => previewFunnel && copyPublicUrl(previewFunnel.id)}
                    className="text-zinc-400 hover:text-white h-7 px-2 text-[9px]">
                    <Copy className="w-3 h-3 mr-1" /> Copiar URL
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => previewFunnel && openPublicUrl(previewFunnel.id)}
                    className="text-zinc-400 hover:text-white h-7 px-2 text-[9px]">
                    <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setPreviewFunnel(null)}
                className="text-zinc-400 hover:text-white h-7 px-2">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 52px)" }}>
            {loadingPreview ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              </div>
            ) : previewFunnel?.status === "published" ? (
              <iframe
                src={api.getFunnelPublicUrl(previewFunnel.id)}
                className="w-full border-0"
                style={{ height: "calc(85vh - 52px)" }}
                title="Funnel Preview"
              />
            ) : previewStages.length > 0 ? (
              <div className="p-6 space-y-4">
                <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  ⚠️ Este funnel aún no está publicado. Publícalo para ver el preview completo con HTML generado.
                </p>
                {previewStages.map((stage, i) => (
                  <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-violet-500/10 flex items-center justify-center text-[9px] font-bold text-violet-400">
                        {i + 1}
                      </div>
                      <span className="text-xs font-semibold text-white">{stage.headline || stage.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{stage.type}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">{stage.description}</p>
                    {stage.cta_text && (
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-[10px] font-semibold">
                          {stage.cta_text}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-zinc-500 text-xs">
                No hay etapas para previsualizar
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SaasLayout>
  );
}
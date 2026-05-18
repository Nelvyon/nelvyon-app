import { useEffect, useState, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Share2, Loader2, Sparkles, Crown, CheckCircle2, Instagram, Facebook,
  Linkedin, Twitter, Youtube, Globe, TrendingUp, Eye, Heart, MessageCircle,
  BarChart3, Calendar, Zap, Target, ChevronDown, ChevronUp, Image,
  Video, FileText, Hash, Clock, Send, RefreshCw, Play, Pause,
  Copy, Download, Filter, Search, Plus, Star, Flame, Camera,
  Film, Layers, Layout, Type, Music, Mic, BookOpen, Palette,
  ArrowRight, ChevronLeft, ChevronRight, MoreHorizontal, Trash2,
  Edit, ExternalLink, AlertCircle, Bot, Hammer, XCircle, RotateCcw,
  MousePointerClick, Shield, Lock, Unlock, Check, X,
} from "lucide-react";
import { api, type NelvyonProject, type NelvyonOutput, type NelvyonClient, client } from "@/lib/api";
import { cn } from "@/lib/utils";
import SocialAnalyticsTab from "@/components/analytics/SocialAnalyticsTab";
import { toast } from "sonner";
import { parseE2EParams, buildE2EUrl } from "@/lib/e2e-flow";
import E2EContextBanner from "@/components/E2EContextBanner";

// ── Types ──
interface SocialPost {
  id: number;
  user_id: string;
  platform: string;
  content: string;
  format_type: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  impressions: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  error_message?: string;
  retry_count: number;
  hashtags?: string;
  media_url?: string;
  campaign_name?: string;
  created_at?: string;
}

// ── Platform Config ──
const platforms = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "from-pink-500 to-purple-600", bg: "bg-gradient-to-br from-pink-500/10 to-purple-600/10", border: "border-pink-500/20", text: "text-pink-400" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "from-blue-600 to-blue-500", bg: "bg-gradient-to-br from-blue-600/10 to-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { id: "tiktok", name: "TikTok", icon: Zap, color: "from-zinc-800 to-pink-500", bg: "bg-gradient-to-br from-zinc-800/10 to-pink-500/10", border: "border-pink-400/20", text: "text-pink-300" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "from-blue-700 to-blue-600", bg: "bg-gradient-to-br from-blue-700/10 to-blue-600/10", border: "border-blue-600/20", text: "text-blue-300" },
  { id: "twitter", name: "X / Twitter", icon: Twitter, color: "from-zinc-700 to-zinc-600", bg: "bg-gradient-to-br from-zinc-700/10 to-zinc-600/10", border: "border-zinc-500/20", text: "text-zinc-300" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "from-red-600 to-red-500", bg: "bg-gradient-to-br from-red-600/10 to-red-500/10", border: "border-red-500/20", text: "text-red-400" },
  { id: "pinterest", name: "Pinterest", icon: Image, color: "from-red-500 to-pink-500", bg: "bg-gradient-to-br from-red-500/10 to-pink-500/10", border: "border-red-400/20", text: "text-red-300" },
  { id: "threads", name: "Threads", icon: Hash, color: "from-zinc-600 to-zinc-500", bg: "bg-gradient-to-br from-zinc-600/10 to-zinc-500/10", border: "border-zinc-400/20", text: "text-zinc-300" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  draft: { label: "Borrador", color: "text-zinc-400", icon: FileText, bg: "bg-zinc-500/10 border-zinc-500/20" },
  scheduled: { label: "Programado", color: "text-blue-400", icon: Clock, bg: "bg-blue-500/10 border-blue-500/20" },
  sending: { label: "Enviando", color: "text-amber-400", icon: Send, bg: "bg-amber-500/10 border-amber-500/20" },
  sent: { label: "Enviado", color: "text-emerald-400", icon: CheckCircle2, bg: "bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Fallido", color: "text-red-400", icon: XCircle, bg: "bg-red-500/10 border-red-500/20" },
  retrying: { label: "Reintentando", color: "text-orange-400", icon: RotateCcw, bg: "bg-orange-500/10 border-orange-500/20" },
};

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ─── Role Permissions ─── */
type SocialRole = "admin" | "manager" | "editor" | "viewer";
const SOCIAL_ROLES: Record<SocialRole, { label: string; color: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; canChangeStatus: boolean; canRetry: boolean; canViewLogs: boolean }> = {
  admin: { label: "Administrador", color: "text-amber-400", canCreate: true, canEdit: true, canDelete: true, canChangeStatus: true, canRetry: true, canViewLogs: true },
  manager: { label: "Manager Social", color: "text-violet-400", canCreate: true, canEdit: true, canDelete: true, canChangeStatus: true, canRetry: true, canViewLogs: true },
  editor: { label: "Editor", color: "text-blue-400", canCreate: true, canEdit: true, canDelete: false, canChangeStatus: false, canRetry: false, canViewLogs: false },
  viewer: { label: "Visor", color: "text-zinc-400", canCreate: false, canEdit: false, canDelete: false, canChangeStatus: false, canRetry: false, canViewLogs: false },
};

/* ─── Audit Log ─── */
interface SocialAuditEntry {
  action: string;
  timestamp: string;
  user: string;
  role: string;
  details?: string;
}

export default function SaasSocial() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const e2eParams = parseE2EParams(location.search);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("metrics");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Role & Audit
  const [currentRole, setCurrentRole] = useState<SocialRole>("admin");
  const permissions = SOCIAL_ROLES[currentRole];
  const [auditTrail, setAuditTrail] = useState<SocialAuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  // Create form
  const [newPlatform, setNewPlatform] = useState("instagram");
  const [newContent, setNewContent] = useState("");
  const [newFormat, setNewFormat] = useState("post");
  const [newSchedule, setNewSchedule] = useState("");
  const [newCampaign, setNewCampaign] = useState("");
  const [newHashtags, setNewHashtags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities.social_posts.query({ sort: "-created_at", limit: 200 });
      setPosts((res?.data as SocialPost[]) || []);
    } catch {
      toast.error("Error cargando publicaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchPosts(); }, [user, fetchPosts]);

  // Auto-refresh for sending/retrying posts
  useEffect(() => {
    const hasPending = posts.some(p => p.status === "sending" || p.status === "retrying");
    if (!hasPending) return;
    const interval = setInterval(fetchPosts, 15000);
    return () => clearInterval(interval);
  }, [posts, fetchPosts]);

  // ── Filtered posts ──
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.content.toLowerCase().includes(q) || (p.campaign_name || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [posts, filterPlatform, filterStatus, searchQuery]);

  // ── Metrics ──
  const metrics = useMemo(() => {
    const byPlatform: Record<string, { impressions: number; clicks: number; likes: number; comments: number; shares: number; posts: number; sent: number; failed: number }> = {};
    platforms.forEach(p => {
      byPlatform[p.id] = { impressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0, posts: 0, sent: 0, failed: 0 };
    });
    posts.forEach(p => {
      if (!byPlatform[p.platform]) return;
      byPlatform[p.platform].impressions += p.impressions || 0;
      byPlatform[p.platform].clicks += p.clicks || 0;
      byPlatform[p.platform].likes += p.likes || 0;
      byPlatform[p.platform].comments += p.comments || 0;
      byPlatform[p.platform].shares += p.shares || 0;
      byPlatform[p.platform].posts += 1;
      if (p.status === "sent") byPlatform[p.platform].sent += 1;
      if (p.status === "failed") byPlatform[p.platform].failed += 1;
    });
    const totalImpressions = posts.reduce((a, p) => a + (p.impressions || 0), 0);
    const totalClicks = posts.reduce((a, p) => a + (p.clicks || 0), 0);
    const totalLikes = posts.reduce((a, p) => a + (p.likes || 0), 0);
    const totalEngagement = totalLikes + posts.reduce((a, p) => a + (p.comments || 0) + (p.shares || 0), 0);
    const engagementRate = totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : "0";
    const sentCount = posts.filter(p => p.status === "sent").length;
    const failedCount = posts.filter(p => p.status === "failed").length;
    const scheduledCount = posts.filter(p => p.status === "scheduled").length;
    return { byPlatform, totalImpressions, totalClicks, totalLikes, totalEngagement, engagementRate, sentCount, failedCount, scheduledCount };
  }, [posts]);

  // ── CRUD (permission-gated + audit logged) ──
  const handleCreate = async () => {
    if (!permissions.canCreate) { toast.error("No tienes permisos para crear publicaciones"); return; }
    if (!newContent.trim()) { toast.error("El contenido es obligatorio"); return; }
    setSaving(true);
    try {
      await client.entities.social_posts.create({
        platform: newPlatform,
        content: newContent,
        format_type: newFormat,
        status: newSchedule ? "scheduled" : "draft",
        scheduled_at: newSchedule || undefined,
        campaign_name: e2eParams.campaign_name || newCampaign || undefined,
        hashtags: newHashtags || undefined,
        impressions: 0, clicks: 0, likes: 0, comments: 0, shares: 0, retry_count: 0,
        // E2E relationship fields — persisted in backend
        client_id: e2eParams.client_id || null,
        project_id: e2eParams.project_id || null,
        output_id: e2eParams.output_id || null,
        contract_id: e2eParams.contract_id || null,
      });
      toast.success("Publicación creada");
      addAudit("Publicación creada", `${platforms.find(p => p.id === newPlatform)?.name || newPlatform} · ${newFormat} · ${newContent.slice(0, 40)}...`);
      resetForm();
      setShowCreateModal(false);
      fetchPosts();
    } catch {
      toast.error("Error creando publicación");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (post: SocialPost, newStatus: string) => {
    if (!permissions.canChangeStatus) { toast.error("No tienes permisos para cambiar el estado"); return; }
    const oldStatus = post.status;
    try {
      await client.entities.social_posts.update(post.id, { status: newStatus });
      toast.success(`Estado actualizado a ${statusConfig[newStatus]?.label || newStatus}`);
      addAudit("Estado cambiado", `${statusConfig[oldStatus]?.label || oldStatus} → ${statusConfig[newStatus]?.label || newStatus} · Post #${post.id}`);
      fetchPosts();
    } catch {
      toast.error("Error actualizando estado");
    }
  };

  const handleRetry = async (post: SocialPost) => {
    if (!permissions.canRetry) { toast.error("No tienes permisos para reintentar envíos"); return; }
    try {
      await client.entities.social_posts.update(post.id, { status: "retrying", retry_count: (post.retry_count || 0) + 1, error_message: "" });
      toast.success("Reintentando envío...");
      addAudit("Reintento de envío", `Post #${post.id} · Intento ${(post.retry_count || 0) + 1} · ${post.platform}`);
      fetchPosts();
    } catch {
      toast.error("Error reintentando");
    }
  };

  const handleDelete = async (id: number) => {
    if (!permissions.canDelete) { toast.error("No tienes permisos para eliminar publicaciones"); return; }
    const post = posts.find(p => p.id === id);
    try {
      await client.entities.social_posts.delete(id);
      toast.success("Publicación eliminada");
      addAudit("Publicación eliminada", `Post #${id} · ${post?.platform || "?"} · ${(post?.content || "").slice(0, 40)}...`);
      fetchPosts();
    } catch {
      toast.error("Error eliminando");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    if (!permissions.canEdit) { toast.error("No tienes permisos para editar publicaciones"); return; }
    setSaving(true);
    try {
      await client.entities.social_posts.update(editingPost.id, {
        content: editingPost.content,
        platform: editingPost.platform,
        format_type: editingPost.format_type,
        scheduled_at: editingPost.scheduled_at || undefined,
        campaign_name: editingPost.campaign_name || undefined,
        hashtags: editingPost.hashtags || undefined,
      });
      toast.success("Publicación actualizada");
      addAudit("Publicación editada", `Post #${editingPost.id} · ${editingPost.platform}`);
      setEditingPost(null);
      fetchPosts();
    } catch {
      toast.error("Error actualizando");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewPlatform("instagram"); setNewContent(""); setNewFormat("post");
    setNewSchedule(""); setNewCampaign(""); setNewHashtags("");
  };

  // ── Calendar helpers ──
  const getCalendarWeekDates = () => {
    const start = new Date(calendarDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };
  const weekDates = getCalendarWeekDates();

  const getMonthDates = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const dates: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) dates.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) dates.push(new Date(year, month, d));
    return dates;
  };
  const monthDates = getMonthDates();

  const getPostsForDate = (date: Date) => {
    return posts.filter(p => {
      const pDate = p.scheduled_at ? new Date(p.scheduled_at) : p.created_at ? new Date(p.created_at) : null;
      return pDate && pDate.toDateString() === date.toDateString();
    });
  };

  const getPlatformInfo = (id: string) => platforms.find(p => p.id === id);

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <SaasLayout title="Social Media Studio" subtitle="Gestión completa de contenido social con métricas reales y estados de entrega">
      {/* E2E Context Banner */}
      <E2EContextBanner
        currentModule="social"
        context={{
          client_id: e2eParams.client_id,
          project_id: e2eParams.project_id,
          contract_id: e2eParams.contract_id,
          campaign_name: e2eParams.campaign_name,
        }}
      />
      {/* Role Selector + Audit */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <Shield className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[10px] text-zinc-500">Rol:</span>
            <select value={currentRole} onChange={e => setCurrentRole(e.target.value as SocialRole)}
              className="h-7 px-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-xs text-zinc-300">
              {Object.entries(SOCIAL_ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { key: "canCreate", label: "Crear" },
              { key: "canEdit", label: "Editar" },
              { key: "canDelete", label: "Eliminar" },
              { key: "canChangeStatus", label: "Estado" },
              { key: "canRetry", label: "Reintentar" },
            ].map(p => (
              <span key={p.key} className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5",
                permissions[p.key as keyof typeof permissions] ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                {permissions[p.key as keyof typeof permissions] ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                {p.label}
              </span>
            ))}
          </div>
        </div>
        {permissions.canViewLogs && (
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={() => setShowAuditLog(!showAuditLog)}>
            <Clock className="w-3 h-3 mr-1" /> Log ({auditTrail.length})
          </Button>
        )}
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && permissions.canViewLogs && auditTrail.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-pink-400" /> Registro de Auditoría Social ({auditTrail.length})
            </span>
            <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditTrail.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-pink-400">{entry.action}</span>
                    <span className="text-[9px] text-zinc-500">{entry.user}</span>
                    <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{SOCIAL_ROLES[entry.role as SocialRole]?.label || entry.role}</span>
                  </div>
                  {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                  <p className="text-[8px] text-zinc-700">{new Date(entry.timestamp).toLocaleString("es")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Badge */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500/[0.08] via-violet-500/[0.06] to-blue-500/[0.08] border border-pink-500/10 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">SOCIAL MEDIA PROFESIONAL</h2>
              <p className="text-[10px] text-zinc-500">8 plataformas · Métricas reales · Estados de entrega · Calendario de campañas</p>
            </div>
          </div>
          {permissions.canCreate && (
            <Button size="sm" className="bg-pink-600 hover:bg-pink-500 text-white h-8 text-xs" onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nueva Publicación
            </Button>
          )}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Posts", value: posts.length, icon: Share2, color: "text-pink-400", gradient: "from-pink-500/10 to-rose-500/10" },
          { label: "Impresiones", value: formatNum(metrics.totalImpressions), icon: Eye, color: "text-blue-400", gradient: "from-blue-500/10 to-indigo-500/10" },
          { label: "Clics", value: formatNum(metrics.totalClicks), icon: MousePointerClick, color: "text-cyan-400", gradient: "from-cyan-500/10 to-teal-500/10" },
          { label: "Engagement", value: `${metrics.engagementRate}%`, icon: Heart, color: "text-red-400", gradient: "from-red-500/10 to-rose-500/10" },
          { label: "Enviados", value: metrics.sentCount, icon: CheckCircle2, color: "text-emerald-400", gradient: "from-emerald-500/10 to-green-500/10" },
          { label: "Fallidos", value: metrics.failedCount, icon: XCircle, color: "text-red-400", gradient: "from-red-500/10 to-orange-500/10" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center mb-1.5", s.gradient)}>
              <s.icon className={cn("w-3.5 h-3.5", s.color)} />
            </div>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[9px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#0A0E13] border border-white/[0.06] p-1 mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="metrics" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-400 text-xs gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Publicaciones
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-xs gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Calendario
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 text-xs gap-1.5">
            <Target className="w-3.5 h-3.5" /> Campañas
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ═══ METRICS TAB ═══ */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Per-Platform Metrics */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" /> Métricas por Plataforma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {platforms.map(p => {
                const m = metrics.byPlatform[p.id];
                if (!m || m.posts === 0) return (
                  <div key={p.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] opacity-40">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", p.color)}>
                        <p.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-zinc-500">{p.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-700">Sin datos aún</p>
                  </div>
                );
                const engRate = m.impressions > 0 ? (((m.likes + m.comments + m.shares) / m.impressions) * 100).toFixed(1) : "0";
                return (
                  <div key={p.id} className={cn("p-4 rounded-xl border transition-all hover:border-white/[0.12]", p.bg, p.border)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", p.color)}>
                          <p.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-white">{p.name}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400">{m.posts} posts</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[8px] text-zinc-500 flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> Impresiones</p>
                        <p className="text-sm font-bold text-white">{formatNum(m.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 flex items-center gap-0.5"><MousePointerClick className="w-2.5 h-2.5" /> Clics</p>
                        <p className="text-sm font-bold text-white">{formatNum(m.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> Likes</p>
                        <p className="text-sm font-bold text-white">{formatNum(m.likes)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> Eng. Rate</p>
                        <p className="text-sm font-bold text-white">{engRate}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-zinc-500" />
                        <span className="text-[9px] text-zinc-500">{m.comments} comentarios</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share2 className="w-3 h-3 text-zinc-500" />
                        <span className="text-[9px] text-zinc-500">{m.shares} compartidos</span>
                      </div>
                    </div>
                    {/* Delivery status bar */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                        {m.sent > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(m.sent / m.posts) * 100}%` }} />}
                        {m.failed > 0 && <div className="h-full bg-red-500" style={{ width: `${(m.failed / m.posts) * 100}%` }} />}
                      </div>
                      <span className="text-[8px] text-emerald-400">{m.sent}✓</span>
                      {m.failed > 0 && <span className="text-[8px] text-red-400">{m.failed}✗</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error/Failed Posts */}
          {posts.filter(p => p.status === "failed").length > 0 && (
            <div className="rounded-xl bg-red-500/[0.04] border border-red-500/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" /> Publicaciones Fallidas
              </h3>
              <div className="space-y-2">
                {posts.filter(p => p.status === "failed").map(p => {
                  const plat = getPlatformInfo(p.platform);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/[0.06] border border-red-500/10">
                      <div className="flex items-center gap-3 min-w-0">
                        {plat && (
                          <div className={cn("w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0", plat.color)}>
                            <plat.icon className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] text-white truncate">{p.content.slice(0, 60)}...</p>
                          <p className="text-[9px] text-red-400">{p.error_message || "Error desconocido"} · Reintentos: {p.retry_count}</p>
                        </div>
                      </div>
                      {permissions.canRetry && (
                        <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 h-7 text-[10px] shrink-0" onClick={() => handleRetry(p)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Reintentar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ POSTS TAB ═══ */}
        <TabsContent value="posts" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input placeholder="Buscar contenido o campaña..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0A0E13] border-white/[0.06] text-sm text-white placeholder:text-zinc-600 h-9" />
            </div>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-zinc-300">
              <option value="all">Todas las plataformas</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-zinc-300">
              <option value="all">Todos los estados</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button size="sm" variant="outline" className="border-white/10 text-zinc-400 h-9" onClick={fetchPosts}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/[0.06] rounded w-2/3" />
                      <div className="h-2.5 bg-white/[0.04] rounded w-full" />
                      <div className="h-2.5 bg-white/[0.04] rounded w-1/2" />
                    </div>
                    <div className="h-5 w-20 bg-white/[0.04] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-7 h-7 text-pink-400" />
              </div>
              <p className="text-sm text-zinc-400 font-medium">No hay publicaciones</p>
              {permissions.canCreate && (
                <Button size="sm" className="mt-4 bg-pink-600 hover:bg-pink-500 text-white" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Crear primera publicación
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPosts.map(post => {
                const plat = getPlatformInfo(post.platform);
                const st = statusConfig[post.status] || statusConfig.draft;
                const StIcon = st.icon;
                return (
                  <div key={post.id} className="rounded-xl bg-[#0A0E13] border border-white/[0.04] hover:border-white/[0.08] transition-all p-4">
                    <div className="flex items-start gap-3">
                      {/* Platform icon */}
                      {plat && (
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", plat.color)}>
                          <plat.icon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-white">{plat?.name || post.platform}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">{post.format_type}</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5", st.bg, st.color)}>
                            <StIcon className="w-2.5 h-2.5" /> {st.label}
                          </span>
                          {post.campaign_name && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20">{post.campaign_name}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">{post.content}</p>
                        {post.hashtags && (
                          <p className="text-[9px] text-blue-400 mt-1">{post.hashtags.split(",").map(h => h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`).join(" ")}</p>
                        )}
                        {/* Metrics row for sent posts */}
                        {post.status === "sent" && (post.impressions > 0 || post.likes > 0) && (
                          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04]">
                            <span className="text-[9px] text-zinc-500 flex items-center gap-0.5"><Eye className="w-3 h-3" /> {formatNum(post.impressions)}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-0.5"><MousePointerClick className="w-3 h-3" /> {formatNum(post.clicks)}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-0.5"><Heart className="w-3 h-3" /> {formatNum(post.likes)}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {post.comments}</span>
                            <span className="text-[9px] text-zinc-500 flex items-center gap-0.5"><Share2 className="w-3 h-3" /> {post.shares}</span>
                          </div>
                        )}
                        {/* Error message */}
                        {post.status === "failed" && post.error_message && (
                          <div className="mt-2 p-2 rounded-lg bg-red-500/[0.06] border border-red-500/10">
                            <p className="text-[9px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {post.error_message} · Reintentos: {post.retry_count}</p>
                          </div>
                        )}
                        {/* Schedule info */}
                        {post.scheduled_at && (
                          <p className="text-[9px] text-zinc-600 mt-1 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Programado: {new Date(post.scheduled_at).toLocaleString("es")}
                          </p>
                        )}
                      </div>
                      {/* Actions (permission-gated) */}
                      <div className="flex flex-col gap-1 shrink-0">
                        {post.status === "draft" && permissions.canChangeStatus && (
                          <Button size="sm" variant="outline" className="h-7 text-[9px] border-blue-500/20 text-blue-400" onClick={() => handleUpdateStatus(post, "scheduled")}>
                            <Clock className="w-3 h-3 mr-0.5" /> Programar
                          </Button>
                        )}
                        {post.status === "scheduled" && permissions.canChangeStatus && (
                          <Button size="sm" variant="outline" className="h-7 text-[9px] border-emerald-500/20 text-emerald-400" onClick={() => handleUpdateStatus(post, "sending")}>
                            <Send className="w-3 h-3 mr-0.5" /> Enviar
                          </Button>
                        )}
                        {post.status === "failed" && permissions.canRetry && (
                          <Button size="sm" variant="outline" className="h-7 text-[9px] border-orange-500/20 text-orange-400" onClick={() => handleRetry(post)}>
                            <RotateCcw className="w-3 h-3 mr-0.5" /> Reintentar
                          </Button>
                        )}
                        {permissions.canEdit && (
                          <Button size="sm" variant="ghost" className="h-7 text-[9px] text-zinc-500" onClick={() => setEditingPost({ ...post })}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                        {permissions.canDelete && (
                          <Button size="sm" variant="ghost" className="h-7 text-[9px] text-zinc-500 hover:text-red-400" onClick={() => handleDelete(post.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        {/* E2E: Create Ticket from this Social Post */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[9px] border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={() => {
                            navigate(buildE2EUrl("/saas/helpdesk", {
                              social_post_id: post.id,
                              client_id: e2eParams.client_id,
                              project_id: e2eParams.project_id,
                              contract_id: e2eParams.contract_id,
                              campaign_name: post.campaign_name || e2eParams.campaign_name,
                              source: "social_incident",
                            }));
                            toast.success("→ Helpdesk con contexto E2E del post");
                          }}
                          title="Crear Ticket desde este post"
                        >
                          <AlertCircle className="w-3 h-3 mr-0.5" /> Ticket
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ CALENDAR TAB ═══ */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400"
                  onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() - 1); setCalendarDate(d); }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold text-white w-48 text-center capitalize">
                  {calendarDate.toLocaleDateString("es", { month: "long", year: "numeric" })}
                </span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400"
                  onClick={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() + 1); setCalendarDate(d); }}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button size="sm" variant="outline" className="text-[10px] h-7 border-blue-500/20 text-blue-400"
                onClick={() => setCalendarDate(new Date())}>
                Hoy
              </Button>
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map(d => (
                <div key={d} className="text-center text-[9px] font-semibold text-zinc-600 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="min-h-[80px]" />;
                const isToday = date.toDateString() === new Date().toDateString();
                const dayPosts = getPostsForDate(date);
                return (
                  <div key={i} className={cn(
                    "rounded-lg border p-1.5 min-h-[80px] transition-all cursor-default",
                    isToday ? "bg-blue-500/[0.06] border-blue-500/20" : "bg-white/[0.01] border-white/[0.04] hover:border-white/[0.08]"
                  )}>
                    <span className={cn("text-[10px] font-bold block mb-1", isToday ? "text-blue-400" : "text-zinc-500")}>
                      {date.getDate()}
                    </span>
                    {dayPosts.slice(0, 3).map(p => {
                      const plat = getPlatformInfo(p.platform);
                      const st = statusConfig[p.status];
                      return (
                        <div key={p.id} className={cn("flex items-center gap-0.5 px-1 py-0.5 rounded mb-0.5", st?.bg || "bg-zinc-500/10 border-zinc-500/20", "border")}>
                          {plat && <plat.icon className="w-2.5 h-2.5 text-white shrink-0" />}
                          <span className="text-[7px] text-zinc-300 truncate">{p.format_type}</span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 3 && <p className="text-[7px] text-zinc-600 text-center">+{dayPosts.length - 3}</p>}
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              {Object.entries(statusConfig).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", v.color.replace("text-", "bg-"))} />
                  <span className="text-[9px] text-zinc-500">{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Week Detail */}
          <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Vista Semanal Detallada
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                const dayPosts = getPostsForDate(date);
                return (
                  <div key={i} className={cn(
                    "rounded-xl border p-3 min-h-[140px] transition-all",
                    isToday ? "bg-blue-500/[0.04] border-blue-500/20" : "bg-white/[0.01] border-white/[0.04]"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-[10px] font-semibold", isToday ? "text-blue-400" : "text-zinc-500")}>{weekDays[i]}</span>
                      <span className={cn("text-xs font-bold", isToday ? "text-blue-400" : "text-zinc-400")}>{date.getDate()}</span>
                    </div>
                    {dayPosts.length > 0 ? (
                      <div className="space-y-1.5">
                        {dayPosts.slice(0, 4).map(p => {
                          const plat = getPlatformInfo(p.platform);
                          const st = statusConfig[p.status];
                          return (
                            <div key={p.id} className={cn("p-1.5 rounded-lg border", st?.bg || "bg-zinc-500/10 border-zinc-500/20")}>
                              <div className="flex items-center gap-1">
                                {plat && <plat.icon className="w-2.5 h-2.5 text-white" />}
                                <span className="text-[7px] font-semibold text-zinc-300 truncate">{p.format_type}</span>
                              </div>
                              <p className="text-[7px] text-zinc-500 truncate mt-0.5">{p.content.slice(0, 30)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-16">
                        <Plus className="w-4 h-4 text-zinc-800" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        <TabsContent value="analytics" className="space-y-4">
          <SocialAnalyticsTab />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {(() => {
            const campaignMap: Record<string, SocialPost[]> = {};
            posts.forEach(p => {
              const name = p.campaign_name || "Sin campaña";
              if (!campaignMap[name]) campaignMap[name] = [];
              campaignMap[name].push(p);
            });
            return Object.entries(campaignMap).map(([name, cPosts]) => {
              const totalImp = cPosts.reduce((a, p) => a + (p.impressions || 0), 0);
              const totalClicks = cPosts.reduce((a, p) => a + (p.clicks || 0), 0);
              const totalEng = cPosts.reduce((a, p) => a + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0);
              const sentCount = cPosts.filter(p => p.status === "sent").length;
              const failedCount = cPosts.filter(p => p.status === "failed").length;
              const platCounts: Record<string, number> = {};
              cPosts.forEach(p => { platCounts[p.platform] = (platCounts[p.platform] || 0) + 1; });
              return (
                <div key={name} className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-violet-400" /> {name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{cPosts.length} publicaciones · {sentCount} enviadas · {failedCount} fallidas</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Object.entries(platCounts).map(([pid, count]) => {
                        const plat = getPlatformInfo(pid);
                        if (!plat) return null;
                        return (
                          <div key={pid} className={cn("w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center", plat.color)} title={`${plat.name}: ${count}`}>
                            <plat.icon className="w-3 h-3 text-white" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-zinc-500">Impresiones</p>
                      <p className="text-lg font-bold text-white">{formatNum(totalImp)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-zinc-500">Clics</p>
                      <p className="text-lg font-bold text-white">{formatNum(totalClicks)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-zinc-500">Engagement</p>
                      <p className="text-lg font-bold text-white">{formatNum(totalEng)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-[8px] text-zinc-500">Tasa Éxito</p>
                      <p className="text-lg font-bold text-emerald-400">{cPosts.length > 0 ? Math.round((sentCount / cPosts.length) * 100) : 0}%</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
                      {sentCount > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(sentCount / cPosts.length) * 100}%` }} />}
                      {failedCount > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${(failedCount / cPosts.length) * 100}%` }} />}
                    </div>
                    <span className="text-[9px] text-zinc-500">{sentCount}/{cPosts.length}</span>
                  </div>
                </div>
              );
            });
          })()}
        </TabsContent>
      </Tabs>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1117] border border-white/[0.08] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-400" /> Nueva Publicación
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Plataforma</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <button key={p.id} onClick={() => setNewPlatform(p.id)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-all",
                        newPlatform === p.id ? `${p.bg} ${p.border} text-white` : "bg-white/[0.02] border-white/[0.06] text-zinc-500")}>
                      <p.icon className="w-3.5 h-3.5" /> {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Formato</label>
                <select value={newFormat} onChange={e => setNewFormat(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-zinc-300">
                  {["post", "reel", "story", "carousel", "video", "article", "thread", "live"].map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Contenido</label>
                <textarea value={newContent} onChange={e => setNewContent(e.target.value)} rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-white placeholder:text-zinc-600 resize-none"
                  placeholder="Escribe el contenido de tu publicación..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Programar (opcional)</label>
                  <Input type="datetime-local" value={newSchedule} onChange={e => setNewSchedule(e.target.value)}
                    className="bg-[#0A0E13] border-white/[0.06] text-xs text-zinc-300 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Campaña (opcional)</label>
                  <Input value={newCampaign} onChange={e => setNewCampaign(e.target.value)} placeholder="Nombre de campaña"
                    className="bg-[#0A0E13] border-white/[0.06] text-xs text-zinc-300 h-9 placeholder:text-zinc-600" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Hashtags (separados por coma)</label>
                <Input value={newHashtags} onChange={e => setNewHashtags(e.target.value)} placeholder="#marketing, #growth"
                  className="bg-[#0A0E13] border-white/[0.06] text-xs text-zinc-300 h-9 placeholder:text-zinc-600" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-white/10 text-zinc-400" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button className="bg-pink-600 hover:bg-pink-500 text-white" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Crear Publicación
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingPost(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1117] border border-white/[0.08] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-400" /> Editar Publicación
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Plataforma</label>
                <select value={editingPost.platform} onChange={e => setEditingPost({ ...editingPost, platform: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-zinc-300">
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 mb-1 block">Contenido</label>
                <textarea value={editingPost.content} onChange={e => setEditingPost({ ...editingPost, content: e.target.value })} rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0E13] border border-white/[0.06] text-xs text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Campaña</label>
                  <Input value={editingPost.campaign_name || ""} onChange={e => setEditingPost({ ...editingPost, campaign_name: e.target.value })}
                    className="bg-[#0A0E13] border-white/[0.06] text-xs text-zinc-300 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-1 block">Hashtags</label>
                  <Input value={editingPost.hashtags || ""} onChange={e => setEditingPost({ ...editingPost, hashtags: e.target.value })}
                    className="bg-[#0A0E13] border-white/[0.06] text-xs text-zinc-300 h-9" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-white/10 text-zinc-400" onClick={() => setEditingPost(null)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </SaasLayout>
  );
}
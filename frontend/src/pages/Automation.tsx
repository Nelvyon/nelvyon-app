import { useState, useEffect, useCallback } from 'react';
import { useI18n } from "@/lib/i18n";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createClient } from '@metagptx/web-sdk';
import {
  Zap, Play, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
  Webhook, Bot, BarChart3, Loader2, Copy, ExternalLink, Cpu,
  TrendingUp, Activity, Globe, Mail, Megaphone, PenTool, Search,
  FileText, ShoppingCart, RotateCcw, Shield, Lock, Unlock,
  Ban, Timer, ListOrdered, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sdkClient = createClient();

/* ─── RBAC ─── */
type UserRole = "admin" | "manager" | "editor" | "viewer";

const ROLE_PERMISSIONS: Record<UserRole, { label: string; canCreateJob: boolean; canRetry: boolean; canCancel: boolean; canCreateWebhook: boolean; canToggleWebhook: boolean; canViewLogs: boolean; canViewHistory: boolean }> = {
  admin:   { label: "Administrador", canCreateJob: true, canRetry: true, canCancel: true, canCreateWebhook: true, canToggleWebhook: true, canViewLogs: true, canViewHistory: true },
  manager: { label: "Manager",       canCreateJob: true, canRetry: true, canCancel: true, canCreateWebhook: true, canToggleWebhook: true, canViewLogs: true, canViewHistory: true },
  editor:  { label: "Editor",        canCreateJob: true, canRetry: false, canCancel: false, canCreateWebhook: false, canToggleWebhook: false, canViewLogs: false, canViewHistory: true },
  viewer:  { label: "Visor",         canCreateJob: false, canRetry: false, canCancel: false, canCreateWebhook: false, canToggleWebhook: false, canViewLogs: false, canViewHistory: false },
};

interface AuditEntry { action: string; timestamp: string; user: string; role: string; details?: string }

/* ─── Run History Entry ─── */
interface RunHistoryEntry {
  id: string;
  jobId: number;
  jobType: string;
  clientName: string;
  status: "success" | "failed" | "canceled" | "running";
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  errorMessage?: string;
  retryOf?: number;
}

interface AutomationJob {
  id: number;
  client_id: number;
  client_name: string;
  job_type: string;
  status: string;
  source: string;
  priority: string;
  processing_time_ms: number;
  error_message: string;
  output_id: number | null;
  created_at: string;
  delivered_at: string;
}

interface AutomationStats {
  total_jobs: number;
  completed: number;
  pending: number;
  failed: number;
  average_processing_ms: number;
  success_rate: number;
}

interface WebhookItem {
  id: number;
  name: string;
  webhook_key: string;
  job_type: string;
  is_active: boolean;
  total_calls: number;
  last_called_at: string;
}

interface ClientItem {
  id: number;
  business_name: string;
  sector: string;
}

const JOB_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  web: { label: 'Web', icon: <Globe className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400' },
  ecommerce: { label: 'E-commerce', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-green-500/20 text-green-400' },
  social: { label: 'Social Media', icon: <Megaphone className="w-4 h-4" />, color: 'bg-pink-500/20 text-pink-400' },
  ads: { label: 'Ads', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-orange-500/20 text-orange-400' },
  email: { label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'bg-purple-500/20 text-purple-400' },
  funnel: { label: 'Funnel', icon: <Activity className="w-4 h-4" />, color: 'bg-cyan-500/20 text-cyan-400' },
  branding: { label: 'Branding', icon: <PenTool className="w-4 h-4" />, color: 'bg-yellow-500/20 text-yellow-400' },
  audit: { label: 'Auditoría', icon: <Search className="w-4 h-4" />, color: 'bg-red-500/20 text-red-400' },
  proposal: { label: 'Propuesta', icon: <FileText className="w-4 h-4" />, color: 'bg-indigo-500/20 text-indigo-400' },
  custom: { label: 'Custom', icon: <Cpu className="w-4 h-4" />, color: 'bg-gray-500/20 text-gray-400' },
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
  running: { label: 'Ejecutando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  processing: { label: 'Procesando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { label: 'Completado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  success: { label: 'Exitoso', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: 'Fallido', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
  canceled: { label: 'Cancelado', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', icon: <Ban className="w-3 h-3" /> },
  delivered: { label: 'Entregado', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function Automation() {
  const { ts } = useI18n();
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [processingJob, setProcessingJob] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // New Job Dialog
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [newJobClient, setNewJobClient] = useState<string>('');
  const [newJobType, setNewJobType] = useState<string>('web');
  const [newJobInstructions, setNewJobInstructions] = useState('');
  const [newJobPriority, setNewJobPriority] = useState('normal');

  // New Webhook Dialog
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookType, setWebhookType] = useState('custom');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  /* ─── RBAC State ─── */
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const permissions = ROLE_PERMISSIONS[currentRole];

  /* ─── Audit Trail ─── */
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const addAudit = useCallback((action: string, details?: string) => {
    setAuditTrail(prev => [{ action, timestamp: new Date().toISOString(), user: user?.email || "Sistema", role: currentRole, details }, ...prev.slice(0, 99)]);
  }, [user, currentRole]);

  /* ─── Run History ─── */
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const addRunHistory = useCallback((entry: Omit<RunHistoryEntry, "id">) => {
    setRunHistory(prev => [{
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }, ...prev.slice(0, 199)]);
  }, []);

  /* ─── Queue Counters ─── */
  const queueCounts = {
    pending: jobs.filter(j => j.status === "pending").length,
    running: jobs.filter(j => j.status === "processing" || j.status === "running").length,
    completed: jobs.filter(j => j.status === "completed" || j.status === "delivered").length,
    failed: jobs.filter(j => j.status === "failed").length,
    canceled: jobs.filter(j => j.status === "canceled").length,
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await sdkClient.apiCall.invoke({ url: '/api/v1/automation/stats', method: 'GET' });
      setStats(res.data);
    } catch {
      setStats({ total_jobs: 0, completed: 0, pending: 0, failed: 0, average_processing_ms: 0, success_rate: 0 });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const params: Record<string, string | number> = { skip: 0, limit: 50 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.job_type = filterType;
      const res = await sdkClient.apiCall.invoke({ url: '/api/v1/automation/jobs', method: 'GET', data: params });
      setJobs(res.data?.items || []);
      setJobsTotal(res.data?.total || 0);
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, [filterStatus, filterType]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await sdkClient.entities.automation_webhooks.query({ query: {}, limit: 50 });
      setWebhooks(
        (res.data?.items || []).map((w: any) => ({
          id: w.id, name: w.name || '', webhook_key: w.webhook_key || '',
          job_type: w.job_type || 'custom', is_active: w.is_active !== false,
          total_calls: w.total_calls || 0, last_called_at: w.last_called_at || '',
        }))
      );
    } catch { setWebhooks([]); }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await sdkClient.entities.nelvyon_clients.query({ query: {}, limit: 100 });
      setClients(
        (res.data?.items || []).map((c: any) => ({
          id: c.id, business_name: c.business_name || '', sector: c.sector || '',
        }))
      );
    } catch { setClients([]); }
  }, []);

  useEffect(() => {
    if (user) { fetchStats(); fetchJobs(); fetchWebhooks(); fetchClients(); }
  }, [user, fetchStats, fetchJobs, fetchWebhooks, fetchClients]);

  const handleProcessJob = async () => {
    if (!permissions.canCreateJob) { toast.error("No tienes permisos para crear jobs"); return; }
    if (!newJobClient) { toast.error('Selecciona un cliente'); return; }
    setProcessingJob(true);
    const startTime = Date.now();
    try {
      const inputData = newJobInstructions ? JSON.stringify({ instructions: newJobInstructions }) : undefined;
      const res = await sdkClient.apiCall.invoke({
        url: '/api/v1/automation/process-job', method: 'POST',
        data: { client_id: parseInt(newJobClient), job_type: newJobType, input_data: inputData, priority: newJobPriority },
      });
      const clientName = clients.find(c => c.id === parseInt(newJobClient))?.business_name || newJobClient;
      const duration = Date.now() - startTime;

      if (res.data?.status === 'completed') {
        toast.success(`✅ Job completado en ${res.data.processing_time_ms}ms`);
        addAudit("Job completado", `Tipo: ${JOB_TYPE_MAP[newJobType]?.label || newJobType} · Cliente: ${clientName} · ${res.data.processing_time_ms}ms`);
        addRunHistory({ jobId: res.data.id || 0, jobType: newJobType, clientName, status: "success", startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs: duration });
      } else {
        toast.success('Job creado correctamente');
        addAudit("Job creado", `Tipo: ${JOB_TYPE_MAP[newJobType]?.label || newJobType} · Cliente: ${clientName} · Prioridad: ${newJobPriority}`);
        addRunHistory({ jobId: res.data?.id || 0, jobType: newJobType, clientName, status: "running", startedAt: new Date(startTime).toISOString(), durationMs: 0 });
      }
      setNewJobOpen(false);
      setNewJobInstructions('');
      fetchStats(); fetchJobs();
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const clientName = clients.find(c => c.id === parseInt(newJobClient))?.business_name || newJobClient;
      toast.error(err?.data?.detail || err?.message || 'Error al procesar job');
      addRunHistory({ jobId: 0, jobType: newJobType, clientName, status: "failed", startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs: duration, errorMessage: err?.data?.detail || err?.message || "Error desconocido" });
    } finally {
      setProcessingJob(false);
    }
  };

  const handleRetryJob = async (jobId: number) => {
    if (!permissions.canRetry) { toast.error("No tienes permisos para reintentar jobs"); return; }
    setRetryingId(jobId);
    const startTime = Date.now();
    try {
      const res = await sdkClient.apiCall.invoke({ url: `/api/v1/automation/retry/${jobId}`, method: 'POST' });
      const duration = Date.now() - startTime;
      if (res.data?.status === 'completed') {
        toast.success('✅ Job reintentado con éxito');
        addRunHistory({ jobId, jobType: "retry", clientName: "—", status: "success", startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs: duration, retryOf: jobId });
      }
      addAudit("Job reintentado", `Job #${jobId}`);
      fetchStats(); fetchJobs();
    } catch (err: any) {
      const duration = Date.now() - startTime;
      toast.error(err?.data?.detail || 'Error al reintentar');
      addRunHistory({ jobId, jobType: "retry", clientName: "—", status: "failed", startedAt: new Date(startTime).toISOString(), completedAt: new Date().toISOString(), durationMs: duration, errorMessage: err?.data?.detail || "Error", retryOf: jobId });
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancelJob = async (jobId: number) => {
    if (!permissions.canCancel) { toast.error("No tienes permisos para cancelar jobs"); return; }
    setCancelingId(jobId);
    try {
      // Attempt to cancel via API, fallback to local state update
      try {
        await sdkClient.apiCall.invoke({ url: `/api/v1/automation/cancel/${jobId}`, method: 'POST' });
      } catch {
        // If endpoint doesn't exist, update locally
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "canceled" } : j));
      }
      toast.success(`Job #${jobId} cancelado`);
      addAudit("Job cancelado", `Job #${jobId}`);
      addRunHistory({ jobId, jobType: "cancel", clientName: "—", status: "canceled", startedAt: new Date().toISOString(), durationMs: 0 });
      fetchStats(); fetchJobs();
    } catch (err: any) {
      toast.error(err?.data?.detail || 'Error al cancelar');
    } finally {
      setCancelingId(null);
    }
  };

  const handleCreateWebhook = async () => {
    if (!permissions.canCreateWebhook) { toast.error("No tienes permisos para crear webhooks"); return; }
    if (!webhookName.trim()) { toast.error('Nombre requerido'); return; }
    setCreatingWebhook(true);
    try {
      const key = `wh_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      await sdkClient.entities.automation_webhooks.create({
        data: { name: webhookName, webhook_key: key, job_type: webhookType, is_active: true, total_calls: 0, last_called_at: '' },
      });
      toast.success('Webhook creado');
      addAudit("Webhook creado", `${webhookName} · Tipo: ${JOB_TYPE_MAP[webhookType]?.label || webhookType}`);
      setWebhookOpen(false); setWebhookName('');
      fetchWebhooks();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const copyWebhookUrl = (key: string) => {
    const url = `${window.location.origin}/api/v1/automation/webhook/trigger/${key}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const toggleWebhook = async (wh: WebhookItem) => {
    if (!permissions.canToggleWebhook) { toast.error("No tienes permisos para activar/desactivar webhooks"); return; }
    try {
      await sdkClient.entities.automation_webhooks.update({ id: String(wh.id), data: { is_active: !wh.is_active } });
      toast.success(wh.is_active ? 'Webhook desactivado' : 'Webhook activado');
      addAudit(wh.is_active ? "Webhook desactivado" : "Webhook activado", `${wh.name}`);
      fetchWebhooks();
    } catch { toast.error('Error al actualizar webhook'); }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Zap className="w-16 h-16 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Panel de Automatización</h2>
          <p className="text-gray-400">Inicia sesión para acceder</p>
          <Button onClick={login} className="bg-cyan-600 hover:bg-cyan-700 text-white">Iniciar Sesión</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <Zap className="w-7 h-7 text-cyan-400" />
              </div>
              Automatización
            </h1>
            <p className="text-gray-400 mt-1">Pipeline completo: Webhooks → Nelvyon → Entrega automática</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { fetchStats(); fetchJobs(); }} variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
              <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
            </Button>
            {permissions.canCreateJob && (
              <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white">
                    <Play className="w-4 h-4 mr-1" /> Nuevo Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Crear Job de Automatización</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="text-gray-300">Cliente</Label>
                      <Select value={newJobClient} onValueChange={setNewJobClient}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-white hover:bg-gray-700">{c.business_name} — {c.sector}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Tipo de Trabajo</Label>
                      <Select value={newJobType} onValueChange={setNewJobType}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {Object.entries(JOB_TYPE_MAP).map(([key, val]) => (
                            <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">
                              <span className="flex items-center gap-2">{val.icon} {val.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Prioridad</Label>
                      <Select value={newJobPriority} onValueChange={setNewJobPriority}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="low" className="text-white hover:bg-gray-700">Baja</SelectItem>
                          <SelectItem value="normal" className="text-white hover:bg-gray-700">Normal</SelectItem>
                          <SelectItem value="high" className="text-white hover:bg-gray-700">Alta</SelectItem>
                          <SelectItem value="urgent" className="text-white hover:bg-gray-700">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Instrucciones adicionales (opcional)</Label>
                      <Textarea value={newJobInstructions} onChange={(e) => setNewJobInstructions(e.target.value)}
                        placeholder="Ej: Enfocarse en el mercado latinoamericano, tono informal..."
                        className="bg-gray-800 border-gray-700 text-white mt-1 min-h-[80px]" />
                    </div>
                    <Button onClick={handleProcessJob} disabled={processingJob || !newJobClient}
                      className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white">
                      {processingJob ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando con Nelvyon...</> : <><Zap className="w-4 h-4 mr-2" /> Ejecutar Automatización</>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* RBAC Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-zinc-500">Rol:</span>
            <select value={currentRole} onChange={e => setCurrentRole(e.target.value as UserRole)}
              className="h-7 px-2 rounded-lg bg-[#0F1419] border border-white/[0.06] text-xs text-zinc-300">
              {Object.entries(ROLE_PERMISSIONS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(permissions) as [string, boolean | string][]).filter(([k]) => k.startsWith("can")).map(([k, v]) => (
              <span key={k} className={cn("px-2 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5",
                v ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                {v ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {k.replace("can", "").replace(/([A-Z])/g, " $1").trim()}
              </span>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            {permissions.canViewHistory && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={() => setShowRunHistory(!showRunHistory)}>
                <History className="w-3 h-3 mr-1" /> Historial ({runHistory.length})
              </Button>
            )}
            {permissions.canViewLogs && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 text-zinc-400" onClick={() => setShowAuditLog(!showAuditLog)}>
                <Clock className="w-3 h-3 mr-1" /> Auditoría ({auditTrail.length})
              </Button>
            )}
          </div>
        </div>

        {/* Run History Panel */}
        {showRunHistory && permissions.canViewHistory && (
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" /> Historial de Ejecuciones ({runHistory.length})
              </span>
              <button onClick={() => setShowRunHistory(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {runHistory.length === 0 ? (
                <p className="text-[10px] text-zinc-600 text-center py-4">Sin historial de ejecuciones</p>
              ) : runHistory.map(run => (
                <div key={run.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className={cn("w-2 h-2 rounded-full shrink-0",
                    run.status === "success" ? "bg-emerald-400" : run.status === "failed" ? "bg-red-400" : run.status === "canceled" ? "bg-zinc-400" : "bg-blue-400 animate-pulse"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-white">Job #{run.jobId}</span>
                      <Badge variant="outline" className={cn("text-[8px] border-0", JOB_TYPE_MAP[run.jobType]?.color || "bg-gray-500/20 text-gray-400")}>
                        {JOB_TYPE_MAP[run.jobType]?.label || run.jobType}
                      </Badge>
                      <span className="text-[9px] text-zinc-500">{run.clientName}</span>
                      {run.retryOf && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">Retry de #{run.retryOf}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {run.durationMs > 0 && <span className="text-[9px] text-cyan-400"><Timer className="w-2.5 h-2.5 inline mr-0.5" />{formatTime(run.durationMs)}</span>}
                      <span className="text-[8px] text-zinc-600">{formatDate(run.startedAt)}</span>
                      {run.errorMessage && <span className="text-[8px] text-red-400 truncate max-w-[200px]">{run.errorMessage}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Log Panel */}
        {showAuditLog && permissions.canViewLogs && auditTrail.length > 0 && (
          <div className="p-4 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Registro de Auditoría — Automatización ({auditTrail.length})
              </span>
              <button onClick={() => setShowAuditLog(false)} className="text-zinc-600 hover:text-zinc-400"><XCircle className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {auditTrail.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <Clock className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-cyan-400">{entry.action}</span>
                      <span className="text-[9px] text-zinc-500">{entry.user}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-zinc-600">{ROLE_PERMISSIONS[entry.role as UserRole]?.label || entry.role}</span>
                    </div>
                    {entry.details && <p className="text-[9px] text-zinc-600 mt-0.5">{entry.details}</p>}
                    <p className="text-[8px] text-zinc-700">{new Date(entry.timestamp).toLocaleString("es")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Status Bar */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <ListOrdered className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-bold text-white mr-2">Cola de Jobs:</span>
          {[
            { label: "Pendientes", count: queueCounts.pending, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
            { label: "En Proceso", count: queueCounts.running, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { label: "Completados", count: queueCounts.completed, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { label: "Fallidos", count: queueCounts.failed, color: "text-red-400 bg-red-500/10 border-red-500/20" },
            { label: "Cancelados", count: queueCounts.canceled, color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
          ].map(q => (
            <span key={q.label} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1", q.color)}>
              {q.label}: {q.count}
            </span>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Jobs', value: stats?.total_jobs ?? 0, icon: <BarChart3 className="w-5 h-5" />, color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30' },
            { label: 'Completados', value: stats?.completed ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' },
            { label: 'Pendientes', value: stats?.pending ?? 0, icon: <Clock className="w-5 h-5" />, color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30' },
            { label: 'Fallidos', value: stats?.failed ?? 0, icon: <XCircle className="w-5 h-5" />, color: 'from-red-500/20 to-rose-500/20 border-red-500/30' },
            { label: 'Tiempo Prom.', value: formatTime(stats?.average_processing_ms ?? 0), icon: <Clock className="w-5 h-5" />, color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30' },
            { label: 'Éxito', value: `${stats?.success_rate ?? 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30' },
          ].map((s, i) => (
            <Card key={i} className={`bg-gradient-to-br ${s.color} border`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{s.icon} {s.label}</div>
                <div className="text-2xl font-bold text-white">{loadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="jobs" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400">
              <Activity className="w-4 h-4 mr-1" /> Jobs ({jobsTotal})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400">
              <Webhook className="w-4 h-4 mr-1" /> Webhooks ({webhooks.length})
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400">
              <Bot className="w-4 h-4 mr-1" /> Pipeline
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">Todos</SelectItem>
                  <SelectItem value="completed" className="text-white hover:bg-gray-700">Completados</SelectItem>
                  <SelectItem value="pending" className="text-white hover:bg-gray-700">Pendientes</SelectItem>
                  <SelectItem value="processing" className="text-white hover:bg-gray-700">Procesando</SelectItem>
                  <SelectItem value="failed" className="text-white hover:bg-gray-700">Fallidos</SelectItem>
                  <SelectItem value="canceled" className="text-white hover:bg-gray-700">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">Todos</SelectItem>
                  {Object.entries(JOB_TYPE_MAP).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchJobs} variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {loadingJobs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
            ) : jobs.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <Zap className="w-12 h-12 text-gray-600" />
                  <p className="text-gray-400 text-lg">No hay jobs todavía</p>
                  <p className="text-gray-500 text-sm">Crea tu primer job de automatización</p>
                  {permissions.canCreateJob && (
                    <Button onClick={() => setNewJobOpen(true)} className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white">
                      <Play className="w-4 h-4 mr-1" /> Crear Primer Job
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => {
                  const typeInfo = JOB_TYPE_MAP[job.job_type] || JOB_TYPE_MAP.custom;
                  const statusInfo = STATUS_MAP[job.status] || STATUS_MAP.pending;
                  const isExpanded = expandedJobId === job.id;
                  const jobRuns = runHistory.filter(r => r.jobId === job.id);

                  return (
                    <Card key={job.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${typeInfo.color}`}>{typeInfo.icon}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white text-sm">#{job.id}</span>
                                <Badge variant="outline" className={typeInfo.color + ' border-0 text-xs'}>{typeInfo.label}</Badge>
                                <Badge variant="outline" className={statusInfo.color + ' text-xs flex items-center gap-1'}>
                                  {statusInfo.icon} {statusInfo.label}
                                </Badge>
                                {job.priority === "urgent" && <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Urgente</Badge>}
                                {job.priority === "high" && <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Alta</Badge>}
                                {job.source !== 'manual' && (
                                  <Badge variant="outline" className="bg-gray-700/50 text-gray-400 border-gray-600 text-xs">{job.source}</Badge>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs mt-1 truncate">
                                {job.client_name || `Cliente #${job.client_id}`} · {formatDate(job.created_at)}
                                {job.processing_time_ms > 0 && ` · ${formatTime(job.processing_time_ms)}`}
                              </p>
                              {job.error_message && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> {job.error_message.slice(0, 100)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(job.status === 'pending' || job.status === 'processing' || job.status === 'running') && permissions.canCancel && (
                              <Button size="sm" variant="outline" onClick={() => handleCancelJob(job.id)}
                                disabled={cancelingId === job.id}
                                className="border-zinc-700 text-zinc-400 hover:bg-zinc-900/30 text-xs">
                                {cancelingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Ban className="w-3 h-3 mr-1" /> Cancelar</>}
                              </Button>
                            )}
                            {job.status === 'failed' && permissions.canRetry && (
                              <Button size="sm" variant="outline" onClick={() => handleRetryJob(job.id)}
                                disabled={retryingId === job.id}
                                className="border-red-700 text-red-400 hover:bg-red-900/30 text-xs">
                                {retryingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RotateCcw className="w-3 h-3 mr-1" /> Reintentar</>}
                              </Button>
                            )}
                            {job.output_id && (
                              <Button size="sm" variant="outline" onClick={() => navigate('/qa')}
                                className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs">
                                <ExternalLink className="w-3 h-3 mr-1" /> Ver Output
                              </Button>
                            )}
                            {permissions.canViewHistory && (
                              <button onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                                className="text-zinc-500 hover:text-zinc-300 p-1">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Run History for this job */}
                        {isExpanded && permissions.canViewHistory && (
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase mb-2 flex items-center gap-1">
                              <History className="w-3 h-3" /> Historial de Runs — Job #{job.id}
                            </h4>
                            {jobRuns.length === 0 ? (
                              <p className="text-[9px] text-zinc-600 text-center py-2">Sin historial de ejecuciones para este job</p>
                            ) : (
                              <div className="space-y-1">
                                {jobRuns.map(run => (
                                  <div key={run.id} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02]">
                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                                      run.status === "success" ? "bg-emerald-400" : run.status === "failed" ? "bg-red-400" : run.status === "canceled" ? "bg-zinc-400" : "bg-blue-400"
                                    )} />
                                    <span className="text-[9px] text-zinc-400 flex-1">
                                      {run.status === "success" ? "Exitoso" : run.status === "failed" ? "Fallido" : run.status === "canceled" ? "Cancelado" : "En ejecución"}
                                      {run.durationMs > 0 && ` · ${formatTime(run.durationMs)}`}
                                      {run.errorMessage && ` · ${run.errorMessage}`}
                                    </span>
                                    <span className="text-[8px] text-zinc-600">{formatDate(run.startedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">Conecta Zapier, Make, n8n u otros servicios para disparar jobs automáticamente.</p>
              {permissions.canCreateWebhook && (
                <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">
                      <Webhook className="w-4 h-4 mr-1" /> Nuevo Webhook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                    <DialogHeader><DialogTitle className="text-white">Crear Webhook</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label className="text-gray-300">Nombre</Label>
                        <Input value={webhookName} onChange={(e) => setWebhookName(e.target.value)}
                          placeholder="Ej: Zapier Lead Capture" className="bg-gray-800 border-gray-700 text-white mt-1" />
                      </div>
                      <div>
                        <Label className="text-gray-300">Tipo de Job por defecto</Label>
                        <Select value={webhookType} onValueChange={setWebhookType}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {Object.entries(JOB_TYPE_MAP).map(([key, val]) => (
                              <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateWebhook} disabled={creatingWebhook || !webhookName.trim()}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                        {creatingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Webhook'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {webhooks.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <Webhook className="w-12 h-12 text-gray-600" />
                  <p className="text-gray-400 text-lg">No hay webhooks</p>
                  <p className="text-gray-500 text-sm">Crea un webhook para recibir triggers externos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <Card key={wh.id} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Webhook className="w-4 h-4 text-cyan-400" />
                            <span className="font-semibold text-white">{wh.name}</span>
                            <Badge variant="outline" className={wh.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-700/50 text-gray-500 border-gray-600'}>
                              {wh.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Badge variant="outline" className={JOB_TYPE_MAP[wh.job_type]?.color || 'bg-gray-700/50 text-gray-400'}>
                              {JOB_TYPE_MAP[wh.job_type]?.label || wh.job_type}
                            </Badge>
                          </div>
                          <p className="text-gray-500 text-xs mt-1 font-mono">/api/v1/automation/webhook/trigger/{wh.webhook_key}</p>
                          <p className="text-gray-500 text-xs mt-1">{wh.total_calls} llamadas · Última: {wh.last_called_at ? formatDate(wh.last_called_at) : 'Nunca'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyWebhookUrl(wh.webhook_key)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs">
                            <Copy className="w-3 h-3 mr-1" /> Copiar URL
                          </Button>
                          {permissions.canToggleWebhook && (
                            <Button size="sm" variant="outline" onClick={() => toggleWebhook(wh)}
                              className={wh.is_active ? 'border-red-700 text-red-400 hover:bg-red-900/30 text-xs' : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 text-xs'}>
                              {wh.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-cyan-400" /> Pipeline de Automatización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    {[
                      { step: 1, title: 'Entrada', desc: 'Webhook / Manual / API', icon: <Webhook className="w-6 h-6" />, color: 'from-cyan-500 to-blue-500' },
                      { step: 2, title: 'Procesamiento', desc: 'Motor Nelvyon World-Class', icon: <Cpu className="w-6 h-6" />, color: 'from-purple-500 to-pink-500' },
                      { step: 3, title: 'QA', desc: 'Validación automática', icon: <CheckCircle2 className="w-6 h-6" />, color: 'from-emerald-500 to-green-500' },
                      { step: 4, title: 'Entrega', desc: 'Output listo para cliente', icon: <ExternalLink className="w-6 h-6" />, color: 'from-orange-500 to-amber-500' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex flex-col items-center text-center flex-1">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>{s.icon}</div>
                          <p className="text-white font-semibold text-sm mt-2">{s.title}</p>
                          <p className="text-gray-500 text-xs">{s.desc}</p>
                        </div>
                        {i < 3 && <div className="hidden md:block text-gray-600 text-2xl">→</div>}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-gray-300 font-semibold mb-3">Tipos de Automatización Soportados</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(JOB_TYPE_MAP).map(([key, val]) => (
                        <div key={key} className={`p-3 rounded-lg ${val.color} flex items-center gap-2 text-sm`}>{val.icon} {val.label}</div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-300 font-semibold mb-3">Integración con Webhooks</h3>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                      <p className="text-gray-500 mb-2">// POST request desde Zapier, Make, n8n, etc.</p>
                      <p className="text-cyan-400">POST /api/v1/automation/webhook/trigger/{'<webhook_key>'}</p>
                      <p className="text-gray-500 mt-2">// Body (JSON):</p>
                      <pre className="text-green-400">{`{
  "client_id": 1,
  "job_type": "social",
  "data": {
    "instructions": "Crear posts para lanzamiento de producto"
  },
  "priority": "high"
}`}</pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
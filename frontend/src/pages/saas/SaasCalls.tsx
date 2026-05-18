import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone, Loader2, Search, CheckCircle2,
  Clock, PhoneCall, PhoneOff, Volume2, BarChart3, User, RefreshCw,
  AlertCircle, Plus, Star, PhoneIncoming, PhoneOutgoing, Trash2, X,
  Save, Edit,
} from "lucide-react";
import { client } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Activity {
  id: number;
  user_id: string;
  workspace_id?: number;
  contact_id?: number;
  deal_id?: number;
  type: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  created_at?: string;
}

const CALL_TYPES = ["call", "missed_call", "voicemail", "outbound_call", "inbound_call"];

const statusFromActivity = (a: Activity) => {
  if (a.type === "missed_call") return "missed";
  if (a.type === "voicemail") return "voicemail";
  if (!a.is_completed && a.type === "call") return "in_progress";
  return "completed";
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Completada", color: "text-emerald-400", icon: CheckCircle2 },
  missed: { label: "Perdida", color: "text-red-400", icon: PhoneOff },
  voicemail: { label: "Buzón", color: "text-amber-400", icon: Volume2 },
  in_progress: { label: "En curso", color: "text-blue-400", icon: PhoneCall },
};

const callTypeLabels: Record<string, string> = {
  call: "Llamada",
  outbound_call: "Llamada Saliente",
  inbound_call: "Llamada Entrante",
  missed_call: "Llamada Perdida",
  voicemail: "Buzón de Voz",
};

export default function SaasCalls() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCall, setSelectedCall] = useState<Activity | null>(null);
  const [filter, setFilter] = useState("all");

  /* ── New Call Form ── */
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCall, setNewCall] = useState({
    title: "", type: "outbound_call", description: "", contact_id: "",
  });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  /* ── Edit Call State ── */
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: "", type: "outbound_call", description: "", contact_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities.activities.query({ sort: "-created_at", limit: 200 });
      const items = (res.data?.items as Activity[]) || [];
      const callActivities = items.filter(a => CALL_TYPES.includes(a.type));
      setActivities(callActivities);
      if (callActivities.length > 0 && !selectedCall) setSelectedCall(callActivities[0]);
    } catch {
      toast.error("Error cargando llamadas");
    } finally {
      setLoading(false);
    }
  }, [selectedCall]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  /* ── Create Call ── */
  const handleCreateCall = async () => {
    if (!newCall.title.trim()) { toast.error("El título es obligatorio"); return; }
    setCreating(true);
    try {
      await client.entities.activities.create({
        data: {
          title: newCall.title,
          type: newCall.type,
          description: newCall.description || `Registro de ${callTypeLabels[newCall.type] || "llamada"}`,
          is_completed: newCall.type !== "call",
          contact_id: newCall.contact_id ? parseInt(newCall.contact_id) : undefined,
          created_at: new Date().toISOString(),
        },
      });
      toast.success("Llamada registrada correctamente");
      setShowNewForm(false);
      setNewCall({ title: "", type: "outbound_call", description: "", contact_id: "" });
      await fetchData();
    } catch {
      toast.error("Error al registrar la llamada");
    } finally {
      setCreating(false);
    }
  };

  /* ── Toggle Complete ── */
  const handleToggleComplete = async (activity: Activity) => {
    setToggling(activity.id);
    try {
      await client.entities.activities.update({
        id: String(activity.id),
        data: { is_completed: !activity.is_completed },
      });
      setActivities(prev => prev.map(a =>
        a.id === activity.id ? { ...a, is_completed: !a.is_completed } : a,
      ));
      if (selectedCall?.id === activity.id) {
        setSelectedCall({ ...activity, is_completed: !activity.is_completed });
      }
      toast.success(activity.is_completed ? "Marcada como pendiente" : "Marcada como completada");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setToggling(null);
    }
  };

  /* ── Delete Call ── */
  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await client.entities.activities.delete({ id: String(id) });
      setActivities(prev => prev.filter(a => a.id !== id));
      if (selectedCall?.id === id) setSelectedCall(null);
      toast.success("Registro eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  /* ── Open Edit ── */
  const openEdit = (activity: Activity) => {
    setEditData({
      title: activity.title || "",
      type: activity.type || "outbound_call",
      description: activity.description || "",
      contact_id: activity.contact_id?.toString() || "",
    });
    setSelectedCall(activity);
    setEditing(true);
  };

  /* ── Save Edit ── */
  const handleSaveEdit = async () => {
    if (!selectedCall || !editData.title.trim()) { toast.error("El título es obligatorio"); return; }
    setSaving(true);
    try {
      await client.entities.activities.update({
        id: String(selectedCall.id),
        data: {
          title: editData.title,
          type: editData.type,
          description: editData.description,
          contact_id: editData.contact_id ? parseInt(editData.contact_id) : undefined,
        },
      });
      // Optimistic update
      const updated = {
        ...selectedCall,
        title: editData.title,
        type: editData.type,
        description: editData.description,
        contact_id: editData.contact_id ? parseInt(editData.contact_id) : undefined,
      };
      setActivities(prev => prev.map(a => a.id === selectedCall.id ? updated : a));
      setSelectedCall(updated);
      setEditing(false);
      toast.success("Llamada actualizada correctamente");
    } catch {
      toast.error("Error al actualizar la llamada");
    } finally {
      setSaving(false);
    }
  };

  const filtered = activities.filter(a => {
    const status = statusFromActivity(a);
    const matchSearch = (a.title || "").toLowerCase().includes(search.toLowerCase()) || (a.description || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || status === filter;
    return matchSearch && matchFilter;
  });

  const totalCalls = activities.length;
  const completed = activities.filter(a => statusFromActivity(a) === "completed").length;
  const missed = activities.filter(a => statusFromActivity(a) === "missed").length;
  const inProgress = activities.filter(a => statusFromActivity(a) === "in_progress").length;

  return (
    <SaasLayout title="Llamadas" subtitle="Registro y gestión de llamadas — Conectado a base de datos">

      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">
          Conectado a backend real — CRUD completo (crear, leer, editar, completar, eliminar)
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Registros", value: totalCalls, icon: Phone, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
          { label: "Completadas", value: completed, icon: CheckCircle2, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
          { label: "Perdidas", value: missed, icon: PhoneOff, color: "text-red-400", bg: "from-red-500/10 to-rose-500/10" },
          { label: "En Curso", value: inProgress, icon: Clock, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-[#0F1419] border border-white/[0.04] hover:border-white/[0.08] transition-all">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-zinc-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search, Filter & New Call */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
        <Phone className="w-4 h-4 text-emerald-400" />
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input placeholder="Buscar llamadas..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
        </div>
        {["all", "completed", "missed", "in_progress"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}
            className={cn("text-[10px] h-8", filter === f ? "bg-emerald-600 text-white" : "border-white/10 text-zinc-500")}>
            {f === "all" ? "Todos" : f === "in_progress" ? "En Curso" : statusConfig[f]?.label || f}
          </Button>
        ))}
        <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-8">
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button size="sm" onClick={() => setShowNewForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1">
          <Plus className="w-3 h-3" /> Registrar Llamada
        </Button>
      </div>

      {/* New Call Form */}
      {showNewForm && (
        <div className="mb-4 p-4 rounded-xl bg-[#0A0E13] border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" /> Registrar Nueva Llamada
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)} className="text-zinc-500 h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Título / Contacto *</label>
              <Input value={newCall.title} onChange={e => setNewCall(p => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Llamada con Juan García" className="bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Tipo de Llamada</label>
              <select value={newCall.type} onChange={e => setNewCall(p => ({ ...p, type: e.target.value }))}
                className="w-full h-9 rounded-md bg-[#0F1419] border border-white/[0.06] text-white text-sm px-3">
                {Object.entries(callTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Contact ID (opcional)</label>
              <Input value={newCall.contact_id} onChange={e => setNewCall(p => ({ ...p, contact_id: e.target.value }))}
                placeholder="ID del contacto" className="bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Notas</label>
              <Input value={newCall.description} onChange={e => setNewCall(p => ({ ...p, description: e.target.value }))}
                placeholder="Notas de la llamada..." className="bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)} className="border-white/10 text-zinc-400 h-8">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateCall} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1">
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
      ) : activities.length === 0 && !showNewForm ? (
        <div className="text-center py-20 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <Phone className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-2">No hay registros de llamadas</p>
          <p className="text-xs text-zinc-600 mb-4">Registra tu primera llamada para empezar a llevar el historial.</p>
          <Button size="sm" onClick={() => setShowNewForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <Plus className="w-3 h-3" /> Registrar Primera Llamada
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Call List */}
          <div className="lg:col-span-5 space-y-2 overflow-y-auto" style={{ maxHeight: 520 }}>
            {filtered.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
                <Phone className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No hay llamadas con este filtro</p>
              </div>
            ) : filtered.map(activity => {
              const status = statusFromActivity(activity);
              const cfg = statusConfig[status];
              const isInbound = activity.type === "inbound_call";
              const DirIcon = isInbound ? PhoneIncoming : PhoneOutgoing;
              return (
                <div key={activity.id} onClick={() => setSelectedCall(activity)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-[#0A0E13] border transition-all cursor-pointer group",
                    selectedCall?.id === activity.id ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/[0.04] hover:border-white/[0.08]",
                  )}>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    status === "missed" ? "bg-red-500/10" : "bg-emerald-500/10",
                  )}>
                    <DirIcon className={cn("w-4 h-4", status === "missed" ? "text-red-400" : "text-emerald-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{activity.title}</span>
                      <cfg.icon className={cn("w-3 h-3", cfg.color)} />
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">{callTypeLabels[activity.type] || activity.type}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] text-zinc-600">
                      <span>{cfg.label}</span>
                      <span>{activity.created_at ? new Date(activity.created_at).toLocaleDateString("es") : "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(activity); }}
                      className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-500 hover:text-emerald-400 transition-colors">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(activity); }}
                      disabled={toggling === activity.id}
                      className={cn("p-1.5 rounded-lg transition-colors", activity.is_completed ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-zinc-500 hover:text-white")}>
                      {toggling === activity.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }}
                      disabled={deleting === activity.id}
                      className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-500 hover:text-red-400 transition-colors">
                      {deleting === activity.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call Detail */}
          <div className="lg:col-span-7 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-5 overflow-y-auto" style={{ maxHeight: 520 }}>
            {/* Edit Mode */}
            {editing && selectedCall ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit className="w-4 h-4 text-emerald-400" /> Editar Llamada
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 w-7 p-0 text-zinc-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Título / Contacto</label>
                    <Input value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Tipo de Llamada</label>
                    <select value={editData.type} onChange={e => setEditData(d => ({ ...d, type: e.target.value }))}
                      className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-xs px-3">
                      {Object.entries(callTypeLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Notas / Descripción</label>
                    <textarea value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                      rows={3} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Contact ID (opcional)</label>
                    <Input value={editData.contact_id} onChange={e => setEditData(d => ({ ...d, contact_id: e.target.value }))}
                      placeholder="ID del contacto" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar Cambios
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-zinc-400 text-xs h-8">Cancelar</Button>
                  </div>
                </div>
              </div>
            ) : selectedCall ? (() => {
              const status = statusFromActivity(selectedCall);
              const cfg = statusConfig[status];

              return (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-white">{selectedCall.title}</p>
                      <p className="text-xs text-zinc-500">{callTypeLabels[selectedCall.type] || selectedCall.type} · {cfg.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => openEdit(selectedCall)}
                        className="h-8 gap-1 text-[10px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                        <Edit className="w-3 h-3" /> Editar
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => handleToggleComplete(selectedCall)}
                        disabled={toggling === selectedCall.id}
                        className={cn("h-8 gap-1 text-[10px]", selectedCall.is_completed ? "border-emerald-500/30 text-emerald-400" : "border-white/10 text-zinc-400")}>
                        {toggling === selectedCall.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {selectedCall.is_completed ? "Completada" : "Completar"}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => handleDelete(selectedCall.id)}
                        disabled={deleting === selectedCall.id}
                        className="h-8 gap-1 text-[10px] border-red-500/20 text-red-400 hover:bg-red-500/10">
                        {deleting === selectedCall.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Estado", value: cfg.label, color: cfg.color },
                      { label: "Tipo", value: callTypeLabels[selectedCall.type] || selectedCall.type, color: "text-white" },
                      { label: "Completada", value: selectedCall.is_completed ? "Sí" : "No", color: selectedCall.is_completed ? "text-emerald-400" : "text-amber-400" },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[9px] text-zinc-600">{item.label}</p>
                        <p className={cn("text-sm font-bold capitalize", item.color)}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {selectedCall.description && (
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-2">Notas del Registro</p>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-xs text-zinc-300 leading-relaxed">{selectedCall.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      { label: "Fecha", value: selectedCall.created_at ? new Date(selectedCall.created_at).toLocaleString("es") : "—" },
                      { label: "ID", value: `#${selectedCall.id}` },
                      { label: "Contact ID", value: selectedCall.contact_id?.toString() || "—" },
                      { label: "Deal ID", value: selectedCall.deal_id?.toString() || "—" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600">{item.label}</span>
                        <span className="text-xs text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Phone className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Selecciona un registro para ver detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SaasLayout>
  );
}
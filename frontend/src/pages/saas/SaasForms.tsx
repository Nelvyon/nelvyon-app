import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Plus, RefreshCw, Search, Database, Loader2,
  Trash2, Edit, Eye, BarChart3, CheckCircle2, Zap, Copy
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, type FormItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formTypes = [
  { value: "contact", label: "Contacto", icon: "📧" },
  { value: "survey", label: "Encuesta", icon: "📊" },
  { value: "lead", label: "Lead Capture", icon: "🎯" },
  { value: "feedback", label: "Feedback", icon: "💬" },
  { value: "registration", label: "Registro", icon: "📝" },
  { value: "order", label: "Pedido", icon: "🛒" },
];

const emptyForm: Partial<FormItem> = {
  name: "", form_type: "contact", status: "draft", fields_count: 0,
  responses_count: 0, completion_rate: 0, conversion_rate: 0, ai_optimized: false,
};

export default function SaasForms() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<FormItem>>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getForms(0, 200);
      setForms(res.items || []);
      if ((res.items || []).length > 0) setBackendConnected(true);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasForms] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchForms(); }, [user, fetchForms]);

  const handleSave = async () => {
    if (!editingForm.name?.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingForm.id) {
        await api.updateForm(editingForm.id, editingForm);
        toast.success("Formulario actualizado");
      } else {
        await api.createForm(editingForm);
        toast.success("Formulario creado");
      }
      setShowForm(false);
      fetchForms();
    } catch {
      toast.error("Error guardando formulario");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteForm(id);
      toast.success("Formulario eliminado");
      fetchForms();
    } catch {
      toast.error("Error eliminando formulario");
    }
  };

  const handleDuplicate = async (form: FormItem) => {
    try {
      await api.createForm({ ...form, id: undefined, name: `${form.name} (copia)`, status: "draft", responses_count: 0 } as Partial<FormItem>);
      toast.success("Formulario duplicado");
      fetchForms();
    } catch {
      toast.error("Error duplicando formulario");
    }
  };

  const openNew = () => {
    setEditingForm({ ...emptyForm });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (f: FormItem) => {
    setEditingForm({ ...f });
    setIsEditing(true);
    setShowForm(true);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filtered = forms.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.form_type || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalResponses = forms.reduce((s, f) => s + (f.responses_count || 0), 0);
  const avgConversion = forms.length > 0
    ? forms.reduce((s, f) => s + (f.conversion_rate || 0), 0) / forms.length
    : 0;
  const activeCount = forms.filter((f) => f.status === "active").length;

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-400" /> Formularios
            </h1>
            <p className="text-sm text-slate-400 mt-1">Crea y gestiona formularios conectados a PostgreSQL</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              backendConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            )}>
              <Database className="w-3 h-3" />
              {backendConnected ? "Conectado a PostgreSQL" : "Backend vacío"}
            </div>
            <Button size="sm" variant="outline" onClick={fetchForms} className="border-white/10 text-slate-300 hover:bg-white/5">
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={openNew} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Formulario
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Formularios", value: forms.length, icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Activos", value: activeCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total Respuestas", value: totalResponses, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Conversión Media", value: `${avgConversion.toFixed(1)}%`, icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{kpi.label}</span>
                <div className={cn("p-1.5 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("w-3.5 h-3.5", kpi.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar formularios..." className="pl-9 bg-[#12141A] border-white/10 text-white" />
        </div>

        {/* Forms Grid */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Cargando formularios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-12 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{forms.length === 0 ? "Sin formularios — crea el primero" : "Sin resultados"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((f) => {
              const typeInfo = formTypes.find((t) => t.value === f.form_type) || { icon: "📄", label: f.form_type };
              return (
                <div key={f.id} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{f.name}</h3>
                        <span className="text-xs text-slate-500">{typeInfo.label}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      f.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                      f.status === "draft" ? "bg-amber-500/10 text-amber-400" :
                      "bg-slate-500/10 text-slate-400"
                    )}>
                      {f.status === "active" ? "Activo" : f.status === "draft" ? "Borrador" : f.status || "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{f.fields_count || 0}</p>
                      <p className="text-[10px] text-slate-500">Campos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{f.responses_count || 0}</p>
                      <p className="text-[10px] text-slate-500">Respuestas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{f.conversion_rate || 0}%</p>
                      <p className="text-[10px] text-slate-500">Conversión</p>
                    </div>
                  </div>

                  {f.ai_optimized && (
                    <div className="flex items-center gap-1 mb-3 px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-xs">
                      <Zap className="w-3 h-3" /> Optimizado con IA
                    </div>
                  )}

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(f)} className="text-slate-400 hover:text-white h-8 flex-1">
                      <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(f)} className="text-slate-400 hover:text-white h-8">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 h-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <p className="text-[10px] text-slate-600 mt-2">{formatDate(f.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-[#12141A] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Formulario" : "Nuevo Formulario"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre *</label>
                <Input value={editingForm.name || ""} onChange={(e) => setEditingForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-[#0A0C10] border-white/10 text-white" placeholder="Formulario de contacto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                  <select value={editingForm.form_type || "contact"} onChange={(e) => setEditingForm((p) => ({ ...p, form_type: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {formTypes.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Estado</label>
                  <select value={editingForm.status || "draft"} onChange={(e) => setEditingForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nº Campos</label>
                  <Input type="number" value={editingForm.fields_count || 0} onChange={(e) => setEditingForm((p) => ({ ...p, fields_count: Number(e.target.value) }))}
                    className="bg-[#0A0C10] border-white/10 text-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={editingForm.ai_optimized || false}
                      onChange={(e) => setEditingForm((p) => ({ ...p, ai_optimized: e.target.checked }))}
                      className="rounded border-white/20" />
                    <Zap className="w-3.5 h-3.5 text-violet-400" /> IA Optimizado
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/10 text-slate-300">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SaasLayout>
  );
}
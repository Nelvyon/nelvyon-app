import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, Plus, RefreshCw, Search, Database, Loader2,
  Trash2, Edit, Eye, Calendar, Tag, Globe, Zap, BarChart3
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, type BlogPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categoryOptions = ["Marketing", "Tecnología", "Negocios", "IA", "SEO", "Ventas", "Productividad", "Diseño"];

const emptyPost: Partial<BlogPost> = {
  title: "", slug: "", content: "", excerpt: "", category: "Marketing",
  tags: "", status: "draft", author: "", seo_title: "", seo_description: "",
};

export default function SaasBlog() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost>>(emptyPost);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBlogPosts(0, 200);
      setPosts(res.items || []);
      if ((res.items || []).length > 0) setBackendConnected(true);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SaasBlog] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchPosts(); }, [user, fetchPosts]);

  const handleSave = async () => {
    if (!editingPost.title?.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const slug = editingPost.slug || editingPost.title!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const payload = { ...editingPost, slug };

      if (isEditing && editingPost.id) {
        await api.updateBlogPost(editingPost.id, payload);
        toast.success("Post actualizado");
      } else {
        await api.createBlogPost(payload);
        toast.success("Post creado");
      }
      setShowForm(false);
      fetchPosts();
    } catch {
      toast.error("Error guardando post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteBlogPost(id);
      toast.success("Post eliminado");
      fetchPosts();
    } catch {
      toast.error("Error eliminando post");
    }
  };

  const handlePublish = async (post: BlogPost) => {
    try {
      await api.updateBlogPost(post.id, { status: "published", published_at: new Date().toISOString() });
      toast.success("Post publicado");
      fetchPosts();
    } catch {
      toast.error("Error publicando post");
    }
  };

  const openNew = () => {
    setEditingPost({ ...emptyPost, author: user?.email || "" });
    setIsEditing(false);
    setShowForm(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditingPost({ ...p });
    setIsEditing(true);
    setShowForm(true);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filtered = posts.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const totalViews = posts.reduce((s, p) => s + (p.views_count || 0), 0);

  return (
    <SaasLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-pink-400" /> Blog & Contenido
            </h1>
            <p className="text-sm text-slate-400 mt-1">Gestiona posts y contenido conectado a PostgreSQL</p>
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
            <Button size="sm" variant="outline" onClick={fetchPosts} className="border-white/10 text-slate-300 hover:bg-white/5">
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={openNew} className="bg-pink-600 hover:bg-pink-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Post
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Posts", value: posts.length, icon: BookOpen, color: "text-pink-400", bg: "bg-pink-500/10" },
            { label: "Publicados", value: publishedCount, icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Borradores", value: draftCount, icon: Edit, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Total Vistas", value: totalViews.toLocaleString(), icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
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

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar posts..." className="pl-9 bg-[#12141A] border-white/10 text-white" />
          </div>
          <div className="flex gap-1">
            {["all", "published", "draft", "archived"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterStatus === s ? "bg-violet-600/20 text-violet-300" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                {s === "all" ? "Todos" : s === "published" ? "Publicados" : s === "draft" ? "Borradores" : "Archivados"}
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-pink-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Cargando posts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#12141A] border border-white/[0.06] rounded-xl p-12 text-center text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{posts.length === 0 ? "Sin posts — crea el primero" : "Sin resultados"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-[#12141A] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all group">
                <div className="flex items-start gap-4">
                  {/* Thumbnail placeholder */}
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-8 h-8 text-pink-400/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{p.title}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium",
                        p.status === "published" ? "bg-emerald-500/10 text-emerald-400" :
                        p.status === "draft" ? "bg-amber-500/10 text-amber-400" :
                        "bg-slate-500/10 text-slate-400"
                      )}>
                        {p.status === "published" ? "Publicado" : p.status === "draft" ? "Borrador" : p.status || "—"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{p.excerpt || p.content?.slice(0, 120) || "Sin contenido"}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {p.category && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {p.category}</span>}
                      {p.author && <span>✍️ {p.author}</span>}
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views_count || 0} vistas</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(p.published_at || p.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status === "draft" && (
                      <Button size="sm" variant="ghost" onClick={() => handlePublish(p)}
                        className="text-emerald-400 hover:text-emerald-300 h-8 text-xs">
                        <Globe className="w-3.5 h-3.5 mr-1" /> Publicar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="text-slate-400 hover:text-white h-8">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 h-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-[#12141A] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Post" : "Nuevo Post"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Título *</label>
                <Input value={editingPost.title || ""} onChange={(e) => setEditingPost((p) => ({ ...p, title: e.target.value }))}
                  className="bg-[#0A0C10] border-white/10 text-white" placeholder="Título del post" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Extracto</label>
                <Input value={editingPost.excerpt || ""} onChange={(e) => setEditingPost((p) => ({ ...p, excerpt: e.target.value }))}
                  className="bg-[#0A0C10] border-white/10 text-white" placeholder="Resumen breve" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Contenido</label>
                <textarea value={editingPost.content || ""} onChange={(e) => setEditingPost((p) => ({ ...p, content: e.target.value }))}
                  className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[150px] resize-none"
                  placeholder="Escribe el contenido del post..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                  <select value={editingPost.category || "Marketing"} onChange={(e) => setEditingPost((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Estado</label>
                  <select value={editingPost.status || "draft"} onChange={(e) => setEditingPost((p) => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#0A0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Autor</label>
                  <Input value={editingPost.author || ""} onChange={(e) => setEditingPost((p) => ({ ...p, author: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="Nombre" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tags (separados por coma)</label>
                <Input value={editingPost.tags || ""} onChange={(e) => setEditingPost((p) => ({ ...p, tags: e.target.value }))}
                  className="bg-[#0A0C10] border-white/10 text-white" placeholder="marketing, ia, ventas" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">SEO Título</label>
                  <Input value={editingPost.seo_title || ""} onChange={(e) => setEditingPost((p) => ({ ...p, seo_title: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="Título SEO" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">SEO Descripción</label>
                  <Input value={editingPost.seo_description || ""} onChange={(e) => setEditingPost((p) => ({ ...p, seo_description: e.target.value }))}
                    className="bg-[#0A0C10] border-white/10 text-white" placeholder="Meta description" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/10 text-slate-300">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white">
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
/**
 * CRMContactsTab — Extracted from SaasCRM for code-splitting.
 * Contains the full contacts list with search, filters, pagination, and CRUD dialog.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Search, Plus, Trash2, Edit, Eye, Mail, Building2,
  Loader2, Filter, X, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import { api, getApiErrorMessage, type Contact } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SkeletonTable } from "@/components/SkeletonCards";

// ─── Constants ───
const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  prospect: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  inactive: "bg-white/5 text-white/40 border-white/10",
  vip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const sourceIcons: Record<string, string> = {
  manual: "✏️", csv_import: "📄", website: "🌐", referral: "🤝",
  social: "📱", email: "📧", phone: "📞", api: "🔌",
};

const emptyContact: Partial<Contact> = {
  first_name: "", last_name: "", email: "", phone: "",
  company_name: "", tags: "", status: "active", source: "manual",
  score: 0, notes: "",
};

const PAGE_SIZE = 20;

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs text-white/50">{score}</span>
    </div>
  );
}

interface Props {
  onViewContact: (id: number) => void;
}

export default function CRMContactsTab({ onViewContact }: Props) {
  const { activeWorkspace, loading: wsLoading, needsWorkspaceSelection } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  /** Distinto de “lista vacía”: fallo de API / red / filtros. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact>>(emptyContact);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const loadContacts = useCallback(async () => {
    if (needsWorkspaceSelection) {
      setContacts([]);
      setTotal(0);
      setLoadError(null);
      setLoadingData(false);
      return;
    }
    if (wsLoading) {
      setLoadingData(true);
      return;
    }
    setLoadingData(true);
    setLoadError(null);
    try {
      const res = await api.crmSearch({
        search: search || undefined,
        status: filterStatus || undefined,
        source: filterSource || undefined,
        sort: "first_name",
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setContacts(res.items);
      setTotal(res.total);
    } catch (e) {
      const msg = getApiErrorMessage(
        e,
        "No se pudieron cargar los contactos. Revisa la conexión, el workspace o los filtros.",
      );
      setLoadError(msg);
      setContacts([]);
      setTotal(0);
      toast.error(msg);
    } finally {
      setLoadingData(false);
    }
  }, [search, filterStatus, filterSource, page, needsWorkspaceSelection, wsLoading, activeWorkspace?.id]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleSearchChange = (val: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
    }, 300);
  };

  const handleSave = async () => {
    if (!editingContact.first_name || !editingContact.email) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingContact.id) {
        await api.updateContact(editingContact.id, editingContact);
        toast.success("Contacto actualizado");
      } else {
        await api.createContact(editingContact);
        toast.success("Contacto creado");
      }
      setShowForm(false);
      setEditingContact(emptyContact);
      setIsEditing(false);
      loadContacts();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error guardando contacto"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    try {
      await api.deleteContact(id);
      toast.success("Contacto eliminado");
      loadContacts();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error eliminando contacto"));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4" data-testid="crm-contacts-root">
      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Buscar por nombre o email…"
            className="pl-9 bg-white/5 border-white/10"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 text-white/70" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> Filtros
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditingContact(emptyContact); setIsEditing(false); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <select className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="prospect">Prospecto</option>
            <option value="lead">Lead</option>
            <option value="vip">VIP</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white" value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(0); }}>
            <option value="">Todas las fuentes</option>
            <option value="manual">Manual</option>
            <option value="csv_import">CSV Import</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="social">Social</option>
            <option value="email">Email</option>
          </select>
          {(filterStatus || filterSource) && (
            <Button variant="ghost" size="sm" className="text-white/50" onClick={() => { setFilterStatus(""); setFilterSource(""); setPage(0); }}>
              <X className="w-3 h-3 mr-1" /> Limpiar
            </Button>
          )}
        </div>
      )}

      {loadError && !loadingData && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border border-red-500/25 bg-red-500/5 text-sm"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-200">No se pudo cargar la lista de contactos</p>
            <p className="text-red-200/80 text-xs mt-1 break-words">{loadError}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-100 shrink-0"
            onClick={() => {
              setLoadError(null);
              void loadContacts();
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loadingData ? (
        <SkeletonTable rows={6} columns={6} />
      ) : loadError ? null : contacts.length === 0 ? (
        <div className="text-center py-20 text-white/40 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40 text-white/50" />
          <p className="text-lg text-white/80">No hay contactos que coincidan</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {search || filterStatus || filterSource
              ? "Prueba a limpiar la búsqueda o los filtros, o crea un contacto nuevo."
              : "Añade tu primer contacto para empezar a trabajar el CRM en este workspace."}
          </p>
          <Button
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              setEditingContact(emptyContact);
              setIsEditing(false);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo contacto
          </Button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm" data-testid="crm-contacts-table">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs">
                  <th className="text-left py-3 px-3 font-medium">Contacto</th>
                  <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Fuente</th>
                  <th className="text-left py-3 px-3 font-medium">Estado</th>
                  <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Score</th>
                  <th className="text-right py-3 px-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`crm-contact-row-${c.id}`}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => onViewContact(c.id!)}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {(c.first_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{c.first_name} {c.last_name || ""}</p>
                          <p className="text-xs text-white/40 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" /> {c.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      {c.company_name ? (
                        <span className="text-white/60 flex items-center gap-1 text-xs">
                          <Building2 className="w-3 h-3" /> {c.company_name}
                        </span>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <span className="text-xs text-white/50">
                        {sourceIcons[c.source || "manual"] || "❓"} {c.source || "manual"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge className={cn("text-xs border", statusColors[c.status || "active"] || statusColors.active)}>
                        {c.status || "active"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <ScoreBar score={c.score ?? 0} />
                    </td>
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-blue-400" onClick={() => onViewContact(c.id!)} title="Ver ficha">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-amber-400" onClick={() => { setEditingContact(c); setIsEditing(true); setShowForm(true); }} title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-white/40 hover:text-red-400" onClick={() => handleDelete(c.id!)} title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-white/40">
            <span>{total} contacto{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-white/40">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>{page + 1} / {Math.max(1, totalPages)}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-white/40">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#0F1419] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Nombre *</label>
                <Input className="bg-white/5 border-white/10" value={editingContact.first_name || ""} onChange={(e) => setEditingContact(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Apellido</label>
                <Input className="bg-white/5 border-white/10" value={editingContact.last_name || ""} onChange={(e) => setEditingContact(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Email *</label>
              <Input className="bg-white/5 border-white/10" type="email" value={editingContact.email || ""} onChange={(e) => setEditingContact(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Teléfono</label>
                <Input className="bg-white/5 border-white/10" value={editingContact.phone || ""} onChange={(e) => setEditingContact(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Empresa</label>
                <Input className="bg-white/5 border-white/10" value={editingContact.company_name || ""} onChange={(e) => setEditingContact(p => ({ ...p, company_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Estado</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" value={editingContact.status || "active"} onChange={(e) => setEditingContact(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Activo</option>
                  <option value="prospect">Prospecto</option>
                  <option value="lead">Lead</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Fuente</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" value={editingContact.source || "manual"} onChange={(e) => setEditingContact(p => ({ ...p, source: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Score</label>
                <Input className="bg-white/5 border-white/10" type="number" min={0} max={100} value={editingContact.score ?? 0} onChange={(e) => setEditingContact(p => ({ ...p, score: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Tags (separados por coma)</label>
              <Input className="bg-white/5 border-white/10" value={editingContact.tags || ""} onChange={(e) => setEditingContact(p => ({ ...p, tags: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Notas</label>
              <Textarea className="bg-white/5 border-white/10 min-h-[60px]" value={editingContact.notes || ""} onChange={(e) => setEditingContact(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
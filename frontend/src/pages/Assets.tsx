import { useEffect, useState, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import E2EFlowBanner from "@/components/E2EFlowBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Image, Upload, Search, FolderOpen, FileImage, FileVideo, FileText,
  Loader2, Trash2, Download, Eye, Grid3X3, List, Filter,
  HardDrive, ImagePlus, X, CheckCircle2, AlertCircle, Copy,
  Shield, ScrollText, UserCog, ArrowRight, Share2, FileSignature
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAPIBaseURL } from "@/lib/config";
import axios from "axios";
import { buildE2EUrl, parseE2EParams, getOriginLabel } from "@/lib/e2e-flow";

/* ═══════════════════════════════════════════════
   RBAC — Roles & Permissions
═══════════════════════════════════════════════ */
type Role = "Admin" | "Manager" | "Editor" | "Visor";
const ROLES: Role[] = ["Admin", "Manager", "Editor", "Visor"];

interface Permission {
  upload: boolean;
  delete: boolean;
  copyUrl: boolean;
  viewLogs: boolean;
}

const ROLE_PERMISSIONS: Record<Role, Permission> = {
  Admin:   { upload: true,  delete: true,  copyUrl: true,  viewLogs: true },
  Manager: { upload: true,  delete: true,  copyUrl: true,  viewLogs: true },
  Editor:  { upload: true,  delete: false, copyUrl: true,  viewLogs: false },
  Visor:   { upload: false, delete: false, copyUrl: true,  viewLogs: false },
};

const ROLE_COLORS: Record<Role, string> = {
  Admin: "bg-red-500/20 text-red-300 border-red-500/30",
  Manager: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Editor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Visor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

/* ═══════════════════════════════════════════════
   Audit Trail
═══════════════════════════════════════════════ */
interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  user: string;
  role: Role;
  timestamp: string;
}

/* ═══════════════════════════════════════════════
   Asset Types
═══════════════════════════════════════════════ */
interface AssetFile {
  key: string;
  name: string;
  type: string;
  url: string;
  size?: string;
  uploadedAt?: string;
}

const BUCKET_NAME = "nelvyon-assets";

const fileTypeIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return FileImage;
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return FileVideo;
  return FileText;
};

const fileTypeColor = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "from-violet-500 to-blue-500";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "from-pink-500 to-rose-500";
  if (["pdf"].includes(ext)) return "from-red-500 to-orange-500";
  return "from-zinc-500 to-zinc-400";
};

export default function Assets() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<AssetFile | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RBAC
  const [currentRole, setCurrentRole] = useState<Role>("Admin");
  const perms = ROLE_PERMISSIONS[currentRole];

  // Audit Trail
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const addAudit = useCallback((action: string, detail: string) => {
    setAuditLog(prev => [{
      id: crypto.randomUUID(),
      action,
      detail,
      user: user?.name || user?.email || "Sistema",
      role: currentRole,
      timestamp: new Date().toLocaleString("es-ES"),
    }, ...prev].slice(0, 100));
  }, [currentRole, user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const base = getAPIBaseURL();
      const { data } = await axios.get(`${base}/api/v1/storage/list/${BUCKET_NAME}`, {
        withCredentials: true,
      });
      const files: AssetFile[] = (data.objects || []).map((key: string) => ({
        key,
        name: key.split("/").pop() || key,
        type: key.split(".").pop()?.toLowerCase() || "file",
        url: `${base}/api/v1/storage/download/${BUCKET_NAME}/${key}`,
      }));
      setAssets(files);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAssets();
  }, [user, fetchAssets]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!perms.upload) { toast.error("Sin permisos para subir archivos"); return; }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const base = getAPIBaseURL();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket_name", BUCKET_NAME);
        formData.append("object_key", file.name);

        await axios.post(`${base}/api/v1/storage/upload`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        addAudit("UPLOAD", `Archivo subido: ${file.name}`);
      }
      toast.success(`${files.length} archivo(s) subido(s) correctamente`);
      await fetchAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error subiendo archivos";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (key: string) => {
    if (!perms.delete) { toast.error("Sin permisos para eliminar archivos"); return; }
    try {
      const base = getAPIBaseURL();
      await axios.delete(`${base}/api/v1/storage/delete/${BUCKET_NAME}/${key}`, {
        withCredentials: true,
      });
      setAssets(prev => prev.filter(a => a.key !== key));
      if (selected?.key === key) setSelected(null);
      addAudit("DELETE", `Archivo eliminado: ${key}`);
      toast.success("Archivo eliminado");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error eliminando archivo";
      toast.error(msg);
    }
  };

  const copyUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    addAudit("COPY_URL", `URL copiada: ${name}`);
    toast.success("URL copiada al portapapeles");
  };

  const filtered = assets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    if (filterType === "all") return matchSearch;
    if (filterType === "images") return matchSearch && ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(a.type);
    if (filterType === "videos") return matchSearch && ["mp4", "mov", "avi", "webm"].includes(a.type);
    if (filterType === "docs") return matchSearch && ["pdf", "doc", "docx", "txt", "md"].includes(a.type);
    return matchSearch;
  });

  const totalImages = assets.filter(a => ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(a.type)).length;
  const totalVideos = assets.filter(a => ["mp4", "mov", "avi", "webm"].includes(a.type)).length;

  const [assetSearchParams] = useSearchParams();
  const e2eParams = parseE2EParams(assetSearchParams.toString());
  const e2eOrigin = e2eParams.source ? getOriginLabel(e2eParams.source) : undefined;

  return (
    <DashboardLayout title="Asset Manager" subtitle="Gestión de archivos, imágenes y recursos del cliente">
      {/* ─── E2E Flow Banner ─── */}
      <E2EFlowBanner
        extra={e2eOrigin || (e2eParams.output_id ? `Output #${e2eParams.output_id}` : undefined)}
      />

      {/* RBAC Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-[#111113] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-zinc-400">Rol:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as Role)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-violet-500/50 focus:outline-none"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Badge className={cn("text-[10px]", ROLE_COLORS[currentRole])}>{currentRole}</Badge>
          <div className="flex gap-1.5 ml-2">
            {Object.entries(perms).map(([key, val]) => (
              <span key={key} className={cn(
                "text-[9px] px-1.5 py-0.5 rounded border",
                val ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-600 border-zinc-700 line-through"
              )}>
                {key === "upload" ? "Subir" : key === "delete" ? "Eliminar" : key === "copyUrl" ? "Copiar URL" : "Ver Logs"}
              </span>
            ))}
          </div>
        </div>
        {perms.viewLogs && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAudit(!showAudit)}
            className={cn("h-7 text-[10px] border-white/10", showAudit ? "bg-violet-600/20 text-violet-300" : "text-zinc-400")}
          >
            <ScrollText className="w-3 h-3 mr-1" />
            Audit Log ({auditLog.length})
          </Button>
        )}
      </div>

      {/* Audit Trail Panel */}
      {showAudit && perms.viewLogs && (
        <div className="mb-4 rounded-xl bg-[#0d0d0f] border border-violet-500/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-violet-300 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Audit Trail — Assets
            </h4>
            <span className="text-[9px] text-zinc-500">{auditLog.length} registros</span>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.03]">
            {auditLog.length === 0 ? (
              <p className="text-xs text-zinc-600 p-4 text-center">Sin registros de auditoría</p>
            ) : auditLog.map(entry => (
              <div key={entry.id} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                <span className="text-zinc-600 w-32 shrink-0">{entry.timestamp}</span>
                <Badge className={cn("text-[9px]", ROLE_COLORS[entry.role])}>{entry.role}</Badge>
                <span className="text-zinc-400">{entry.user}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-medium",
                  entry.action === "DELETE" ? "bg-red-500/10 text-red-400" :
                  entry.action === "UPLOAD" ? "bg-emerald-500/10 text-emerald-400" :
                  "bg-blue-500/10 text-blue-400"
                )}>{entry.action}</span>
                <span className="text-zinc-500 truncate">{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Archivos", value: assets.length, icon: HardDrive, color: "text-violet-400" },
          { label: "Imágenes", value: totalImages, icon: FileImage, color: "text-blue-400" },
          { label: "Vídeos", value: totalVideos, icon: FileVideo, color: "text-pink-400" },
          { label: "Documentos", value: assets.length - totalImages - totalVideos, icon: FileText, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-[#111113] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn("w-4 h-4", s.color)} />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar archivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111113] border-white/[0.08] text-white text-sm h-9"
            />
          </div>
          <div className="flex gap-1">
            {[
              { id: "all", label: "Todos" },
              { id: "images", label: "Imágenes" },
              { id: "videos", label: "Vídeos" },
              { id: "docs", label: "Docs" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filterType === f.id
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                    : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-violet-600/20 text-violet-300" : "text-zinc-500 hover:text-white")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-violet-600/20 text-violet-300" : "text-zinc-500 hover:text-white")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleUpload}
            className="hidden"
          />
          {perms.upload && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-violet-600 hover:bg-violet-500 text-white h-9 text-xs"
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="w-3.5 h-3.5 mr-1" /> Subir Archivos</>
              )}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Cargando assets...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-[#111113] border border-white/[0.06]">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/[0.08] flex items-center justify-center mb-4">
            <ImagePlus className="w-8 h-8 text-violet-500/50" />
          </div>
          <p className="text-sm text-zinc-400 mb-1">No hay archivos</p>
          <p className="text-xs text-zinc-600 mb-4">Sube imágenes, vídeos o documentos de tus clientes</p>
          {perms.upload && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> Subir Primer Archivo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Grid/List */}
          <div className="lg:col-span-2">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filtered.map((asset) => {
                  const Icon = fileTypeIcon(asset.name);
                  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(asset.type);
                  return (
                    <button
                      key={asset.key}
                      onClick={() => setSelected(asset)}
                      className={cn(
                        "group rounded-xl border overflow-hidden transition-all duration-200 text-left",
                        selected?.key === asset.key
                          ? "border-violet-500/40 bg-violet-500/[0.05] shadow-lg shadow-violet-500/5"
                          : "border-white/[0.06] bg-[#111113] hover:border-white/[0.12]"
                      )}
                    >
                      <div className="aspect-square relative bg-black/20 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${fileTypeColor(asset.name)} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {selected?.key === asset.key && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] text-white font-medium truncate">{asset.name}</p>
                        <p className="text-[9px] text-zinc-600 uppercase">{asset.type}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                {filtered.map((asset) => {
                  const Icon = fileTypeIcon(asset.name);
                  return (
                    <button
                      key={asset.key}
                      onClick={() => setSelected(asset)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left",
                        selected?.key === asset.key && "bg-violet-500/[0.05]"
                      )}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${fileTypeColor(asset.name)} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{asset.name}</p>
                        <p className="text-[10px] text-zinc-600 uppercase">{asset.type}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="rounded-xl bg-[#111113] border border-white/[0.06] overflow-hidden">
            {selected ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-sm font-semibold text-white">Detalle</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="text-zinc-400 hover:text-white h-7 w-7">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Preview */}
                  {["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(selected.type) ? (
                    <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-black/20">
                      <img src={selected.url} alt={selected.name} className="w-full object-contain max-h-[240px]" />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 h-[120px] flex items-center justify-center">
                      {(() => { const Icon = fileTypeIcon(selected.name); return <Icon className="w-12 h-12 text-zinc-600" />; })()}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Nombre</span>
                      <p className="text-sm text-white mt-0.5 break-all">{selected.name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tipo</span>
                      <p className="text-sm text-white mt-0.5 uppercase">{selected.type}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {perms.copyUrl && (
                      <Button
                        onClick={() => copyUrl(selected.url, selected.name)}
                        className="w-full bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20 text-xs justify-start"
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" /> Copiar URL
                      </Button>
                    )}
                    <a
                      href={selected.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full px-4 py-2.5 rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/20 text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Original
                    </a>
                    {perms.delete && (
                      <Button
                        onClick={() => handleDelete(selected.key)}
                        variant="outline"
                        className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 !bg-transparent text-xs justify-start"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center px-8 py-12">
                <Image className="w-12 h-12 text-zinc-700 mb-4" />
                <p className="text-sm text-zinc-500 mb-1">Selecciona un archivo</p>
                <p className="text-xs text-zinc-600">para ver el detalle y opciones</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
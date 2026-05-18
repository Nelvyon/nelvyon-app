import { useState, useRef, useCallback } from "react";
import {
  QrCode, Download, Copy, Palette, BarChart3, FolderOpen, Link2, Plus,
  Trash2, Edit3, Eye, Share2, Filter, Search, RefreshCw, Zap, Globe,
  Smartphone, ChevronDown, Check, X, Image, Settings, TrendingUp,
  Users, MapPin, Clock, ExternalLink, Layers, FileText, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ─────────────────────────── TYPES ─────────────────────────── */
interface QRCode {
  id: string;
  name: string;
  type: "static" | "dynamic";
  content: string;
  scans: number;
  created: string;
  folder: string;
  campaign?: string;
  status: "active" | "paused" | "expired";
  style: { fg: string; bg: string; logo?: string; shape: string };
}

interface QRFolder {
  id: string;
  name: string;
  count: number;
  color: string;
}

interface ScanEvent {
  id: string;
  qrId: string;
  qrName: string;
  timestamp: string;
  location: string;
  device: string;
  browser: string;
}

/* ─────────────────────────── MOCK DATA ─────────────────────────── */
const MOCK_QRS: QRCode[] = [
  { id: "qr1", name: "Landing Principal", type: "dynamic", content: "https://nelvyon.com", scans: 2847, created: "2026-03-15", folder: "Marketing", campaign: "Spring 2026", status: "active", style: { fg: "#000000", bg: "#FFFFFF", shape: "rounded" } },
  { id: "qr2", name: "Menú Restaurante", type: "static", content: "https://nelvyon.com/menu", scans: 1523, created: "2026-03-20", folder: "Clientes", status: "active", style: { fg: "#1a1a2e", bg: "#e8e8e8", shape: "dots" } },
  { id: "qr3", name: "Tarjeta Digital", type: "dynamic", content: "https://nelvyon.com/card/ceo", scans: 892, created: "2026-04-01", folder: "Personal", status: "active", style: { fg: "#6c3ce0", bg: "#f5f0ff", logo: "logo.png", shape: "rounded" } },
  { id: "qr4", name: "Promo Verano", type: "dynamic", content: "https://nelvyon.com/promo/summer", scans: 4201, created: "2026-04-05", folder: "Marketing", campaign: "Summer Sale", status: "active", style: { fg: "#e63946", bg: "#fff1f2", shape: "square" } },
  { id: "qr5", name: "WiFi Oficina", type: "static", content: "WIFI:T:WPA;S:NelvyonHQ;P:s3cur3pass;;", scans: 312, created: "2026-02-10", folder: "Interno", status: "active", style: { fg: "#000", bg: "#fff", shape: "square" } },
  { id: "qr6", name: "Encuesta NPS", type: "dynamic", content: "https://nelvyon.com/survey/nps-q1", scans: 156, created: "2026-01-20", folder: "Clientes", campaign: "NPS Q1", status: "paused", style: { fg: "#059669", bg: "#ecfdf5", shape: "rounded" } },
];

const MOCK_FOLDERS: QRFolder[] = [
  { id: "f1", name: "Marketing", count: 12, color: "#e63946" },
  { id: "f2", name: "Clientes", count: 8, color: "#3b82f6" },
  { id: "f3", name: "Personal", count: 5, color: "#8b5cf6" },
  { id: "f4", name: "Interno", count: 3, color: "#6b7280" },
];

const MOCK_SCANS: ScanEvent[] = [
  { id: "s1", qrId: "qr1", qrName: "Landing Principal", timestamp: "2026-04-12 14:32", location: "Madrid, ES", device: "iPhone 15", browser: "Safari" },
  { id: "s2", qrId: "qr4", qrName: "Promo Verano", timestamp: "2026-04-12 14:28", location: "Barcelona, ES", device: "Samsung S24", browser: "Chrome" },
  { id: "s3", qrId: "qr3", qrName: "Tarjeta Digital", timestamp: "2026-04-12 14:15", location: "México DF, MX", device: "Pixel 8", browser: "Chrome" },
  { id: "s4", qrId: "qr1", qrName: "Landing Principal", timestamp: "2026-04-12 13:55", location: "Buenos Aires, AR", device: "iPhone 14", browser: "Safari" },
  { id: "s5", qrId: "qr2", qrName: "Menú Restaurante", timestamp: "2026-04-12 13:40", location: "Valencia, ES", device: "iPad Pro", browser: "Safari" },
  { id: "s6", qrId: "qr4", qrName: "Promo Verano", timestamp: "2026-04-12 13:22", location: "Bogotá, CO", device: "Samsung A54", browser: "Samsung Internet" },
];

/* ─────────────────────────── QR CANVAS RENDERER ─────────────────────────── */
function QRPreview({ content, style, size = 160 }: { content: string; style: QRCode["style"]; size?: number }) {
  const cellSize = size / 21;
  // Deterministic pattern from content hash
  const hash = content.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const cells: boolean[][] = Array.from({ length: 21 }, (_, r) =>
    Array.from({ length: 21 }, (_, c) => {
      if (r < 7 && c < 7) return true; // top-left finder
      if (r < 7 && c > 13) return true; // top-right finder
      if (r > 13 && c < 7) return true; // bottom-left finder
      if (r === 6 || c === 6) return (r + c) % 2 === 0; // timing
      return ((hash * (r * 21 + c + 1)) & 0xff) > 120;
    })
  );

  const isRounded = style.shape === "rounded" || style.shape === "dots";
  const isDots = style.shape === "dots";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect width={size} height={size} fill={style.bg} rx={isRounded ? 8 : 0} />
      {cells.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            isDots ? (
              <circle
                key={`${r}-${c}`}
                cx={c * cellSize + cellSize / 2}
                cy={r * cellSize + cellSize / 2}
                r={cellSize * 0.38}
                fill={style.fg}
              />
            ) : (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize + 0.5}
                y={r * cellSize + 0.5}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={style.fg}
                rx={isRounded ? 2 : 0}
              />
            )
          ) : null
        )
      )}
      {/* Center logo area */}
      {style.logo && (
        <g>
          <rect x={size / 2 - 16} y={size / 2 - 16} width={32} height={32} fill={style.bg} rx={6} />
          <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="10" fill={style.fg} fontWeight="bold">N</text>
        </g>
      )}
    </svg>
  );
}

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function SaasQRService() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [qrs, setQrs] = useState<QRCode[]>(MOCK_QRS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "static" | "dynamic">("all");
  const [filterFolder, setFilterFolder] = useState("all");
  const [showCreator, setShowCreator] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);

  // Creator state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"static" | "dynamic">("dynamic");
  const [newContent, setNewContent] = useState("");
  const [newFolder, setNewFolder] = useState("Marketing");
  const [newFg, setNewFg] = useState("#000000");
  const [newBg, setNewBg] = useState("#FFFFFF");
  const [newShape, setNewShape] = useState<"square" | "rounded" | "dots">("rounded");
  const [newLogo, setNewLogo] = useState(false);

  // Bulk state
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("QR-Bulk");

  const filtered = qrs.filter(q => {
    if (search && !q.name.toLowerCase().includes(search.toLowerCase()) && !q.content.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && q.type !== filterType) return false;
    if (filterFolder !== "all" && q.folder !== filterFolder) return false;
    return true;
  });

  const totalScans = qrs.reduce((a, q) => a + q.scans, 0);
  const dynamicCount = qrs.filter(q => q.type === "dynamic").length;
  const activeCount = qrs.filter(q => q.status === "active").length;

  const handleCreate = useCallback(() => {
    if (!newName.trim() || !newContent.trim()) {
      toast.error("Nombre y contenido son obligatorios");
      return;
    }
    const qr: QRCode = {
      id: `qr-${Date.now()}`,
      name: newName,
      type: newType,
      content: newContent,
      scans: 0,
      created: new Date().toISOString().split("T")[0],
      folder: newFolder,
      status: "active",
      style: { fg: newFg, bg: newBg, shape: newShape, logo: newLogo ? "logo.png" : undefined },
    };
    setQrs(prev => [qr, ...prev]);
    setShowCreator(false);
    setNewName(""); setNewContent("");
    toast.success(`QR "${qr.name}" creado exitosamente`);
  }, [newName, newType, newContent, newFolder, newFg, newBg, newShape, newLogo]);

  const handleBulkGenerate = useCallback(() => {
    const urls = bulkUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) { toast.error("Ingresa al menos una URL"); return; }
    const newQrs: QRCode[] = urls.map((url, i) => ({
      id: `qr-bulk-${Date.now()}-${i}`,
      name: `${bulkPrefix}-${i + 1}`,
      type: "dynamic" as const,
      content: url,
      scans: 0,
      created: new Date().toISOString().split("T")[0],
      folder: "Marketing",
      status: "active" as const,
      style: { fg: "#000000", bg: "#FFFFFF", shape: "rounded" },
    }));
    setQrs(prev => [...newQrs, ...prev]);
    setBulkUrls("");
    toast.success(`${newQrs.length} QR codes generados`);
  }, [bulkUrls, bulkPrefix]);

  const handleDelete = useCallback((id: string) => {
    setQrs(prev => prev.filter(q => q.id !== id));
    toast.success("QR eliminado");
  }, []);

  const handleDuplicate = useCallback((qr: QRCode) => {
    const dup = { ...qr, id: `qr-dup-${Date.now()}`, name: `${qr.name} (copia)`, scans: 0, created: new Date().toISOString().split("T")[0] };
    setQrs(prev => [dup, ...prev]);
    toast.success("QR duplicado");
  }, []);

  const handleToggleStatus = useCallback((id: string) => {
    setQrs(prev => prev.map(q => q.id === id ? { ...q, status: q.status === "active" ? "paused" : "active" } : q));
    toast.success("Estado actualizado");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d18] to-[#0a0a12] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <QrCode className="w-6 h-6" />
            </div>
            QR Studio Pro
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Crea, gestiona y analiza QR codes profesionales para tu negocio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => setActiveTab("bulk")}>
            <Layers className="w-4 h-4 mr-1.5" /> Bulk
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500" onClick={() => setShowCreator(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo QR
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total QR Codes", value: qrs.length, icon: QrCode, color: "from-purple-600 to-purple-800" },
          { label: "Escaneos Totales", value: totalScans.toLocaleString(), icon: TrendingUp, color: "from-emerald-600 to-emerald-800" },
          { label: "QR Dinámicos", value: dynamicCount, icon: Zap, color: "from-blue-600 to-blue-800" },
          { label: "Activos", value: activeCount, icon: Check, color: "from-amber-600 to-amber-800" },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${s.color}`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[11px] text-zinc-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/80 border border-zinc-800/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="gallery">Galería</TabsTrigger>
          <TabsTrigger value="analytics">Analítica</TabsTrigger>
          <TabsTrigger value="bulk">Bulk</TabsTrigger>
          <TabsTrigger value="folders">Carpetas</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input placeholder="Buscar QR..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-zinc-900/60 border-zinc-800" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300">
              <option value="all">Todos los tipos</option>
              <option value="static">Estáticos</option>
              <option value="dynamic">Dinámicos</option>
            </select>
            <select value={filterFolder} onChange={e => setFilterFolder(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300">
              <option value="all">Todas las carpetas</option>
              {MOCK_FOLDERS.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>

          {/* QR Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(qr => (
              <Card key={qr.id} className="bg-zinc-900/60 border-zinc-800/50 hover:border-purple-600/30 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{qr.name}</h3>
                      <p className="text-[11px] text-zinc-500 truncate">{qr.content}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedQR(qr)} className="p-1 hover:bg-zinc-800 rounded"><Eye className="w-3.5 h-3.5 text-zinc-400" /></button>
                      <button onClick={() => handleDuplicate(qr)} className="p-1 hover:bg-zinc-800 rounded"><Copy className="w-3.5 h-3.5 text-zinc-400" /></button>
                      <button onClick={() => handleDelete(qr.id)} className="p-1 hover:bg-zinc-800 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  <div className="flex justify-center py-3 bg-white/[0.03] rounded-lg mb-3">
                    <QRPreview content={qr.content} style={qr.style} size={120} />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`text-[10px] ${qr.type === "dynamic" ? "border-purple-600/40 text-purple-400" : "border-zinc-700 text-zinc-400"}`}>
                        {qr.type === "dynamic" ? "Dinámico" : "Estático"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${qr.status === "active" ? "border-emerald-600/40 text-emerald-400" : "border-yellow-600/40 text-yellow-400"}`}>
                        {qr.status === "active" ? "Activo" : "Pausado"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500">
                      <BarChart3 className="w-3 h-3" />
                      {qr.scans.toLocaleString()} escaneos
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-600">
                    <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" />{qr.folder}</span>
                    <span>{qr.created}</span>
                  </div>

                  {qr.campaign && (
                    <div className="mt-2">
                      <Badge className="bg-blue-600/20 text-blue-400 text-[10px] border-blue-600/30">
                        <Link2 className="w-2.5 h-2.5 mr-1" /> {qr.campaign}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" onClick={() => { navigator.clipboard.writeText(qr.content); toast.success("URL copiada"); }}>
                      <Copy className="w-3 h-3 mr-1" /> Copiar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-zinc-700" onClick={() => toast.success("QR descargado (PNG)")}>
                      <Download className="w-3 h-3 mr-1" /> PNG
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-700" onClick={() => handleToggleStatus(qr.id)}>
                      {qr.status === "active" ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── GALLERY TAB ── */}
        <TabsContent value="gallery" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {qrs.map(qr => (
              <div key={qr.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-3 text-center hover:border-purple-600/30 transition-all cursor-pointer" onClick={() => setSelectedQR(qr)}>
                <QRPreview content={qr.content} style={qr.style} size={100} />
                <p className="text-[11px] font-medium mt-2 truncate">{qr.name}</p>
                <p className="text-[10px] text-zinc-500">{qr.scans.toLocaleString()} scans</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scan Timeline */}
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Escaneos Últimos 7 Días</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {[320, 480, 290, 560, 420, 680, 520].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" style={{ height: `${(v / 700) * 100}%` }} />
                      <span className="text-[9px] text-zinc-600">{["L", "M", "X", "J", "V", "S", "D"][i]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top QR by scans */}
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> Top QR por Escaneos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...qrs].sort((a, b) => b.scans - a.scans).slice(0, 5).map((qr, i) => (
                  <div key={qr.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{qr.name}</p>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full" style={{ width: `${(qr.scans / Math.max(...qrs.map(q => q.scans))) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">{qr.scans.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Device breakdown */}
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="w-4 h-4 text-amber-400" /> Dispositivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "iPhone", pct: 42, color: "bg-blue-500" },
                  { label: "Android", pct: 38, color: "bg-emerald-500" },
                  { label: "iPad/Tablet", pct: 12, color: "bg-purple-500" },
                  { label: "Desktop", pct: 8, color: "bg-amber-500" },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-20">{d.label}</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-2">
                      <div className={`${d.color} h-2 rounded-full`} style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right">{d.pct}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Location breakdown */}
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-red-400" /> Ubicaciones Top</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { city: "Madrid, ES", scans: 1240 },
                  { city: "Barcelona, ES", scans: 890 },
                  { city: "México DF, MX", scans: 720 },
                  { city: "Buenos Aires, AR", scans: 580 },
                  { city: "Bogotá, CO", scans: 340 },
                ].map(l => (
                  <div key={l.city} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 flex items-center gap-1.5"><Globe className="w-3 h-3 text-zinc-500" />{l.city}</span>
                    <span className="text-zinc-500 font-mono">{l.scans.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent scans feed */}
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-400" /> Escaneos Recientes (Tiempo Real)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_SCANS.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium text-zinc-200 w-32 truncate">{s.qrName}</span>
                    <span className="text-zinc-500 w-28">{s.timestamp}</span>
                    <span className="text-zinc-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>
                    <span className="text-zinc-500 ml-auto">{s.device} · {s.browser}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BULK TAB ── */}
        <TabsContent value="bulk" className="space-y-4 mt-4">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-purple-400" /> Generación Masiva de QR Codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Prefijo de nombre</label>
                <Input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="QR-Campaña" className="bg-zinc-800/50 border-zinc-700" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">URLs (una por línea)</label>
                <textarea
                  value={bulkUrls}
                  onChange={e => setBulkUrls(e.target.value)}
                  placeholder={"https://ejemplo.com/producto-1\nhttps://ejemplo.com/producto-2\nhttps://ejemplo.com/producto-3"}
                  rows={8}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {bulkUrls.split("\n").filter(u => u.trim()).length} URLs detectadas
                </p>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600" onClick={handleBulkGenerate}>
                  <Zap className="w-4 h-4 mr-1.5" /> Generar Todos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-blue-400" /> Importar desde CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-purple-600/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Arrastra un CSV o haz clic para subir</p>
                <p className="text-[10px] text-zinc-600 mt-1">Formato: nombre, url, tipo (static/dynamic)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FOLDERS TAB ── */}
        <TabsContent value="folders" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {MOCK_FOLDERS.map(f => (
              <Card key={f.id} className="bg-zinc-900/60 border-zinc-800/50 hover:border-purple-600/30 transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: f.color + "20" }}>
                    <FolderOpen className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-[11px] text-zinc-500">{f.count} QR codes</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-zinc-900/60 border-zinc-800/50 border-dashed hover:border-purple-600/30 transition-all cursor-pointer" onClick={() => toast.info("Crear carpeta: próximamente")}>
              <CardContent className="p-4 flex items-center justify-center gap-2 text-zinc-500">
                <Plus className="w-5 h-5" />
                <span className="text-sm">Nueva Carpeta</span>
              </CardContent>
            </Card>
          </div>

          {/* CRM/Campaign connection */}
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-blue-400" /> Conexión CRM & Campañas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-zinc-400">Vincula QR codes a contactos del CRM y campañas activas para tracking completo.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "QR vinculados a CRM", value: "24", icon: Users, color: "text-blue-400" },
                  { label: "Campañas con QR", value: "8", icon: Megaphone, color: "text-purple-400" },
                  { label: "Conversiones vía QR", value: "142", icon: TrendingUp, color: "text-emerald-400" },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-800/40 rounded-lg p-3 flex items-center gap-3">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                    <div>
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] text-zinc-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── CREATOR MODAL ── */}
      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowCreator(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-purple-400" /> Crear QR Code</h2>
              <button onClick={() => setShowCreator(false)} className="p-1 hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nombre</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mi QR Code" className="bg-zinc-800/50 border-zinc-700" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Tipo</label>
                  <select value={newType} onChange={e => setNewType(e.target.value as "static" | "dynamic")} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                    <option value="dynamic">Dinámico</option>
                    <option value="static">Estático</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Carpeta</label>
                  <select value={newFolder} onChange={e => setNewFolder(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                    {MOCK_FOLDERS.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Contenido / URL</label>
                <Input value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="https://..." className="bg-zinc-800/50 border-zinc-700" />
              </div>

              {/* Branding */}
              <div>
                <label className="text-xs text-zinc-400 mb-2 block flex items-center gap-1"><Palette className="w-3 h-3" /> Branding Visual</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Color QR</label>
                    <input type="color" value={newFg} onChange={e => setNewFg(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Fondo</label>
                    <input type="color" value={newBg} onChange={e => setNewBg(e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Forma</label>
                    <select value={newShape} onChange={e => setNewShape(e.target.value as typeof newShape)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs">
                      <option value="square">Cuadrado</option>
                      <option value="rounded">Redondeado</option>
                      <option value="dots">Puntos</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 text-xs text-zinc-400 cursor-pointer">
                  <input type="checkbox" checked={newLogo} onChange={e => setNewLogo(e.target.checked)} className="rounded" />
                  Incluir logo en el centro
                </label>
              </div>

              {/* Preview */}
              <div className="flex justify-center py-4 bg-white/[0.03] rounded-xl">
                <QRPreview content={newContent || "https://nelvyon.com"} style={{ fg: newFg, bg: newBg, shape: newShape, logo: newLogo ? "logo.png" : undefined }} size={160} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setShowCreator(false)}>Cancelar</Button>
              <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600" onClick={handleCreate}>
                <QrCode className="w-4 h-4 mr-1.5" /> Crear QR
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedQR(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedQR.name}</h2>
              <button onClick={() => setSelectedQR(null)} className="p-1 hover:bg-zinc-800 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex justify-center py-4 bg-white rounded-xl">
              <QRPreview content={selectedQR.content} style={selectedQR.style} size={200} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Tipo</span><Badge variant="outline" className="text-[10px]">{selectedQR.type}</Badge></div>
              <div className="flex justify-between"><span className="text-zinc-500">URL/Contenido</span><span className="text-zinc-300 truncate max-w-[200px]">{selectedQR.content}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Escaneos</span><span className="text-zinc-300 font-mono">{selectedQR.scans.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Carpeta</span><span className="text-zinc-300">{selectedQR.folder}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Creado</span><span className="text-zinc-300">{selectedQR.created}</span></div>
              {selectedQR.campaign && <div className="flex justify-between"><span className="text-zinc-500">Campaña</span><Badge className="bg-blue-600/20 text-blue-400 text-[10px]">{selectedQR.campaign}</Badge></div>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => { navigator.clipboard.writeText(selectedQR.content); toast.success("Copiado"); }}>
                <Copy className="w-4 h-4 mr-1" /> Copiar URL
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600" onClick={() => toast.success("QR descargado")}>
                <Download className="w-4 h-4 mr-1" /> Descargar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
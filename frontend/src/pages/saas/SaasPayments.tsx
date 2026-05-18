import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SaasLayout from "@/components/SaasLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Loader2, Plus, Search, CheckCircle2,
  DollarSign, BarChart3,
  RefreshCw, Clock,
  Receipt, Download, Send, XCircle, RotateCcw, Zap,
  Edit, Save, X, Trash2
} from "lucide-react";
import { client, type SalesRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InlineServiceDemo } from "@/components/saas/InlineServiceDemo";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed: { label: "Completado", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  pending: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  failed: { label: "Fallido", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  refunded: { label: "Reembolsado", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: RotateCcw },
};

const methodIcons: Record<string, string> = {
  "Stripe": "💳", "PayPal": "🅿️", "Apple Pay": "🍎", "Google Pay": "🔵", "Transferencia": "🏦",
};

export default function SaasPayments() {
  const { ts } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTxn, setSelectedTxn] = useState<SalesRecord | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    client_name: "", product: "", amount: 0, currency: "EUR",
    status: "pending", payment_method: "Stripe", invoice_number: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/saas");
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.entities.sales_records.query({ sort: "-created_at", limit: 200 });
      const items = (res.data?.items as SalesRecord[]) || [];
      setRecords(items);
      if (items.length > 0 && !selectedTxn) setSelectedTxn(items[0]);
    } catch (err) {
      toast.error("Error cargando pagos");
    } finally {
      setLoading(false);
    }
  }, [selectedTxn]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleCreate = async () => {
    setCreating(true);
    const idx = records.length;
    try {
      await client.entities.sales_records.create({
        client_name: "Nuevo cliente",
        product: "Pendiente de asignar",
        amount: 0,
        currency: "EUR",
        status: "pending",
        payment_method: "Stripe",
        invoice_number: `INV-${new Date().getFullYear()}-${String(idx + 1).padStart(4, "0")}`,
        notes: "Creado manualmente — editar con datos reales",
        closed_at: new Date().toISOString(),
      });
      toast.success("Factura creada — edita los datos reales del cliente y monto");
      fetchData();
    } catch (err) {
      toast.error("Error creando factura");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (txn: SalesRecord) => {
    setEditData({
      client_name: txn.client_name || "",
      product: txn.product || "",
      amount: txn.amount || 0,
      currency: txn.currency || "EUR",
      status: txn.status || "pending",
      payment_method: txn.payment_method || "Stripe",
      invoice_number: txn.invoice_number || "",
      notes: txn.notes || "",
    });
    setSelectedTxn(txn);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTxn || !editData.client_name.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await client.entities.sales_records.update({
        id: String(selectedTxn.id),
        data: {
          client_name: editData.client_name,
          product: editData.product,
          amount: editData.amount,
          currency: editData.currency,
          status: editData.status,
          payment_method: editData.payment_method,
          invoice_number: editData.invoice_number,
          notes: editData.notes,
        },
      });
      toast.success("Factura actualizada");
      setEditing(false);
      await fetchData();
    } catch (err) {
      toast.error("Error actualizando factura");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta factura?")) return;
    try {
      await client.entities.sales_records.delete({ id: String(id) });
      toast.success("Factura eliminada");
      if (selectedTxn?.id === id) { setSelectedTxn(null); setEditing(false); }
      await fetchData();
    } catch (err) {
      toast.error("Error eliminando factura");
    }
  };

  const filtered = records.filter(t => {
    const matchSearch =
      (t.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.invoice_number || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter;
    return matchSearch && matchFilter;
  });

  const totalRevenue = records.filter(t => t.status === "completed").reduce((s, t) => s + (t.amount || 0), 0);
  const pendingAmount = records.filter(t => t.status === "pending").reduce((s, t) => s + (t.amount || 0), 0);
  const subscriptions = records.filter(t => (t.product || "").toLowerCase().includes("plan")).length;
  const successRate = records.length > 0 ? Math.round((records.filter(t => t.status === "completed").length / records.length) * 100) : 0;

  // Revenue chart data (last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayTxns = records.filter(t => t.status === "completed" && t.created_at && new Date(t.created_at).toDateString() === d.toDateString());
    return { day: d.toLocaleDateString("es", { weekday: "short" }), amount: dayTxns.reduce((s, t) => s + (t.amount || 0), 0) };
  });
  const maxChart = Math.max(...chartData.map(d => d.amount), 1);

  const getMethodIcon = (method?: string) => methodIcons[method || ""] || "💳";

  return (
    <SaasLayout title="Pagos y Facturas" subtitle="Gestión financiera con Nelvyon — Facturas y cobros">
      <InlineServiceDemo serviceKey="payments" serviceName="Pagos y Facturas" />
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/[0.06] via-teal-500/[0.04] to-green-500/[0.06] border border-emerald-500/10 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white">Pagos y Facturación</span>
          {["STRIPE", "FACTURAS", "MULTI-MONEDA"].map(b => (
            <span key={b} className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">{b}</span>
          ))}
        </div>
      </div>

      {/* Live data indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium">DATOS EN VIVO — BACKEND CONECTADO</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Revenue Mes", value: `€${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "from-emerald-500/10 to-green-500/10" },
          { label: "Pendiente", value: `€${pendingAmount.toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-500/10" },
          { label: "Suscripciones", value: subscriptions.toString(), icon: Zap, color: "text-violet-400", bg: "from-violet-500/10 to-purple-500/10" },
          { label: "Tasa Cobro", value: `${successRate}%`, icon: CheckCircle2, color: "text-blue-400", bg: "from-blue-500/10 to-cyan-500/10" },
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

      {/* Revenue Chart */}
      <div className="rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white">Revenue Ultimos 7 Dias</span>
          </div>
          <span className="text-xs font-bold text-emerald-400">€{chartData.reduce((s, d) => s + d.amount, 0).toLocaleString()}</span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-zinc-600">€{d.amount}</span>
              <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 hover:from-emerald-500 hover:to-green-300"
                style={{ height: `${maxChart > 0 ? (d.amount / maxChart) * 80 : 4}px`, minHeight: 4 }} />
              <span className="text-[9px] text-zinc-600">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input placeholder="Buscar transacciones o facturas..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[#0F1419] border-white/[0.06] text-white text-sm h-9" />
        </div>
        {["all", "completed", "pending"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}
            className={cn("text-[10px] h-8", filter === f ? "bg-emerald-600 text-white" : "border-white/10 text-zinc-500")}>
            {f === "all" ? "Todos" : statusConfig[f]?.label || f}
          </Button>
        ))}
        <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
          {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />} Nueva Factura
        </Button>
        <Button size="sm" variant="outline" className="border-white/10 text-zinc-400 h-8 text-xs">
          <Download className="w-3.5 h-3.5 mr-1" /> Exportar
        </Button>
        <Button size="sm" onClick={fetchData} variant="outline" className="border-white/10 text-zinc-400 h-8">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-[#0A0E13] border border-white/[0.04]">
          <CreditCard className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-2">No hay transacciones todavía</p>
          <p className="text-xs text-zinc-600 mb-4">Crea tu primera factura para empezar</p>
          <Button size="sm" onClick={handleCreate} disabled={creating} className="bg-emerald-600 text-white">
            <Plus className="w-3.5 h-3.5 mr-1" /> Crear Primera Factura
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 rounded-xl bg-[#0A0E13] border border-white/[0.04] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Cliente", "Factura", "Monto", "Metodo", "Producto", "Estado", "Fecha"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[9px] font-semibold text-zinc-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(txn => {
                  const sc = statusConfig[txn.status || "pending"] || statusConfig.pending;
                  return (
                    <tr key={txn.id} onClick={() => { setSelectedTxn(txn); setEditing(false); }}
                      className={cn("border-b border-white/[0.02] cursor-pointer transition-colors",
                        selectedTxn?.id === txn.id ? "bg-emerald-500/[0.03]" : "hover:bg-white/[0.01]"
                      )}>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-white">{txn.client_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-zinc-500 font-mono">{txn.invoice_number || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm font-bold text-white">€{(txn.amount || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs">{getMethodIcon(txn.payment_method)} {txn.payment_method || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-zinc-500">{txn.product || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold border", sc.bg)}>
                          <sc.icon className={cn("w-2.5 h-2.5 inline mr-0.5", sc.color)} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-zinc-600">{txn.created_at ? new Date(txn.created_at).toLocaleDateString("es") : "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail / Edit Panel */}
          <div className="lg:col-span-4 rounded-xl bg-[#0A0E13] border border-white/[0.04] p-4">
            {selectedTxn && editing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                  <span className="text-xs font-bold text-white">Editar Factura</span>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 w-6 p-0 text-zinc-400"><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Cliente *</label>
                  <Input value={editData.client_name} onChange={e => setEditData(d => ({ ...d, client_name: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Producto</label>
                  <Input value={editData.product} onChange={e => setEditData(d => ({ ...d, product: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Monto (€)</label>
                    <Input type="number" value={editData.amount} onChange={e => setEditData(d => ({ ...d, amount: Number(e.target.value) }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Moneda</label>
                    <select value={editData.currency} onChange={e => setEditData(d => ({ ...d, currency: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white">
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Estado</label>
                    <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white">
                      <option value="pending">Pendiente</option>
                      <option value="completed">Completado</option>
                      <option value="failed">Fallido</option>
                      <option value="refunded">Reembolsado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Método</label>
                    <select value={editData.payment_method} onChange={e => setEditData(d => ({ ...d, payment_method: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white">
                      <option value="Stripe">Stripe</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Apple Pay">Apple Pay</option>
                      <option value="Google Pay">Google Pay</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Nº Factura</label>
                  <Input value={editData.invoice_number} onChange={e => setEditData(d => ({ ...d, invoice_number: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-8" />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase mb-0.5 block">Notas</label>
                  <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                    rows={2} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-zinc-400 text-xs h-7">Cancelar</Button>
                </div>
              </div>
            ) : selectedTxn ? (
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-white/[0.04]">
                  <span className="text-3xl">{getMethodIcon(selectedTxn.payment_method)}</span>
                  <p className="text-2xl font-bold text-white mt-2">€{(selectedTxn.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500">{selectedTxn.invoice_number || "Sin factura"}</p>
                  <span className={cn("inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold border", (statusConfig[selectedTxn.status || "pending"] || statusConfig.pending).bg)}>
                    {(statusConfig[selectedTxn.status || "pending"] || statusConfig.pending).label}
                  </span>
                </div>
                {[
                  { label: "Cliente", value: selectedTxn.client_name },
                  { label: "Producto", value: selectedTxn.product || "—" },
                  { label: "Metodo", value: selectedTxn.payment_method || "—" },
                  { label: "Moneda", value: selectedTxn.currency || "EUR" },
                  { label: "Notas", value: selectedTxn.notes || "—" },
                  { label: "Fecha", value: selectedTxn.created_at ? new Date(selectedTxn.created_at).toLocaleString("es") : "—" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600">{item.label}</span>
                    <span className="text-xs text-white font-medium">{item.value}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => openEdit(selectedTxn)} className="flex-1 text-[10px] h-7 bg-emerald-600 text-white">
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 border-white/10 text-zinc-400">
                    <Receipt className="w-3 h-3 mr-1" /> Ver Factura
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(selectedTxn.id)}
                    className="text-[10px] h-7 border-red-500/20 text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <CreditCard className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600">Selecciona una transaccion</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SaasLayout>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

// ── Types ──────────────────────────────────────────────────────────────────────
interface StoreVariant { name: string; priceModifier: number; stock: number }
interface StoreProduct { id: string; name: string; description: string | null; price: number; currency: string; type: string; active: boolean; imageUrl: string | null; sku: string | null; stock: number; slug: string | null; category: string | null; variants: StoreVariant[] | null; salesCount: number; createdAt: string }
interface StoreSettings { currency: string; vatPct: number; vatIncluded: boolean; shippingFee: number; freeShippingAbove: number | null; storeName: string | null; storeDescription: string | null }
interface StoreOrderItem {
  id: string; productName: string; variantName: string | null; sku: string | null;
  quantity: number; unitPrice: number; totalPrice: number;
}
interface StoreOrder {
  id: string; orderNumber: string; status: string; customerEmail: string; customerName: string | null;
  subtotal: number; vatAmount: number; shippingFee: number; total: number; currency: string;
  paidAt: string | null; createdAt: string; items?: StoreOrderItem[];
}

type Tab = "productos" | "pedidos" | "configuracion";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", processing: "Procesando",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", refunded: "Devuelto",
};
const ORDER_STATUS_TONES: Record<string, "primary" | "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning", paid: "success", processing: "primary",
  shipped: "primary", delivered: "success", cancelled: "danger", refunded: "neutral",
};

const STATUS_ACTIONS: Array<{ from: string; to: string; label: string }> = [
  { from: "pending", to: "paid", label: "→ Marcar pagado" },
  { from: "pending", to: "cancelled", label: "Cancelar" },
  { from: "paid", to: "processing", label: "→ Procesar" },
  { from: "processing", to: "shipped", label: "→ Enviar" },
  { from: "shipped", to: "delivered", label: "→ Entregado" },
];

// ── Product Modal ──────────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved }: { product?: StoreProduct; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name ?? ""); const [desc, setDesc] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? "")); const [type, setType] = useState(product?.type ?? "physical");
  const [sku, setSku] = useState(product?.sku ?? ""); const [stock, setStock] = useState(String(product?.stock ?? "0"));
  const [slug, setSlug] = useState(product?.slug ?? ""); const [category, setCategory] = useState(product?.category ?? "");
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const url = product ? `/api/saas/store/products/${product.id}` : "/api/saas/store/products";
      const method = product ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, price: parseFloat(price) || 0, type, sku: sku.trim() || null, stock: parseInt(stock) || 0, slug: slug.trim() || null, category: category.trim() || null }) });
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? "Error"); }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">{product ? "Editar producto" : "Nuevo producto"}</h2>
        {error && <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label><input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Precio (€)</label><input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="physical">Físico</option><option value="digital">Digital</option><option value="service">Servicio</option><option value="subscription">Suscripción</option>
              </select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">SKU</label><input value={sku} onChange={e => setSku(e.target.value)} placeholder="PROD-001" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Stock</label><input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Slug (URL)</label><input value={slug} onChange={e => setSlug(e.target.value)} placeholder="mi-producto" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ropa, Electrónica…" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
            <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
          </div>
          <div className="flex gap-3 pt-2"><NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton><NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : product ? "Guardar" : "Crear"}</NelvyonDsButton></div>
        </form>
      </div>
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────
function SettingsPanel({ settings, onSaved }: { settings: StoreSettings; onSaved: (s: StoreSettings) => void }) {
  const [vatPct, setVatPct] = useState(String(settings.vatPct));
  const [vatIncluded, setVatIncluded] = useState(settings.vatIncluded);
  const [currency, setCurrency] = useState(settings.currency);
  const [shippingFee, setShippingFee] = useState(String(settings.shippingFee));
  const [freeAbove, setFreeAbove] = useState(settings.freeShippingAbove != null ? String(settings.freeShippingAbove) : "");
  const [storeName, setStoreName] = useState(settings.storeName ?? "");
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setOk(false); setError(null);
    try {
      const res = await fetch("/api/saas/store/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, vat_pct: parseFloat(vatPct) || 21, vat_included: vatIncluded, shipping_fee: parseFloat(shippingFee) || 0, free_shipping_above: freeAbove ? parseFloat(freeAbove) : null, store_name: storeName || null }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Error al guardar");
      }
      const d = await res.json() as { settings: StoreSettings };
      onSaved(d.settings); setOk(true); setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-5">
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de la tienda</label><input value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Moneda</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
          </select></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">IVA / VAT (%)</label><input type="number" min="0" max="100" step="0.1" value={vatPct} onChange={e => setVatPct(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="vatIncluded" checked={vatIncluded} onChange={e => setVatIncluded(e.target.checked)} className="h-4 w-4 rounded border-border" />
        <label htmlFor="vatIncluded" className="text-sm text-foreground">IVA ya incluido en el precio (price includes VAT)</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Gastos de envío (€)</label><input type="number" min="0" step="0.01" value={shippingFee} onChange={e => setShippingFee(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
        <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Envío gratis a partir de (€)</label><input type="number" min="0" step="0.01" value={freeAbove} onChange={e => setFreeAbove(e.target.value)} placeholder="—" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></div>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <NelvyonDsButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</NelvyonDsButton>
        {ok && <span className="text-sm text-success">✓ Guardado</span>}
      </div>
      <p className="text-xs text-muted-foreground">Los países de la UE aplican IVA según la directiva EU VAT 2021. Configura el % correcto para tu país de origen (España: 21%, Alemania: 19%, Francia: 20%…).</p>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasStorePage() {
  const [tab, setTab] = useState<Tab>("productos");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editProduct, setEditProduct] = useState<StoreProduct | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/saas/store/products");
    const d = await res.json() as { products?: StoreProduct[] };
    setProducts(d.products ?? []);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/saas/store/orders");
    const d = await res.json() as { orders?: StoreOrder[] };
    setOrders(d.orders ?? []);
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/saas/store/settings");
    const d = await res.json() as { settings?: StoreSettings };
    if (d.settings) setSettings(d.settings);
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadProducts(), loadOrders(), loadSettings()]).finally(() => setLoading(false));
  }, [loadProducts, loadOrders, loadSettings]);

  useEffect(() => {
    if (tab === "pedidos") void loadOrders();
  }, [tab, loadOrders]);

  async function toggleActive(p: StoreProduct) {
    setActionError(null);
    const res = await fetch(`/api/saas/store/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setActionError(d.error ?? "No se pudo actualizar el producto");
      return;
    }
    void loadProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("¿Eliminar producto?")) return;
    setActionError(null);
    const res = await fetch(`/api/saas/store/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setActionError(d.error ?? "No se pudo eliminar el producto");
      return;
    }
    void loadProducts();
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setActionError(null);
    const res = await fetch(`/api/saas/store/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setActionError(d.error ?? "No se pudo actualizar el pedido");
      return;
    }
    void loadOrders();
    if (selectedOrder?.id === orderId) void openOrderDetail(orderId);
  }

  async function openOrderDetail(orderId: string) {
    setOrderDetailLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/saas/store/orders/${orderId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setActionError(d.error ?? "No se pudo cargar el pedido");
        return;
      }
      const d = await res.json() as { order: StoreOrder };
      setSelectedOrder(d.order);
    } finally {
      setOrderDetailLoading(false);
    }
  }

  const revenue = orders
    .filter((o) => o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered")
    .reduce((s, o) => s + o.total, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="store" />}>
      <div className="flex flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="🛍️ Tienda Online" subtitle="Productos, pedidos e IVA EU configurables por tenant" />
          {tab === "productos" && <NelvyonDsButton onClick={() => setShowNew(true)}>+ Nuevo producto</NelvyonDsButton>}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile icon="📦" label="Productos activos" value={products.filter((p) => p.active).length} />
          <KpiTile icon="🧾" label="Pedidos totales" value={orders.length} />
          <KpiTile icon="✅" label="Pedidos cobrados" value={orders.filter((o) => ["paid", "processing", "shipped", "delivered"].includes(o.status)).length} />
          <KpiTile icon="💶" label="Revenue" value={`${revenue.toFixed(0)}€`} />
        </div>

        {actionError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{actionError}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["productos", "pedidos", "configuracion"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "configuracion" ? "Configuración" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab: Productos */}
        {tab === "productos" && (
          loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/30" />)}</div>
          ) : products.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">🛒</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin productos</p>
              <p className="mt-2 text-sm text-muted-foreground">Crea tu primer producto para empezar a vender</p>
              <NelvyonDsButton className="mt-5" onClick={() => setShowNew(true)}>+ Nuevo producto</NelvyonDsButton>
            </NelvyonDsCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(p => (
                <NelvyonDsCard key={p.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground text-sm leading-tight">{p.name}</p>
                    <NelvyonDsBadge tone={p.active ? "success" : "primary"}>{p.active ? "Activo" : "Inactivo"}</NelvyonDsBadge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="text-muted-foreground">Precio</p><p className="font-semibold text-foreground">{p.price}€</p></div>
                    <div><p className="text-muted-foreground">Stock</p><p className={`font-semibold ${p.stock === 0 ? "text-destructive" : "text-foreground"}`}>{p.stock}</p></div>
                    <div><p className="text-muted-foreground">Ventas</p><p className="font-semibold text-foreground">{p.salesCount}</p></div>
                  </div>
                  {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                  <div className="flex gap-2">
                    <NelvyonDsButton variant="ghost" className="flex-1 text-xs" onClick={() => setEditProduct(p)}>Editar</NelvyonDsButton>
                    <NelvyonDsButton variant="ghost" className="flex-1 text-xs" onClick={() => void toggleActive(p)}>{p.active ? "Desactivar" : "Activar"}</NelvyonDsButton>
                    <button type="button" onClick={() => void deleteProduct(p.id)} className="px-2 text-xs text-destructive hover:text-destructive/80">×</button>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}

        {/* Tab: Pedidos */}
        {tab === "pedidos" && (
          loading ? <div className="h-32 animate-pulse rounded-xl bg-muted/30" /> :
          orders.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">📦</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin pedidos</p>
              <p className="mt-2 text-sm text-muted-foreground">Los pedidos de tu tienda aparecerán aquí</p>
            </NelvyonDsCard>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/20">
                  <tr>{["Pedido", "Cliente", "Total", "IVA", "Envío", "Estado", "Fecha", "Acción"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <button type="button" className="font-mono text-xs text-primary hover:underline" onClick={() => void openOrderDetail(o.id)}>
                          {o.orderNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3"><p className="text-foreground">{o.customerName ?? "—"}</p><p className="text-xs text-muted-foreground">{o.customerEmail}</p></td>
                      <td className="px-4 py-3 font-semibold text-foreground">{o.total.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.vatAmount.toFixed(2)}€</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.shippingFee.toFixed(2)}€</td>
                      <td className="px-4 py-3"><NelvyonDsBadge tone={ORDER_STATUS_TONES[o.status] ?? "primary"}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</NelvyonDsBadge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("es-ES")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {STATUS_ACTIONS.filter((a) => a.from === o.status).map((a) => (
                            <button
                              key={`${a.from}-${a.to}`}
                              type="button"
                              onClick={() => void updateOrderStatus(o.id, a.to)}
                              className={`text-xs hover:underline ${a.to === "cancelled" ? "text-destructive" : "text-primary"}`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab: Configuración */}
        {tab === "configuracion" && (
          settings ? (
            <NelvyonDsCard className="p-6">
              <h3 className="mb-5 font-semibold text-foreground">Configuración de la tienda</h3>
              <SettingsPanel settings={settings} onSaved={setSettings} />
            </NelvyonDsCard>
          ) : (
            <NelvyonDsCard className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No se pudo cargar la configuración. Comprueba permisos `settings.read`.</p>
              <NelvyonDsButton className="mt-4" variant="secondary" onClick={() => void loadSettings()}>Reintentar</NelvyonDsButton>
            </NelvyonDsCard>
          )
        )}
      </div>

      {showNew && <ProductModal onClose={() => setShowNew(false)} onSaved={loadProducts} />}
      {editProduct && <ProductModal product={editProduct} onClose={() => setEditProduct(null)} onSaved={() => { void loadProducts(); setEditProduct(null); }} />}
      {(selectedOrder || orderDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {orderDetailLoading ? "Cargando pedido…" : `Pedido ${selectedOrder?.orderNumber}`}
              </h2>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            {selectedOrder && !orderDetailLoading && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <NelvyonDsBadge tone={ORDER_STATUS_TONES[selectedOrder.status] ?? "primary"}>
                    {ORDER_STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                  </NelvyonDsBadge>
                  <span className="text-xs text-muted-foreground">{selectedOrder.customerEmail}</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Artículo</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="px-3 py-4 text-center text-xs text-muted-foreground">Sin líneas de pedido</td></tr>
                      ) : (
                        selectedOrder.items!.map((it) => (
                          <tr key={it.id} className="border-t border-border/50">
                            <td className="px-3 py-2">
                              <p className="text-foreground">{it.productName}</p>
                              {it.variantName && <p className="text-xs text-muted-foreground">{it.variantName}</p>}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{it.quantity}</td>
                            <td className="px-3 py-2 text-right text-foreground">{it.totalPrice.toFixed(2)}€</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{selectedOrder.subtotal.toFixed(2)}€</span></p>
                  <p className="flex justify-between text-muted-foreground"><span>IVA</span><span>{selectedOrder.vatAmount.toFixed(2)}€</span></p>
                  <p className="flex justify-between text-muted-foreground"><span>Envío</span><span>{selectedOrder.shippingFee.toFixed(2)}€</span></p>
                  <p className="flex justify-between font-semibold text-foreground"><span>Total</span><span>{selectedOrder.total.toFixed(2)}€</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ACTIONS.filter((a) => a.from === selectedOrder.status).map((a) => (
                    <NelvyonDsButton
                      key={`${a.from}-${a.to}`}
                      variant={a.to === "cancelled" ? "ghost" : "secondary"}
                      className="text-xs"
                      onClick={() => void updateOrderStatus(selectedOrder.id, a.to)}
                    >
                      {a.label}
                    </NelvyonDsButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SaasShellLayout>
  );
}

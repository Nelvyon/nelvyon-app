"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type ProductType = "service" | "physical" | "digital" | "subscription";

interface Product {
  id: string;
  name: string;
  description: string;
  type: ProductType;
  price: number;
  currency: string;
  sku: string | null;
  stock: number | null;
  active: boolean;
  imageUrl: string | null;
  salesCount: number;
  revenue: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<ProductType, { label: string; icon: string }> = {
  service: { label: "Servicio", icon: "🔧" },
  physical: { label: "Físico", icon: "📦" },
  digital: { label: "Digital", icon: "💾" },
  subscription: { label: "Suscripción", icon: "🔄" },
};

const MOCK: Product[] = [
  { id: "p1", name: "Pack Marketing Starter", description: "Gestión básica de redes sociales + email mensual", type: "subscription", price: 299, currency: "EUR", sku: "MKT-STR-M", stock: null, active: true, imageUrl: null, salesCount: 23, revenue: 6877, createdAt: "2026-01-10T10:00:00Z" },
  { id: "p2", name: "Auditoría SEO Completa", description: "Análisis completo de posicionamiento web + informe detallado", type: "service", price: 450, currency: "EUR", sku: "SEO-AUD", stock: null, active: true, imageUrl: null, salesCount: 11, revenue: 4950, createdAt: "2026-02-15T10:00:00Z" },
  { id: "p3", name: "Guía Email Marketing 2026", description: "Ebook descargable con 80 templates y estrategias", type: "digital", price: 29, currency: "EUR", sku: "GEM-2026", stock: null, active: true, imageUrl: null, salesCount: 187, revenue: 5423, createdAt: "2026-03-01T10:00:00Z" },
  { id: "p4", name: "Sesión Estrategia 1h", description: "Consultoría estratégica de marketing personalizada", type: "service", price: 120, currency: "EUR", sku: "CONS-1H", stock: null, active: true, imageUrl: null, salesCount: 34, revenue: 4080, createdAt: "2026-04-10T10:00:00Z" },
  { id: "p5", name: "Pack Landing + Funnel", description: "Diseño y configuración de landing page + embudo completo", type: "service", price: 1800, currency: "EUR", sku: "LND-FNL", stock: null, active: false, imageUrl: null, salesCount: 5, revenue: 9000, createdAt: "2026-01-20T10:00:00Z" },
];

function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [type, setType] = useState<ProductType>(product?.type ?? "service");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{product ? "Editar producto" : "Nuevo producto"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as ProductType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {(Object.keys(TYPE_CONFIG) as ProductType[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Precio (€) *</label>
              <input type="number" min={0} step={0.01} value={price} onChange={e => setPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">SKU / Referencia</label>
            <input value={sku} onChange={e => setSku(e.target.value)} placeholder="Ej: MKT-STR-001"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name} className="flex-1">{saving ? "Guardando…" : "Guardar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasProductosPage() {
  const [products, setProducts] = useState<Product[]>(MOCK);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [filterType, setFilterType] = useState<ProductType | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = products.filter(p => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  const totalSales = products.reduce((s, p) => s + p.salesCount, 0);

  function toggleActive(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="productos" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Productos & Catálogo" subtitle="Gestiona tus servicios y productos para facturar desde el CRM" />
              <NelvyonDsButton onClick={() => { setEditingProduct(undefined); setShowModal(true); }}>+ Nuevo producto</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Productos activos", value: products.filter(p => p.active).length },
                { label: "Total ventas", value: totalSales },
                { label: "Ingresos totales", value: `€${totalRevenue.toLocaleString("es-ES")}` },
                { label: "Ticket medio", value: totalSales > 0 ? `€${Math.round(totalRevenue / totalSales)}` : "—" },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…"
                className="h-9 flex-1 min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none" />
              <div className="flex gap-1.5">
                <button onClick={() => setFilterType("all")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>Todos</button>
                {(Object.keys(TYPE_CONFIG) as ProductType[]).map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
                    {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(p => (
                <NelvyonDsCard key={p.id} className={`flex flex-col p-4 transition-colors ${!p.active ? "opacity-60" : "hover:border-primary/30"}`}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{TYPE_CONFIG[p.type].icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_CONFIG[p.type].label}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleActive(p.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${p.active ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${p.active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{p.description}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">€{p.price.toLocaleString("es-ES")}</p>
                      <p className="text-xs text-muted-foreground">{p.type === "subscription" ? "/mes" : "unidad"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{p.salesCount} ventas</p>
                      <p className="text-xs text-muted-foreground">€{p.revenue.toLocaleString("es-ES")} total</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <NelvyonDsButton variant="ghost" className="flex-1 text-xs" onClick={() => { setEditingProduct(p); setShowModal(true); }}>✎ Editar</NelvyonDsButton>
                    <NelvyonDsButton className="flex-1 text-xs">+ Factura</NelvyonDsButton>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
      {showModal && <ProductModal product={editingProduct} onClose={() => setShowModal(false)} />}
    </SaasShellLayout>
  );
}

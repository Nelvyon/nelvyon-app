"use client";

/**
 * /saas/store sobre las pantallas `ecom-product-list` (productos) y
 * `ecom-product-order` (pedidos) de la plantilla oficial W3CRM, con `Modal` y
 * `form-control` de react-bootstrap para alta, edicion y ajustes.
 *
 * Productos: tarjetas de `(ecommerce)/ecom-product-list/page.jsx` — `card` >
 * `card-body`, precio en `p.price`, disponibilidad con
 * `<i className="fa fa-check-circle text-success" />` y datos en `span.item`.
 *
 * Pedidos: tabla de `(ecommerce)/ecom-product-order/page.jsx` tal cual —
 * `table table-sm mb-0 table-responsive-lg`, `thead` en `text-white bg-primary`,
 * filas `btn-reveal-trigger`, celdas `py-2`, badges `badge badge-sm badge-*`
 * con `<span className="ms-1 fa fa-check">`, importes en `text-end font-w600`,
 * selector maestro `chackboxFun` y dropdown de tres puntos
 * `btn btn-primary i-false tp-btn-light sharp`.
 *
 * Logica de NELVYON intacta: los cinco tipos, las tres pestanas,
 * `ORDER_STATUS_LABELS`, `ORDER_STATUS_TONES`, `STATUS_ACTIONS`,
 * `ProductModal`, `SettingsPanel`, los diez `useState`, `loadProducts`,
 * `loadOrders`, `loadSettings`, `toggleActive`, `deleteProduct`,
 * `updateOrderStatus`, `openOrderDetail`, el calculo de revenue y los cinco
 * endpoints.
 */
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Dropdown, Modal, Nav, Tab } from "react-bootstrap";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";

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
/** Tonos traducidos a las clases de badge de W3CRM. */
const ORDER_STATUS_TONES: Record<string, string> = {
  pending: "badge-warning", paid: "badge-success", processing: "badge-primary",
  shipped: "badge-primary", delivered: "badge-success", cancelled: "badge-danger", refunded: "badge-secondary",
};

const STATUS_ACTIONS: Array<{ from: string; to: string; label: string }> = [
  { from: "pending", to: "paid", label: "→ Marcar pagado" },
  { from: "pending", to: "cancelled", label: "Cancelar" },
  { from: "paid", to: "processing", label: "→ Procesar" },
  { from: "processing", to: "shipped", label: "→ Enviar" },
  { from: "shipped", to: "delivered", label: "→ Entregado" },
];

/** Un estado fuera de los siete conocidos no puede tumbar la tabla. */
function estadoPedido(status: string): { label: string; clase: string } {
  return {
    label: ORDER_STATUS_LABELS[status] ?? status ?? "Desconocido",
    clase: ORDER_STATUS_TONES[status] ?? "badge-secondary",
  };
}

/** Importes que pueden llegar ausentes en un payload degradado. */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtFecha(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

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
    <Modal className="modal fade" show onHide={onClose} centered>
      <div className="modal-header">
        <h5 className="modal-title">{product ? "Editar producto" : "Nuevo producto"}</h5>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
      </div>
      <div className="modal-body">
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={save} data-testid="form-producto">
          <div className="row">
            <div className="col-12 mb-3">
              <label className="form-label" htmlFor="prod-nombre">Nombre *</label>
              <input id="prod-nombre" className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-precio">Precio (€)</label>
              <input id="prod-precio" type="number" min="0" step="0.01" className="form-control" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-tipo">Tipo</label>
              <select id="prod-tipo" className="form-control" value={type} onChange={e => setType(e.target.value)}>
                <option value="physical">Físico</option><option value="digital">Digital</option>
                <option value="service">Servicio</option><option value="subscription">Suscripción</option>
              </select>
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-sku">SKU</label>
              <input id="prod-sku" className="form-control" value={sku} onChange={e => setSku(e.target.value)} placeholder="PROD-001" />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-stock">Stock</label>
              <input id="prod-stock" type="number" min="0" className="form-control" value={stock} onChange={e => setStock(e.target.value)} />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-slug">Slug (URL)</label>
              <input id="prod-slug" className="form-control" value={slug} onChange={e => setSlug(e.target.value)} placeholder="mi-producto" />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="prod-categoria">Categoría</label>
              <input id="prod-categoria" className="form-control" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ropa, Electrónica…" />
            </div>
            <div className="col-12 mb-3">
              <label className="form-label" htmlFor="prod-desc">Descripción</label>
              <textarea id="prod-desc" className="form-control" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-primary light" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando…" : product ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────
function SettingsPanel({ settings, onSaved }: { settings: StoreSettings; onSaved: (s: StoreSettings) => void }) {
  // `?? ` en cada campo: `settings` puede llegar incompleto y `String(undefined)`
  // pintaba "undefined" en los inputs.
  const [vatPct, setVatPct] = useState(String(settings.vatPct ?? 21));
  const [vatIncluded, setVatIncluded] = useState(Boolean(settings.vatIncluded));
  const [currency, setCurrency] = useState(settings.currency ?? "EUR");
  const [shippingFee, setShippingFee] = useState(String(settings.shippingFee ?? 0));
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
      if (d.settings) onSaved(d.settings);
      setOk(true); setTimeout(() => setOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} data-testid="form-ajustes">
      <div className="row">
        <div className="col-12 mb-3">
          <label className="form-label" htmlFor="cfg-nombre">Nombre de la tienda</label>
          <input id="cfg-nombre" className="form-control" value={storeName} onChange={e => setStoreName(e.target.value)} />
        </div>
        <div className="col-sm-6 mb-3">
          <label className="form-label" htmlFor="cfg-moneda">Moneda</label>
          <select id="cfg-moneda" className="form-control" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="col-sm-6 mb-3">
          <label className="form-label" htmlFor="cfg-iva">IVA / VAT (%)</label>
          <input id="cfg-iva" type="number" min="0" max="100" step="0.1" className="form-control" value={vatPct} onChange={e => setVatPct(e.target.value)} />
        </div>
        <div className="col-12 mb-3">
          <div className="form-check custom-checkbox checkbox-success">
            <input type="checkbox" id="vatIncluded" className="form-check-input" checked={vatIncluded} onChange={e => setVatIncluded(e.target.checked)} />
            <label className="form-check-label" htmlFor="vatIncluded">IVA ya incluido en el precio (price includes VAT)</label>
          </div>
        </div>
        <div className="col-sm-6 mb-3">
          <label className="form-label" htmlFor="cfg-envio">Gastos de envío (€)</label>
          <input id="cfg-envio" type="number" min="0" step="0.01" className="form-control" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
        </div>
        <div className="col-sm-6 mb-3">
          <label className="form-label" htmlFor="cfg-gratis">Envío gratis a partir de (€)</label>
          <input id="cfg-gratis" type="number" min="0" step="0.01" className="form-control" value={freeAbove} onChange={e => setFreeAbove(e.target.value)} placeholder="—" />
        </div>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <div className="d-flex align-items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</button>
        {ok && <span className="text-success">✓ Guardado</span>}
      </div>
      <p className="text-muted fs-13 mt-3 mb-0">
        Los países de la UE aplican IVA según la directiva EU VAT 2021. Configura el % correcto para tu país de
        origen (España: 21%, Alemania: 19%, Francia: 20%…).
      </p>
    </form>
  );
}

/** Dropdown de acciones por fila — `DropdonBlog` de la plantilla. */
function AccionesPedido({ order, onDetalle }: { order: StoreOrder; onDetalle: () => void }) {
  return (
    <Dropdown className="text-sans-serif">
      <Dropdown.Toggle as="div" variant="" className="i-false">
        <button className="btn btn-primary i-false tp-btn-light sharp" type="button" aria-label={`Acciones del pedido ${order.orderNumber}`}>
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 24 24" version="1.1">
              <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                <rect x="0" y="0" width="24" height="24"></rect>
                <circle fill="#000000" cx="12" cy="5" r="2"></circle>
                <circle fill="#000000" cx="12" cy="12" r="2"></circle>
                <circle fill="#000000" cx="12" cy="19" r="2"></circle>
              </g>
            </svg>
          </span>
        </button>
      </Dropdown.Toggle>
      <Dropdown.Menu className="dropdown-menu-right border py-0" align="end">
        <div className="py-2">
          <Link className="dropdown-item" href="#" scroll={false} onClick={(e) => { e.preventDefault(); onDetalle(); }}>
            Ver detalle
          </Link>
        </div>
      </Dropdown.Menu>
    </Dropdown>
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
    setProducts(Array.isArray(d.products) ? d.products : []);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/saas/store/orders");
    const d = await res.json() as { orders?: StoreOrder[] };
    setOrders(Array.isArray(d.orders) ? d.orders : []);
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
      if (d.order) setSelectedOrder(d.order);
    } finally {
      setOrderDetailLoading(false);
    }
  }

  const revenue = orders
    .filter((o) => o.status === "paid" || o.status === "processing" || o.status === "shipped" || o.status === "delivered")
    .reduce((s, o) => s + num(o.total), 0);

  /** Selector maestro de la plantilla (`chackboxFun`). */
  const chackboxFun = (type: string) => {
    setTimeout(() => {
      const chackbox = document.querySelectorAll<HTMLInputElement>(".product_order");
      const motherChackBox = document.querySelector<HTMLInputElement>(".product_order_single");
      if (!motherChackBox) return;
      for (let i = 0; i < chackbox.length; i++) {
        const element = chackbox[i];
        if (!element) continue;
        if (type === "all") {
          element.checked = motherChackBox.checked;
        } else if (!element.checked) {
          motherChackBox.checked = false;
          break;
        } else {
          motherChackBox.checked = true;
        }
      }
    }, 100);
  };

  const PESTANAS: Array<{ id: Tab; label: string }> = [
    { id: "productos", label: "Productos" },
    { id: "pedidos", label: "Pedidos" },
    { id: "configuracion", label: "Configuración" },
  ];

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Tienda Online" parentTitle="Gestión" pageTitle="Tienda" />
      <div className="h-80">
        <div className="container-fluid">
          {/* KPIs */}
          <div className="row">
            {[
              { label: "Productos activos", value: String(products.filter((p) => p.active).length) },
              { label: "Pedidos totales", value: String(orders.length) },
              { label: "Pedidos cobrados", value: String(orders.filter((o) => ["paid", "processing", "shipped", "delivered"].includes(o.status)).length) },
              { label: "Revenue", value: `${revenue.toFixed(0)}€` },
            ].map(({ label, value }) => (
              <div className="col-xl-3 col-sm-6" key={label}>
                <div className="card">
                  <div className="card-body">
                    <span className="d-block text-muted fs-13 text-uppercase mb-1">{label}</span>
                    <h3 className="mb-0">{value}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {actionError && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {actionError}
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setActionError(null)} />
            </div>
          )}

          <div className="row">
            <div className="col-lg-12">
              <div className="card">
                <Tab.Container activeKey={tab} onSelect={(k) => setTab((k as Tab) ?? "productos")}>
                  <div className="card-header">
                    <Nav as="ul" className="nav nav-pills mix-chart-tab" role="tablist">
                      {PESTANAS.map((p) => (
                        <Nav.Item as="li" className="nav-item" key={p.id} role="presentation">
                          <Nav.Link as="button" type="button" className="nav-link" eventKey={p.id}>
                            {p.label}
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                    {tab === "productos" && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
                        + Nuevo producto
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <Tab.Content>
                      {/* ── Productos — tarjetas de `ecom-product-list` ── */}
                      <Tab.Pane eventKey="productos">
                        {loading ? (
                          <div className="d-flex align-items-center justify-content-center py-5" role="status">
                            <div className="spinner-border text-primary me-3" aria-hidden="true" />
                            <span className="text-muted">Cargando…</span>
                          </div>
                        ) : products.length === 0 ? (
                          <div className="text-center py-5">
                            <h5 className="mb-1">Sin productos</h5>
                            <p className="mb-3 text-muted fs-14">Crea tu primer producto para empezar a vender.</p>
                            <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
                              + Nuevo producto
                            </button>
                          </div>
                        ) : (
                          <div className="row" data-testid="grid-productos">
                            {products.map((p) => (
                              <div className="col-xl-4 col-lg-6 col-sm-6" key={p.id}>
                                <div className="card">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <h4 className="card-title mb-0">{p.name}</h4>
                                      <span className={`badge badge-sm ${p.active ? "badge-success" : "badge-secondary"}`}>
                                        {p.active ? "Activo" : "Inactivo"}
                                      </span>
                                    </div>
                                    {p.description && <p className="text-muted fs-13">{p.description}</p>}
                                    <p className="price">{num(p.price).toFixed(2)}€</p>
                                    <p>
                                      Disponibilidad:{" "}
                                      <span className="item">
                                        {num(p.stock) > 0 ? (
                                          <Fragment>
                                            {num(p.stock)} en stock <i className="fa fa-check-circle text-success" />
                                          </Fragment>
                                        ) : (
                                          <Fragment>
                                            Sin stock <i className="fa fa-times-circle text-danger" />
                                          </Fragment>
                                        )}
                                      </span>
                                    </p>
                                    {p.sku && <p>Código de producto: <span className="item">{p.sku}</span></p>}
                                    {p.category && <p>Categoría: <span className="item">{p.category}</span></p>}
                                    <p>Ventas: <span className="item">{num(p.salesCount)}</span></p>
                                    <div className="d-flex flex-wrap gap-2">
                                      <button type="button" className="btn btn-primary light btn-sm" onClick={() => setEditProduct(p)}>
                                        Editar
                                      </button>
                                      <button type="button" className="btn btn-primary light btn-sm" onClick={() => void toggleActive(p)}>
                                        {p.active ? "Desactivar" : "Activar"}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-danger light btn-sm"
                                        aria-label={`Eliminar ${p.name}`}
                                        onClick={() => void deleteProduct(p.id)}
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Tab.Pane>

                      {/* ── Pedidos — tabla de `ecom-product-order` ── */}
                      <Tab.Pane eventKey="pedidos">
                        {loading ? (
                          <div className="d-flex align-items-center justify-content-center py-5" role="status">
                            <div className="spinner-border text-primary me-3" aria-hidden="true" />
                            <span className="text-muted">Cargando…</span>
                          </div>
                        ) : orders.length === 0 ? (
                          <div className="text-center py-5">
                            <h5 className="mb-1">Sin pedidos</h5>
                            <p className="mb-0 text-muted fs-14">Los pedidos de tu tienda aparecerán aquí.</p>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm mb-0 table-responsive-lg ">
                              <thead className="text-white bg-primary">
                                <tr>
                                  <th className="align-middle">
                                    <div className="form-check custom-checkbox checkbox-success">
                                      <input
                                        type="checkbox"
                                        className="form-check-input  product_order_single"
                                        id="checkAll"
                                        aria-label="Seleccionar todos los pedidos"
                                        onClick={() => chackboxFun("all")}
                                      />
                                    </div>
                                  </th>
                                  <th className="align-middle">Pedido</th>
                                  <th className="align-middle pr-7">Fecha</th>
                                  <th className="align-middle minw200">Cliente</th>
                                  <th className="align-middle text-end">Estado</th>
                                  <th className="align-middle text-end">Total</th>
                                  <th className="no-sort text-end">Acción</th>
                                </tr>
                              </thead>
                              <tbody id="orders">
                                {orders.map((o) => {
                                  const sc = estadoPedido(o.status);
                                  return (
                                    <tr className="btn-reveal-trigger" key={o.id}>
                                      <td className="py-2">
                                        <div className="form-check custom-checkbox checkbox-success">
                                          <input
                                            type="checkbox"
                                            className="form-check-input product_order"
                                            aria-label={`Seleccionar pedido ${o.orderNumber}`}
                                            onClick={() => chackboxFun("")}
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2">
                                        <Link href="#" scroll={false} onClick={(e) => { e.preventDefault(); void openOrderDetail(o.id); }}>
                                          <strong>#{o.orderNumber}</strong>
                                        </Link>
                                        <br />
                                        <span className="text-muted fs-13">
                                          IVA {num(o.vatAmount).toFixed(2)}€ · Envío {num(o.shippingFee).toFixed(2)}€
                                        </span>
                                      </td>
                                      <td className="py-2">{fmtFecha(o.createdAt)}</td>
                                      <td className="py-2">
                                        {o.customerName ?? "—"}
                                        <p className="mb-0 text-500">{o.customerEmail}</p>
                                      </td>
                                      <td className="py-2 text-end">
                                        <span className={`badge badge-sm ${sc.clase}`}>
                                          {sc.label}
                                          <span className="ms-1 fa fa-check" />
                                        </span>
                                        <div className="d-flex flex-column align-items-end mt-1">
                                          {STATUS_ACTIONS.filter((a) => a.from === o.status).map((a) => (
                                            <button
                                              key={`${a.from}-${a.to}`}
                                              type="button"
                                              className={`btn btn-sm p-0 border-0 bg-transparent fs-13 ${a.to === "cancelled" ? "text-danger" : "text-primary"}`}
                                              onClick={() => void updateOrderStatus(o.id, a.to)}
                                            >
                                              {a.label}
                                            </button>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2 text-end font-w600">{num(o.total).toFixed(2)}€</td>
                                      <td className="py-2 text-end">
                                        <AccionesPedido order={o} onDetalle={() => void openOrderDetail(o.id)} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </Tab.Pane>

                      {/* ── Configuración ── */}
                      <Tab.Pane eventKey="configuracion">
                        {settings ? (
                          <SettingsPanel settings={settings} onSaved={setSettings} />
                        ) : (
                          <div className="text-center py-5">
                            <h5 className="mb-1">Sin configuración</h5>
                            <p className="mb-3 text-muted fs-14">
                              No se pudo cargar la configuración. Comprueba permisos <code>settings.read</code>.
                            </p>
                            <button type="button" className="btn btn-primary light" onClick={() => void loadSettings()}>
                              Reintentar
                            </button>
                          </div>
                        )}
                      </Tab.Pane>
                    </Tab.Content>
                  </div>
                </Tab.Container>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNew && <ProductModal onClose={() => setShowNew(false)} onSaved={loadProducts} />}
      {editProduct && (
        <ProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { void loadProducts(); setEditProduct(null); }}
        />
      )}

      {/* Detalle de pedido */}
      {(selectedOrder || orderDetailLoading) && (
        <Modal className="modal fade" show onHide={() => setSelectedOrder(null)} centered>
          <div className="modal-header">
            <h5 className="modal-title">
              {orderDetailLoading ? "Cargando pedido…" : `Pedido ${selectedOrder?.orderNumber ?? ""}`}
            </h5>
            <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)} aria-label="Cerrar" />
          </div>
          <div className="modal-body">
            {orderDetailLoading ? (
              <div className="d-flex align-items-center justify-content-center py-4" role="status">
                <div className="spinner-border text-primary me-3" aria-hidden="true" />
                <span className="text-muted">Cargando…</span>
              </div>
            ) : selectedOrder ? (
              <Fragment>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className={`badge badge-sm ${estadoPedido(selectedOrder.status).clase}`}>
                    {estadoPedido(selectedOrder.status).label}
                    <span className="ms-1 fa fa-check" />
                  </span>
                  <span className="text-muted fs-13">{selectedOrder.customerEmail}</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-border">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th className="center">Cant.</th>
                        <th className="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-muted fs-13">Sin líneas de pedido</td></tr>
                      ) : (
                        (selectedOrder.items ?? []).map((it) => (
                          <tr key={it.id}>
                            <td className="left strong">
                              {it.productName}
                              {it.variantName && <p className="mb-0 text-500">{it.variantName}</p>}
                            </td>
                            <td className="center">{num(it.quantity)}</td>
                            <td className="right">{num(it.totalPrice).toFixed(2)}€</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <table className="table table-clear">
                  <tbody>
                    <tr><td className="left"><strong>Subtotal</strong></td><td className="right">{num(selectedOrder.subtotal).toFixed(2)}€</td></tr>
                    <tr><td className="left"><strong>IVA</strong></td><td className="right">{num(selectedOrder.vatAmount).toFixed(2)}€</td></tr>
                    <tr><td className="left"><strong>Envío</strong></td><td className="right">{num(selectedOrder.shippingFee).toFixed(2)}€</td></tr>
                    <tr><td className="left"><strong>Total</strong></td><td className="right"><strong>{num(selectedOrder.total).toFixed(2)}€</strong></td></tr>
                  </tbody>
                </table>
                <div className="d-flex flex-wrap gap-2">
                  {STATUS_ACTIONS.filter((a) => a.from === selectedOrder.status).map((a) => (
                    <button
                      key={`${a.from}-${a.to}`}
                      type="button"
                      className={`btn btn-sm ${a.to === "cancelled" ? "btn-danger light" : "btn-primary light"}`}
                      onClick={() => void updateOrderStatus(selectedOrder.id, a.to)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </Fragment>
            ) : null}
          </div>
        </Modal>
      )}
    </SaasW3crmShell>
  );
}

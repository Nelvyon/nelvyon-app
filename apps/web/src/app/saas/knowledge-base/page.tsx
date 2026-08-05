"use client";

/**
 * /saas/knowledge-base sobre la pantalla oficial `(cms)/blog` de W3CRM, que es
 * la equivalente: articulos con categorias, filtro y listado.
 *
 * Marcado de la plantilla, tal cual:
 *   - caja de filtro `filter cm-content-box box-primary` > `content-title`
 *     (`cpa` con icono + `tools` con el `SlideToolHeader` que alterna
 *     `collapse`/`expand`) > `<Collapse>` > `cm-content-body form excerpt` >
 *     `card-body pb-3` > `row` con sus celdas y los botones
 *     `btn btn-primary` / `btn btn-danger light`;
 *   - barra de acciones `mb-3` > `ul.d-flex align-items-center flex-wrap` > `li`;
 *   - caja de listado con `table table-responsive-lg table-striped
 *     table-condensed flip-content` dentro de `table-responsive` >
 *     `#blog_wrapper.dataTables_wrapper.no-footer`, con el pie
 *     `dataTables_info` + `dataTables_paginate paging_simple_numbers` y su
 *     paginacion de 5 por pagina;
 *   - los dos formularios usan el `<Modal>` de la plantilla (ver
 *     `(apps)/app-profile`): `modal fade` > `modal-content` > `modal-header`
 *     con `h5.modal-title` y `btn-close` > `modal-body` > `row` >
 *     `col-lg-*` > `form-group mb-3` con `label.text-black.font-w600`.
 *
 * Adaptacion de la fila de filtro: la plantilla trae cuatro celdas (titulo,
 * select, fecha, botones). NELVYON no filtra por fecha —`/api/saas/knowledge-base`
 * no acepta ese parametro— asi que se dejan tres celdas `col-xl-4 col-sm-6` en
 * vez de cuatro `col-xl-3`. Inventar un filtro de fecha seria anadir logica que
 * el backend no soporta.
 *
 * El selector de categoria sustituye a las pastillas de categoria de la version
 * anterior: es el mismo estado `filterCategory` y muestra el mismo recuento por
 * categoria, con el control que la plantilla ya trae. No se duplica el mismo
 * filtro en dos sitios.
 *
 * Logica de NELVYON intacta: `GET /api/saas/knowledge-base` y
 * `GET ?resource=categories`, y el `POST` con sus acciones (`create` implicito,
 * `update`, `delete`, `create-category`); los tipos `KbArticle` y `KbCategory`,
 * `load`, `deleteArticle`, `togglePublish`, el filtrado por categoria y por
 * texto, y los calculos `totalViews`, `withVotes` y `avgHelpful`.
 *
 * Guardas: respuestas sin `articles`/`categories` -> listas vacias; contadores
 * nulos o en texto normalizados con `num()`; fechas invalidas -> "—"; textos
 * ausentes -> cadena vacia antes de `toLowerCase()`.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Collapse from "react-bootstrap/Collapse";
import Modal from "react-bootstrap/Modal";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";

interface KbCategory {
  id: string; name: string; icon: string; slug: string; sortOrder: number; articleCount: number;
}
interface KbArticle {
  id: string; categoryId: string | null; categoryName: string | null;
  title: string; slug: string; content: string; excerpt: string;
  published: boolean; views: number; helpful: number; notHelpful: number;
  createdAt: string; updatedAt: string;
}

/** Contadores que pueden llegar nulos o como texto. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}

// ── Editor de articulo, sobre el `<Modal>` de la plantilla ────────────────────
function ArticleEditor({ article, categories, onClose, onSaved }: {
  article?: KbArticle; categories: KbCategory[];
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { setError("Título y contenido son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const body = article
        ? { action: "update", id: article.id, title: title.trim(), content: content.trim(), categoryId: categoryId || null, published }
        : { title: title.trim(), content: content.trim(), categoryId: categoryId || null, published };
      const res = await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al guardar artículo"); return; }
      onSaved(); onClose();
    } catch {
      setError("Error al guardar artículo");
    } finally { setSaving(false); }
  }

  return (
    <Modal className="modal fade" show onHide={onClose} centered size="lg">
      <div className="modal-content" data-testid="editor-articulo">
        <div className="modal-header">
          <h5 className="modal-title">{article ? "Editar artículo" : "Nuevo artículo"}</h5>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div>}
          <form onSubmit={save}>
            <div className="row">
              <div className="col-lg-8">
                <div className="form-group mb-3">
                  <label htmlFor="kb-titulo" className="text-black font-w600">Título <span className="required">*</span></label>
                  <input id="kb-titulo" type="text" className="form-control" placeholder="Ej: Cómo configurar tu primera campaña"
                    value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              </div>
              <div className="col-lg-4">
                <div className="form-group mb-3">
                  <label htmlFor="kb-categoria" className="text-black font-w600">Categoría</label>
                  <select id="kb-categoria" className="form-control" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-lg-12">
                <div className="form-group mb-3">
                  <label htmlFor="kb-contenido" className="text-black font-w600">Contenido <span className="required">*</span></label>
                  <textarea id="kb-contenido" className="form-control" rows={12}
                    placeholder="# Título&#10;&#10;Escribe tu artículo aquí..."
                    value={content} onChange={(e) => setContent(e.target.value)} />
                  <div className="form-text">Markdown soportado.</div>
                </div>
              </div>
              <div className="col-lg-12">
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="kb-publicado"
                    checked={published} onChange={(e) => setPublished(e.target.checked)} />
                  <label className="form-check-label" htmlFor="kb-publicado">Publicar (visible para clientes)</label>
                </div>
              </div>
              <div className="col-lg-12">
                <div className="text-end">
                  <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar artículo"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

// ── Alta de categoria ─────────────────────────────────────────────────────────
function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/knowledge-base", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-category", name: name.trim(), icon }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      onSaved(); onClose();
    } catch {
      setError("Error al crear la categoría");
    } finally { setSaving(false); }
  }

  return (
    <Modal className="modal fade" show onHide={onClose} centered>
      <div className="modal-content" data-testid="modal-categoria">
        <div className="modal-header">
          <h5 className="modal-title">Nueva categoría</h5>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div>}
          <form onSubmit={save}>
            <div className="row">
              <div className="col-lg-4">
                <div className="form-group mb-3">
                  <label htmlFor="kb-cat-icono" className="text-black font-w600">Icono</label>
                  <input id="kb-cat-icono" type="text" className="form-control text-center" maxLength={4}
                    value={icon} onChange={(e) => setIcon(e.target.value)} />
                </div>
              </div>
              <div className="col-lg-8">
                <div className="form-group mb-3">
                  <label htmlFor="kb-cat-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
                  <input id="kb-cat-nombre" type="text" className="form-control" placeholder="Primeros pasos"
                    value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div className="col-lg-12">
                <div className="text-end">
                  <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Guardando…" : "Crear"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default function SaasKnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editing, setEditing] = useState<KbArticle | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [openFiltro, setOpenFiltro] = useState(true);
  const [openLista, setOpenLista] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/saas/knowledge-base"),
        fetch("/api/saas/knowledge-base?resource=categories"),
      ]);
      if (aRes.ok) {
        const d = (await aRes.json().catch(() => ({}))) as { articles?: KbArticle[] };
        setArticles(Array.isArray(d.articles) ? d.articles : []);
      }
      if (cRes.ok) {
        const d = (await cRes.json().catch(() => ({}))) as { categories?: KbCategory[] };
        setCategories(Array.isArray(d.categories) ? d.categories : []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deleteArticle(id: string) {
    const r = await Alert.fire({
      title: "¿Eliminar artículo?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    void load();
  }

  async function togglePublish(article: KbArticle) {
    await fetch("/api/saas/knowledge-base", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id: article.id, published: !article.published }) });
    void load();
  }

  const filtered = articles.filter((a) => {
    if (filterCategory !== "all" && a.categoryId !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const titulo = (a.title ?? "").toLowerCase();
      const extracto = (a.excerpt ?? "").toLowerCase();
      if (!titulo.includes(q) && !extracto.includes(q)) return false;
    }
    return true;
  });

  const totalViews = articles.reduce((s, a) => s + num(a.views), 0);
  const withVotes = articles.filter((a) => num(a.helpful) + num(a.notHelpful) > 0);
  const avgHelpful = withVotes.length > 0
    ? withVotes.reduce((s, a) => s + (num(a.helpful) / (num(a.helpful) + num(a.notHelpful))) * 100, 0) / withVotes.length
    : 0;

  // Paginacion de la plantilla: 5 registros por pagina.
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPage = 5;
  const lastIndex = currentPage * recordsPage;
  const firstIndex = lastIndex - recordsPage;
  const records = filtered.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(filtered.length / recordsPage));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }
  // Al cambiar de filtro la pagina actual puede quedar fuera de rango.
  useEffect(() => { setCurrentPage(1); }, [filterCategory, search]);

  const cabecera = (icono: string, titulo: string, abierto: boolean, alternar: () => void) => (
    <div className="content-title">
      <div className="cpa">
        <i className={`${icono} me-2`} />{titulo}
      </div>
      <div className="tools">
        <Link
          href="#"
          scroll={false}
          className={`SlideToolHeader ${abierto ? "collapse" : "expand"}`}
          role="button"
          aria-expanded={abierto}
          aria-label={`Plegar ${titulo}`}
          onClick={(e) => { e.preventDefault(); alternar(); }}
        >
          <i className="fas fa-angle-up" />
        </Link>
      </div>
    </div>
  );

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Base de Conocimiento" parentTitle="Gestión" pageTitle="Base de Conocimiento" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Artículos publicados" value={articles.filter((a) => a.published).length} accent />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Total lecturas" value={totalViews.toLocaleString("es-ES")} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="% útil" value={`${Math.round(avgHelpful)}%`} />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Categorías" value={categories.length} />
          </div>

          <div className="col-xl-12">
            {/* Filtro */}
            <div className="filter cm-content-box box-primary">
              {cabecera("fas fa-filter", "Filtro", openFiltro, () => setOpenFiltro(!openFiltro))}
              <Collapse in={openFiltro}>
                <div className="cm-content-body form excerpt">
                  <div className="card-body pb-3">
                    <div className="row">
                      <div className="col-xl-4 col-sm-6">
                        <label className="visually-hidden" htmlFor="kb-buscar">Buscar artículo</label>
                        <input
                          id="kb-buscar"
                          type="text"
                          className="form-control mb-3 mb-xl-0"
                          placeholder="Buscar artículo…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="col-xl-4 col-sm-6 mb-3 mb-xl-0">
                        <label className="visually-hidden" htmlFor="kb-filtro-categoria">Categoría</label>
                        <select
                          id="kb-filtro-categoria"
                          className="form-control"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                        >
                          <option value="all">Todas ({articles.length})</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name} ({num(c.articleCount)})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-xl-4 col-sm-6">
                        <button
                          className="btn btn-danger light"
                          title="Quitar los filtros"
                          type="button"
                          onClick={() => { setSearch(""); setFilterCategory("all"); }}
                        >
                          Quitar filtros
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Collapse>
            </div>

            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary" onClick={() => { setEditing(undefined); setShowEditor(true); }}>
                    + Nuevo artículo
                  </button>
                </li>
                <li>
                  <button type="button" className="btn btn-primary mx-1" onClick={() => setShowCatModal(true)}>
                    + Categoría
                  </button>
                </li>
              </ul>
            </div>

            {/* Listado */}
            <div className="filter cm-content-box box-primary">
              {cabecera("fa-solid fa-file-lines", "Artículos", openLista, () => setOpenLista(!openLista))}
              <Collapse in={openLista}>
                <div className="cm-content-body form excerpt">
                  <div className="card-body py-3">
                    <div className="table-responsive">
                      <div id="blog_wrapper" className="dataTables_wrapper no-footer">
                        {loading ? (
                          <div className="d-flex align-items-center justify-content-center py-5" role="status">
                            <div className="spinner-border text-primary me-3" aria-hidden="true" />
                            <span className="text-muted">Cargando artículos…</span>
                          </div>
                        ) : filtered.length === 0 ? (
                          <W3crmEmptyState
                            title={search || filterCategory !== "all" ? "Sin resultados" : "Base de conocimiento vacía"}
                            description={search || filterCategory !== "all"
                              ? "Prueba con otros filtros"
                              : "Crea el primer artículo para ayudar a tus clientes."}
                          />
                        ) : (
                          <>
                            <table className="table table-responsive-lg table-striped table-condensed flip-content">
                              <thead>
                                <tr>
                                  <th className="text-black">Título</th>
                                  <th className="text-black">Categoría</th>
                                  <th className="text-black">Estado</th>
                                  <th className="text-black">Lecturas</th>
                                  <th className="text-black">% útil</th>
                                  <th className="text-black">Modificado</th>
                                  <th className="text-black text-end">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {records.map((a) => {
                                  const votos = num(a.helpful) + num(a.notHelpful);
                                  const helpfulPct = votos > 0 ? Math.round((num(a.helpful) / votos) * 100) : null;
                                  return (
                                    <tr key={a.id}>
                                      <td>
                                        <span className="fw-bold">{a.title || "—"}</span>
                                        {a.excerpt ? <div className="text-muted fs-12">{a.excerpt}</div> : null}
                                      </td>
                                      <td>{a.categoryName ?? "—"}</td>
                                      <td>
                                        <span className={`badge ${a.published ? "badge-success" : "badge-primary"}`}>
                                          {a.published ? "Publicado" : "Borrador"}
                                        </span>
                                      </td>
                                      <td>{num(a.views).toLocaleString("es-ES")}</td>
                                      <td>{helpfulPct !== null ? `${helpfulPct}%` : "—"}</td>
                                      <td>{fecha(a.updatedAt)}</td>
                                      <td className="text-end">
                                        <button
                                          type="button"
                                          className="btn btn-warning btn-sm content-icon me-1"
                                          aria-label={`Editar ${a.title || "artículo"}`}
                                          onClick={() => { setEditing(a); setShowEditor(true); }}
                                        >
                                          <i className="fa fa-edit" />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm content-icon me-1"
                                          aria-label={a.published ? `Despublicar ${a.title || "artículo"}` : `Publicar ${a.title || "artículo"}`}
                                          onClick={() => void togglePublish(a)}
                                        >
                                          <i className={`fa-solid ${a.published ? "fa-eye-slash" : "fa-check"}`} />
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-danger btn-sm content-icon"
                                          aria-label={`Eliminar ${a.title || "artículo"}`}
                                          onClick={() => void deleteArticle(a.id)}
                                        >
                                          <i className="fa-solid fa-trash" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="d-sm-flex text-center justify-content-between align-items-center">
                              <div className="dataTables_info">
                                Mostrando {firstIndex + 1} a {Math.min(lastIndex, filtered.length)} de {filtered.length} artículos
                              </div>
                              <div className="dataTables_paginate paging_simple_numbers justify-content-center" id="kb_paginate">
                                <button type="button" className={`paginate_button previous ${currentPage === 1 ? "disabled" : ""}`} aria-label="Página anterior" onClick={prePage}>
                                  <i className="fa-solid fa-angle-left" />
                                </button>
                                <span>
                                  {number.map((n) => (
                                    <button
                                      type="button"
                                      key={n}
                                      className={`paginate_button ${currentPage === n ? "current" : ""}`}
                                      aria-label={`Página ${n}`}
                                      aria-current={currentPage === n ? "page" : undefined}
                                      onClick={() => setCurrentPage(n)}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </span>
                                <button type="button" className={`paginate_button next ${currentPage === npage ? "disabled" : ""}`} aria-label="Página siguiente" onClick={nextPage}>
                                  <i className="fa-solid fa-angle-right" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Collapse>
            </div>
          </div>
        </div>
      </div>

      {showEditor && (
        <ArticleEditor
          article={editing}
          categories={categories}
          onClose={() => setShowEditor(false)}
          onSaved={() => void load()}
        />
      )}
      {showCatModal && <CategoryModal onClose={() => setShowCatModal(false)} onSaved={() => void load()} />}
    </SaasW3crmShell>
  );
}

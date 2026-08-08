"use client";

/**
 * Piezas de la pantalla `(cms)/content` de W3CRM, portadas una vez y
 * reutilizadas por todos los modulos de listado. El marcado y las clases son
 * los de la plantilla, verbatim; aqui solo se parametrizan el titulo, el icono
 * y el contenido.
 *
 *   <div className="filter cm-content-box box-primary">
 *     <div className="content-title">
 *       <div className="cpa"><i className="..." />Titulo</div>
 *       <div className="tools">
 *         <Link className="SlideToolHeader collapse|expand"><i className="fas fa-angle-up" /></Link>
 *       </div>
 *     </div>
 *     <Collapse in={...}>
 *       <div className="cm-content-body form excerpt">
 *         <div className="card-body">...</div>
 *       </div>
 *     </Collapse>
 *   </div>
 *
 * y la tabla del listado:
 *
 *   <div className="table-responsive">
 *     <div id="content_wrapper" className="dataTables_wrapper no-footer">
 *       <table className="table table-responsive-lg table-striped table-condensed flip-content">
 *       ...
 *       <div className="d-sm-flex text-center justify-content-between align-items-center">
 *         <div className="dataTables_info">...</div>
 *         <div className="dataTables_paginate paging_simple_numbers">...</div>
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Collapse from "react-bootstrap/Collapse";
import Modal from "react-bootstrap/Modal";

export function W3crmContentBox({
  titulo,
  icono = "fa-solid fa-file-lines",
  acciones,
  defaultOpen = true,
  bodyClassName = "card-body",
  children,
  testId,
}: {
  titulo: ReactNode;
  icono?: string;
  /** Controles siempre visibles, en el `tools` de la cabecera. */
  acciones?: ReactNode;
  defaultOpen?: boolean;
  bodyClassName?: string;
  children: ReactNode;
  testId?: string;
}) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const etiqueta = typeof titulo === "string" ? titulo : "sección";
  return (
    <div className="filter cm-content-box box-primary" data-testid={testId}>
      <div className="content-title">
        <div className="cpa">
          <i className={`${icono} me-2`} />
          {titulo}
        </div>
        <div className="tools">
          {acciones}
          <Link
            href="#"
            scroll={false}
            className={`SlideToolHeader ${abierto ? "collapse" : "expand"}`}
            role="button"
            aria-expanded={abierto}
            aria-label={`Plegar ${etiqueta}`}
            onClick={(e) => { e.preventDefault(); setAbierto((v) => !v); }}
          >
            <i className="fas fa-angle-up" />
          </Link>
        </div>
      </div>
      <Collapse in={abierto}>
        <div className="cm-content-body form excerpt">
          <div className={bodyClassName}>{children}</div>
        </div>
      </Collapse>
    </div>
  );
}

/** Spinner de carga con el marcado de Bootstrap que usa la plantilla. */
export function W3crmCargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-center py-5" role="status">
      <div className="spinner-border text-primary me-3" aria-hidden="true" />
      <span className="text-muted">{texto}</span>
    </div>
  );
}

/**
 * Tabla + pie de paginacion de la plantilla. Pagina de 5 en 5 como
 * `(cms)/content`; `filas` es el total ya filtrado y `render` recibe solo la
 * pagina visible, asi el modulo no repite la aritmetica de paginado.
 */
export function W3crmDataTable<T>({
  filas,
  columnas,
  render,
  etiqueta = "registros",
  wrapperId = "content_wrapper",
  porPagina = 5,
  reiniciarEn,
}: {
  filas: T[];
  columnas: { titulo: string; alFinal?: boolean }[];
  render: (fila: T, indice: number) => ReactNode;
  etiqueta?: string;
  wrapperId?: string;
  porPagina?: number;
  /** Cambiar este valor devuelve la paginacion a la primera pagina. */
  reiniciarEn?: unknown;
}) {
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [reiniciarEn]);

  const ultimo = pagina * porPagina;
  const primero = ultimo - porPagina;
  const visibles = filas.slice(primero, ultimo);
  const paginas = Math.max(1, Math.ceil(filas.length / porPagina));
  const numeros = [...Array(paginas + 1).keys()].slice(1);

  return (
    <div className="table-responsive">
      <div id={wrapperId} className="dataTables_wrapper no-footer">
        <table className="table table-responsive-lg table-striped table-condensed flip-content">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.titulo} className={`text-black ${c.alFinal ? "text-end" : ""}`}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => render(f, primero + i))}
          </tbody>
        </table>
        <div className="d-sm-flex text-center justify-content-between align-items-center">
          <div className="dataTables_info">
            Mostrando {filas.length === 0 ? 0 : primero + 1} a {Math.min(ultimo, filas.length)} de {filas.length} {etiqueta}
          </div>
          <div className="dataTables_paginate paging_simple_numbers justify-content-center">
            <button
              type="button"
              className={`paginate_button previous ${pagina === 1 ? "disabled" : ""}`}
              aria-label="Página anterior"
              onClick={() => { if (pagina !== 1) setPagina(pagina - 1); }}
            >
              <i className="fa-solid fa-angle-left" />
            </button>
            <span>
              {numeros.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`paginate_button ${pagina === n ? "current" : ""}`}
                  aria-label={`Página ${n}`}
                  aria-current={pagina === n ? "page" : undefined}
                  onClick={() => setPagina(n)}
                >
                  {n}
                </button>
              ))}
            </span>
            <button
              type="button"
              className={`paginate_button next ${pagina === paginas ? "disabled" : ""}`}
              aria-label="Página siguiente"
              onClick={() => { if (pagina !== paginas) setPagina(pagina + 1); }}
            >
              <i className="fa-solid fa-angle-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de la plantilla (ver `(apps)/app-profile`): `modal fade` >
 * `modal-content` > `modal-header` con `h5.modal-title` y `btn-close` >
 * `modal-body`.
 */
export function W3crmModal({
  titulo,
  onClose,
  size,
  error,
  children,
  testId,
}: {
  titulo: string;
  onClose: () => void;
  size?: "lg" | "sm";
  error?: string | null;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Modal className="modal fade" show onHide={onClose} centered size={size}>
      <div className="modal-content" data-testid={testId}>
        <div className="modal-header">
          <h5 className="modal-title">{titulo}</h5>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
        </div>
        <div className="modal-body">
          {error ? <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div> : null}
          {children}
        </div>
      </div>
    </Modal>
  );
}

"use client";

/**
 * `W3crmJobList` — portado verbatim a TypeScript desde
 * `components/apps/JobManagementList.jsx` de la plantilla oficial W3CRM.
 *
 * `JobRejectionsList.jsx` comparte exactamente el mismo marcado (mismas
 * cabeceras `Name` / `Date Added` / `Last active` / `Action`, mismo
 * `action-button` con `btn btn-primary btn-icon-xxs` y
 * `btn btn-danger btn-icon-xxs`, misma paginacion de 5 registros), asi que las
 * dos listas de `(apps)/user-roles` se resuelven con este unico componente
 * parametrizado por titulo, icono y columnas.
 *
 * Se conserva: `h4.heading mb-0` con su icono, `card h-auto`, `card-body p-0`,
 * `table-responsive active-projects active-projects`, `dataTables_wrapper
 * no-footer`, `table ItemsCheckboxSec dataTable no-footer mb-0`, el avatar
 * `avatar avatar-md rounded-circle`, `font-w500`, y la paginacion
 * `dataTables_paginate paging_simple_numbers` con `recordsPage = 5`.
 *
 * Es solo presentacion: recibe las filas por props y no conoce ninguna API.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";

export interface W3crmJobListRow {
  clave: string;
  /** Iniciales: NELVYON no guarda avatares, ver nota en W3crmUserTabs. */
  iniciales: string;
  nombre: string;
  /** Segunda linea bajo el nombre (en la plantilla, el email). */
  subtitulo: string;
  /** `Date Added` en la plantilla. */
  fecha: ReactNode;
  /** `Last active` en la plantilla. */
  ultimaActividad: ReactNode;
  acciones?: ReactNode;
}

export function W3crmJobList({
  titulo,
  icono,
  columnas = ["Nombre", "Alta", "Estado", "Acción"],
  filas,
  cargando = false,
  vacio,
}: {
  titulo: string;
  icono: string;
  columnas?: [string, string, string, string];
  filas: W3crmJobListRow[];
  cargando?: boolean;
  vacio?: ReactNode;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPage = 5;
  const lastIndex = currentPage * recordsPage;
  const firstIndex = lastIndex - recordsPage;
  const records = filas.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(filas.length / recordsPage));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function changeCPage(id: number) { setCurrentPage(id); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }

  return (
    <>
      <h4 className="heading mb-0">
        <i className={`${icono} text-primary me-3 mb-3`}></i> {titulo}
      </h4>
      <div className="card h-auto">
        <div className="card-body p-0">
          <div className="table-responsive active-projects active-projects ">
            <div id="job-tbl_wrapper" className="dataTables_wrapper no-footer">
              {cargando ? (
                <div className="d-flex align-items-center justify-content-center py-5" role="status">
                  <div className="spinner-border text-primary me-3" aria-hidden="true" />
                  <span className="text-muted">Cargando…</span>
                </div>
              ) : filas.length === 0 ? (
                <div className="text-center py-5">{vacio}</div>
              ) : (
                <>
                  <table id="projects-tbl" className="table ItemsCheckboxSec dataTable no-footer mb-0">
                    <thead>
                      <tr>
                        {columnas.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((item) => (
                        <tr key={item.clave}>
                          <td>
                            <div className="d-flex align-items-center">
                              <span
                                className="avatar avatar-md rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white"
                                style={{ width: 40, height: 40 }}
                              >
                                {item.iniciales}
                              </span>
                              <div className="ms-2">
                                <p className="mb-0 text-start font-w500">{item.nombre}</p>
                                <span>{item.subtitulo}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="mb-0 font-w500">{item.fecha}</p>
                          </td>
                          <td>
                            <p className="mb-0 font-w500">{item.ultimaActividad}</p>
                          </td>
                          <td>
                            <div className="action-button">{item.acciones}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="d-sm-flex text-center justify-content-between align-items-center">
                    <div className="dataTables_info">
                      Mostrando {filas.length === 0 ? 0 : firstIndex + 1} a {Math.min(lastIndex, filas.length)} de {filas.length}
                    </div>
                    <div className="dataTables_paginate paging_simple_numbers justify-content-center" id="job-tbl_paginate">
                      <Link
                        className={`paginate_button previous ${currentPage === 1 ? "disabled" : ""}`}
                        href="#" scroll={false}
                        onClick={(e) => { e.preventDefault(); prePage(); }}
                      >
                        <i className="fa-solid fa-angle-left" />
                      </Link>
                      <span>
                        {number.map((n) => (
                          <Link
                            href="#" scroll={false} key={n}
                            className={`paginate_button ${currentPage === n ? "current" : ""} `}
                            onClick={(e) => { e.preventDefault(); changeCPage(n); }}
                          >
                            {n}
                          </Link>
                        ))}
                      </span>
                      <Link
                        className={`paginate_button next ${currentPage === npage ? "disabled" : ""}`}
                        href="#" scroll={false}
                        onClick={(e) => { e.preventDefault(); nextPage(); }}
                      >
                        <i className="fa-solid fa-angle-right" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Botones de fila de la plantilla: `action-button` con `btn-icon-xxs`. */
export function W3crmIconButton({
  tono = "primary",
  icono,
  etiqueta,
  disabled,
  onClick,
}: {
  tono?: "primary" | "danger" | "warning" | "success";
  icono: string;
  etiqueta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${tono} btn-icon-xxs`}
      aria-label={etiqueta}
      title={etiqueta}
      disabled={disabled}
      onClick={onClick}
    >
      <i className={icono}></i>
    </button>
  );
}

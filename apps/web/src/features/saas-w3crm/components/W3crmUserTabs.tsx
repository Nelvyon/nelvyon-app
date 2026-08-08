"use client";

/**
 * Componentes de la pantalla `(apps)/user` de la plantilla oficial W3CRM,
 * portados verbatim a TypeScript:
 *
 *   - `W3crmUserGrid`      ← `components/apps/GridTab.jsx`
 *   - `W3crmUserList`      ← `components/apps/ListTab.jsx`
 *   - `W3crmEmployeeOffcanvas` ← `constant/EmployeeOffcanvas.jsx`
 *
 * Se conserva el marcado, las clases, la estructura Bootstrap, los espaciados,
 * la paginacion, los dropdowns, los iconos y el comportamiento responsive.
 * Lo unico que cambia es que los arrays de demo (`usergridblog`, `tableData`)
 * pasan a ser props: estos componentes son solo presentacion, no llevan logica
 * de negocio ni conocen las APIs de NELVYON.
 *
 * Dos adaptaciones inevitables, ambas de datos y no de diseno:
 *   - La plantilla pinta un `<Image src={item.image}>` en `crd-bx-img` y en la
 *     celda de usuario. NELVYON no guarda avatares, solo iniciales, asi que ese
 *     hueco lo ocupa un `<span>` con las mismas clases (`rounded-circle`,
 *     `avatar rounded-circle`). Si algun dia hay imagen, se sustituye sin tocar
 *     el resto.
 *   - El export CSV de `ListTab` usa `react-csv`, que no es dependencia de este
 *     proyecto. Se genera el CSV con un Blob y se descarga desde un `<button>`
 *     con las clases y el icono originales (`btn btn-primary light btn-sm me-2`
 *     + `fa-solid fa-file-excel`).
 */
import Link from "next/link";
import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import { Dropdown, Offcanvas } from "react-bootstrap";

// ── GridTab ────────────────────────────────────────────────────────────────────

export interface W3crmUserGridItem {
  /** `id: 'active' | 'deactive'` en la plantilla: controla el punto de estado. */
  activo: boolean;
  iniciales: string;
  titulo: string;
  email: string;
  /** Las tres cifras de `ul.card__info`. */
  estadisticas: Array<{ valor: string; etiqueta: string }>;
  /** Las dos filas de `ul.post-pos`. */
  detalles: Array<{ etiqueta: string; valor: string }>;
  acciones?: ReactNode;
}

export function W3crmUserGrid({ items }: { items: W3crmUserGridItem[] }) {
  return (
    <div className="row">
      {items.map((item, index) => (
        <div className="col-xl-3 col-lg-4 col-sm-6" key={index}>
          <div className="card">
            <div className="card-body">
              <div className="card-use-box">
                <div className="crd-bx-img">
                  <span className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white" style={{ width: 70, height: 70 }}>
                    {item.iniciales}
                  </span>
                  <div className={`active ${!item.activo ? "deactive" : ""} `}></div>
                </div>
                <div className="card__text">
                  <h4 className="mb-0">{item.titulo}</h4>
                  <p>{item.email}</p>
                </div>
                <ul className="card__info">
                  {item.estadisticas.map((e) => (
                    <li key={e.etiqueta}>
                      <span className="card__info__stats">{e.valor}</span>
                      <span>{e.etiqueta}</span>
                    </li>
                  ))}
                </ul>
                <ul className="post-pos">
                  {item.detalles.map((d) => (
                    <li key={d.etiqueta}>
                      <span className="card__info__stats">{d.etiqueta}: </span>
                      <span>{d.valor}</span>
                    </li>
                  ))}
                </ul>
                <div>{item.acciones}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ListTab ────────────────────────────────────────────────────────────────────

export interface W3crmUserListItem {
  clave: string;
  iniciales: string;
  titulo: string;
  email: string;
  /** `postion` en la plantilla. */
  posicion: string;
  fecha: string;
  /** `week` en la plantilla: la ultima columna antes de las acciones. */
  estado: ReactNode;
  acciones?: ReactNode;
}

/** Descarga CSV con el mismo boton e icono que usaba `CSVLink`. */
function descargarCsv(cabeceras: Array<{ label: string; key: string }>, filas: Array<Record<string, string>>, nombre: string) {
  const escapar = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = [
    cabeceras.map((c) => escapar(c.label)).join(","),
    ...filas.map((f) => cabeceras.map((c) => escapar(f[c.key] ?? "")).join(",")),
  ];
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function W3crmUserList({
  titulo,
  items,
  csvCabeceras,
  csvFilas,
  csvNombre = "usuarios.csv",
}: {
  titulo: string;
  items: W3crmUserListItem[];
  csvCabeceras: Array<{ label: string; key: string }>;
  csvFilas: Array<Record<string, string>>;
  csvNombre?: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPage = 12;
  const lastIndex = currentPage * recordsPage;
  const firstIndex = lastIndex - recordsPage;
  const records = items.slice(firstIndex, lastIndex);
  const npage = Math.max(1, Math.ceil(items.length / recordsPage));
  const number = [...Array(npage + 1).keys()].slice(1);
  function prePage() { if (currentPage !== 1) setCurrentPage(currentPage - 1); }
  function changeCPage(id: number) { setCurrentPage(id); }
  function nextPage() { if (currentPage !== npage) setCurrentPage(currentPage + 1); }

  const checkboxFun = (type?: string) => {
    setTimeout(() => {
      const checkbox = document.querySelectorAll<HTMLInputElement>(".sorting_20 input");
      const motherCheckBox = document.querySelector<HTMLInputElement>(".sorting_asc_11 input");
      if (!motherCheckBox) return;
      for (let i = 0; i < checkbox.length; i++) {
        const element = checkbox[i];
        if (!element) continue;
        if (type === "all") {
          element.checked = motherCheckBox.checked;
        } else if (!element.checked) {
          motherCheckBox.checked = false;
          break;
        } else {
          motherCheckBox.checked = true;
        }
      }
    }, 100);
  };

  return (
    <div className="card">
      <div className="card-body p-0">
        <div className="table-responsive active-projects style-1 ItemsCheckboxSec shorting">
          <div className="tbl-caption">
            <h4 className="heading mb-0">{titulo}</h4>
            <div>
              <button
                type="button"
                className="btn btn-primary light btn-sm me-2"
                onClick={() => descargarCsv(csvCabeceras, csvFilas, csvNombre)}
              >
                <i className="fa-solid fa-file-excel" /> Exportar
              </button>
            </div>
          </div>
          <div id="user-tbl_wrapper" className="dataTables_wrapper no-footer">
            <table id="projects-tbl" className="table ItemsCheckboxSec dataTable no-footer mb-0">
              <thead>
                <tr>
                  <th className="sorting_asc_11">
                    <div className="form-check custom-checkbox ms-0">
                      <input
                        type="checkbox"
                        className="form-check-input checkAllInput"
                        aria-label="Seleccionar todo"
                        onClick={() => checkboxFun("all")}
                      />
                      <label className="form-check-label" htmlFor="checkAll"></label>
                    </div>
                  </th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Última actividad</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item, index) => (
                  <tr key={item.clave}>
                    <td className="sorting_20">
                      <div className="form-check11custom-checkbox">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`user${index + 211}`}
                          aria-label={`Seleccionar ${item.titulo}`}
                          onClick={() => checkboxFun()}
                        />
                        <label className="form-check-label" htmlFor={`user${index + 211}`}></label>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="avatar rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white" style={{ width: 35, height: 35 }}>
                          {item.iniciales}
                        </span>
                        <p className="mb-0 ms-2">{item.titulo}</p>
                      </div>
                    </td>
                    <td>{item.email}</td>
                    <td>{item.posicion}</td>
                    <td>{item.fecha}</td>
                    <td>{item.estado}</td>
                    <td>{item.acciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="d-sm-flex text-center justify-content-between align-items-center">
              <div className="dataTables_info">
                Mostrando {items.length === 0 ? 0 : firstIndex + 1} a {Math.min(lastIndex, items.length)} de {items.length}
              </div>
              <div className="dataTables_paginate paging_simple_numbers justify-content-center" id="example2_paginate">
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
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dropdown de acciones por fila — el de `ListTab`, con su SVG de tres puntos. */
export function W3crmRowDropdown({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  return (
    <Dropdown>
      <Dropdown.Toggle as="div" className="btn-link i-false" aria-label={etiqueta}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12Z" stroke="#737B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          <path d="M18 12C18 12.5523 18.4477 13 19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12Z" stroke="#737B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          <path d="M4 12C4 12.5523 4.44772 13 5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12Z" stroke="#737B8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </Dropdown.Toggle>
      <Dropdown.Menu className="dropdown-menu-right" align="end">
        {children}
      </Dropdown.Menu>
    </Dropdown>
  );
}

// ── EmployeeOffcanvas ──────────────────────────────────────────────────────────

export interface W3crmOffcanvasHandle {
  /** Mismo nombre que en la plantilla. */
  showEmployeModal: () => void;
  hideEmployeModal: () => void;
}

/**
 * Chrome del offcanvas de `EmployeeOffcanvas`: `offcanvas-end customeoff`,
 * `offcanvas-header` con `modal-title` y `btn-close`, y `offcanvas-body >
 * container-fluid`. El formulario de demo (ID de empleado, departamento,
 * pais...) lo sustituye el que le pase la pagina, que es el real de NELVYON.
 */
export const W3crmEmployeeOffcanvas = forwardRef<W3crmOffcanvasHandle, { title: string; children: ReactNode }>(
  function W3crmEmployeeOffcanvas({ title, children }, ref) {
    const [addEmploye, setAddEmploye] = useState(false);
    useImperativeHandle(ref, () => ({
      showEmployeModal() { setAddEmploye(true); },
      hideEmployeModal() { setAddEmploye(false); },
    }));
    return (
      <Offcanvas show={addEmploye} onHide={() => setAddEmploye(false)} className="offcanvas-end customeoff" placement="end">
        <div className="offcanvas-header">
          <h5 className="modal-title" id="#gridSystemModal">{title}</h5>
          <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setAddEmploye(false)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="offcanvas-body">
          <div className="container-fluid">{children}</div>
        </div>
      </Offcanvas>
    );
  },
);

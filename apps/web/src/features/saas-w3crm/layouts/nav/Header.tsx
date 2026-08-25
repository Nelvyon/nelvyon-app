"use client";

/**
 * Cabecera del panel — BLOQUE 5.
 *
 * Esta cabecera se monta en **75 pantallas** del panel a traves de
 * `SaasW3crmShell → Layout → Nav`, asi que todo lo que pinte lo ve el cliente
 * en practicamente todo el producto. Lo que traia de la plantilla W3CRM:
 *
 *   - Una identidad FIJA: «Thomas Fleming · info@gmail.com · Web Designer».
 *     Un cliente entraba en SU cuenta y leia el nombre y el correo de otra
 *     persona. Es el defecto mas grave que encontro la auditoria del Bloque 5.
 *   - Dos desplegables de notificaciones INVENTADAS: «Youtube, a video-sharing
 *     website, goes live $500», «New order placed #XF-2356», «Quisque a
 *     consequat ante Sit amet magna at volutapt...», «Dr sultads Send you
 *     Photo», «Reminder : Treatment Time!» —restos de una plantilla de clinica—
 *     todo fechado el 29 de julio de 2022.
 *   - Un menu de perfil apuntando a `/app-profile` y `/email-inbox`, rutas que
 *     NO EXISTEN en NELVYON, mas cuatro `href="#"` que no hacian nada. Uno de
 *     ellos era «Logout»: se pulsaba y la sesion seguia abierta.
 *   - Un icono de mensajes cuyo `onClick` conmutaba un estado que nadie lee.
 *   - Un buscador sin manejador: se escribia, se pulsaba Enter y no pasaba nada.
 *
 * Lo que hay ahora, y por que no es producto nuevo:
 *
 *   - La identidad sale de `useAuth()`, que es la sesion real.
 *   - La campana consume `/api/saas/notifications`, que ya estaba construida
 *     entera —contador, marcar leida, marcar todas— y **no tenia un solo
 *     consumidor en la UI**. Conectarla no inventa nada: enchufa lo que habia.
 *   - Lo que no tenia nada real detras se ha retirado en vez de rellenarse.
 *     Quitar un control que no hace nada no quita ninguna capacidad; dejarlo
 *     puesto si promete una que no existe.
 *
 * Se conservan las clases del pack (`header`, `nav-item`, `dropdown-item`...)
 * porque el CSS de W3CRM selecciona por ellas.
 */

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";

import { useAuth } from "@/core/auth/AuthContext";
import { SVGICON } from "@/features/saas-w3crm/constant/theme";

import { useNotificacionesDeCabecera } from "./useNotificacionesDeCabecera";

/** «hace 5 min» sin traer una libreria de fechas para tres restas. */
function haceCuanto(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const seg = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seg < 60) return "hace unos segundos";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hor = Math.floor(min / 60);
  if (hor < 24) return `hace ${hor} h`;
  const dias = Math.floor(hor / 24);
  return dias === 1 ? "ayer" : `hace ${dias} dias`;
}

const ETIQUETA_DE_ROL: Record<string, string> = {
  member: "Miembro",
  operator: "Operador",
  admin: "Administrador",
  super_admin: "Super administrador",
};

function CampanaDeNotificaciones() {
  const { estado, notificaciones, sinLeer, marcarTodasLeidas } = useNotificacionesDeCabecera();

  // Sin el permiso `notifications.read` la campana no se dibuja. Ensenar un
  // error diria que la funcion existe a quien no debe verla.
  if (estado === "sin_permiso") return null;

  return (
    <Dropdown as="li" className="nav-item dropdown notification_dropdown">
      <Dropdown.Toggle
        className="nav-link i-false c-pointer"
        variant=""
        as="div"
        role="button"
        tabIndex={0}
        aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {sinLeer > 0 && (
          <span className="badge light text-white bg-primary rounded-circle">{sinLeer}</span>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu align="end" className="mt-2 dropdown-menu dropdown-menu-end">
        <div className="widget-media dz-scroll p-3 height380">
          {estado === "cargando" && (
            // Mientras no se sabe, no se dice «no tienes nada»: seria afirmar
            // algo que aun no se ha comprobado.
            <p className="mb-0 text-muted small">Cargando notificaciones…</p>
          )}

          {estado === "error" && (
            <p className="mb-0 text-danger small">
              No se han podido cargar las notificaciones. Vuelve a intentarlo en un momento.
            </p>
          )}

          {estado === "listas" && notificaciones.length === 0 && (
            <p className="mb-0 text-muted small">No tienes notificaciones sin leer.</p>
          )}

          {estado === "listas" && notificaciones.length > 0 && (
            <ul className="timeline">
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <div className="timeline-panel">
                    <div className="media-body">
                      <h6 className="mb-1">{n.title}</h6>
                      <small className="d-block text-muted">{n.message}</small>
                      <small className="d-block">{haceCuanto(n.createdAt)}</small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {estado === "listas" && notificaciones.length > 0 && (
          <button
            type="button"
            className="all-notification btn btn-link w-100 text-start"
            onClick={() => void marcarTodasLeidas()}
          >
            Marcar todas como leidas <i className="ti-arrow-right" aria-hidden="true" />
          </button>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

type HeaderProps = Record<string, unknown>;

const Header = (_props: HeaderProps) => {
  const [headerFix, setheaderFix] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    // La plantilla registraba el listener sin retirarlo nunca: cada montaje del
    // shell dejaba uno vivo sobre `window`.
    const alDesplazar = () => setheaderFix(window.scrollY > 50);
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  const nombre = user?.fullName?.trim() || user?.email || "";
  const rol = user ? (ETIQUETA_DE_ROL[user.role] ?? user.role) : "";
  const inicial = nombre ? nombre.charAt(0).toUpperCase() : "?";

  return (
    <div className={`header ${headerFix ? "is-fixed" : ""}`}>
      <div className="header-content">
        <nav className="navbar navbar-expand">
          <div className="collapse navbar-collapse justify-content-end">
            <ul className="navbar-nav header-right">
              <CampanaDeNotificaciones />

              <li className="nav-item ps-3">
                <Dropdown className="header-profile2">
                  <Dropdown.Toggle className="nav-link i-false" as="div" role="button" tabIndex={0}>
                    <div className="header-info2 d-flex align-items-center">
                      <div className="header-media" aria-hidden="true">
                        <span className="avatar avatar-md rounded-circle d-inline-flex align-items-center justify-content-center">
                          {inicial}
                        </span>
                      </div>
                      <div className="header-info">
                        {/*
                          Aqui vivia «Thomas Fleming / info@gmail.com». Si no hay
                          sesion no se inventa un nombre: se dice que no la hay.
                        */}
                        <h6>{nombre || "Sin sesion"}</h6>
                        {rol ? <p>{rol}</p> : null}
                      </div>
                    </div>
                  </Dropdown.Toggle>
                  <Dropdown.Menu align="end">
                    <div className="card border-0 mb-0">
                      {user ? (
                        <div className="card-header py-2">
                          <div className="products">
                            <div>
                              <h6>{nombre}</h6>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="card-body px-0 py-2">
                        {/* Rutas que EXISTEN. Las de la plantilla, no. */}
                        <Link href="/account" className="dropdown-item ai-icon">
                          {SVGICON.User} <span className="ms-2">Mi cuenta</span>
                        </Link>
                        <Link href="/saas/settings" className="dropdown-item ai-icon">
                          {SVGICON.Headersetting} <span className="ms-2">Ajustes</span>
                        </Link>
                        <Link href="/saas/inbox" className="dropdown-item ai-icon">
                          {SVGICON.Message} <span className="ms-2">Bandeja de entrada</span>
                        </Link>
                      </div>

                      <div className="card-footer px-0 py-2">
                        {/*
                          Era un `href="#"`: se pulsaba «Logout» y la sesion
                          seguia abierta. Ahora cierra sesion de verdad.
                        */}
                        <button
                          type="button"
                          className="dropdown-item ai-icon"
                          onClick={() => signOut()}
                        >
                          <svg
                            className="profle-logout"
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ff7979"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span className="ms-2 text-danger">Cerrar sesion</span>
                        </button>
                      </div>
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Header;

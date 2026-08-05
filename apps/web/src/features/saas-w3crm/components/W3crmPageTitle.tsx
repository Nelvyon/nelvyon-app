"use client";

/**
 * Cabecera de pagina de W3CRM (`layouts/MainPagetitle.jsx`).
 *
 * Marcado y clases VERBATIM de la plantilla: `page-titles` > `breadcrumb` con
 * `bc-title`, `breadcrumb-item` y `breadcrumb-item active`.
 *
 * Unico cambio: el enlace de accion de la derecha, que en la demo abria un
 * offcanvas de "Add Task" con datos ficticios, aqui recibe la accion real de
 * NELVYON (etiqueta + handler). Si no se pasa accion, no se renderiza.
 */
import Link from "next/link";
import React from "react";

import { SVGICON } from "@/features/saas-w3crm/constant/theme";

export function W3crmPageTitle({
  mainTitle,
  parentTitle,
  pageTitle,
  actionLabel,
  onAction,
}: {
  mainTitle: string;
  parentTitle: string;
  pageTitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-titles">
      <ol className="breadcrumb">
        <li><h5 className="bc-title">{mainTitle}</h5></li>
        <li className="breadcrumb-item">
          <Link href="#" scroll={false} onClick={(e) => e.preventDefault()}>
            {SVGICON.HomeSvg}
            {" "}{parentTitle}
          </Link>
        </li>
        {/*
          La plantilla pone aqui un `<Link href="#">`, es decir un `<a href>`.
          Eso convierte la pagina ACTUAL en un enlace, y como su texto coincide
          con el del item del sidebar, la pantalla acaba con dos enlaces del
          mismo nombre accesible (ambiguo para lector de pantalla; en
          /saas/playbooks rompia ademas la busqueda por rol).

          Se deja el mismo `<a>` pero sin `href`: la regla
          `.breadcrumb .breadcrumb-item.active a { color: #000 }` sigue
          aplicando igual —mismo elemento, mismo selector— asi que el resultado
          visual es identico, y sin `href` deja de exponerse como enlace.
        */}
        <li className="breadcrumb-item active">
          <a aria-current="page">{pageTitle}</a>
        </li>
      </ol>
      {actionLabel && onAction ? (
        <Link
          href="#"
          scroll={false}
          className="text-primary fs-13"
          onClick={(e) => { e.preventDefault(); onAction(); }}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default W3crmPageTitle;

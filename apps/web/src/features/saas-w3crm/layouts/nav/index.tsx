"use client";

import React, { Fragment } from "react";

import Header from "./Header";
import type { W3crmMenuItem } from "./Menu";
import NavHader from "./NavHader";
import SideBar from "./SideBar";

/**
 * La plantilla mantenia aqui un `useState("")` y le pasaba a `Header` cuatro
 * manejadores (`onNote`, `onNotification`, `onProfile`, `onBox`) que solo
 * conmutaban ese estado. Nadie lo leia: ni `Header`, ni `SideBar`, ni
 * `NavHader`. Era una maquina de estados sin consumidor, y por eso pulsar el
 * icono de mensajes en el panel no producia ningun efecto visible.
 */
const JobieNav = ({ title, menuList }: { title?: string; menuList?: W3crmMenuItem[] }) => {
  return (
    <Fragment>
      <NavHader />
      <Header title={title} />
      <SideBar menuList={menuList} />
    </Fragment>
  );
};

export default JobieNav;

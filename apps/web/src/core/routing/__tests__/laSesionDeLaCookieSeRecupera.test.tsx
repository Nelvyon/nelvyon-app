/**
 * BLOQUE 5 · una pestana nueva no te echa del panel.
 *
 * Lo encontro la medicion en navegador, no la lectura del codigo: al abrir las
 * 75 rutas representativas con la cookie de sesion puesta, **33 terminaban en
 * `/login`**. Y no era el middleware —respondia 200— sino `ProtectedLayout`
 * rindiendose.
 *
 * La cadena:
 *
 *   1. El JWT vive en `sessionStorage`, que es **por pestana**.
 *   2. `AuthContext` solo intentaba recuperar la sesion desde la cookie en una
 *      lista de rutas escrita a mano: `/saas`, `/os`, `/portal`, `/admin`,
 *      `/dashboard`, `/auth`, `/login`.
 *   3. `ProtectedLayout` envuelve **136 pantallas**, y ninguna de las de
 *      `/account`, `/analytics/*`, `/campaigns`, `/billing`, `/crm/*`,
 *      `/funnels`, `/publicidad`, `/reputacion`, `/social`, `/inbox`,
 *      `/ecommerce`, `/settings`, `/automations/*` ni `/app/*` estaba en esa
 *      lista.
 *
 * Consecuencia para un cliente: abre `/analytics` en una pestana nueva —o
 * pincha el enlace de un correo, o reinicia el navegador— y aterriza en el
 * login **con la sesion perfectamente valida en la cookie**; pero
 * `/saas/dashboard` entra sin problema. Mismo usuario, misma cookie, dos
 * comportamientos segun la ruta.
 *
 * La causa raiz no es que faltaran rutas en la lista: es que hubiera una lista.
 * Se mantiene a mano y se desincroniza siempre. Ahora lo pide el componente que
 * sabe que necesita sesion.
 */
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enrutador = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }));
const rutaActual = vi.hoisted(() => ({ valor: "/analytics" }));
const sesion = vi.hoisted(() => ({
  isAuthenticated: false,
  isBootstrapping: false,
  user: null as { id: string; email: string; role: string } | null,
  recuperarSesionDesdeCookie: vi.fn(async () => false),
  signIn: vi.fn(),
  signOut: vi.fn(),
  syncRoleFromWorkspaceRole: vi.fn(),
  accessToken: null as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => enrutador,
  usePathname: () => rutaActual.valor,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/core/auth/AuthContext", () => ({ useAuth: () => sesion }));

// El armazon visual no interviene en lo que se mide aqui y arrastra medio arbol.
vi.mock("@/core/shell/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/core/auth/AuthDebugPanel", () => ({ AuthDebugPanel: () => null }));

import { ProtectedLayout } from "../ProtectedLayout";

beforeEach(() => {
  rutaActual.valor = "/analytics";
  sesion.isAuthenticated = false;
  sesion.isBootstrapping = false;
  sesion.user = null;
  sesion.accessToken = null;
  sesion.recuperarSesionDesdeCookie = vi.fn(async () => false);
});

afterEach(() => {
  vi.clearAllMocks();
});

function pintar() {
  return render(
    <ProtectedLayout module="crm">
      <p>contenido protegido</p>
    </ProtectedLayout>,
  );
}

describe("BLOQUE 5 · la sesion de la cookie se recupera en cualquier pantalla protegida", () => {
  it("con la cookie valida NO manda al login", async () => {
    // El defecto exacto: pestana nueva, `sessionStorage` vacio, cookie buena.
    sesion.recuperarSesionDesdeCookie = vi.fn(async () => {
      sesion.isAuthenticated = true;
      sesion.user = { id: "u", email: "c@t.test", role: "admin" };
      sesion.accessToken = "jwt";
      return true;
    });

    pintar();

    await waitFor(() => {
      expect(sesion.recuperarSesionDesdeCookie).toHaveBeenCalled();
    });
    expect(
      enrutador.replace,
      "echo al usuario al login teniendo sesion valida en la cookie",
    ).not.toHaveBeenCalled();
  });

  it("lo intenta en una ruta que NO estaba en la lista de rutas del arranque", async () => {
    // `/analytics` es justo una de las que la lista no cubria. La prueba iria
    // verde por accidente si se hiciera sobre `/saas`, que si estaba.
    rutaActual.valor = "/analytics";
    pintar();
    await waitFor(() => {
      expect(sesion.recuperarSesionDesdeCookie).toHaveBeenCalled();
    });
  });

  it("EL CONTROL: sin sesion recuperable SI manda al login", async () => {
    // Sin esto, un `ProtectedLayout` que no redirigiera nunca pasaria la
    // primera prueba y dejaria las 136 pantallas abiertas a cualquiera.
    sesion.recuperarSesionDesdeCookie = vi.fn(async () => false);
    pintar();
    await waitFor(() => {
      expect(enrutador.replace).toHaveBeenCalledWith("/login?next=%2Fanalytics");
    });
  });

  it("no reintenta la cookie en cada re-render", async () => {
    // Un reintento por render convierte una pantalla sin sesion en una tanda de
    // peticiones a `/api/auth/me` mientras el usuario mira.
    const { rerender } = pintar();
    await waitFor(() => expect(sesion.recuperarSesionDesdeCookie).toHaveBeenCalled());
    for (let i = 0; i < 3; i++) {
      rerender(
        <ProtectedLayout module="crm">
          <p>contenido protegido</p>
        </ProtectedLayout>,
      );
    }
    expect(sesion.recuperarSesionDesdeCookie.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("mientras arranca no decide nada", async () => {
    // Redirigir durante el arranque es echar a quien todavia no se ha
    // comprobado si tiene sesion.
    sesion.isBootstrapping = true;
    pintar();
    await new Promise((r) => setTimeout(r, 30));
    expect(enrutador.replace).not.toHaveBeenCalled();
    expect(sesion.recuperarSesionDesdeCookie).not.toHaveBeenCalled();
  });

  it("ya autenticado ni pregunta por la cookie", async () => {
    sesion.isAuthenticated = true;
    sesion.user = { id: "u", email: "c@t.test", role: "admin" };
    sesion.accessToken = "jwt";
    pintar();
    await new Promise((r) => setTimeout(r, 30));
    expect(sesion.recuperarSesionDesdeCookie).not.toHaveBeenCalled();
    expect(enrutador.replace).not.toHaveBeenCalled();
    expect(screen.getByText("contenido protegido")).toBeTruthy();
  });
});

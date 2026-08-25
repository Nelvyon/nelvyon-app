/**
 * BLOQUE 5 · la cabecera del panel no inventa datos.
 *
 * La auditoria de pantallas encontro que `Header.tsx` —montado por
 * `SaasW3crmShell` en **75 pantallas** del panel— servia:
 *
 *   - una identidad FIJA de la plantilla: «Thomas Fleming · info@gmail.com ·
 *     Web Designer», en lugar del usuario con la sesion abierta;
 *   - notificaciones INVENTADAS con fecha de julio de 2022, importes en dolares
 *     y relleno latino («Quisque a consequat ante Sit amet magna at volutapt»);
 *   - enlaces a `/app-profile` y `/email-inbox`, que no existen en NELVYON;
 *   - un «Logout» con `href="#"` que no cerraba la sesion.
 *
 * Sobrevivio porque **ninguna prueba miraba esta cabecera**. Este fichero es
 * esa prueba.
 *
 * Va por dos caminos a proposito, porque cada uno caza lo que el otro no:
 *
 *   1. **Comportamiento**: se renderiza con una sesion y con respuestas
 *      controladas, y se comprueba que sale lo que hay y no otra cosa.
 *   2. **Fuente**: un barrido por las cadenas concretas de la plantilla en toda
 *      la carpeta. Es lo unico que impide que vuelvan por otro fichero —el
 *      relleno estaba repartido en `Header.tsx` y en un subcomponente— o que
 *      alguien reintroduzca la plantilla entera de un pegote.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Header from "../Header";

// ── la sesion ────────────────────────────────────────────────────────────────

const sesion = vi.hoisted(() => ({
  user: {
    id: "u-1",
    email: "cliente@ejemplo.test",
    role: "admin" as const,
    fullName: "Carmen Ruiz",
  } as { id: string; email: string; role: string; fullName?: string } | null,
  signOut: vi.fn(),
}));

vi.mock("@/core/auth/AuthContext", () => ({
  useAuth: () => sesion,
}));

// El icono viene de un modulo del pack que arrastra imagenes; para esta prueba
// solo importa que exista algo que pintar.
vi.mock("@/features/saas-w3crm/constant/theme", () => ({
  SVGICON: { User: null, Headersetting: null, Message: null },
  IMAGES: {},
}));

/**
 * `Dropdown.Menu` de react-bootstrap NO renderiza sus hijos hasta que se abre.
 * Sin este paso las cuatro pruebas de la campana fallaban por no encontrar un
 * texto que el arbol nunca llego a montar — y habrian pasado igual de verdes
 * con la campana rota.
 */
async function abrirCampana(): Promise<void> {
  const boton = await screen.findByLabelText(/notificaciones/i);
  fireEvent.click(boton);
}

function respondeNotificaciones(cuerpo: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(cuerpo), { status })),
  );
}

beforeEach(() => {
  sesion.user = {
    id: "u-1",
    email: "cliente@ejemplo.test",
    role: "admin",
    fullName: "Carmen Ruiz",
  };
  respondeNotificaciones({ notifications: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ── 1 · comportamiento ───────────────────────────────────────────────────────

describe("BLOQUE 5 · la identidad de la cabecera es la de la sesion", () => {
  it("muestra el nombre del usuario con la sesion abierta", async () => {
    render(<Header />);
    expect(await screen.findByText("Carmen Ruiz")).toBeTruthy();
  });

  it("NO muestra la identidad de la plantilla", async () => {
    render(<Header />);
    await screen.findByText("Carmen Ruiz");
    // El defecto exacto que se corrigio: un cliente leyendo el nombre de otro.
    expect(screen.queryByText(/Thomas Fleming/i)).toBeNull();
    expect(screen.queryByText(/info@gmail\.com/i)).toBeNull();
    expect(screen.queryByText(/Web Designer/i)).toBeNull();
  });

  it("sin nombre completo cae al correo, no a un nombre inventado", async () => {
    sesion.user = { id: "u-2", email: "solo-correo@ejemplo.test", role: "member" };
    render(<Header />);
    expect(await screen.findByText("solo-correo@ejemplo.test")).toBeTruthy();
  });

  it("SIN sesion lo dice, en vez de rellenar el hueco", async () => {
    // Un nombre por defecto en el hueco de la identidad es como nacio el
    // defecto original.
    sesion.user = null;
    render(<Header />);
    expect(await screen.findByText("Sin sesion")).toBeTruthy();
  });
});

describe("BLOQUE 5 · la campana dice la verdad sobre lo que sabe", () => {
  it("EL CONTROL: pinta las notificaciones REALES que devuelve la API", async () => {
    // Sin este control, una campana que no pintara nunca nada pasaria todas las
    // pruebas de abajo.
    respondeNotificaciones({
      notifications: [
        {
          id: "n-1",
          title: "Pack de crecimiento terminado",
          message: "El informe ya esta disponible",
          read: false,
          createdAt: new Date().toISOString(),
          type: "job_completed",
        },
      ],
    });
    render(<Header />);
    await abrirCampana();
    expect(await screen.findByText("Pack de crecimiento terminado")).toBeTruthy();
  });

  it("bandeja vacia y bandeja ilegible NO se pintan igual", async () => {
    // Es el mismo fallo que el Bloque 4 quito de los healthchecks: un error que
    // se disfraza de estado normal deja al cliente creyendo que no tiene nada.
    respondeNotificaciones({}, 500);
    render(<Header />);
    await abrirCampana();
    await waitFor(() => {
      expect(screen.getByText(/no se han podido cargar/i)).toBeTruthy();
    });
    expect(screen.queryByText(/no tienes notificaciones/i)).toBeNull();
  });

  it("sin el permiso `notifications.read` la campana NO se dibuja", async () => {
    // Un error visible le confirmaria a quien no tiene el permiso que la
    // funcion existe.
    respondeNotificaciones({ error: "forbidden" }, 403);
    render(<Header />);
    await waitFor(() => {
      expect(screen.queryByLabelText(/notificaciones/i)).toBeNull();
    });
  });

  it("no inventa notificaciones cuando la API devuelve cero", async () => {
    render(<Header />);
    await abrirCampana();
    expect(await screen.findByText(/no tienes notificaciones sin leer/i)).toBeTruthy();
  });

  it("descarta un elemento sin `id` en vez de romper la lista al pulsarlo", async () => {
    respondeNotificaciones({
      notifications: [
        { title: "sin id", message: "x", read: false, createdAt: new Date().toISOString() },
        {
          id: "n-2",
          title: "Con identificador",
          message: "y",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    render(<Header />);
    await abrirCampana();
    expect(await screen.findByText("Con identificador")).toBeTruthy();
    expect(screen.queryByText("sin id")).toBeNull();
  });
});

// ── 2 · fuente: que el relleno no vuelva por otro fichero ────────────────────

describe("BLOQUE 5 · el relleno de la plantilla no vuelve", () => {
  const RELLENO_DE_PLANTILLA = [
    "Thomas Fleming",
    "info@gmail.com",
    "Web Designer",
    "Quisque a consequat",
    "XF-2356",
    "Dr sultads",
    "Resport created",
    "Treatment Time",
    "a video-sharing website",
    "StumbleUpon is acquired",
    "See all notifications",
    "/app-profile",
    "/email-inbox",
  ];

  it("ninguna cadena de la plantilla sigue en la carpeta de navegacion", async () => {
    // El barrido es sobre la CARPETA y no sobre `Header.tsx`, porque el relleno
    // estaba repartido: la mitad vivia en un subcomponente del mismo fichero y
    // habria bastado moverlo a otro para esquivar una prueba mas estrecha.
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");

    let d = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) break;
      d = dirname(d);
    }
    const carpeta = join(d, "apps", "web", "src", "features", "saas-w3crm", "layouts", "nav");
    const ficheros = readdirSync(carpeta).filter((f) => /\.tsx?$/.test(f));

    // Suelo minimo: cero cadenas sobre cero ficheros seria el verde mas vacio
    // posible, y ya paso una vez en el Bloque 3.
    expect(ficheros.length).toBeGreaterThanOrEqual(4);

    const culpables: string[] = [];
    for (const f of ficheros) {
      const texto = readFileSync(join(carpeta, f), "utf8");
      // El propio encabezado de `Header.tsx` CITA el relleno para explicar que
      // se quito. Se mira solo lo que queda tras vaciar comentarios, o la
      // prueba fallaria por su propia documentacion.
      const codigo = texto
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
      for (const cadena of RELLENO_DE_PLANTILLA) {
        if (codigo.includes(cadena)) culpables.push(`${f}: ${cadena}`);
      }
    }
    expect(culpables, culpables.join(" | ")).toEqual([]);
  });
});

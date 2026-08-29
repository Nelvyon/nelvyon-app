/**
 * LAS CUENTAS SALEN BIEN, O NO SALEN.
 *
 * QUÉ PROTEGE. Diecisiete de los veinticinco servicios tenían agentes que sólo
 * le pedían texto a un modelo. Un especialista de verdad hace cuentas: calcula
 * si una campaña deja dinero, si un experimento va a poder concluir, si el
 * calendario cabe en las horas que el cliente tiene.
 *
 * Y una cuenta tiene DOS formas de fallar, no una:
 *
 *   DA MAL EL NÚMERO ......... se nota al comprobarlo
 *   DA UN NÚMERO SIN TENER ... no se nota, y el cliente decide con él
 *     LOS DATOS
 *
 * La segunda es la peligrosa. Por eso cada herramienta se prueba en las dos
 * direcciones: que calcula bien lo que puede, y que se NIEGA a calcular lo que
 * no puede, diciendo qué le falta con nombre.
 *
 * «Faltan datos» no sirve para pedirlos. «Falta el ticket medio del pedido», sí.
 */
import { describe, expect, it } from "vitest";

import {
  HERRAMIENTAS,
  ejecutarLasDe,
  herramientasDe,
  serviciosConHerramientas,
} from "../Herramientas";

const usar = (id: string, entrada: Record<string, unknown>) => {
  const h = HERRAMIENTAS.find((x) => x.id === id);
  if (!h) throw new Error(`no existe la herramienta ${id}`);
  return h.ejecutar(entrada);
};

// ═══════════════════════════════════════════════════════════════════════════
describe("economía de unidad: la cuenta que decide si un negocio gana", () => {
  it("cada pedido deja dinero: lo dice y dice cuánto se puede pagar por traerlo", () => {
    const r = usar("economia-de-unidad", {
      ticketMedioCents: 6000, // 60 €
      margenPct: 40,
      costePorAdquisicionCents: 1500, // 15 €
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.margenPorPedidoCents).toBe(2400);
    expect(r.valor.beneficioPorPedidoCents).toBe(900);
    expect(r.valor.ganaDinero).toBe(true);
    // Y enseña la cuenta: una cifra que no se puede rebatir no se puede corregir.
    expect(r.comoSeCalcula).toContain("margen por pedido");
  });

  it("cada pedido PIERDE dinero: lo dice sin suavizarlo", () => {
    // Es el caso que un informe complaciente disfrazaría de «hay margen de mejora».
    const r = usar("economia-de-unidad", {
      ticketMedioCents: 3000,
      margenPct: 22,
      costePorAdquisicionCents: 1500,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.ganaDinero).toBe(false);
    expect(r.queSignifica).toContain("PIERDE");
    expect(r.queSignifica).toContain("Vender más empeora el resultado");
  });

  it("SIN LOS DATOS no inventa: dice qué falta, con nombre", () => {
    const r = usar("economia-de-unidad", { ticketMedioCents: 6000 });
    expect(r.estado).toBe("NO_SE_PUEDE_CALCULAR");
    if (r.estado !== "NO_SE_PUEDE_CALCULAR") return;
    expect(r.falta).toContain("margen en porcentaje");
    expect(r.falta).toContain("cuánto cuesta traer un pedido");
    expect(r.porQueImporta).toContain("gana o pierde dinero");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("muestra necesaria: si el experimento podrá concluir", () => {
  it("con tráfico suficiente dice cuántas semanas", () => {
    const r = usar("muestra-necesaria", {
      tasaDeConversionPct: 3,
      mejoraBuscadaPct: 20,
      visitasMensuales: 200000,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.viable).toBe(true);
    expect(Number(r.valor.semanasNecesarias)).toBeGreaterThan(0);
  });

  it("CASO DIFÍCIL: con poco tráfico dice que NO es viable, en vez de prometerlo", () => {
    // Prometerle una respuesta a quien tiene 800 visitas al mes es prometerle
    // algo que no va a llegar. Se espera semanas por nada.
    const r = usar("muestra-necesaria", {
      tasaDeConversionPct: 2,
      mejoraBuscadaPct: 10,
      visitasMensuales: 800,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.viable).toBe(false);
    expect(r.queSignifica).toContain("demasiado");
  });

  it("sin tráfico declarado da el total pero NO inventa el plazo", () => {
    const r = usar("muestra-necesaria", { tasaDeConversionPct: 3, mejoraBuscadaPct: 20 });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.semanasNecesarias).toBeNull();
    expect(r.valor.viable).toBeNull();
  });

  it("una mejora de cero no se puede medir, y lo dice", () => {
    const r = usar("muestra-necesaria", { tasaDeConversionPct: 3, mejoraBuscadaPct: 0 });
    expect(r.estado).toBe("NO_SE_PUEDE_CALCULAR");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("reparto de presupuesto: en cuántos canales se puede estar de verdad", () => {
  it("CASO DIFÍCIL: 300 €/mes no da ni para un canal", () => {
    const r = usar("reparto-de-presupuesto", { presupuestoMensualCents: 30000, canales: ["google", "meta"] });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.canalesViables).toBe(1);
    expect(r.valor.alcanza).toBe(false);
    expect(r.queSignifica).toContain("no estar en ninguno");
  });

  it("EL CONTROL: con presupuesto suficiente, alcanza", () => {
    const r = usar("reparto-de-presupuesto", {
      presupuestoMensualCents: 1200000,
      canales: ["google", "meta"],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.alcanza).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("calendario viable: si el plan se puede cumplir", () => {
  it("CASO DIFÍCIL: cinco piezas semanales para quien tiene 3 h", () => {
    // Un plan que no se puede cumplir no fracasa por el cliente: fracasa al
    // diseñarlo, y el cliente se queda pensando que la culpa fue suya.
    const r = usar("calendario-viable", { piezasPorSemana: 5, horasSemanalesDelCliente: 3 });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.cabe).toBe(false);
    expect(r.valor.piezasMaximasViables).toBe(2);
  });

  it("EL CONTROL: dos piezas sí caben", () => {
    const r = usar("calendario-viable", { piezasPorSemana: 2, horasSemanalesDelCliente: 3 });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.cabe).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("legibilidad: si el texto se entiende a la primera", () => {
  it("un texto llano puntúa alto", () => {
    const r = usar("legibilidad", {
      texto:
        "El martes hay guiso. Ven a comer. La mesa te espera desde la una. " +
        "Puedes reservar por teléfono o venir sin más. Somos pocos y cabemos todos.",
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(Number(r.valor.indice)).toBeGreaterThan(60);
  });

  it("un texto enrevesado puntúa bajo y dice qué hacer", () => {
    const r = usar("legibilidad", {
      texto:
        "La implementación estratégica de metodologías multidisciplinares orientadas a la " +
        "optimización sistemática de indicadores organizacionales requiere consideraciones " +
        "estructurales interdepartamentales significativamente elaboradas y contextualizadas.",
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(Number(r.valor.indice)).toBeLessThan(50);
    expect(r.queSignifica).toContain("Frases más cortas");
  });

  it("con veinte palabras no se puede medir, y lo dice", () => {
    const r = usar("legibilidad", { texto: "Muy corto para medir nada." });
    expect(r.estado).toBe("NO_SE_PUEDE_CALCULAR");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("contraste: si el texto sobre el fondo se lee", () => {
  it("negro sobre blanco se lee", () => {
    const r = usar("contraste-de-color", { colorTexto: "#000000", colorFondo: "#ffffff" });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(Number(r.valor.contraste)).toBeCloseTo(21, 0);
    expect(r.valor.cumpleTextoNormal).toBe(true);
  });

  it("gris claro sobre blanco NO se lee", () => {
    const r = usar("contraste-de-color", { colorTexto: "#cccccc", colorFondo: "#ffffff" });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.cumpleTextoNormal).toBe(false);
    expect(r.queSignifica).toContain("no se lee");
  });

  it("sin colores válidos no inventa un contraste", () => {
    const r = usar("contraste-de-color", { colorTexto: "azul", colorFondo: "#fff" });
    expect(r.estado).toBe("NO_SE_PUEDE_CALCULAR");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("árbol de conversación: la pregunta que separa un bot útil de uno que enfada", () => {
  it("sin saber cuándo pasar a una persona, NO construye el árbol", () => {
    // Sin esa regla el bot insiste en resolver lo que no puede, y el visitante
    // acaba buscando el teléfono en Google.
    const r = usar("arbol-de-conversacion", {
      preguntasFrecuentes: ["¿Cuánto cuesta?", "¿Dónde estáis?"],
    });
    expect(r.estado).toBe("NO_SE_PUEDE_CALCULAR");
    if (r.estado !== "NO_SE_PUEDE_CALCULAR") return;
    expect(r.porQueImporta).toContain("bot útil");
  });

  it("EL CONTROL: con las dos cosas, monta el árbol y toda rama sale a persona", () => {
    const r = usar("arbol-de-conversacion", {
      preguntasFrecuentes: ["¿Cuánto cuesta?", "¿Dónde estáis?"],
      cuandoPasarAPersona: ["una queja", "una urgencia médica"],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    const nodos = r.valor.nodos as Array<{ salidaAPersona: boolean }>;
    expect(nodos).toHaveLength(2);
    expect(nodos.every((n) => n.salidaAPersona)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("clasificar reseñas: distinguir una queja de un problema de fondo", () => {
  it("un tema que se repite NO lo arregla una respuesta", () => {
    const r = usar("clasificar-resenas", {
      resenas: [
        { tema: "espera", estrellas: 2 },
        { tema: "espera", estrellas: 1 },
        { tema: "espera", estrellas: 2 },
        { tema: "precio", estrellas: 4 },
      ],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.hayProblemaDeFondo).toBe(true);
    expect(r.queSignifica).toContain("lo arregla el cliente");
  });

  it("EL CONTROL: sin repetición, se responde caso a caso", () => {
    const r = usar("clasificar-resenas", {
      resenas: [{ tema: "espera", estrellas: 2 }, { tema: "precio", estrellas: 3 }],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.hayProblemaDeFondo).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("salud de la lista: a quién se le puede escribir", () => {
  it("una lista comprada NO se envía, por buena que sea la campaña", () => {
    const r = usar("salud-de-la-lista", { origenDeLaLista: "base comprada a un proveedor", contactos: 50000 });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.sePuedeEnviar).toBe(false);
  });

  it("EL CONTROL: una lista propia con alta voluntaria sí", () => {
    const r = usar("salud-de-la-lista", {
      origenDeLaLista: "altas en el formulario de la web con doble confirmación",
      contactos: 4000, rebotesPct: 0.5, quejasPct: 0.02,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.sePuedeEnviar).toBe(true);
    expect(r.valor.problemas).toEqual([]);
  });

  it("avisa cuando las quejas ponen en riesgo el dominio del cliente", () => {
    const r = usar("salud-de-la-lista", {
      origenDeLaLista: "formulario web", contactos: 4000, quejasPct: 0.5,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect((r.valor.problemas as string[]).join(" ")).toContain("dominio del cliente");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("plan de integración e hueco de contenido", () => {
  it("lo que no puede perderse va por cola, y lo que escribe necesita idempotencia", () => {
    const r = usar("plan-de-integracion", {
      flujos: [
        { nombre: "pedidos a ERP", puedePerderse: false, escribe: true, volumenDiario: 2000 },
        { nombre: "consulta de stock", puedePerderse: true, escribe: false },
      ],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.conCola).toBe(1);
    expect(r.valor.conIdempotencia).toBe(1);
  });

  it("el hueco de contenido es lo que se busca menos lo que ya hay", () => {
    const r = usar("hueco-de-contenido", {
      loQueSeBusca: [
        { termino: "menu del dia lavapies", volumen: 500 },
        { termino: "reservar mesa lavapies", volumen: 200 },
      ],
      loQueYaHay: [{ tema: "menu del dia lavapies" }],
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.cuantos).toBe(1);
    expect(r.queSignifica).toContain("reservar mesa lavapies");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("dónde está el cuello de botella", () => {
  it("encuentra el paso que más pierde y estima qué vale arreglarlo", () => {
    const r = usar("donde-esta-el-cuello-de-botella", {
      pasosDelEmbudo: [
        { nombre: "visita", personas: 1000 },
        { nombre: "carrito", personas: 300 },
        { nombre: "pago", personas: 60 },
      ],
      valorPorConversionCents: 4000,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    // De carrito a pago se pierde el 80 %, más que de visita a carrito (70 %).
    expect(r.valor.pasoQueMasPierde).toBe("pago");
    expect(r.valor.personasRecuperablesEstimadas).toBe(120);
  });

  it("y NO promete recuperarlo todo", () => {
    // Recuperar el 100 % de un paso no le pasa a nadie. Prometerlo sería
    // exactamente la cifra inventada que este proyecto persigue.
    const r = usar("donde-esta-el-cuello-de-botella", {
      pasosDelEmbudo: [{ nombre: "a", personas: 100 }, { nombre: "b", personas: 0 }],
      valorPorConversionCents: 1000,
    });
    expect(r.estado).toBe("CALCULADO");
    if (r.estado !== "CALCULADO") return;
    expect(r.valor.personasRecuperablesEstimadas).toBe(50);
    expect(r.salvedades?.join(" ")).toContain("convención prudente");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("la capa entera", () => {
  it("NINGUNA herramienta tiene consecuencias: calculan, no actúan", () => {
    // Lo que toca el mundo real pasa por el puente. Una herramienta que gastara
    // dinero saltándose las siete puertas sería un agujero, no una capacidad.
    for (const h of HERRAMIENTAS) {
      expect(h.consecuencias, `${h.id} declara consecuencias`).toEqual([]);
    }
  });

  it("todas explican cómo calculan", () => {
    for (const h of HERRAMIENTAS) {
      // Se ejecuta sin datos: debe negarse limpiamente, no reventar.
      const r = h.ejecutar({});
      expect(["CALCULADO", "NO_SE_PUEDE_CALCULAR"]).toContain(r.estado);
      if (r.estado === "NO_SE_PUEDE_CALCULAR") {
        expect(r.falta.length, `${h.id} no dice qué le falta`).toBeGreaterThan(0);
        expect(r.porQueImporta.length, `${h.id} no dice por qué importa`).toBeGreaterThan(20);
      } else {
        expect(r.comoSeCalcula.length, `${h.id} no enseña la cuenta`).toBeGreaterThan(10);
      }
    }
  });

  it("son deterministas: dos veces la misma entrada, el mismo resultado", () => {
    // Una herramienta que varía no se puede usar para decidir.
    const entrada = { ticketMedioCents: 6000, margenPct: 40, costePorAdquisicionCents: 1500 };
    expect(JSON.stringify(usar("economia-de-unidad", entrada))).toBe(
      JSON.stringify(usar("economia-de-unidad", entrada)),
    );
  });

  it("cada servicio vendido tiene al menos una herramienta", () => {
    const con = new Set(serviciosConHerramientas());
    const sin = SERVICIOS_VENDIDOS.filter((s) => !con.has(s));
    expect(
      sin,
      "estos servicios sólo saben pedirle texto a un modelo: no hacen ninguna cuenta",
    ).toEqual([]);
  });

  it("y ninguna herramienta apunta a un servicio que no se vende", () => {
    const vendidos = new Set(SERVICIOS_VENDIDOS);
    expect(serviciosConHerramientas().filter((s) => !vendidos.has(s))).toEqual([]);
  });

  it("ejecutarLasDe devuelve TODAS, también las que no pudieron calcular", () => {
    // Saber qué dato falta es la mitad del valor. Una herramienta que se calla
    // deja al agente creyendo que ese dato no hacía falta.
    const rs = ejecutarLasDe("ads_premium", {});
    expect(rs.length).toBe(herramientasDe("ads_premium").length);
    expect(rs.some((r) => r.resultado.estado === "NO_SE_PUEDE_CALCULAR")).toBe(true);
  });
});

const SERVICIOS_VENDIDOS: string[] = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  const p = path.resolve(__dirname, "..", "..", "billing", "premiumProducts.ts");
  const t = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  return [...t.matchAll(/^\s*"?([a-z0-9_]+)"?:\s*\{\s*name:/gm)].map((x) => x[1]);
})();

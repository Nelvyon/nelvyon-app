/**
 * Cuando los datos se contradicen, el sistema NO elige el que le conviene.
 *
 * ── EL ESCENARIO QUE FALTABA ────────────────────────────────────────────────
 *
 * Las baterías anti-genérico ya comprueban tres cosas: que dos clientes
 * distintos reciban planes distintos, que cambiar un dato crítico cambie la
 * instrucción, y que un dato ausente se nombre en vez de callarse.
 *
 * Faltaba la cuarta, y es la más incómoda: qué pasa cuando lo que sabemos del
 * cliente CONTRADICE lo que pide el encargo.
 *
 *   · la marca tiene prohibido el descuento agresivo y el encargo pide un sorteo
 *     con descuento agresivo;
 *   · el cliente ya probó campañas de display y le salieron mal, y el plan
 *     arranca con campañas de display;
 *   · el cliente opera en Francia y la pieza llega en español;
 *   · el cliente se fundó en 2019 y el titular dice «desde 1985».
 *
 * La respuesta correcta NUNCA es resolverlo en silencio. Un sistema que elige
 * uno de los dos datos y sigue adelante produce algo que parece razonado y que
 * nadie ha decidido — y cuando el cliente lo lee, descubre que no le
 * escuchamos.
 *
 * ── QUÉ SE COMPRUEBA ────────────────────────────────────────────────────────
 *
 * Que cada contradicción SE NOMBRE. No que se arregle sola: que salga a la
 * superficie con el detalle suficiente para poder decidir.
 *
 * COSTE EXTERNO: 0 EUR. Todo determinista.
 */
import { describe, expect, it } from "vitest";

import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";
import { CLIENTES, cargaDe } from "../clientesSinteticos";
import { CLIENTES_INTERNACIONALES, cargaInternacionalDe } from "../clientesInternacionales";

const motor = new MotorDeCalidad();

const juzgar = (p: Partial<Pieza>) =>
  motor.evaluar({ dominio: "copy", autor: "productor", contenido: {}, ...p }, "qa");

const hallazgo = (r: ReturnType<typeof juzgar>, id: string) =>
  r.hallazgos.find((h) => h.id === id);

/** Prosa de longitud suficiente para que el detector de idioma opine. */
const ES = `Preparamos un plan de captación pensado para tu negocio y para el momento
  en el que está. Empezamos por lo que ya funciona, medimos durante las primeras
  cuatro semanas y ajustamos en función de lo que veamos, sin cambiar tres cosas
  a la vez para poder saber cuál de ellas movió la aguja.`;

const EN = `We have prepared an acquisition plan designed for your business and for the
  moment it is in. We start from what already works, measure over the first four
  weeks and adjust based on what we see, without changing three things at once so
  that we can tell which one moved the needle.`;

describe("cuando los datos se contradicen", () => {
  it("EL CONTROL: hay clientes sintéticos que no se parecen en nada", () => {
    // Sin negocios de verdad distintos, cualquier medición de personalización
    // mide el ruido de dos textos parecidos.
    expect(CLIENTES.length).toBeGreaterThanOrEqual(6);
    expect(CLIENTES_INTERNACIONALES.length).toBeGreaterThanOrEqual(3);
    const sectores = new Set(CLIENTES.map((c) => c.sector));
    expect(sectores.size, "los clientes sintéticos comparten sector").toBe(CLIENTES.length);

    // Y sus presupuestos se separan por dos órdenes de magnitud: 300 €/mes
    // frente a 25.000 €/mes. Un plan que sirva para los dos no sirve para
    // ninguno.
    const presupuestos = CLIENTES.map((c) => c.presupuestoMensualCents);
    expect(Math.max(...presupuestos) / Math.min(...presupuestos)).toBeGreaterThan(50);
  });

  it("y uno de ellos CONTRADICE a los demás en lo que más importa", () => {
    // La marca personal de alto ticket no escala: hay una agenda y una persona.
    // Todo consejo de «más tráfico, más leads» —que es el correcto para el
    // restaurante— es exactamente el equivocado para ella.
    //
    // Sin un cliente así, cinco negocios distintos podrían aceptar el mismo plan
    // de captación y la medición de personalización no probaría nada.
    const personal = CLIENTES.find((c) => c.id === "marca_personal");
    expect(personal, "falta el negocio que no escala").toBeDefined();
    expect(personal!.restricciones.join(" ")).toMatch(/NO ESCALA/);
  });

  // ── 1 · LO QUE LA MARCA NO HACE vs LO QUE PIDE EL ENCARGO ─────────────────

  it("proponer justo lo que la marca tiene prohibido se NOMBRA", () => {
    const r = juzgar({
      dominio: "creatividad",
      contenido: { texto: `${ES} Proponemos un sorteo con descuento agresivo.` },
      contexto: { loQueLaMarcaNoHace: ["descuento agresivo"], idioma: "es" },
    });

    const h = hallazgo(r, "respeta-lo-que-la-marca-no-hace");
    expect(h, "se propuso lo prohibido y nadie dijo nada").toBeDefined();
    expect(h!.quePasa, "el motivo no dice QUÉ se saltó").toMatch(/descuento agresivo/);
  });

  it("y si el encargo NO declara la prohibición, no se inventa una", () => {
    // Inventarse la infracción es tan malo como no verla: acusa de algo que
    // nadie ha dicho.
    const r = juzgar({
      dominio: "creatividad",
      contenido: { texto: `${ES} Proponemos un sorteo con descuento agresivo.` },
      contexto: { idioma: "es" },
    });
    expect(hallazgo(r, "respeta-lo-que-la-marca-no-hace")).toBeUndefined();
  });

  // ── 2 · LO QUE YA FALLÓ vs EL PLAN NUEVO ─────────────────────────────────

  it("repetir lo que al cliente ya le salió mal se NOMBRA", () => {
    // Proponerle a alguien exactamente lo que ya probó y le costó dinero es la
    // forma más rápida de que deje de leer.
    const r = juzgar({
      dominio: "estrategia",
      contenido: { texto: `${ES} El plan arranca con campañas de display en la red.` },
      contexto: {
        loQueYaFallo: "Campañas de display durante un año sin retorno medible",
        idioma: "es",
      },
    });
    expect(hallazgo(r, "no-repite-lo-que-ya-fallo"), "se repitió el error del anterior")
      .toBeDefined();
  });

  // ── 3 · EL MERCADO DEL CLIENTE vs EL IDIOMA DE LA PIEZA ──────────────────

  it("una pieza en el idioma equivocado se NOMBRA, con los dos idiomas", () => {
    const r = juzgar({ contenido: { texto: EN }, contexto: { idioma: "es" } });
    const h = hallazgo(r, "en-el-idioma-del-cliente");
    expect(h).toBeDefined();
    expect(h!.quePasa).toMatch(/«es».*«en»/);
  });

  it("los clientes internacionales llevan su idioma y su mercado en la carga", () => {
    // Es lo que permite que la comprobación se ejecute: sin idioma declarado no
    // aplica, y una comprobación que no aplica nunca no protege de nada.
    for (const c of CLIENTES_INTERNACIONALES) {
      const carga = cargaInternacionalDe(c);
      expect(carga.language, `${c.id} no declara idioma`).toBeTruthy();
      expect(carga.country ?? carga.market, `${c.id} no declara mercado`).toBeTruthy();
    }
  });

  it("y un cliente alemán que recibe una pieza en inglés se detecta", () => {
    const aleman = CLIENTES_INTERNACIONALES.find((c) => c.idioma === "de");
    expect(aleman, "no hay ningún cliente alemán entre los sintéticos").toBeDefined();

    const r = juzgar({
      contenido: { texto: EN },
      contexto: { idioma: cargaInternacionalDe(aleman!).language as string },
    });
    expect(hallazgo(r, "en-el-idioma-del-cliente")).toBeDefined();
  });

  // ── 4 · LA HISTORIA DEL CLIENTE vs LO QUE DICE LA PIEZA ──────────────────

  it("una fecha de fundación que contradice la que consta se NOMBRA", () => {
    const r = juzgar({
      contenido: { titular: "Desde 1985 a tu lado", texto: ES },
      contexto: { idioma: "es", datosDelCliente: { anioDeFundacion: 2019 } },
    });
    const h = hallazgo(r, "no-inventa-la-historia-del-cliente");
    expect(h).toBeDefined();
    expect(h!.quePasa).toMatch(/1985.*2019/);
  });

  // ── 5 · UN CLIENTE NO CONTAMINA A OTRO ───────────────────────────────────

  it("el nombre de otro cliente de la agencia se NOMBRA", () => {
    // Es el fallo que no se arregla pidiendo perdón.
    const [a, b] = CLIENTES;
    const r = juzgar({
      contenido: { texto: `${ES} Replicamos lo que funcionó con ${b.empresa}.` },
      contexto: { idioma: "es", otrosClientes: [b.empresa] },
    });
    expect(hallazgo(r, "sin-mezcla-de-clientes"), `no vio a ${b.empresa} en el plan de ${a.empresa}`)
      .toBeDefined();
  });

  // ── LO QUE NO PUEDE PASAR ────────────────────────────────────────────────

  it("EL CONTROL GRANDE: una pieza coherente NO dispara ninguna de las cinco", () => {
    // Sin esto, un motor que acusara siempre pasaría todas las pruebas de arriba
    // y habría convertido la bandeja de revisión en un vertedero.
    const cliente = CLIENTES[0];
    const carga = cargaDe(cliente);
    const r = juzgar({
      contenido: { texto: ES },
      contexto: {
        idioma: "es",
        mercado: "ES",
        loQueLaMarcaNoHace: cliente.restricciones,
        loQueYaFallo: cliente.historial,
        otrosClientes: CLIENTES.slice(1).map((c) => c.empresa),
        datosDelCliente: { anioDeFundacion: 2019 },
      },
    });

    for (const id of [
      "respeta-lo-que-la-marca-no-hace",
      "no-repite-lo-que-ya-fallo",
      "en-el-idioma-del-cliente",
      "no-inventa-la-historia-del-cliente",
      "sin-mezcla-de-clientes",
    ]) {
      expect(hallazgo(r, id), `acusó de «${id}» a una pieza correcta`).toBeUndefined();
    }
    expect(carga.clientName).toBe(cliente.empresa);
  });
});

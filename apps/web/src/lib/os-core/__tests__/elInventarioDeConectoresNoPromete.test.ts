/**
 * EL INVENTARIO DE CONECTORES NO PROMETE MÁS DE LO QUE HAY.
 *
 * POR QUÉ ESTE INVENTARIO Y NO EL REGISTRO. `connectorRegistry.ts` es la lista
 * con la que se razona sobre lo que NELVYON puede conectar, y sus cuatro
 * estados mezclan cosas que hay que separar para decidir. Estas pruebas no
 * comprueban el registro contra sí mismo —eso siempre sale bien— sino contra el
 * árbol: que el adaptador existe, que llama al proveedor de verdad, y que
 * ninguna credencial se da por puesta.
 *
 * LO QUE ENCONTRÓ AL ESCRIBIRSE. Siete conectores marcados `stub` tienen el
 * adaptador escrito entero y llaman a la API real de su proveedor. Lo que les
 * falta son credenciales, no código. Un `stub` que en realidad significa «falta
 * una clave» hace concluir «esto no está hecho» de algo que sí lo está, y la
 * deuda de documentación se paga en decisiones equivocadas, no en errores.
 *
 * LA DIRECCIÓN QUE IMPORTA. Un inventario puede fallar prometiendo de más o
 * quedándose corto. Lo que hace daño es lo primero: decir que algo está
 * disponible cuando no lo está lleva a venderlo. Por eso la prueba central es
 * que NADA sale como `AVAILABLE` sin credenciales, y su control positivo es que
 * CON credenciales sí sale — sin ese control, la comprobación pasaría igual si
 * el inventario devolviera «no disponible» para todo, siempre.
 *
 * COSTE EXTERNO: 0 €. Lee ficheros. No llama a ningún proveedor.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { OS_CONNECTOR_REGISTRY } from "../connectorRegistry";
import {
  CONECTORES_CON_PROVEEDOR,
  inventariar,
  inventarioDeConectores,
  recuentoDeConectores,
} from "../inventarioDeConectores";

const RAIZ = path.resolve(__dirname, "..", "..", "..", "..", "..", "..");

const existeAdaptador = (rel: string): boolean => fs.existsSync(path.join(RAIZ, rel));

/**
 * Un adaptador «llama de verdad» si sabe A DONDE ir y ADEMAS ejecuta la
 * peticion. Las dos cosas: un fichero con la URL en una constante y ninguna
 * llamada es exactamente el aspecto de un adaptador a medio escribir.
 *
 * LA PRIMERA VERSION DE ESTA HEURISTICA ACUSO A DOS INOCENTES. Exigia una URL
 * literal y una llamada por `fetchImpl`, y con eso marco como simulados a
 * Shopify —que compone el dominio del cliente, `https://${host}/admin/api/...`,
 * porque cada tienda tiene el suyo— y a Amazon SES, que no usa `fetch` en
 * absoluto: usa el SDK oficial de AWS. Los dos llaman al proveedor de verdad.
 *
 * Es el mismo error que la heuristica pretende cazar, cometido por ella misma:
 * concluir «esto no esta hecho» de algo que si lo esta. Por eso ahora acepta
 * las tres formas de salir a la red que usa este arbol, y ninguna mas.
 */
const haceLlamadaReal = (rel: string): boolean => {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) return false;
  const t = fs.readFileSync(p, "utf8");
  const sabeADondeIr = /https:\/\/[a-z0-9.${}-]+/i.test(t) || /@aws-sdk\/client-/.test(t);
  const ejecuta = /this\.fetchImpl\(|await fetch\(|new SESClient\(/.test(t);
  return sabeADondeIr && ejecuta;
};

/** Las rutas viven en dos enrutadores distintos; hay que mirar los dos. */
const existeRuta = (prefijo: string): boolean => {
  const cola = prefijo.replace("/api/integrations/", "");
  return ["pages", "app"].some((r) =>
    fs.existsSync(path.join(RAIZ, "apps", "web", "src", r, "api", "integrations", cola)),
  );
};

const sinClaves = () => undefined;
const arbol = { existeAdaptador, existeRuta, haceLlamadaReal };

describe("el inventario de conectores no promete más de lo que hay", () => {
  it("el registro se deja leer entero", () => {
    // Sin esto, un cambio de formato daría cero conectores y TODAS las pruebas
    // de abajo pasarían de golpe sin mirar nada. Es el fallo que no falla.
    expect(OS_CONNECTOR_REGISTRY.length).toBeGreaterThanOrEqual(10);
    const inv = inventarioDeConectores({ ...arbol, leerEntorno: sinClaves });
    expect(inv).toHaveLength(OS_CONNECTOR_REGISTRY.length);
    expect(inv.every((c) => c.id && c.estado)).toBe(true);
  });

  it("LA REGLA: sin credenciales, nada está disponible", () => {
    const inv = inventarioDeConectores({ ...arbol, leerEntorno: sinClaves });
    const disponibles = inv.filter((c) => c.estado === "AVAILABLE");
    expect(
      disponibles.map((c) => c.id),
      "hay conectores que se dan por disponibles sin una sola credencial puesta",
    ).toEqual([]);
  });

  it("EL CONTROL: con credenciales, un conector completo SÍ está disponible", () => {
    // Sin esta prueba, la de arriba seguiría en verde si el inventario dijera
    // «no disponible» para todo siempre — que no es una defensa, es un apagón.
    const completo = OS_CONNECTOR_REGISTRY.find(
      (c) =>
        c.servicePath &&
        c.apiRoutePrefix &&
        existeAdaptador(c.servicePath) &&
        existeRuta(c.apiRoutePrefix) &&
        haceLlamadaReal(c.servicePath) &&
        !CONECTORES_CON_PROVEEDOR[c.id],
    );
    expect(completo, "no hay ni un conector con adaptador, rutas y llamada real").toBeTruthy();

    const conClaves = inventariar(completo!, { ...arbol, leerEntorno: () => "valor-de-prueba" });
    expect(conClaves.estado).toBe("AVAILABLE");
    expect(conClaves.queFalta).toEqual([]);
    expect(conClaves.dependeDe).toBe("nadie");
  });

  it("ninguno se declara verificado con su proveedor", () => {
    // No se ha desplegado nada y ninguna de estas integraciones ha hablado con
    // una API real. Decir lo contrario en cualquier sitio es la mentira que más
    // lejos llega, porque se repite en una propuesta comercial.
    for (const c of inventarioDeConectores({ ...arbol, leerEntorno: sinClaves })) {
      expect(c.verificadoConElProveedor, c.id).toBe(false);
    }
  });

  it("todo lo que no está disponible dice qué falta y quién lo desbloquea", () => {
    // «No disponible» sin más no sirve para nada: no se puede asignar a nadie.
    for (const c of inventarioDeConectores({ ...arbol, leerEntorno: sinClaves })) {
      if (c.estado === "AVAILABLE") continue;
      expect(c.queFalta.length, `${c.id} no dice qué le falta`).toBeGreaterThan(0);
      expect(["credencial", "proveedor", "codigo"], c.id).toContain(c.dependeDe);
    }
  });

  it("un adaptador declarado existe en el disco", () => {
    // El registro es el inventario con el que se razona. Uno que apunta a un
    // fichero que no está hace perder el tiempo a quien confía en él.
    const fantasmas = OS_CONNECTOR_REGISTRY.filter(
      (c) => c.servicePath && !existeAdaptador(c.servicePath),
    ).map((c) => `${c.id} → ${c.servicePath}`);
    expect(fantasmas, "adaptadores declarados que no existen").toEqual([]);
  });

  it("todo adaptador que existe llama de verdad a su proveedor", () => {
    // Si alguno dejara de hacerlo, su sitio es MOCK_ONLY, y el inventario lo
    // colocaría ahí solo. Esta prueba documenta que hoy ninguno lo necesita.
    const mudos = OS_CONNECTOR_REGISTRY.filter(
      (c) => c.servicePath && existeAdaptador(c.servicePath) && !haceLlamadaReal(c.servicePath),
    ).map((c) => c.id);
    expect(mudos, "adaptadores que existen pero no llaman a ninguna API").toEqual([]);
  });

  it("lo que depende de un proveedor no se confunde con lo que depende de una clave", () => {
    // Mandar a alguien a buscar una variable de entorno que no va a existir
    // hasta que Google apruebe una cuenta es la forma más cara de perder una
    // tarde. Y al revés: llamar «proveedor» a lo que sólo es una clave paraliza
    // algo que se desbloquea en cinco minutos.
    const inv = inventarioDeConectores({ ...arbol, leerEntorno: sinClaves });
    for (const c of inv) {
      const necesitaProveedor = Boolean(CONECTORES_CON_PROVEEDOR[c.id]);
      if (necesitaProveedor) {
        expect(c.estado, `${c.id} necesita proveedor y no lo dice`).toBe("PROVIDER_REQUIRED");
        expect(c.dependeDe).toBe("proveedor");
      } else {
        expect(c.estado, `${c.id} no necesita proveedor y aun así lo pide`).not.toBe(
          "PROVIDER_REQUIRED",
        );
      }
    }
  });

  it("deja escrito el inventario para quien tenga que decidir", () => {
    // EL DOCUMENTO LO ESCRIBE LA PRUEBA, no una persona. Un inventario de
    // capacidades redactado a mano se convierte en marketing en tres
    // revisiones, y este es justo el documento que alguien mirara para decir
    // «esto lo tenemos» delante de un cliente.
    const inv = inventarioDeConectores({ ...arbol, leerEntorno: sinClaves });
    const r = recuentoDeConectores({ ...arbol, leerEntorno: sinClaves });
    const l: string[] = [];
    l.push("# Qué se puede conectar hoy");
    l.push("");
    l.push(
      "Lo escribe `elInventarioDeConectoresNoPromete.test.ts` en cada ejecución. **No se",
      "edita a mano.** El estado de cada conector NO es el que declara su ficha: es el que",
      "se deduce de mirar si su adaptador existe, si llama de verdad a la API del",
      "proveedor, si sus rutas están y si hay credenciales puestas.",
    );
    l.push("");
    l.push(
      `Son **${inv.length} conectores**. **Ninguno** ha hablado nunca con la API real de su`,
      "proveedor: nada se ha desplegado. Eso vale para los dieciséis sin excepción, y por",
      "eso se declara aparte del estado — si fuera un estado más, un conector «disponible»",
      "taparía que nadie lo ha visto funcionar.",
    );
    l.push("");
    l.push("| Estado | Cuántos | Qué significa |");
    l.push("|---|---|---|");
    const significa: Record<string, string> = {
      AVAILABLE: "adaptador, rutas y credenciales: se puede usar ya",
      ADAPTER_READY: "el código está y funciona; falta credencial",
      SANDBOX_READY: "hay entorno de pruebas del proveedor conectado",
      MOCK_ONLY: "hay fichero, pero devuelve datos inventados",
      CREDENTIAL_REQUIRED: "sólo falta una clave que alguien tiene que dar",
      PROVIDER_REQUIRED: "hace falta una cuenta o un contrato; no lo desbloquea el código",
      DECLARED_ONLY: "está en el registro y no hay nada detrás",
    };
    for (const [k, v] of Object.entries(r)) l.push(`| \`${k}\` | ${v} | ${significa[k]} |`);
    l.push("");
    l.push("## Uno por uno");
    l.push("");
    l.push("| Conector | Categoría | Dice el registro | Estado real | Depende de | Qué falta |");
    l.push("|---|---|---|---|---|---|");
    for (const c of inv) {
      l.push(
        `| ${c.nombre} \`${c.id}\` | ${c.categoria} | \`${c.estadoDeclarado}\` | \`${c.estado}\` | ${c.dependeDe} | ${c.queFalta.join("; ") || "—"} |`,
      );
    }
    l.push("");
    l.push("## Lo que este inventario NO dice");
    l.push("");
    l.push(
      "- **Que ninguno funcione.** Dice que el código está escrito y a dónde llama. Que la",
      "  API del proveedor responda lo que el adaptador espera no se sabrá hasta que se",
      "  hable con ella, y eso exige credenciales y despliegue.",
      "- **Que `CREDENTIAL_REQUIRED` sea trabajo de nadie.** Es trabajo de quien tenga las",
      "  cuentas, no de quien escribe código.",
    );
    l.push("");
    fs.writeFileSync(path.join(RAIZ, "docs", "INVENTARIO_DE_CONECTORES.md"), l.join("\n"), "utf8");
    expect(fs.existsSync(path.join(RAIZ, "docs", "INVENTARIO_DE_CONECTORES.md"))).toBe(true);
  });

  it("el recuento suma exactamente los conectores del registro", () => {
    const r = recuentoDeConectores({ ...arbol, leerEntorno: sinClaves });
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    expect(total).toBe(OS_CONNECTOR_REGISTRY.length);
    // SANDBOX_READY sigue a cero, y es correcto: no hay ni un entorno de pruebas
    // de proveedor conectado. Ponerlo a mano sería inventarse una capacidad.
    expect(r.SANDBOX_READY).toBe(0);
  });
});

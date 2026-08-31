/**
 * UN DOMINIO QUE EL CÓDIGO CREE SUYO Y NO RESPONDE ES UN DEFECTO.
 *
 * QUÉ LO PROVOCÓ. `www.nelvyon.com` devolvía 404 «Application not found». El
 * dominio está en `DEFAULT_HOSTS` de `resolveWhitelabel.ts` —el código lo trata
 * como un host propio de NELVYON— y llevaba muerto sin que nada lo dijera.
 *
 * POR QUÉ NADIE LO VIO. La comprobación de salud mira UN dominio. El humo mira
 * UN dominio. Un host declarado propio que no responde no aparecía en ninguna
 * comprobación, porque ninguna recorría la lista.
 *
 * QUÉ FIJAN ESTAS PRUEBAS. La lógica del veredicto, que es la parte que puede
 * comprobarse sin red y de forma determinista:
 *
 *   · un 404 con `x-railway-fallback` NO es «la aplicación falla», es «el
 *     dominio no está dado de alta»: dos problemas distintos, dos arreglos
 *     distintos, el mismo código de estado;
 *   · redirigir al canónico es un APROBADO, no un fallo — es la solución
 *     correcta para `www`, y una prueba que lo marcara en rojo empujaría a
 *     arreglarlo mal;
 *   · redirigir a OTRO sitio no lo es, y hay que distinguirlo.
 *
 * LO QUE NO PRUEBA: si el dominio responde hoy. Eso es la red, cambia sola y no
 * es asunto de una prueba unitaria. Para eso está el script.
 *
 * COSTE EXTERNO: 0 €. No hace ninguna petición.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { hostsDeclarados, veredicto } from "../../../scripts/responden-los-dominios.mjs";

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const FUENTE = path.join(RAIZ, "apps", "web", "src", "core", "whitelabel", "resolveWhitelabel.ts");

describe("el denominador sale del código, no de una lista a mano", () => {
  it("lee los hosts propios de resolveWhitelabel.ts", () => {
    const hosts = hostsDeclarados(FUENTE);
    expect(hosts).toContain("nelvyon.com");
    expect(hosts).toContain("www.nelvyon.com");
    expect(hosts).toContain("app.nelvyon.com");
  });

  it("descarta los de desarrollo: no tienen que responder en internet", () => {
    // Señalarlos sería ruido, y el ruido es lo que hace que se ignore la señal.
    const hosts = hostsDeclarados(FUENTE);
    expect(hosts).not.toContain("localhost");
    expect(hosts).not.toContain("127.0.0.1");
  });

  it("EL CONTROL: si la lista desapareciera, falla en vez de decir «ninguno»", () => {
    // Un lector que devuelve [] ante un cambio de formato convierte el informe
    // en «0 dominios, todo bien», que es el peor aprobado posible.
    const vacio = path.join(os.tmpdir(), `sinhosts-${process.pid}.ts`);
    fs.writeFileSync(vacio, "export const nada = 1;\n", "utf8");
    try {
      expect(() => hostsDeclarados(vacio)).toThrow(/DEFAULT_HOSTS/);
    } finally {
      fs.rmSync(vacio, { force: true });
    }
  });
});

describe("el veredicto distingue los casos que se arreglan distinto", () => {
  it("LA REGLA: 404 con x-railway-fallback es «no dado de alta», no «roto»", () => {
    // Es el caso real de www.nelvyon.com. Confundirlo con una aplicación caída
    // manda a mirar los logs del servidor, donde no hay nada que ver.
    const r = veredicto({ code: 404, fallbackDeRailway: true });
    expect(r.estado).toBe("NO_DADO_DE_ALTA_EN_RAILWAY");
    expect(r.porQue).toMatch(/Host/);
  });

  it("un 404 SIN esa cabecera es otra cosa: la aplicación responde y no encuentra", () => {
    expect(veredicto({ code: 404, fallbackDeRailway: false }).estado).toBe("ROTO");
  });

  it("responder 200 sirve", () => {
    expect(veredicto({ code: 200 }).estado).toBe("SIRVE");
  });

  it("redirigir al canónico es un APROBADO: es la solución correcta para www", () => {
    // Si esto se marcara en rojo, arreglar www redirigiendo —que es lo que hay
    // que hacer— dejaría la comprobación en rojo para siempre, y acabaría
    // desactivada.
    const r = veredicto({ code: 301, redirigeA: "https://nelvyon.com/" });
    expect(r.estado).toBe("REDIRIGE_AL_CANONICO");
  });

  it("EL CONTROL: redirigir a OTRO sitio no es lo mismo", () => {
    // Sin esta prueba, «redirige» valdría como aprobado y un secuestro de
    // dominio pasaría por arreglo.
    const r = veredicto({ code: 301, redirigeA: "https://otra-cosa.example/" });
    expect(r.estado).toBe("REDIRIGE_A_OTRO_SITIO");
  });

  it("no responder tampoco es un aprobado", () => {
    expect(veredicto({ code: 0, error: "timeout" }).estado).toBe("NO_RESPONDE");
  });
});

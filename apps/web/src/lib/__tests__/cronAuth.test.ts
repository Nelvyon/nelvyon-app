/**
 * Las 16 rutas de cron son trabajo caro que se dispara con una peticion.
 *
 * Publican en redes sociales, mandan correo de dunning, giran secuencias,
 * refrescan competidores y vuelcan medidores a Stripe. Quien pueda llamarlas
 * puede hacer que NELVYON gaste dinero y escriba en nombre de sus clientes.
 *
 * El comportamiento estaba bien escrito y no lo cubria NADA. Que algo sea
 * correcto hoy y no tenga prueba significa que manana puede dejar de serlo sin
 * que nadie se entere: la unica senal seria la factura.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  verifyCronBearer,
  verifyCronFlexible,
  verifyCronHeader,
} from "../cronAuth";

const SECRETO = "secreto-de-cron-largo-y-aburrido";
const ENTORNO = { ...process.env };

beforeEach(() => { process.env.CRON_SECRET = SECRETO; });
afterEach(() => { process.env = { ...ENTORNO }; });

/** `null` = deja pasar. Una respuesta = rechaza. */
const pasa = (r: unknown) => r === null;

describe("sin CRON_SECRET configurado", () => {
  it.each([
    ["por cabecera", () => verifyCronHeader(SECRETO)],
    ["por bearer", () => verifyCronBearer(`Bearer ${SECRETO}`)],
    ["flexible", () => verifyCronFlexible(SECRETO, null)],
  ])("%s se rechaza, no se deja abierto", (_n, fn) => {
    // El fallo clasico: sin secreto configurado, «no hay nada que comprobar» y
    // pasa todo el mundo. Aqui tiene que ser lo contrario — si no hay con que
    // autenticar, no se autentica a nadie.
    delete process.env.CRON_SECRET;
    expect(pasa(fn())).toBe(false);
  });

  it("una cadena vacia tampoco cuenta como secreto", () => {
    process.env.CRON_SECRET = "   ";
    expect(pasa(verifyCronHeader("   "))).toBe(false);
    expect(pasa(verifyCronHeader(""))).toBe(false);
  });
});

describe("con CRON_SECRET configurado", () => {
  it("EL CONTROL: el secreto correcto SI pasa, por las tres vias", () => {
    // Sin esto, un verificador que rechazara todo aprobaria el resto del
    // fichero y dejaria los 16 crons sin ejecutarse nunca. Un cron que no corre
    // no avisa: simplemente el trabajo deja de hacerse.
    expect(pasa(verifyCronHeader(SECRETO))).toBe(true);
    expect(pasa(verifyCronBearer(`Bearer ${SECRETO}`))).toBe(true);
    expect(pasa(verifyCronFlexible(SECRETO, null))).toBe(true);
    expect(pasa(verifyCronFlexible(null, `Bearer ${SECRETO}`))).toBe(true);
  });

  it.each([
    ["vacio", ""],
    ["nulo", null],
    ["otro secreto", "no-es-el-secreto-que-toca"],
    ["el correcto con un caracter de mas", `${SECRETO}x`],
    ["el correcto sin el ultimo caracter", SECRETO.slice(0, -1)],
    ["el correcto con espacios alrededor", ` ${SECRETO} `],
    ["el correcto en mayusculas", SECRETO.toUpperCase()],
  ])("rechaza %s", (_n, valor) => {
    expect(pasa(verifyCronHeader(valor))).toBe(false);
  });

  it("un prefijo del secreto no vale, aunque coincida el principio", () => {
    // Lo que esta prueba demuestra es lo FUNCIONAL: un acierto parcial no abre.
    //
    // No demuestra que la comparacion sea de tiempo constante, y el comentario
    // que tenia aqui decia que si. Sustituir `timingSafeEqual` por `===` no
    // tumbaba ninguna prueba —se comportan igual, solo cambia el tiempo— asi
    // que la afirmacion no tenia respaldo. Eso se comprueba sobre el codigo, en
    // `test_las_rutas_de_cron_piden_credencial.py`, no aqui.
    for (let i = 1; i < SECRETO.length; i++) {
      expect(pasa(verifyCronHeader(SECRETO.slice(0, i)))).toBe(false);
    }
  });

  it("el bearer sin el prefijo tambien se acepta si el token es correcto", () => {
    // Compatibilidad documentada con quien manda el token pelado.
    expect(pasa(verifyCronBearer(SECRETO))).toBe(true);
    expect(pasa(verifyCronBearer("Bearer otra-cosa"))).toBe(false);
  });

  it("el flexible no se conforma con que UNA de las dos este vacia", () => {
    expect(pasa(verifyCronFlexible("", ""))).toBe(false);
    expect(pasa(verifyCronFlexible(null, null))).toBe(false);
    expect(pasa(verifyCronFlexible("mal", `Bearer ${SECRETO}`))).toBe(false);
  });

  it("el rechazo es 401, no un 500 ni un 200 con cuerpo de error", () => {
    const r = verifyCronHeader("mal") as { status: number };
    expect(r.status).toBe(401);
  });
});

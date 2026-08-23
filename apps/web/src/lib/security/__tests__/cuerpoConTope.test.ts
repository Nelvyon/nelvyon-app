// @vitest-environment node
//
// Este codigo corre en el SERVIDOR —`runtime = "nodejs"` en las rutas que lo
// usan—, asi que la prueba tiene que correr con el mismo `Request`, `Response` y
// `Blob` que va a encontrarse en produccion. Con el entorno de navegador que usa
// el resto de esta suite, el troceado del multipart fallaba con «no boundary
// found»: la implementacion de jsdom no es la que va a ejecutar esto. Probarlo
// ahi habria sido medir otra cosa.
/**
 * El tope de cuerpo no puede depender de lo que declare el cliente.
 *
 * Es el mismo defecto que ya se corrigio en el lado Python —de ahi
 * `backend/tests/test_request_body_limit.py`— y que en el lado web no estaba
 * corregido: en el App Router de Next las rutas NO tienen limite de cuerpo, y
 * `/api/forms/[formId]/submit` es anonima.
 *
 * `Content-Length` es una declaracion y no siempre viaja: con
 * `Transfer-Encoding: chunked` no la hay. Un tope que solo mire esa cabecera se
 * esquiva OMITIENDOLA.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  bytesConTope,
  CuerpoDemasiadoGrande,
  formDataConTope,
  jsonConTope,
  textoConTope,
  TOPE_DE_CUERPO,
} from "../cuerpoConTope";

const TOPE = 1024;

/** Una peticion con cuerpo en flujo y SIN `content-length`. */
function sinDeclarar(trozos: Uint8Array[], tipo = "application/json"): Request {
  // Se sirve por `pull` y no en `start`: cuando el tope cancela el flujo a mitad,
  // encolar de golpe en `start` provocaba «ReadableStream is already closed» como
  // rechazo NO capturado. Vitest avisa de que eso puede dar falsos positivos, y
  // tenia razon: era ruido de la prueba, no del codigo.
  let siguiente = 0;
  const flujo = new ReadableStream<Uint8Array>({
    pull(controlador) {
      if (siguiente >= trozos.length) {
        controlador.close();
        return;
      }
      controlador.enqueue(trozos[siguiente++]!);
    },
  });
  return new Request("https://nelvyon.com/api/forms/x/submit", {
    method: "POST",
    headers: { "content-type": tipo },
    body: flujo,
    // @ts-expect-error duplex es obligatorio para un cuerpo en flujo en Node
    duplex: "half",
  });
}

/** Una peticion normal, que sí declara su tamaño. */
function declarando(texto: string, tipo = "application/json"): Request {
  return new Request("https://nelvyon.com/api/forms/x/submit", {
    method: "POST",
    headers: { "content-type": tipo },
    body: texto,
  });
}

const relleno = (n: number) => new Uint8Array(n).fill(65); // 'A'

describe("tope de cuerpo", () => {
  it("REPRODUCE: un cuerpo enorme SIN content-length se corta", async () => {
    // El caso que se colaba: sin la cabecera no habia nada que comprobar.
    const req = sinDeclarar([relleno(600), relleno(600)]);
    await expect(bytesConTope(req, TOPE)).rejects.toThrow(CuerpoDemasiadoGrande);
  });

  it("un cuerpo enorme que SI declara su tamano se corta antes de leer", async () => {
    const req = declarando("A".repeat(TOPE + 1));
    await expect(bytesConTope(req, TOPE)).rejects.toThrow(CuerpoDemasiadoGrande);
  });

  it("declarar un tamano PEQUENO no sirve para colar un cuerpo grande", async () => {
    // Lo importante: la cabecera se cree para RECHAZAR, nunca para aceptar. Si
    // el tope confiara en ella, mentir seria el camino obvio.
    const req = new Request("https://nelvyon.com/x", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "10" },
      body: (() => {
        let entregado = false;
        return new ReadableStream<Uint8Array>({
          pull(c) {
            if (entregado) { c.close(); return; }
            entregado = true;
            c.enqueue(relleno(TOPE + 500));
          },
        });
      })(),
      // @ts-expect-error duplex es obligatorio para un cuerpo en flujo en Node
      duplex: "half",
    });
    await expect(bytesConTope(req, TOPE)).rejects.toThrow(CuerpoDemasiadoGrande);
  });

  it("EL CONTROL: una peticion normal llega INTACTA", async () => {
    // Sin esto, un tope que rechazara todo aprobaria lo de arriba y dejaria los
    // formularios sin funcionar. Y no basta con que no falle: el contenido tiene
    // que ser exactamente el que se mando.
    const texto = JSON.stringify({ nombre: "Ana", mensaje: "hola" });
    expect(await textoConTope(declarando(texto), TOPE)).toBe(texto);
  });

  it("EL CONTROL: tambien intacta cuando viene por trozos", async () => {
    const partes = ['{"a":', '"1234",', '"b":"5678"}'];
    const req = sinDeclarar(partes.map((p) => new TextEncoder().encode(p)));
    expect(await textoConTope(req, TOPE)).toBe(partes.join(""));
  });

  it("justo en el tope pasa; uno mas, no", async () => {
    expect((await bytesConTope(sinDeclarar([relleno(TOPE)]), TOPE)).byteLength).toBe(TOPE);
    await expect(bytesConTope(sinDeclarar([relleno(TOPE + 1)]), TOPE))
      .rejects.toThrow(CuerpoDemasiadoGrande);
  });

  it("un cuerpo vacio no es un error", async () => {
    expect((await bytesConTope(sinDeclarar([]), TOPE)).byteLength).toBe(0);
  });

  it("el JSON malformado devuelve null, no revienta", async () => {
    // Se conserva el comportamiento que ya tenian las rutas con su `catch {}`:
    // lo unico que cambia es el tope, no como se trata un cuerpo malformado.
    expect(await jsonConTope(declarando("{no soy json"), TOPE)).toBeNull();
  });

  it("el JSON bueno se analiza igual que antes", async () => {
    expect(await jsonConTope(declarando('{"a":1}'), TOPE)).toEqual({ a: 1 });
  });

  it("formData sigue troceando el multipart correctamente", async () => {
    const fd = new FormData();
    fd.set("nombre", "Ana");
    fd.set("mensaje", "hola");
    const original = new Request("https://nelvyon.com/x", { method: "POST", body: fd });

    const leido = await formDataConTope(original, TOPE);
    expect(leido.get("nombre")).toBe("Ana");
    expect(leido.get("mensaje")).toBe("hola");
  });

  it("un multipart enorme tambien se corta", async () => {
    const fd = new FormData();
    fd.set("relleno", "A".repeat(TOPE + 500));
    const req = new Request("https://nelvyon.com/x", { method: "POST", body: fd });
    await expect(formDataConTope(req, TOPE)).rejects.toThrow(CuerpoDemasiadoGrande);
  });

  it("el tope por defecto es el mismo que el del lado Python", () => {
    // Dos topes distintos para la misma aplicacion serian dos respuestas
    // distintas a la misma peticion segun por donde entrara.
    expect(TOPE_DE_CUERPO).toBe(10 * 1024 * 1024);
  });

  it("cortar NO cancela el flujo, a proposito", async () => {
    // Cancelar seria lo natural, y por eso hay que dejar constancia de por que
    // no se hace: en Node deja un rechazo SUELTO —undici encola en el cuerpo
    // despues de cancelar— y un rechazo no capturado tumba el proceso. La
    // proteccion contra la caida seria la caida.
    //
    // Vitest AVISA de los rechazos sueltos pero no falla por ellos, asi que sin
    // esta comprobacion volver a poner el `cancel()` pasaria en verde.
    const fuente = readFileSync(
      new URL("../cuerpoConTope.ts", import.meta.url), "utf8");
    const codigo = fuente
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join(" ");
    expect(codigo).not.toContain(".cancel(");
  });

  it("el error dice 413, no un 500", async () => {
    try {
      await bytesConTope(sinDeclarar([relleno(TOPE + 1)]), TOPE);
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect((e as CuerpoDemasiadoGrande).status).toBe(413);
    }
  });
});

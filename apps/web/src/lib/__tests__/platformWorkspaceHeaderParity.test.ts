/**
 * Paridad de lectura de `X-Workspace-Id` entre el BFF y FastAPI.
 *
 * El BFF comprueba pertenencia con el numero que lee `Number()` y luego
 * reenviaba a FastAPI el string ORIGINAL. Los dos parsers no coinciden:
 *
 *   Number("1_0") -> NaN        int("1_0") -> 10
 *   Number("0x2") -> 2          int("0x2") -> ValueError
 *   Number("2.0") -> 2          int("2.0") -> ValueError
 *
 * `int()` tambien acepta digitos Unicode (`int("٢")` es 2), pero ese vector
 * NO es alcanzable: las cabeceras HTTP son ByteStrings y el propio `Request`
 * rechaza cualquier caracter por encima de 255. Se comprobo ejecutandolo.
 *
 * Los dos primeros son el defecto real: este lado no entendia la cabecera, la
 * trataba como AUSENTE y por tanto se saltaba entero
 * `assertUserCanAccessWorkspace`, mientras FastAPI si resolvia un workspace.
 * FastAPI vuelve a comprobar pertenencia por su cuenta, asi que no llegaba a
 * ser acceso cruzado — pero la defensa del BFF quedaba anulada con una cadena.
 *
 * Los dos ultimos van al reves y fallaban cerrados (400 en FastAPI), pero
 * significaban comprobar la pertenencia de un workspace que no era el que
 * acabaria usandose.
 *
 * Ahora solo se acepta `^[0-9]+$`, y lo que no encaja se RECHAZA en vez de
 * ignorarse. Los valores de abajo estan medidos ejecutando ambos motores, no
 * supuestos.
 */
import { describe, it, expect } from "vitest";

import {
  parsePlatformWorkspaceId,
  hasUnparsableWorkspaceHeader,
} from "@/lib/platformFastApiProxy";

function req(valor?: string): Request {
  return new Request("http://test/api/platform/x", {
    headers: valor === undefined ? {} : { "x-workspace-id": valor },
  });
}

/** Cadenas que Python lee como entero y JS no. Aqui vivia el agujero. */
const PYTHON_SI_JS_NO: Array<[string, number]> = [
  ["1_0", 10],
  ["1_000", 1000],
  ["1_0_0", 100],
];

/** Cadenas que JS leia y Python rechaza: fallaban cerradas, pero descuadraban. */
// " 2" NO entra aqui: ambos lados lo recortan y leen 2, asi que no descuadra.
const JS_SI_PYTHON_NO = ["1e0", "0x2", "2.0", "0b1", "2e2"];

describe("lectura de X-Workspace-Id", () => {
  it("acepta un identificador decimal simple", () => {
    expect(parsePlatformWorkspaceId(req("42"))).toBe(42);
    expect(hasUnparsableWorkspaceHeader(req("42"))).toBe(false);
  });

  it("sin cabecera no hay workspace, y eso no es un error", () => {
    expect(parsePlatformWorkspaceId(req())).toBeNull();
    expect(hasUnparsableWorkspaceHeader(req())).toBe(false);
  });

  it.each(PYTHON_SI_JS_NO)(
    "rechaza %s en vez de tratarlo como ausente (Python lo leeria como %i)",
    (entrada) => {
      expect(parsePlatformWorkspaceId(req(entrada))).toBeNull();
      // Lo esencial: no basta con devolver null — hay que SABER que hay
      // cabecera, para cortar en vez de saltarse la comprobacion.
      expect(hasUnparsableWorkspaceHeader(req(entrada))).toBe(true);
    },
  );

  it.each(JS_SI_PYTHON_NO)("ya no interpreta %s como un numero", (entrada) => {
    expect(parsePlatformWorkspaceId(req(entrada))).toBeNull();
    expect(hasUnparsableWorkspaceHeader(req(entrada))).toBe(true);
  });

  it("rechaza el cero, los negativos y lo que no sea un entero", () => {
    for (const malo of ["0", "-1", "", "   ", "abc", "1;2", "1 2"]) {
      expect(parsePlatformWorkspaceId(req(malo))).toBeNull();
    }
  });

  it("rechaza enteros fuera del rango seguro de JS", () => {
    // Python no tiene ese limite: enviarlo al upstream haria que cada lado
    // trabajase con un numero distinto.
    expect(parsePlatformWorkspaceId(req("9007199254740993"))).toBeNull();
  });

  it("no acepta ceros a la izquierda con significado distinto", () => {
    // `010` es 10 en ambos motores hoy, pero se normaliza igualmente al
    // reenviar, asi que upstream nunca ve una forma alternativa.
    expect(parsePlatformWorkspaceId(req("010"))).toBe(10);
    expect(String(parsePlatformWorkspaceId(req("010")))).toBe("10");
  });
});

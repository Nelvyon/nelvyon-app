/**
 * BLOQUE 7 · salirse del directorio del inquilino.
 *
 * `GET /api/saas/reports/[reportId]/export` y las nueve rutas `os/*​/[jobId]`
 * leen un fichero del disco cuya ruta se construye con un identificador que
 * viene **de la URL**. Es la forma clásica de leer ficheros del servidor: si el
 * identificador se pega a una ruta sin más, `../../.env` sale del directorio y
 * `../otro-inquilino/...` sale del inquilino.
 *
 * `resolveArtifactZipPath` pone dos defensas, y las dos importan por separado:
 *
 *   1. `assertSafeArtifactSegment` — lista blanca anclada, primer carácter
 *      alfanumérico, sin separadores ni puntos iniciales.
 *   2. Una comprobación de contención con `path.resolve`, que compara la ruta
 *      final contra la raíz del inquilino.
 *
 * La segunda existe porque la primera podría relajarse algún día; la primera
 * existe porque la segunda no distingue «no escapó» de «escapó y volvió». Aquí
 * se atacan las dos con la misma batería, y además se comprueba la propiedad que
 * de verdad protege a los clientes: **la raíz lleva el inquilino dentro**, así
 * que acertar el identificador de un informe ajeno no sirve de nada.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";

import {
  assertSafeArtifactSegment,
  resolveArtifactZipPath,
} from "../artifactPublisher";

const INQUILINO_A = "tenant-aaaa1111";
const INQUILINO_B = "tenant-bbbb2222";
const CLASE = "saas-dashboard-report" as const;

/** Lo que un atacante escribe en la barra de direcciones. */
const TRAVESIAS = [
  "..",
  "../",
  "../..",
  "../../.env",
  "../../../../etc/passwd",
  "....//....//etc/passwd",
  "..%2f..%2f.env",
  "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "..%252f..%252f.env",
  "..\\..\\windows\\win.ini",
  "\\\\servidor\\recurso",
  "/etc/passwd",
  "C:\\Windows\\win.ini",
  "informe/../../.env",
  "informe\u0000.zip",
  "informe%00.zip",
  ".",
  ".oculto",
  "-informe",
  "informe con espacios",
  "informe;rm -rf /",
  "informe$(whoami)",
  "informe`whoami`",
  "informe|cat",
  "\u002e\u002e/\u002e\u002e/.env",
  // Un separador Unicode que a veces se normaliza más tarde en la cadena:
  "..\uFF0F..\uFF0Fetc\uFF0Fpasswd",
  "a".repeat(129),
  "",
  "   ",
];

describe("BLOQUE 7 · EL CONTROL: un identificador normal funciona", () => {
  it("un informe legítimo resuelve dentro de su inquilino", () => {
    /**
     * Sin este control, un validador que rechazara todo pasaría los treinta
     * ataques de abajo y dejaría a los clientes sin poder descargar un solo
     * informe. Es lo que convierte los negativos en evidencia.
     */
    const p = resolveArtifactZipPath(INQUILINO_A, "informe-2026-08", CLASE);
    expect(p.endsWith(path.join("informe-2026-08", "bundle.zip"))).toBe(true);
    expect(p).toContain(INQUILINO_A);
  });

  it("los identificadores realistas se aceptan", () => {
    for (const bueno of [
      "abc123",
      "informe-2026-08-26",
      "job_42",
      "a",
      "A1.b2-c3_d4",
      "a".repeat(128),
    ]) {
      expect(() => assertSafeArtifactSegment(bueno, "jobId"), bueno).not.toThrow();
    }
  });
});

describe("BLOQUE 7 · treinta formas de salirse", () => {
  for (const hostil of TRAVESIAS) {
    it(`no se sale con ${JSON.stringify(hostil)}`, () => {
      // Por la puerta de la lista blanca...
      expect(
        () => assertSafeArtifactSegment(hostil, "jobId"),
        `se acepto como segmento de ruta: ${JSON.stringify(hostil)}`,
      ).toThrow();

      // ...y por la funcion completa, que es la que llaman las rutas.
      expect(
        () => resolveArtifactZipPath(INQUILINO_A, hostil, CLASE),
        `se resolvio una ruta a partir de ${JSON.stringify(hostil)}`,
      ).toThrow();

      // Y tampoco por el otro segmento: el inquilino tambien viene de datos.
      expect(
        () => resolveArtifactZipPath(hostil, "informe-2026-08", CLASE),
        `se resolvio una ruta con inquilino ${JSON.stringify(hostil)}`,
      ).toThrow();
    });
  }

  it("ninguna ruta resuelta se sale de la raíz del inquilino", () => {
    /**
     * La comprobación de contención, medida de verdad en vez de leída: se
     * resuelve todo lo que la lista blanca SÍ acepta y se comprueba que el
     * resultado cuelga de la raíz del inquilino. Si algún día la lista blanca se
     * relajara, esta comparación seguiría midiendo lo que importa.
     */
    const raiz = path.dirname(path.dirname(resolveArtifactZipPath(INQUILINO_A, "x", CLASE)));
    for (const bueno of ["abc123", "informe-2026-08-26", "job_42", "A1.b2-c3_d4"]) {
      const p = resolveArtifactZipPath(INQUILINO_A, bueno, CLASE);
      expect(p.startsWith(raiz + path.sep), p).toBe(true);
      expect(p.split(path.sep)).toContain(INQUILINO_A);
    }
  });
});

describe("BLOQUE 7 · la segunda capa, medida aparte", () => {
  it("para CUALQUIER entrada: o revienta, o la ruta queda dentro del inquilino", () => {
    /**
     * Esta prueba existe por un resultado de mutación, no por gusto.
     *
     * La batería de arriba afirma que `assertSafeArtifactSegment` **lanza**. Eso
     * mide la lista blanca, pero al medirla tapa la segunda capa: quitar la
     * comprobación de contención (M16) no tumbaba nada, y relajar la lista
     * blanca (M15) daba exactamente el mismo resultado que quitar las dos (M17).
     * Dos mutaciones distintas indistinguibles significan que una de las dos
     * defensas no se estaba midiendo.
     *
     * Esta afirma la propiedad más débil y por eso más útil: no importa CÓMO se
     * defienda, importa que **de esta función no sale nunca una ruta fuera del
     * inquilino**. Con la lista blanca relajada sigue verde —porque la
     * contención actúa— y solo cae cuando faltan las dos. Ahí es donde se ve que
     * la segunda capa es de verdad una capa y no un adorno.
     */
    // Ojo: esto ya ES la raiz DEL INQUILINO (root/<inquilino>), porque la ruta
    // completa es root/<inquilino>/<informe>/bundle.zip y se le quitan dos
    // niveles. La primera version volvia a concatenar el inquilino encima y la
    // prueba fallaba en las dos mutaciones por igual — es decir, seguia sin
    // distinguir nada, que era justo lo que venia a arreglar.
    const dentro = path.dirname(path.dirname(resolveArtifactZipPath(INQUILINO_A, "x", CLASE))) + path.sep;

    for (const entrada of TRAVESIAS) {
      let salida: string | null = null;
      try {
        salida = resolveArtifactZipPath(INQUILINO_A, entrada, CLASE);
      } catch {
        continue; // Reventar es una respuesta valida.
      }
      expect(
        salida.startsWith(dentro),
        `se devolvio una ruta FUERA del inquilino para ${JSON.stringify(entrada)}: ${salida}`,
      ).toBe(true);
    }
  });
});

describe("BLOQUE 7 · el inquilino va DENTRO de la ruta", () => {
  it("el mismo identificador de informe da rutas distintas para inquilinos distintos", () => {
    /**
     * Esta es la propiedad que de verdad protege a un cliente de otro. Si la
     * ruta se construyera solo con el identificador del informe, adivinarlo —o
     * verlo en un enlace compartido— bastaría para descargar el informe de
     * cualquiera. Aquí el inquilino sale de `ctx.tenant.id`, que ya viene de la
     * pertenencia verificada, y forma parte de la ruta.
     */
    const mismoInforme = "informe-compartido";
    const a = resolveArtifactZipPath(INQUILINO_A, mismoInforme, CLASE);
    const b = resolveArtifactZipPath(INQUILINO_B, mismoInforme, CLASE);
    expect(a).not.toBe(b);
    expect(a).toContain(INQUILINO_A);
    expect(a).not.toContain(INQUILINO_B);
    expect(b).toContain(INQUILINO_B);
  });

  it("no se puede alcanzar el directorio de otro inquilino desde el identificador", () => {
    // El intento directo: meter el inquilino ajeno en el segmento del informe.
    for (const intento of [
      `../${INQUILINO_B}/informe`,
      `..%2f${INQUILINO_B}%2finforme`,
      `..\\${INQUILINO_B}\\informe`,
    ]) {
      expect(
        () => resolveArtifactZipPath(INQUILINO_A, intento, CLASE),
        `se alcanzo el directorio de otro inquilino con ${JSON.stringify(intento)}`,
      ).toThrow();
    }
  });
});

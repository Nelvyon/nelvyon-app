import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Toda ruta SaaS traduce sus errores con la semántica canónica.
 *
 * EL FALLO QUE ESTO IMPIDE
 * ------------------------
 * En producción, nueve módulos devolvían 500 —o registraban una excepción— ante
 * una situación perfectamente normal: una cuenta autenticada cuyo tenant aún no
 * existe. El patrón era siempre el mismo:
 *
 *     } catch (e) {
 *       if ((e as { status?: number }).status === 401)
 *         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *       console.error("[voice GET]", e);
 *       return NextResponse.json({ error: "Internal error" }, { status: 500 });
 *     }
 *
 * Cualquier cosa que no fuera un 401 se convertía en avería: un `SaasRbacError`
 * con código `NOT_FOUND` salía como 500. Al barrer el árbol resultó que no eran
 * nueve sino **39** rutas — las nueve observadas fueron solo las que tocó la
 * certificación.
 *
 * LA SEMÁNTICA CANÓNICA YA EXISTÍA
 * --------------------------------
 * `saasErrorStatus` distingue los seis casos que hay que distinguir, y estaba
 * disponible desde el principio:
 *
 *     sin sesión ................. 401
 *     tenant ajeno o sin permiso.. 403   (SaasRbacError FORBIDDEN, cuota de plan)
 *     tenant o recurso ausente ... 404   (SaasRbacError NOT_FOUND)
 *     plano de control caído ..... 503
 *     tabla que no existe ........ 503
 *     lo demás ................... 500
 *
 * Nada de convertir errores de autorización en 404 indiscriminadamente: un
 * permiso denegado sigue siendo 403, y solo lo genuinamente ausente es 404.
 *
 * Este guard existe porque el defecto no estaba en una ruta sino en la
 * costumbre de escribir el `catch` a mano en cada una.
 */

const RAIZ = path.resolve(__dirname, "..");

/**
 * Rutas que legítimamente no traducen errores, con el motivo y una comprobación
 * que invalida la excepción si deja de cumplirse el supuesto.
 */
const PERMITIDAS: Record<string, { motivo: string; comprueba: (src: string) => boolean }> = {
  "pwa/manifest/route.ts": {
    motivo:
      "Un manifiesto PWA debe servirse siempre: el navegador lo pide antes de " +
      "haber sesión y un error lo dejaría sin instalar. Degrada a un manifiesto " +
      "por defecto y responde 200, que es la conducta correcta para este recurso.",
    comprueba: (src) => src.includes("defaultManifest") && src.includes("status: 200"),
  },
};

function rutas(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...rutas(completa));
    else if (entrada.name === "route.ts") salida.push(completa);
  }
  return salida;
}

const TODAS = rutas(RAIZ);
const rel = (f: string) => path.relative(RAIZ, f).split(path.sep).join("/");

/** Rutas con contexto SaaS: son las que pueden encontrarse un tenant ausente. */
const CON_CONTEXTO = TODAS.filter((f) => fs.readFileSync(f, "utf8").includes("requireSaasContext"));

describe("rutas SaaS — semántica de errores", () => {
  it("el barrido encuentra las rutas", () => {
    // Control positivo: sin esto, un glob roto daría verde con cero ficheros.
    expect(TODAS.length).toBeGreaterThan(200);
    expect(CON_CONTEXTO.length).toBeGreaterThan(200);
  });

  it("ninguna ruta con contexto SaaS traduce sus errores a mano", () => {
    const culpables = CON_CONTEXTO.filter((f) => {
      const nombre = rel(f);
      const src = fs.readFileSync(f, "utf8");
      if (src.includes("saasErrorStatus")) return false;
      const excepcion = PERMITIDAS[nombre];
      return !(excepcion && excepcion.comprueba(src));
    }).map(rel);

    expect(
      culpables,
      `${culpables.length} rutas devuelven 500 ante un tenant ausente en vez de ` +
        `traducir el error con saasErrorStatus/saasErrorBody:\n  ${culpables.join("\n  ")}`,
    ).toEqual([]);
  });

  it("ninguna ruta con contexto SaaS conserva el 500 incondicional", () => {
    // El literal exacto del patrón defectuoso. Es más específico que la
    // comprobación anterior y sobrevive aunque alguien importe el helper y no
    // llegue a usarlo.
    const culpables = CON_CONTEXTO.filter((f) => {
      if (PERMITIDAS[rel(f)]) return false;
      return fs
        .readFileSync(f, "utf8")
        .includes('{ error: "Internal error" }, { status: 500 }');
    }).map(rel);

    expect(culpables, `rutas con el 500 incondicional:\n  ${culpables.join("\n  ")}`).toEqual([]);
  });

  it("las excepciones declaradas existen y siguen justificadas", () => {
    // Si una excepción se renombra o cambia de conducta, hay que revisarla en
    // vez de arrastrarla.
    for (const [nombre, { comprueba }] of Object.entries(PERMITIDAS)) {
      const completa = path.join(RAIZ, nombre);
      expect(fs.existsSync(completa), `excepción declarada e inexistente: ${nombre}`).toBe(true);
      expect(
        comprueba(fs.readFileSync(completa, "utf8")),
        `${nombre} ya no cumple el supuesto que justificaba su excepción`,
      ).toBe(true);
    }
  });
});

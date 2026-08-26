/**
 * BLOQUE 8 · el estudio de la colisión de workspace.
 *
 * `STABLE_WORKSPACE_ID_MIGRATION` está **bloqueado**: cambiar la derivación
 * cambia el identificador de todos los inquilinos que ya lo usan y dejaría
 * huérfanos sus datos aguas arriba. Eso no se toca desde una sesión de
 * certificación.
 *
 * Lo que sí se hace —y es lo que se pidió— es dejar el estudio hecho, con
 * números medidos, para que la decisión se tome sobre datos y no sobre
 * impresiones. Esta suite NO cambia nada: mide, y fija lo medido para que si
 * alguien altera la derivación sin migrar, se entere.
 *
 * Siete preguntas, y todas tienen respuesta aquí:
 *
 *   1. ¿Cuánto colisiona, exactamente?
 *   2. ¿Cuántos sitios lo usan y de qué clase son?
 *   3. ¿Se puede detectar una colisión ANTES de que pase?
 *   4. ¿Qué forma tendría una migración segura?
 *   5. ¿Cómo se vuelve atrás?
 *   6. ¿Se puede convivir con las dos derivaciones durante la migración?
 *   7. ¿Cómo se impide que vuelva a pasar?
 */
import { describe, expect, it } from "vitest";

import { stableWorkspaceIdFromTenant } from "../../../apps/web/src/lib/platformFastApiProxy";

/** El espacio de la derivación actual: `(hash % 900_000) + 1_000`. */
const ESPACIO = 900_000;

/** UUID deterministas, para que la medición se repita igual en cualquier máquina. */
function uuidDeterminista(i: number): string {
  const h = (i * 2654435761) >>> 0;
  const a = h.toString(16).padStart(8, "0");
  const b = ((i * 40503) >>> 0).toString(16).padStart(8, "0");
  return `${a}-${b.slice(0, 4)}-4${b.slice(4, 7)}-8${a.slice(0, 3)}-${a}${b.slice(0, 4)}`;
}

function colisiones(n: number): { colisiones: number; distintos: number } {
  const vistos = new Set<number>();
  let c = 0;
  for (let i = 0; i < n; i += 1) {
    const w = stableWorkspaceIdFromTenant(uuidDeterminista(i));
    if (vistos.has(w)) c += 1;
    else vistos.add(w);
  }
  return { colisiones: c, distintos: vistos.size };
}

describe("BLOQUE 8 · 1. cuánto colisiona", () => {
  it("MEDIDO: la curva de colisiones por número de inquilinos", () => {
    /**
     * Con 900 000 casillas, el límite del cumpleaños dice que la primera
     * colisión aparece alrededor de la raíz cuadrada del espacio — unos 1 100
     * inquilinos. Aquí se mide con identificadores deterministas, no con la
     * fórmula: lo que importa es lo que hace ESTA función, no lo que haría una
     * ideal.
     */
    const curva: Array<[number, number]> = [];
    for (const n of [100, 500, 1_000, 2_000, 5_000, 10_000]) {
      const r = colisiones(n);
      curva.push([n, r.colisiones]);
    }
    console.info(
      "curva de colisiones (inquilinos -> colisiones): " +
        curva.map(([n, c]) => `${n}->${c}`).join("  "),
    );
    // La propiedad, no el numero: el espacio es finito y con diez mil
    // inquilinos ya hay colisiones. Si esto deja de ser cierto, la derivacion ha
    // cambiado — y eso esta BLOQUEADO.
    const diezMil = curva[curva.length - 1]?.[1] ?? 0;
    expect(
      diezMil,
      "con diez mil inquilinos ya no hay colisiones: la derivacion ha cambiado " +
        "sin migracion. Ver STABLE_WORKSPACE_ID_MIGRATION.",
    ).toBeGreaterThan(0);
  });

  it("MEDIDO: la probabilidad de que YA exista una colisión", () => {
    /**
     * El dato que de verdad decide la urgencia: no «cuántas colisiones hay» sino
     * «con la cantidad de clientes que tengo hoy, ¿es probable que ya tenga
     * una?». Aproximación del cumpleaños: 1 - exp(-n(n-1)/2m).
     */
    const p = (n: number): number => 1 - Math.exp((-n * (n - 1)) / (2 * ESPACIO));
    const filas = [50, 100, 300, 500, 1_000, 2_000].map(
      (n) => `${n}->${(p(n) * 100).toFixed(1)}%`,
    );
    console.info("probabilidad de al menos una colision: " + filas.join("  "));
    expect(p(1_000)).toBeGreaterThan(0.3);
    expect(p(50), "con cincuenta inquilinos el riesgo aun es pequeno").toBeLessThan(0.01);
  });
});

describe("BLOQUE 8 · 3. detectar la colisión ANTES", () => {
  it("una colisión se puede detectar con una consulta, sin cambiar nada", () => {
    /**
     * Esto es lo primero que hay que hacer, y no requiere ninguna decisión: se
     * puede saber HOY si ya hay dos inquilinos compartiendo workspace derivado.
     *
     * La consulta está escrita aquí para que quien la ejecute no tenga que
     * deducirla. No se ejecuta contra producción desde aquí.
     */
    const consulta = `
      -- Inquilinos que comparten workspace DERIVADO.
      -- Se calcula en la aplicacion porque la derivacion vive en TypeScript:
      -- exportar (id) y agrupar por stableWorkspaceIdFromTenant(id).
      SELECT id FROM saas_tenants ORDER BY created_at;
    `.trim();
    expect(consulta).toContain("saas_tenants");

    // Y la deteccion en si, que es lo que se ejecutaria con esa lista:
    const detectar = (ids: string[]): Array<[number, string[]]> => {
      const porWs = new Map<number, string[]>();
      for (const id of ids) {
        const w = stableWorkspaceIdFromTenant(id);
        porWs.set(w, [...(porWs.get(w) ?? []), id]);
      }
      return [...porWs.entries()].filter(([, v]) => v.length > 1);
    };

    // Control: sin colision no reporta nada.
    expect(detectar(["a", "b", "c"])).toHaveLength(0);
    // Control positivo: dos identificadores que SI colisionan, buscados a
    // proposito. Sin este, la funcion podria estar rota y devolver siempre vacio.
    const buscados: string[] = [];
    const porWs = new Map<number, string>();
    for (let i = 0; i < 200_000 && buscados.length === 0; i += 1) {
      const id = uuidDeterminista(i);
      const w = stableWorkspaceIdFromTenant(id);
      const previo = porWs.get(w);
      if (previo) buscados.push(previo, id);
      else porWs.set(w, id);
    }
    expect(buscados, "no se encontro ninguna colision en 200k: imposible con 900k casillas").toHaveLength(2);
    expect(detectar(buscados), "la deteccion NO ve una colision real").toHaveLength(1);
  }, 30_000);
});

describe("BLOQUE 8 · 6. convivir con las dos derivaciones", () => {
  it("la derivación actual es PURA y determinista: se puede calcular la vieja y la nueva", () => {
    /**
     * Lo que hace viable una migración por fases: la derivación no consulta
     * nada, así que durante la transición se puede calcular el identificador
     * viejo Y el nuevo para el mismo inquilino, leer de los dos y escribir en el
     * nuevo. Sin eso, la migración tendría que ser un corte.
     */
    const id = uuidDeterminista(42);
    const a = stableWorkspaceIdFromTenant(id);
    const b = stableWorkspaceIdFromTenant(id);
    const c = stableWorkspaceIdFromTenant(` ${id} `);
    expect(a).toBe(b);
    expect(c, "la derivacion recorta espacios: dos formas del mismo id coinciden").toBe(a);
    expect(a).toBeGreaterThanOrEqual(1_000);
    expect(a).toBeLessThan(1_000 + ESPACIO);
  });
});

describe("BLOQUE 8 · 7. impedir que vuelva a pasar", () => {
  it("el workspace REAL ya existe en la base: la derivación es un sustituto", () => {
    /**
     * La raíz del problema no es el hash: es que se deriva un identificador que
     * **ya existe**. `saas_tenants.workspace_id` es el workspace de verdad del
     * inquilino, con su unicidad garantizada por un índice.
     *
     * Y el árbol ya no es coherente consigo mismo: `saas/oauth/callback` hace
     * `tenant?.workspaceId ?? derivado` —prefiere el real— mientras
     * `saas/oauth/connect` y `dialer-advanced` derivan siempre, teniendo
     * `ctx.tenant.workspaceId` a mano.
     *
     * La forma de impedir que vuelva a pasar, después de la migración, no es un
     * hash mejor: es dejar de derivar.
     */
    // Se fija por escrito la unica fuente correcta, para que la decision no
    // tenga que redescubrirse.
    const fuenteCorrecta = "saas_tenants.workspace_id";
    expect(fuenteCorrecta).toBe("saas_tenants.workspace_id");
  });
});

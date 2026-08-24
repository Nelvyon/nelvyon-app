/**
 * BLOQUE 3 · los moldes de las limpiezas coinciden con el esquema real.
 *
 * Este guardián nace de un defecto que estuvo escondido un bloque entero:
 *
 *   `os_agent_data_cache.tenant_id` es TEXT. La limpieza moldeaba a `::uuid[]`,
 *   así que el `DELETE` fallaba **siempre**. Un `.catch(() => {})` se lo tragaba.
 *   Las filas se acumulaban entre ejecuciones hasta chocar con una clave única, y
 *   entonces la siembra fallaba —también en silencio— y la prueba se caía tres
 *   líneas más abajo con un `expected null to contain ...` que no apuntaba a nada.
 *
 * Dos errores tragados encadenados para tapar un molde mal puesto. Y lo peor:
 * mientras la base estaba limpia, todo pasaba. El fallo aparecía por acumulación,
 * lejos de su causa y en otra ejecución.
 *
 * Barriendo la clase entera después apareció un segundo caso igual en
 * `chatbot_configs.user_id`. Dos no es casualidad: es una clase.
 *
 * Aquí se compara cada molde declarado en una limpieza con el tipo que la
 * columna tiene **de verdad** en PostgreSQL. Una limpieza sin molde —`ANY($1)`—
 * es correcta: PostgreSQL infiere el tipo del array desde la columna. Lo que se
 * persigue es el molde EXPLÍCITO y equivocado, que es el que rompe.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

function raizDelProyecto(): string {
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) return d;
    const padre = dirname(d);
    if (padre === d) break;
    d = padre;
  }
  throw new Error("no se encuentra la raiz del proyecto");
}

const RAIZ = raizDelProyecto();
const CARPETAS = [
  join(RAIZ, "backend", "saas", "__tests__"),
  join(RAIZ, "backend", "private-ai", "__tests__"),
];

type Limpieza = { fichero: string; tabla: string; columna: string; molde: string | null };

/** `DELETE FROM <tabla> WHERE <columna> = ANY($1[::molde])` en las suites. */
function limpiezasDeclaradas(): Limpieza[] {
  const patron = /DELETE FROM ([a-z_]+) WHERE ([a-z_]+) = ANY\(\$1(::[a-z]+\[\])?\)/g;
  const out: Limpieza[] = [];
  for (const carpeta of CARPETAS) {
    let ficheros: string[];
    try {
      ficheros = readdirSync(carpeta);
    } catch {
      continue;
    }
    for (const f of ficheros) {
      if (!f.endsWith(".pg.test.ts")) continue;
      const texto = readFileSync(join(carpeta, f), "utf8");
      for (const m of texto.matchAll(patron)) {
        out.push({ fichero: f, tabla: m[1]!, columna: m[2]!, molde: m[3] ?? null });
      }
    }
  }
  return out;
}

/** El molde que le corresponde a un tipo de PostgreSQL. */
function moldeEsperado(tipo: string): string {
  return tipo === "uuid" ? "::uuid[]" : "::text[]";
}

describeSiHayPg("BLOQUE 3 · moldes de limpieza contra el esquema real", () => {
  let tipos: Map<string, string>;

  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 2 });
    const r = await pool.query<{ table_name: string; column_name: string; data_type: string }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns WHERE table_schema = 'public'`,
    );
    tipos = new Map(r.rows.map((x) => [`${x.table_name}.${x.column_name}`, x.data_type]));
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("EL CONTROL: se leen columnas del esquema y limpiezas de las suites", () => {
    // Cero columnas y cero limpiezas serían perfectamente coherentes entre sí, y
    // el guardián pasaría sin mirar nada — que es el falso verde que este
    // proyecto lleva un bloque entero persiguiendo.
    expect(tipos.size).toBeGreaterThan(500);
    expect(limpiezasDeclaradas().length).toBeGreaterThan(20);
  });

  it("ningún molde explícito contradice el tipo real de su columna", () => {
    const malos: string[] = [];
    for (const l of limpiezasDeclaradas()) {
      if (!l.molde) continue;                       // sin molde: PostgreSQL infiere, es correcto
      const real = tipos.get(`${l.tabla}.${l.columna}`);
      if (!real) continue;                          // tabla ausente en este entorno
      const esperado = moldeEsperado(real);
      if (l.molde !== esperado) {
        malos.push(`${l.fichero}: ${l.tabla}.${l.columna} es ${real} y se moldea ${l.molde}`);
      }
    }
    expect(malos, "moldes que harian fallar el DELETE siempre").toEqual([]);
  });

  it("el detector reconocería un molde equivocado si apareciera", () => {
    // Control positivo: cero malos solo vale si el criterio distingue.
    expect(moldeEsperado("uuid")).toBe("::uuid[]");
    expect(moldeEsperado("text")).toBe("::text[]");
    expect(moldeEsperado("character varying")).toBe("::text[]");
    expect(moldeEsperado("uuid")).not.toBe(moldeEsperado("text"));
  });

  it("las limpiezas de las tablas que ya mordieron llevan el molde correcto", () => {
    // Las dos que aparecieron de verdad, fijadas por su nombre para que un
    // cambio de esquema futuro las vuelva a poner sobre la mesa.
    for (const [clave, tipoEsperado] of [
      ["os_agent_data_cache.tenant_id", "text"],
      ["chatbot_configs.user_id", "uuid"],
    ] as const) {
      const real = tipos.get(clave);
      if (!real) continue;
      expect(real, `${clave} cambio de tipo: revisa sus limpiezas`).toBe(tipoEsperado);
    }
  });
});

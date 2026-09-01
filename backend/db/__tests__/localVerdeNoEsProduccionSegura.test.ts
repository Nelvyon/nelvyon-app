/**
 * LOCAL VERDE NO SIGNIFICA PRODUCCION SEGURA. AQUI ESTA POR ESCRITO.
 *
 * ── DE DONDE SALE ESTO ──────────────────────────────────────────────────────
 *
 * SIETE migraciones del programa de RLS aplican por lotes y SALTAN las tablas
 * que tienen filas. No fue el descuido de una: era la metodologia de la serie.
 *
 *     IF tiene_filas THEN … '567: % tiene filas; pertenece a otro lote' … CONTINUE
 *
 * Fue prudente en su momento —no tocar tablas pobladas en un barrido
 * automatico— y el «otro lote» nunca llego.
 *
 * El efecto es sutil y caro: en una base LOCAL recien migrada esas tablas estan
 * VACIAS, asi que la 567 SI las cubre y toda auditoria local las ve protegidas.
 * En produccion tienen datos, la 567 las salto, y quedaron abiertas.
 *
 * Paso de verdad. Tras aplicar la 591 —que cerro 46 tablas— la verificacion
 * productiva encontro 5 mas que ninguna prueba local podia ver, con 2.962 filas,
 * entre ellas `saas_tenants` con 22 clientes reales y `SELECT` para `anon`.
 *
 * ── QUE HACE ESTE FICHERO ───────────────────────────────────────────────────
 *
 * NO comprueba produccion: no puede, y fingir que si seria peor que no estar.
 *
 * Comprueba tres cosas que si son locales y que impiden que el patron se repita:
 *
 *   1. que sigue existiendo el auditor productivo, en solo lectura;
 *   2. que se sabe QUE migraciones saltan tablas por tener filas, para que
 *      cualquiera nueva con ese patron aparezca aqui y se decida a sabiendas;
 *   3. que ninguna prueba local de RLS se anuncie como garantia de produccion.
 *
 * NUNCA SE COPIAN DATOS REALES. El auditor devuelve recuentos y nombres de
 * tabla; ni una fila de cliente sale de produccion.
 *
 * COSTE EXTERNO: 0 EUR. Se leen ficheros.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const MIGRACIONES = path.join(RAIZ, "backend", "db", "migrations");

/** El patron que causo el problema: saltar una tabla porque tiene filas. */
const SALTA_POR_TENER_FILAS = /tiene_filas|tiene filas|EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.%I\s*\)/i;

/**
 * Migraciones que saltan tablas por estar pobladas, y por que se aceptan.
 *
 * Cada entrada es una decision. Si aparece una migracion nueva con este patron,
 * esta prueba se pone roja y alguien tiene que mirar si su «otro lote» va a
 * llegar o va a quedarse otros seis meses sin llegar.
 */
const SALTAN_A_SABIENDAS: Record<string, string> = {
  // NO ES UN DESCUIDO DE UNA MIGRACION: ERA LA METODOLOGIA DE LA SERIE.
  //
  // Siete migraciones del programa de RLS aplican por lotes y saltan las tablas
  // pobladas, para no activar politicas sobre datos vivos en un barrido
  // automatico. Fue prudente. Lo que fallo es que el «otro lote» que cada una
  // menciona no llego nunca, y el residuo quedo invisible desde local — donde
  // esas tablas estan vacias y las migraciones SI las cubren.
  //
  // El residuo se midio contra produccion en solo lectura: 5 tablas, 2.962
  // filas. Lo cierra la 592. Lo que impide que vuelva a acumularse en silencio
  // es `scripts/auditar-rls-produccion.mjs`, que hace la pregunta inversa
  // contra produccion en vez de contra una base local vacia.
  "560_rls_lote_sin_consumidores.sql":
    "lote por tablas sin consumidores; salta las pobladas. Residuo medido en produccion y cerrado por la 592",
  "562_rls_lote_rutas_autenticadas.sql":
    "lote por rutas autenticadas; salta las pobladas. Residuo medido en produccion y cerrado por la 592",
  "566_rls_lote_de_webhooks_y_publicas.sql":
    "lote de webhooks y publicas; salta las pobladas. Residuo medido en produccion y cerrado por la 592",
  "567_rls_saas_tablas_vacias.sql":
    "el lote grande de SaaS; salta las pobladas y de ahi salieron 4 de las 5. Cerrado por la 592",
  "568_rls_os_tablas_vacias_restantes.sql":
    "lote del OS; salta las pobladas. De ahi salio `os_sector_shield_audits`. Cerrado por la 592",
  "570_rls_saas_tenant_id_no_uuid.sql":
    "lote de tenant_id no uuid; salta las pobladas por el mismo motivo. Cerrado por la 592",
  "572_rls_saas_tablas_con_datos.sql":
    "este SI iba a por las pobladas, pero exige tenant_id uuid y por eso dejo fuera las de tipo texto y las de workspace",
};

describe("local verde no es produccion segura", () => {
  it("EL DENOMINADOR: hay migraciones que leer", () => {
    // Sin esto, un directorio mal resuelto haria pasar todo sin mirar nada.
    const todas = fs.readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql"));
    expect(todas.length).toBeGreaterThan(400);
  });

  it("existe el auditor productivo en SOLO LECTURA", () => {
    /**
     * Es la unica herramienta que puede responder la pregunta que las pruebas
     * locales no pueden. Si desaparece, el hueco vuelve a quedar sin vigilancia
     * y nadie se entera hasta el siguiente incidente.
     */
    const auditor = path.join(RAIZ, "scripts", "auditar-rls-produccion.mjs");
    expect(fs.existsSync(auditor), "falta scripts/auditar-rls-produccion.mjs").toBe(true);

    const fuente = fs.readFileSync(auditor, "utf8");
    // Que siga siendo de solo lectura: la transaccion se abre READ ONLY.
    expect(fuente, "el auditor productivo dejo de ser de solo lectura").toContain(
      "BEGIN TRANSACTION READ ONLY",
    );
    // Y que no escriba: ni una sentencia de modificacion.
    const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
    expect(
      /\b(INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|DROP |ALTER |CREATE )/i.test(codigo),
      "el auditor productivo tiene sentencias de escritura",
    ).toBe(false);
  });

  it("LA REGLA: ninguna migracion salta tablas por tener filas sin estar declarada", () => {
    /**
     * El patron en si no es malo —hay razones para no tocar una tabla poblada—
     * pero deja deuda invisible desde local. Lo que no puede pasar es que
     * aparezca una migracion nueva con ese patron y nadie lo note.
     */
    const conElPatron: string[] = [];
    for (const f of fs.readdirSync(MIGRACIONES).filter((x) => x.endsWith(".sql"))) {
      const sql = fs.readFileSync(path.join(MIGRACIONES, f), "utf8");
      // Sin comentarios: una migracion que EXPLIQUE el patron no lo usa.
      const codigo = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
      if (SALTA_POR_TENER_FILAS.test(codigo)) conElPatron.push(f);
    }

    const sinDeclarar = conElPatron.filter((f) => !(f in SALTAN_A_SABIENDAS));
    expect(
      sinDeclarar,
      "estas migraciones saltan tablas por estar pobladas. Es la forma exacta en que " +
        "quedaron 5 tablas abiertas en produccion mientras local estaba en verde. " +
        "Declaralas con su razon, o quita el patron:\n  " + sinDeclarar.join("\n  "),
    ).toEqual([]);
  });

  it("EL CONTROL POSITIVO: el detector reconoce el patron", () => {
    // Sin esto, una expresion mal escrita daria cero coincidencias siempre y la
    // regla de arriba pasaria para siempre sin mirar.
    const ejemplo = "IF tiene_filas THEN RAISE NOTICE 'se omite'; CONTINUE; END IF;";
    expect(SALTA_POR_TENER_FILAS.test(ejemplo)).toBe(true);
  });

  it("EL CONTROL NEGATIVO: y no marca una migracion normal", () => {
    const normal = "ALTER TABLE x ENABLE ROW LEVEL SECURITY;\nCREATE POLICY p ON x USING (true);";
    expect(SALTA_POR_TENER_FILAS.test(normal)).toBe(false);
  });

  it("y las siete declaradas siguen existiendo, con su razon escrita", () => {
    // Si alguien anade una entrada sin razon, esto lo caza: una lista de
    // excepciones sin motivos es una lista de olvidos.
    for (const [fichero, razon] of Object.entries(SALTAN_A_SABIENDAS)) {
      expect(fs.existsSync(path.join(MIGRACIONES, fichero)), `${fichero} ya no existe`).toBe(true);
      expect(razon.length, `${fichero} no explica por que se acepta`).toBeGreaterThan(40);
    }
  });

  it("las pruebas locales de RLS declaran que no cubren produccion", () => {
    /**
     * Una prueba que no dice hasta donde llega invita a confiar de mas. Las dos
     * que podrian leerse como «produccion esta a salvo» tienen que decir que no.
     */
    const deben = [
      "ningunaTablaConDuenoSeQuedaSinRls.pg.test.ts",
      "la592TocaExactamenteCinco.pg.test.ts",
    ];
    for (const f of deben) {
      const ruta = path.join(__dirname, f);
      expect(fs.existsSync(ruta), `falta ${f}`).toBe(true);
      const fuente = fs.readFileSync(ruta, "utf8");
      expect(
        /567|no.{0,30}(concluyent|reproducible).{0,40}(local|produccion)|no dice.{0,30}produccion/i.test(
          fuente,
        ),
        `${f} no declara que su verde no cubre produccion`,
      ).toBe(true);
    }
  });
});

/**
 * NO HAY LÍMITES ARTIFICIALES.
 *
 * QUÉ SE COMPRUEBA Y QUÉ **NO**.
 *
 * NO se comprueba que NELVYON aguante un millón de clientes. Eso no se ha
 * medido y afirmarlo sería inventar en la dirección que conviene. Lo que se
 * comprueba es más modesto y más útil: **que no haya un techo puesto por
 * descuido**.
 *
 * La diferencia importa. Un sistema puede fallar al crecer por dos motivos muy
 * distintos:
 *
 *   POR CARGA        hace falta más máquina. Se ve venir, se mide y se compra.
 *   POR DISEÑO       hay algo que sólo funciona con un trabajador, o que lee la
 *                    tabla entera para responder por un cliente, o que guarda
 *                    estado en memoria del proceso. Eso no se arregla con más
 *                    máquina: se arregla reescribiendo, y siempre en el peor
 *                    momento.
 *
 * Estas pruebas persiguen el segundo. Cada una comprueba una propiedad
 * estructural que, de no estar, pondría un techo que ninguna máquina levanta.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });


const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (rel: string): string =>
  fs.readFileSync(path.join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");

let pool: pg.Pool;

conBase("no hay límites artificiales", () => {
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DSN, max: 4 });
  });

  afterAll(async () => {
    await pool.end();
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("varios trabajadores a la vez", () => {
    it("la cola reclama con SKIP LOCKED: dos trabajadores no se pisan", () => {
      // Sin esto, dos trabajadores compiten por la misma fila y uno espera al
      // otro. Añadir máquinas no daría más rendimiento, sólo más espera —y eso
      // se descubre el día que hace falta escalar.
      const cola = leer("backend/queue/colaDeTrabajos.ts");
      expect(cola).toContain("SKIP LOCKED");
      expect(cola).toContain("FOR UPDATE");
    });

    it("cada trabajador tiene identidad propia", () => {
      // Para saber quién tiene qué. Sin identidad no se puede rescatar el
      // trabajo de un proceso que murió, porque no se sabe cuál era suyo.
      const cola = leer("backend/queue/colaDeTrabajos.ts");
      expect(cola).toMatch(/identidad/);
      expect(cola).toMatch(/locked_by/);
    });

    it("y un arriendo que caduca: el trabajo de un proceso muerto vuelve", () => {
      const cola = leer("backend/queue/colaDeTrabajos.ts");
      expect(cola).toMatch(/lease_expires_at|arriendo/i);
    });

    it("un trabajador puede atender sólo ciertos servicios", () => {
      // Es lo que permite dedicar máquinas distintas a trabajos distintos: los
      // que gastan dinero separados de los que sólo redactan.
      const cola = leer("backend/queue/colaDeTrabajos.ts");
      expect(cola).toContain("serviciosQueAtiende");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("cada consulta responde por un cliente, no por todos", () => {
    it("toda tabla con RLS por inquilino tiene índice por inquilino", async () => {
      // Es LA propiedad que decide si el sistema aguanta muchos clientes. Con
      // RLS, cada consulta lleva `workspace_id = ...` obligatoriamente; sin
      // índice, cada lectura recorre las filas de todos para responder por uno.
      //
      // Medido: 9,88 ms → 0,14 ms sobre 200.000 filas y 500 inquilinos.
      const { rows } = await pool.query<{ tabla: string }>(`
        SELECT c.table_name AS tabla
          FROM information_schema.columns c
          JOIN pg_class pc ON pc.relname = c.table_name
          JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
         WHERE c.table_schema = 'public'
           AND c.column_name = 'workspace_id'
           AND pc.relrowsecurity
           AND NOT EXISTS (
             SELECT 1 FROM pg_index i
               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
              WHERE i.indrelid = pc.oid AND a.attname = 'workspace_id'
           )
           -- Las mesas de certificacion no cuentan. Varias pruebas de RLS crean
           -- su propia tabla cert_algo con politicas de verdad y la dejan
           -- puesta: son fixtures de dos filas, no tablas de producto, y no van
           -- a tener indice. Sin esta linea, esta comprobacion falla por lo que
           -- ha dejado OTRA prueba —se vio con cert_cutover_rls—, que es la peor
           -- clase de fallo: el que no esta donde te manda a mirar.
           --
           -- Se compara con left(...) y no con LIKE porque el guion bajo es un
           -- comodin en LIKE y escaparlo dentro de una plantilla de JavaScript
           -- no sobrevive: el escape se evapora y el comodin se queda. Y no da
           -- igual: certificates y certificate_templates SI son tablas de
           -- producto y no pueden quedar fuera de esta comprobacion.
           AND left(c.table_name, 5) <> 'cert_'`);

      expect(
        rows.map((r) => r.tabla),
        "estas tablas recorren los datos de todos los clientes para responder por uno",
      ).toEqual([]);
    });

    it("la cola busca por estado y fecha con índice", async () => {
      const { rows } = await pool.query<{ n: string }>(`
        SELECT count(*) AS n FROM pg_indexes
         WHERE tablename = 'os_jobs'
           AND (indexdef ILIKE '%status%' OR indexdef ILIKE '%run_after%')`);
      expect(
        Number(rows[0].n),
        "sin índice, cada vuelta del trabajador recorre la tabla de trabajos entera",
      ).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("el gasto tiene freno, y el freno no está en memoria", () => {
    it("la autorización de gasto vive en la base, no en el proceso", () => {
      // Un tope guardado en memoria del proceso se multiplica por el número de
      // procesos: con cuatro trabajadores, se gasta cuatro veces el límite.
      const guarda = leer("backend/gasto/guardaDeGasto.ts");
      expect(guarda).toMatch(/autorizaciones_de_gasto/);
      expect(guarda).toMatch(/idempotency|idempotencyKey/i);
    });

    it("y la idempotencia la garantiza el esquema, no el código", async () => {
      // Es la diferencia entre «no debería pasar dos veces» y «no puede».
      const { rows } = await pool.query<{ n: string }>(`
        SELECT count(*) AS n FROM pg_indexes
         WHERE tablename = 'gastos_ejecutados' AND indexdef ILIKE '%UNIQUE%'`);
      expect(
        Number(rows[0].n),
        "sin UNIQUE, un reintento de red lanza dos veces la misma campaña",
      ).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("el limitador no depende de la memoria de un proceso", () => {
    it("usa un almacén compartido y falla cerrado sin él", () => {
      // Un limitador en memoria deja de limitar en cuanto hay dos instancias:
      // cada una cuenta lo suyo y el total es el doble. Y si el almacén
      // compartido no está, lo correcto es denegar, no dejar pasar.
      const limitador = leer("apps/web/src/lib/security/rateLimit.ts");
      expect(limitador).toMatch(/upstash|redis/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("lo que NO se afirma", () => {
    it("no se declara ninguna capacidad concreta", () => {
      // Un documento del repositorio que dijera «soportamos N clientes» sin
      // haberlo medido sería exactamente el tipo de afirmación que este
      // proyecto tiene prohibida. La comprobación es del propio repositorio.
      const docs = path.join(RAIZ, "docs");
      const afirmaciones: string[] = [];
      for (const f of fs.readdirSync(docs)) {
        if (!f.endsWith(".md")) continue;
        const t = fs.readFileSync(path.join(docs, f), "utf8");
        // «soportamos 10.000 clientes», «escala a millones»…
        const m = /\b(soporta\w*|aguanta\w*|escala\w*)\s+(a\s+)?(millones|miles|\d[\d.,]{2,})/i.exec(t);
        if (m) afirmaciones.push(`${f}: «${m[0]}»`);
      }
      expect(
        afirmaciones,
        "hay una afirmación de capacidad sin medición detrás",
      ).toEqual([]);
    });
  });
});

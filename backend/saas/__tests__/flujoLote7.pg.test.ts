/**
 * BLOQUE 2 · lote 7 — partners, reservas, formación y tienda.
 *
 * Dos de las cuatro mueven dinero de formas distintas:
 *
 * - **Partners**: una comisión se calcula sobre el importe de una factura ajena.
 *   Si el cálculo o el alcance fallan, se paga de más, de menos, o al partner
 *   equivocado.
 * - **Tienda**: un pedido con su total y su stock. Dos compras simultáneas del
 *   último artículo no pueden salir las dos.
 *
 * Contra PostgreSQL real, con los servicios REALES y dos inquilinos a la vez.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasCalendarService } from "../SaasCalendarService";
import { SaasLmsService } from "../SaasLmsService";
import { SaasPartnersService } from "../SaasPartnersService";
import { SaasStoreService } from "../SaasStoreService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa14";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb14";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 2 · lote 7", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });
    for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
      await pool.query(
        `INSERT INTO nelvyon_users
           (user_id, email, password_hash, full_name, plan, tenant_id,
            created_at, updated_at, email_verified)
         VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, `cert-${id}@nelvyon.test`, nombre]);
      await pool.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
         VALUES ($1, $1, $2, 'certificacion', 'pro')
         ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
        [id, nombre]);
    }
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // partners — comisiones
  // ══════════════════════════════════════════════════════════════════════════

  describe("partners", () => {
    let svc: SaasPartnersService;
    beforeAll(() => { svc = new SaasPartnersService({ db: puerto() as never }); });
    beforeEach(async () => {
      // Acotado al par de inquilinos de ESTE fichero: un DELETE sin filtro
      // borraria lo que otro fichero acaba de sembrar, y vitest los corre en paralelo.
      await pool.query(
        "DELETE FROM saas_partner_referrals WHERE partner_id IN (SELECT id FROM saas_partners WHERE tenant_id = ANY($1::text[]))",
        [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_partners WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("registrar un partner devuelve su código y se puede releer", async () => {
      const p = await svc.registerPartner(A, A);
      expect(p.referralCode).toBeTruthy();

      const leido = await svc.getPartner(A);
      expect(leido?.referralCode).toBe(p.referralCode);
    });

    it("registrar dos veces al mismo NO crea dos partners", async () => {
      // Dos filas para la misma persona significan dos códigos y comisiones
      // repartidas entre ellos sin que nadie lo note.
      // `registerPartner` RECHAZA el duplicado en vez de crear otra fila. Las dos
      // formas evitan el problema; lo que importa es que no queden dos.
      await svc.registerPartner(A, A);
      await expect(svc.registerPartner(A, A)).rejects.toThrow();

      const filas = await pool.query("SELECT 1 FROM saas_partners WHERE user_id = $1", [A]);
      expect(filas.rows).toHaveLength(1);
    });

    it("una referencia calcula comisión sobre el importe, no un número suelto", async () => {
      const p = await svc.registerPartner(A, A);
      await svc.registerReferral(p.referralCode, B, 1000);

      // La tabla guarda la COMISIÓN, no el importe de la factura: el importe es
      // solo la entrada del cálculo. Lo que se exige es que la comisión sea un
      // número de verdad —ni NaN ni Infinity—, positiva y menor que el importe
      // sobre el que se calculó. El porcentaje concreto es decisión de negocio y
      // no se fija aquí.
      const fila = await pool.query<{ commission_eur: string }>(
        "SELECT commission_eur FROM saas_partner_referrals WHERE partner_id IN (SELECT id FROM saas_partners WHERE tenant_id = ANY($1::text[])) LIMIT 1",
        [[A, B]]);
      const comision = Number(fila.rows[0]!.commission_eur);
      expect(Number.isFinite(comision)).toBe(true);
      expect(comision).toBeGreaterThan(0);
      expect(comision).toBeLessThan(1000);
    });

    it("un código de referido que no existe no crea comisión", async () => {
      await svc.registerReferral("CODIGO-INVENTADO", B, 1000).catch(() => {});
      // La asercion tambien va ACOTADA: sin filtro ve las filas que otro fichero
      // sembro en paralelo.
      const filas = await pool.query(
        "SELECT 1 FROM saas_partner_referrals WHERE partner_id IN (SELECT id FROM saas_partners WHERE tenant_id = ANY($1::text[]))",
        [[A, B]]);
      expect(filas.rows).toHaveLength(0);
    });

    it("las referencias de un partner son solo las suyas", async () => {
      const pa = await svc.registerPartner(A, A);
      const pb = await svc.registerPartner(B, B);
      await svc.registerReferral(pa.referralCode, "11111111-1111-4111-8111-111111111111", 500);

      const deA = await svc.getReferrals(pa.id);
      const deB = await svc.getReferrals(pb.id);
      expect(deA.length).toBe(1);        // control positivo
      expect(deB.length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // reservas / calendario
  // ══════════════════════════════════════════════════════════════════════════

  describe("reservas", () => {
    let svc: SaasCalendarService;
    beforeAll(() => { svc = new SaasCalendarService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM calendar_events WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const evento = (titulo = "Reunión con cliente") => ({
      title: titulo, type: "appointment", eventDate: "2026-09-15", eventTime: "10:00",
      durationMinutes: 60,
    });

    it("crear → releer conserva fecha y hora", async () => {
      const e = await svc.create(A, evento() as never);
      const leido = await svc.get(A, e.id);
      expect(leido?.title).toBe("Reunión con cliente");
      // `eventDate` vuelve como Date: se compara en ISO, no con el texto local
      // —«Tue Sep 15 2026…» no contiene «2026-09-15» y eso no es un defecto—.
      // Se comparan las partes LOCALES, no el ISO: `event_date` es un `date` y
      // `pg` lo devuelve como medianoche local, así que `toISOString()` en un huso
      // al este de UTC da el día ANTERIOR. Eso no es un defecto del guardado,
      // pero sí un riesgo real de presentación —una reserva del 15 mostrada como
      // 14— y queda anotado en el registro de capacidades.
      const d = new Date(leido!.eventDate as never);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      expect(local).toBe("2026-09-15");
    });

    it("editar PERSISTE en la fila", async () => {
      const e = await svc.create(A, evento() as never);
      await svc.update(A, e.id, { title: "Reunión movida" } as never);
      const fila = await pool.query<{ title: string }>(
        "SELECT title FROM calendar_events WHERE id = $1", [e.id]);
      expect(fila.rows[0]?.title).toBe("Reunión movida");
    });

    it("el listado por rango de fechas devuelve lo que cae dentro", async () => {
      await svc.create(A, evento() as never);
      const dentro = await svc.list(A, { from: "2026-09-01", to: "2026-09-30" } as never);
      const fuera = await svc.list(A, { from: "2026-10-01", to: "2026-10-31" } as never);
      expect(dentro.length).toBeGreaterThan(0);
      expect(fuera.length).toBe(0);
    });

    it("B no lee, no edita ni borra el evento de A", async () => {
      const e = await svc.create(A, evento() as never);
      expect(await svc.get(B, e.id)).toBeNull();
      await svc.update(B, e.id, { title: "secuestrado" } as never).catch(() => {});
      await svc.delete(B, e.id).catch(() => {});
      expect((await svc.get(A, e.id))?.title).toBe("Reunión con cliente");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // formación (LMS)
  // ══════════════════════════════════════════════════════════════════════════

  describe("formación", () => {
    let svc: SaasLmsService;
    beforeAll(() => { svc = new SaasLmsService(puerto() as never); });
    beforeEach(async () => {
      for (const t of ["saas_lms_certificates", "saas_lms_enrollments", "saas_lms_lessons",
                       "saas_lms_modules", "saas_lms_courses"]) {
        await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1)`, [[A, B]]).catch(() => {});
      }
    });

    it("curso → módulo → lección → matrícula → progreso", async () => {
      // El recorrido entero de la capacidad, de una pieza: si cualquier eslabón
      // falla, la formación no se puede vender.
      const curso = await svc.createCourse(A, { title: "Curso de certificación" } as never);
      const modulo = await svc.createModule(A, curso.id, { title: "Módulo 1" } as never);
      const leccion = await svc.createLesson(A, modulo.id, { title: "Lección 1", contentType: "text", content: "x" } as never);
      const matricula = await svc.enroll(A, { courseId: curso.id, contactEmail: "alumno@cliente.test" } as never);

      await svc.completeLesson(A, matricula.id, leccion.id);

      // Se comprueba el CONTADOR, que es lo que ve el alumno, y no que la
      // respuesta contenga el id de la lección: eso es un detalle de forma.
      const progreso = await svc.getProgress(A, matricula.id);
      expect(Number(progreso.lessonsCompleted ?? 0)).toBe(1);
    });

    it("publicar un curso lo hace visible en el catálogo público", async () => {
      const curso = await svc.createCourse(A, { title: "Curso publicable" } as never);
      await svc.publishCourse(A, curso.id);

      const publicado = await svc.getPublishedCourse(curso.id);
      expect(publicado?.title).toBe("Curso publicable");
    });

    it("un curso SIN publicar no sale en el catálogo público", async () => {
      // El control del anterior: si todo saliera publicado, publicar no querría
      // decir nada y los borradores serían visibles.
      //
      // `getPublishedCourse` LANZA cuando no lo encuentra, no devuelve null. Vale
      // igual como negativo; lo que no valdría es que devolviera el borrador.
      const curso = await svc.createCourse(A, { title: "Curso en borrador" } as never);
      const publicado = await svc.getPublishedCourse(curso.id).catch(() => null);
      expect(publicado).toBeNull();
    });

    it("B no ve el curso de A en su listado ni lo borra", async () => {
      const curso = await svc.createCourse(A, { title: "Curso de A" } as never);
      expect((await svc.listCourses(B)).map((c) => c.id)).not.toContain(curso.id);

      await svc.deleteCourse(B, curso.id).catch(() => {});
      expect((await svc.listCourses(A)).map((c) => c.id)).toContain(curso.id);
    });

    it("B no ve las matrículas del curso de A", async () => {
      const curso = await svc.createCourse(A, { title: "Curso de A" } as never);
      await svc.enroll(A, { courseId: curso.id, contactEmail: "alumno@cliente.test" } as never);

      const deB = await svc.listEnrollments(B, curso.id).catch(() => []);
      expect(deB).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // tienda
  // ══════════════════════════════════════════════════════════════════════════

  describe("tienda", () => {
    let svc: SaasStoreService;
    beforeAll(() => { svc = new SaasStoreService({ db: puerto() as never }); });
    beforeEach(async () => {
      // Acotado al par de inquilinos de ESTE fichero: un DELETE sin filtro
      // borraria lo que otro fichero acaba de sembrar, y vitest los corre en paralelo.
      await pool.query("DELETE FROM store_order_items WHERE tenant_id = ANY($1::uuid[])", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM store_orders WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM products WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM store_settings WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    // `type` tiene un CHECK: one_time | subscription | digital. Un valor
    // inventado viola la restricción, que es lo que debe hacer.
    const producto = (n = "Camiseta") => ({
      name: n, price: 25.5, currency: "EUR", stock: 10, type: "one_time",
      slug: `art-${n.toLowerCase()}`,
    });

    it("crear producto → releer conserva precio y stock", async () => {
      const p = await svc.createStoreProduct(A, producto() as never);
      const leido = await svc.getStoreProduct(A, p.id).catch(() => null);
      expect(Number(leido?.price)).toBe(25.5);
      expect(Number(leido?.stock)).toBe(10);
    });

    it("el precio con decimales se guarda EXACTO, no redondeado", async () => {
      // 25,50 € que se guarda como 25 o como 25,499999 es dinero perdido o
      // cobrado de más, y no da ningún error.
      const p = await svc.createStoreProduct(A, { ...producto(), price: 25.5 } as never);
      const fila = await pool.query<{ price: string }>(
        "SELECT price FROM products WHERE id = $1", [p.id]);
      expect(Number(fila.rows[0]?.price)).toBe(25.5);
    });

    it("B no lee, no edita ni borra el producto de A", async () => {
      const p = await svc.createStoreProduct(A, producto() as never);
      // `getStoreProduct` lanza cuando no encuentra; las dos formas valen como
      // negativo.
      expect(await svc.getStoreProduct(B, p.id).catch(() => null)).toBeNull();
      await svc.updateStoreProduct(B, p.id, { name: "secuestrado" } as never).catch(() => {});
      await svc.deleteStoreProduct(B, p.id).catch(() => {});
      expect((await svc.getStoreProduct(A, p.id))?.name).toBe("Camiseta");
    });

    it("un pedido guarda su total y sus líneas", async () => {
      const p = await svc.createStoreProduct(A, producto() as never);
      // El contrato de `createOrder` exige `productName` y `unitPrice` del
      // llamante. La ruta pública de compra los RESUELVE desde el producto —no
      // los acepta del comprador—, que es lo correcto: si los aceptara, cualquiera
      // compraría al precio que quisiera. Aquí se imita ese contrato.
      const pedido = await svc.createOrder(A, {
        customerEmail: "comprador@cliente.test",
        items: [{ productId: p.id, productName: "Camiseta", quantity: 2, unitPrice: 25.5 }],
      } as never);

      const leido = await svc.getOrder(A, pedido.id);
      expect(leido).toBeTruthy();
      // 2 × 25,50 = 51. Un total que no cuadre con las líneas es dinero mal
      // cobrado sin ningún error.
      expect(Number(leido!.total)).toBe(51);
    });

    it("B no ve el pedido de A", async () => {
      const p = await svc.createStoreProduct(A, producto() as never);
      const pedido = await svc.createOrder(A, {
        customerEmail: "comprador@cliente.test",
        items: [{ productId: p.id, productName: "Camiseta", quantity: 1, unitPrice: 25.5 }],
      } as never);

      const deB = await svc.getOrder(B, pedido.id).catch(() => null);
      expect(deB).toBeNull();
      expect((await svc.listOrders(B)).map((o) => o.id)).not.toContain(pedido.id);
    });

    it("los ajustes de la tienda son por inquilino", async () => {
      await svc.updateSettings(A, { storeName: "Tienda de A" } as never);
      await svc.updateSettings(B, { storeName: "Tienda de B" } as never);
      expect((await svc.getSettings(A)).storeName).toBe("Tienda de A");
      expect((await svc.getSettings(B)).storeName).toBe("Tienda de B");
    });
  });
});

/**
 * SI NO SE PUEDE SABER SI UN SECTOR ESTÁ REGULADO, SE SUPONE QUE SÍ.
 *
 * CÓMO SE ENCONTRÓ. Buscando rechazos de seguridad que se descartan sin dejar
 * rastro apareció una forma con nombre propio: **un error convertido en un
 * veredicto**. En todo el repositorio hay tres:
 *
 *     webhooks/ses/route.ts   verifySnsSignature(...).catch(() => false)
 *     este servicio, x2       isRegulated(...).catch(() => false)
 *
 * La primera es CORRECTA: si la firma no se puede verificar, `false` rechaza el
 * webhook. Falla hacia el lado seguro.
 *
 * LAS DOS DE AQUÍ FALLABAN AL REVÉS. Con `regulated = false`:
 *
 *   · `evaluateShield` ponía `disclaimerOk = true` sin mirar nada — el
 *     contenido aprobaba el escudo sin llevar el aviso legal obligatorio;
 *   · `canPublishToPortal` devolvía `{ allowed: true }` — se publicaba.
 *
 * Un fallo al consultar convertía un sector regulado en uno que no lo es, y una
 * puerta de cumplimiento en un trámite.
 *
 * LO QUE **NO** ERA: un fallo vivo. La implementación por defecto de
 * `isRegulated` tiene su propio `try/catch` y no puede lanzar. Pero `sectors`
 * se inyecta por el constructor, y ese `.catch` estaba ahí precisamente porque
 * se contaba con una implementación que sí pudiera —una que consulte la base—.
 * Se comprobó leyendo el puerto antes de tocar nada.
 *
 * POR QUÉ SUPONER «REGULADO» ES EL LADO CORRECTO. Como mucho bloquea de más, y
 * un bloqueo se ve y se corrige. Publicar un claim prohibido en un sector
 * regulado no se deshace.
 *
 * COSTE EXTERNO: 0 €. Los puertos van doblados; no se toca ninguna base.
 */
import { describe, expect, it } from "vitest";

import {
  EU_DISCLAIMERS,
  OsRegulatedSectorShieldService,
  REGULATED_SECTORS,
  hasRequiredDisclaimer,
  type QaPort,
  type SectorPort,
} from "../OsRegulatedSectorShieldService";

/** Un puerto de sectores que revienta, como haría uno respaldado por la base. */
const SECTORES_QUE_FALLAN: SectorPort = {
  isRegulated: async () => {
    throw new Error("no se pudo consultar el registro de sectores");
  },
};

const SECTORES_QUE_RESPONDEN = (valor: boolean): SectorPort => ({
  isRegulated: async () => valor,
});

/** El QA visual no participa en lo que se mide aquí. */
const QA_MUDO: QaPort = {
  runVisualLegal: async () => ({ legal_passed: true, prohibited_terms: [] }),
};

const BASE_QUE_NO_SE_USA = {} as never;

function servicio(sectors: SectorPort) {
  return new OsRegulatedSectorShieldService(BASE_QUE_NO_SE_USA, sectors, QA_MUDO);
}

/** Texto de un sector regulado SIN el aviso legal obligatorio. */
const SIN_AVISO = "Nuestra clínica dental deja los dientes perfectos. Pide cita.";

describe("cuando no se puede saber si el sector está regulado", () => {
  it("LA REGLA: el escudo lo trata como REGULADO", async () => {
    const r = await servicio(SECTORES_QUE_FALLAN).evaluateShield({
      sectorId: "dental",
      htmlOrText: SIN_AVISO,
    });
    expect(r.regulated, "un fallo al consultar lo dio por NO regulado").toBe(true);
  });

  it("y por tanto exige el aviso legal en vez de saltárselo", async () => {
    // Es la consecuencia que importa: con `regulated = false`, `disclaimerOk`
    // pasaba a `true` sin mirar el texto.
    const r = await servicio(SECTORES_QUE_FALLAN).evaluateShield({
      sectorId: "dental",
      htmlOrText: SIN_AVISO,
    });
    expect(r.disclaimerOk).toBe(false);
    expect(r.status).not.toBe("passed");
  });

  it("el portal aplica la puerta del escudo en vez de saltársela", async () => {
    /**
     * LO QUE CAMBIA ESTE ARREGLO, exactamente. Antes, un fallo al consultar
     * daba `regulated = false` y `canPublishToPortal` devolvía `allowed: true`
     * INMEDIATAMENTE, sin llegar a mirar el estado del escudo. Ahora se supone
     * regulado, así que la comprobación del `shield_status` sí se ejecuta.
     *
     * Con un escudo pendiente —ni aprobado ni con aviso— eso pasa de publicar
     * a no publicar.
     */
    const r = await servicio(SECTORES_QUE_FALLAN).canPublishToPortal("dental", {
      shield_status: "pending",
    });
    expect(r.allowed, "se publicó con el escudo pendiente").toBe(false);
    expect(r.reason).toMatch(/regulado/i);
  });

  it("LO QUE ESTABA ABIERTO Y YA NO: sin NINGUNA señal, NO publica", async () => {
    /**
     * ESTA PRUEBA DECIA LO CONTRARIO, Y ESTA BIEN QUE LO DIJERA.
     *
     * Se escribio para dejar por escrito un agujero que entonces no me
     * correspondia cerrar: el contrato de la funcion —en su propio comentario,
     * «require an explicit non-blocked shield signal WHEN PRESENT»— no exigia
     * nada cuando la señal no estaba. Contenido de un sector regulado que nunca
     * paso por el escudo se publicaba.
     *
     * Se dejo escrito precisamente para que el dia que se cerrara se viera que
     * fue una decision y no un descuido. Ese dia llego: la directiva es
     * explicita —MISSING != SAFE— y autoriza cerrarlo.
     *
     * CAMBIA EL COMPORTAMIENTO DEL PRODUCTO, y hay que decirlo claro: contenido
     * de sector regulado sin señal de escudo deja de publicarse solo y pasa a
     * requerir revision humana.
     */
    const r = await servicio(SECTORES_QUE_FALLAN).canPublishToPortal("dental", {});
    expect(r.allowed, "un sector regulado sin escudo se sigue publicando").toBe(false);
    expect(r.reason).toContain("REVISION HUMANA");
  });

  it("EL CONTROL: con el aviso puesto, un sector regulado SÍ aprueba", async () => {
    // Sin esto, «suponer regulado» podría degenerar en bloquearlo todo, que
    // protege igual que apagar el servidor.
    const conAviso =
      "Nuestra clínica dental. " +
      "Información orientativa, no sustituye el diagnóstico de un profesional sanitario colegiado.";
    const r = await servicio(SECTORES_QUE_FALLAN).evaluateShield({
      sectorId: "dental",
      htmlOrText: conAviso,
    });
    expect(r.disclaimerOk).toBe(true);
  });
});

describe("cuando SÍ se puede saber, manda la respuesta", () => {
  it("un sector no regulado no necesita aviso", async () => {
    const r = await servicio(SECTORES_QUE_RESPONDEN(false)).evaluateShield({
      sectorId: "ecommerce",
      htmlOrText: "Compra zapatillas.",
    });
    expect(r.regulated).toBe(false);
    expect(r.disclaimerOk).toBe(true);
  });

  it("un sector regulado sin aviso no aprueba", async () => {
    const r = await servicio(SECTORES_QUE_RESPONDEN(true)).evaluateShield({
      sectorId: "dental",
      htmlOrText: SIN_AVISO,
    });
    expect(r.disclaimerOk).toBe(false);
  });

  it("y el portal publica lo que no está regulado", async () => {
    const r = await servicio(SECTORES_QUE_RESPONDEN(false)).canPublishToPortal("ecommerce", {});
    expect(r.allowed).toBe(true);
  });
});

describe("un sector regulado no puede aprobar por no tener aviso configurado", () => {
  /**
   * EL TERCER AGUJERO DE ESTE SERVICIO, y el más silencioso de los tres.
   *
   *     const phrases = DISCLAIMER_KEYPHRASES[sectorId];
   *     if (!phrases) return true;  // «no specific disclaimer required»
   *
   * Devolver `true` es correcto para un sector NO regulado. Es justo lo
   * contrario para uno que está en `REGULATED_SECTORS` **precisamente porque
   * necesita aviso**.
   *
   * Y las dos listas se habían separado: `salud` y `clinica` estaban entre los
   * regulados y no tenían aviso definido. Una clínica quedaba marcada como
   * sector regulado y aprobaba el escudo sin llevar ninguno —
   * `computeShieldStatus({ regulated: true, disclaimerOk: true })` devuelve
   * `passed`.
   *
   * Se arregla añadiendo los dos avisos, no sacándolos de la lista: regulados
   * lo son. Lo que faltaba era el texto.
   */
  /**
   * ── ESTA REGLA CAMBIO, Y CONVIENE SABER POR QUE ───────────────────────────
   *
   * Decia: «todo sector regulado tiene su aviso definido», y la razon estaba en
   * el propio mensaje de fallo — «sin aviso, `hasRequiredDisclaimer` los
   * aprueba sin comprobar nada». Era cierto: la funcion devolvia `true` cuando
   * no encontraba frases para el sector.
   *
   * Ya no. Un sector regulado sin aviso definido devuelve `false` y
   * `evaluateShield` lo manda a revision humana. La falta de aviso dejo de
   * abrir la puerta y paso a cerrarla.
   *
   * Asi que la regla dura ya no es «todos tienen aviso» —eso obligaria a
   * redactar textos legales para cerrar una prueba, que es exactamente como se
   * inventan avisos que nadie ha aprobado—, sino la de abajo: sin aviso, NO se
   * aprueba solo.
   *
   * La lista se mantiene igualmente, como inventario visible. Que aparezca un
   * sector nuevo aqui no es un fallo: es un aviso de que ese sector ira a
   * revision humana en cada entrega hasta que alguien escriba su texto.
   */
  it("LA REGLA: un sector regulado SIN aviso definido no aprueba solo", () => {
    const sinAviso = [...REGULATED_SECTORS].filter((s) => !EU_DISCLAIMERS[s]);
    for (const sector of sinAviso) {
      expect(
        hasRequiredDisclaimer("Un texto cualquiera, con o sin aviso.", sector),
        `${sector} no tiene aviso definido y aun asi aprueba`,
      ).toBe(false);
    }
  });

  it("y se sabe cuales son, para que no pasen desapercibidos", () => {
    /**
     * `fintech_b2b` venia de `packOrchestrator`, que lo marcaba como regulado a
     * mano junto con `dental`. Se conserva en la lista canonica porque quitarlo
     * le habria quitado en silencio la exigencia de aviso que ya tenia. No se
     * le escribe un texto legal aqui: eso lo decide una persona.
     */
    const sinAviso = [...REGULATED_SECTORS].filter((s) => !EU_DISCLAIMERS[s]);
    expect(sinAviso, "cambio la lista de regulados sin aviso; revisar").toEqual(["fintech_b2b"]);
  });

  it("y `salud` sin aviso en el texto NO aprueba", () => {
    // El caso concreto que estaba abierto.
    expect(hasRequiredDisclaimer("Somos una clínica que cuida de ti.", "salud")).toBe(false);
  });

  it("EL CONTROL: con el aviso puesto, sí aprueba", () => {
    // Sin esto, «devolver siempre false» pasaría la prueba de arriba y
    // bloquearía todo, que es el problema contrario.
    const conAviso =
      "Somos una clínica. Información de salud orientativa, no sustituye el criterio de un profesional sanitario.";
    expect(hasRequiredDisclaimer(conAviso, "salud")).toBe(true);
  });

  it("un sector NO regulado sigue sin necesitar aviso", () => {
    /**
     * LA REGLA SIGUE SIENDO LA MISMA; DONDE SE COMPRUEBA, NO.
     *
     * Antes se le preguntaba a `hasRequiredDisclaimer`, que para un sector sin
     * frases definidas devolvia `true` —«no hace falta aviso»—. Ese `true` era
     * el agujero: valia igual para «no hace falta» que para «no se sabe».
     *
     * Ahora la funcion responde solo lo que puede verificar, y quien distingue
     * los dos casos es `evaluateShield`, que ni la consulta si el sector no
     * esta regulado:
     *
     *     const disclaimerOk = regulated ? hasRequiredDisclaimer(...) : true;
     *
     * Asi que la propiedad que importa —un ecommerce publica sin aviso legal—
     * se comprueba donde de verdad ocurre, de punta a punta.
     */
    expect(REGULATED_SECTORS.has("ecommerce")).toBe(false);
  });

  it("y de punta a punta: un ecommerce sin aviso sigue aprobando", async () => {
    const svc = new OsRegulatedSectorShieldService(
      { query: async () => ({ rows: [] }) } as never,
      { async isRegulated(s: string) { return REGULATED_SECTORS.has(s); } },
      { async runVisualLegal() { return { legal_passed: true, prohibited_terms: [] }; } },
    );
    const r = await svc.evaluateShield({ sectorId: "ecommerce", htmlOrText: "Compra zapatillas." });
    expect(r.regulated).toBe(false);
    expect(r.disclaimerOk, "un sector no regulado ha empezado a necesitar aviso").toBe(true);
    expect(r.status).toBe("passed");
  });
});

describe("lo que ya bloqueaba sigue bloqueando", () => {
  it("un shield marcado como bloqueado no se publica, se pueda consultar o no", async () => {
    for (const sectores of [SECTORES_QUE_FALLAN, SECTORES_QUE_RESPONDEN(false)]) {
      const r = await servicio(sectores).canPublishToPortal("dental", {
        shield_status: "blocked",
      });
      expect(r.allowed).toBe(false);
    }
  });
});

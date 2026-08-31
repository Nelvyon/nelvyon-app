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
  OsRegulatedSectorShieldService,
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

  it("LO QUE SIGUE ABIERTO, y no lo cierro yo: sin NINGUNA señal, publica", async () => {
    /**
     * ESTO NO ES UN FALLO DE ESTE ARREGLO: es el contrato que ya tenía la
     * función, escrito en su propio comentario —«require an explicit
     * non-blocked shield signal WHEN PRESENT»—. Si no hay señal de escudo, no
     * se comprueba nada.
     *
     * Es decir: contenido de un sector regulado que NUNCA pasó por el escudo se
     * puede publicar. Cerrarlo es defendible, pero cambia el comportamiento del
     * producto —dejaría de publicarse contenido que hoy se publica— y eso es
     * una decisión de producto, no un arreglo.
     *
     * La prueba deja el comportamiento actual POR ESCRITO, para que el día que
     * se decida cambiarlo se vea que era una decisión y no un descuido.
     */
    const r = await servicio(SECTORES_QUE_FALLAN).canPublishToPortal("dental", {});
    expect(r.allowed).toBe(true);
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

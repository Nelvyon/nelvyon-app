/**
 * El clasificador, atacado por donde una regla puede robarle el caso a otra.
 *
 * El orden de las categorías ES la decisión de diseño. Un «estaré fuera de la
 * oficina, no estaré disponible» contiene palabras que suenan a rechazo; un
 * «no me interesa, dadme de baja» contiene las dos cosas. Cuál gana no es un
 * detalle: decide si se sigue escribiendo a una persona que pidió que pares.
 *
 * El criterio es la asimetría del daño:
 *
 *   · perder una baja      → reclamación, y con razón;
 *   · perder un prospecto  → un cliente menos.
 *
 * Por eso la baja se mira primero, aunque eso signifique que un correo que
 * mezcla las dos cosas se trate como baja. Es la equivocación barata.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import { clasificarRespuesta } from "../clasificarRespuesta";

const cat = (t: string) => clasificarRespuesta(t).categoria;

describe("clasificarRespuesta", () => {
  // ── LOS CRUCES ────────────────────────────────────────────────────────────

  it("«no me interesa, dadme de baja» es BAJA, no negativo", () => {
    // Tratarlo como negativo dejaría el consentimiento intacto y otra secuencia
    // volvería a escribirle.
    expect(cat("No me interesa, dadme de baja de la lista")).toBe("baja");
  });

  it("un fuera-de-oficina que dice «no estaré disponible» sigue siendo AUTOMÁTICA", () => {
    // Es el cruce que más caro sale: clasificarlo como negativo pierde al
    // prospecto sin que nadie se entere.
    expect(cat("Estaré fuera de la oficina y no estaré disponible hasta el lunes 8")).toBe(
      "automatica",
    );
  });

  it("un fuera-de-oficina que propone escribir a un compañero NO es una reunión", () => {
    expect(cat("Respuesta automática: para asuntos urgentes escribe a ana@empresa.com")).toBe(
      "automatica",
    );
  });

  it("«estoy de baja» en español NO es darse de baja: es una ausencia", () => {
    // Trampa del idioma, y sale cara en las dos direcciones. Un patrón que se
    // conformara con «de baja» leería una baja médica como una petición de
    // supresión: se retiraría el consentimiento a alguien que solo estaba
    // enfermo, y eso no se deshace solo.
    const r = clasificarRespuesta("Estoy de baja médica hasta el 20, escribid a mi compañera");
    expect(r.categoria).not.toBe("baja");
    expect(r.retiraConsentimiento).toBe(false);
  });

  it("«ya trabajamos con otra agencia» es NEGATIVO, no baja", () => {
    // No ha pedido que pares. Retirarle el consentimiento le cierra la puerta a
    // otra oferta dentro de un año.
    const r = clasificarRespuesta("Gracias, ya trabajamos con otra agencia");
    expect(r.categoria).toBe("negativo");
    expect(r.retiraConsentimiento).toBe(false);
  });

  it("un rebote SMTP no se confunde con una respuesta humana", () => {
    expect(cat("550 5.1.1 <juan@empresa.com>: Recipient address rejected: User unknown")).toBe(
      "rebote",
    );
  });

  // ── LOS CASOS PEDIDOS, UNO A UNO ──────────────────────────────────────────

  it.each([
    ["Me interesa mucho, ¿podemos agendar una llamada el martes a las 10h?", "reunion"],
    ["¿Me puedes enviar más información y precios?", "interesado"],
    ["No, gracias. No es prioridad este año.", "negativo"],
    ["Por favor eliminad mis datos, derecho de supresión RGPD", "baja"],
    ["Automatic reply: I am on annual leave, back on the 12th", "automatica"],
    ["Hola", "indeterminado"],
  ])("«%s» → %s", (texto, esperado) => {
    expect(cat(texto)).toBe(esperado);
  });

  it("también en inglés: el prospecto no tiene por qué escribir en español", () => {
    expect(cat("Not interested, thanks")).toBe("negativo");
    expect(cat("Please remove me from your list")).toBe("baja");
    expect(cat("Can we book a call next week?")).toBe("reunion");
  });

  // ── LOS INVARIANTES ───────────────────────────────────────────────────────

  it("sólo la baja retira el consentimiento", () => {
    // Cualquier otra categoría que lo retirara estaría borrando prospectos por
    // su cuenta, y eso no se recupera.
    const textos = [
      "no me interesa",
      "¿me mandas precios?",
      "agendamos el jueves a las 12h",
      "out of office",
      "550 5.0.0 user unknown",
      "??",
    ];
    for (const t of textos) {
      expect(clasificarRespuesta(t).retiraConsentimiento, `«${t}» retiró el consentimiento`).toBe(
        false,
      );
    }
    expect(clasificarRespuesta("unsubscribe").retiraConsentimiento).toBe(true);
  });

  it("sólo lo automático deja seguir enviando", () => {
    // Es el único caso en el que no ha hablado una persona. Todo lo demás para.
    const paran = ["baja", "rebote", "reunion", "interesado", "negativo", "indeterminado"];
    for (const t of ["unsubscribe", "user unknown", "agendamos el lunes 9h", "mándame precios", "no me interesa", "??"]) {
      const r = clasificarRespuesta(t);
      expect(paran).toContain(r.categoria);
      expect(r.detieneLaSecuencia, `«${t}» no detuvo la secuencia`).toBe(true);
    }
    expect(clasificarRespuesta("out of office").detieneLaSecuencia).toBe(false);
  });

  it("ni un autorespondedor ni un rebote inflan la tasa de respuesta", () => {
    expect(clasificarRespuesta("automatic reply").cuentaComoRespuesta).toBe(false);
    expect(clasificarRespuesta("mailbox unavailable").cuentaComoRespuesta).toBe(false);
    expect(clasificarRespuesta("no me interesa").cuentaComoRespuesta).toBe(true);
  });

  it("sin texto se para, y se dice que no se clasificó", () => {
    // Fingir una categoría sería peor que admitir que no se sabe.
    for (const v of [null, undefined, "", "   "]) {
      const r = clasificarRespuesta(v);
      expect(r.categoria).toBe("indeterminado");
      expect(r.detieneLaSecuencia).toBe(true);
      expect(r.señales).toContain("sin-texto");
    }
  });

  it("cada clasificación dice en qué se basó", () => {
    // Una decisión que gobierna si sigues escribiendo a alguien tiene que poder
    // discutirse después, y para eso hace falta saber qué se reconoció.
    for (const t of ["dadme de baja", "out of office", "no me interesa", "agendamos el lunes 10h"]) {
      expect(clasificarRespuesta(t).señales.length, `«${t}» no dejó ninguna señal`).toBeGreaterThan(0);
    }
  });
});

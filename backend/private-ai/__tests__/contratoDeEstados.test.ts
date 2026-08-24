/**
 * BLOQUE 3 · el contrato de estados dice la verdad.
 *
 * Lo que se prueba no es que los cinco nombres existan —eso seria una lista—
 * sino que el sistema **no pueda** afirmar una accion que no ocurrio. Por eso
 * casi todas las pruebas son negativas: construyen la mentira y comprueban que
 * el contrato se niega.
 */
import { describe, expect, it } from "vitest";

import {
  ESTADOS_DE_ACCION,
  ESTADOS_SIN_EFECTO,
  afirmaAccionRealizada,
  comoTextoHonesto,
  ejecutada,
  listaParaAprobar,
  propuesta,
  simulada,
  validarResultado,
  verificada,
  type ResultadoDeAccion,
} from "../estadoDeAccion";

describe("BLOQUE 3 · contrato de estados", () => {
  it("EL CONTROL: los cinco estados existen y son distintos", () => {
    // Sin esto, un contrato con un solo estado pasaria todo lo de abajo.
    expect(new Set(ESTADOS_DE_ACCION).size).toBe(5);
    for (const e of ["PROPOSED", "SIMULATED", "READY_FOR_APPROVAL", "EXECUTED", "VERIFIED"]) {
      expect(ESTADOS_DE_ACCION).toContain(e);
    }
  });

  it("solo EXECUTED y VERIFIED afirman que se hizo algo", () => {
    expect(afirmaAccionRealizada("EXECUTED")).toBe(true);
    expect(afirmaAccionRealizada("VERIFIED")).toBe(true);
    for (const e of ESTADOS_SIN_EFECTO) {
      expect(afirmaAccionRealizada(e), e).toBe(false);
    }
  });

  it("EXECUTED sin evidencia se RECHAZA", () => {
    // El caso que importa: alguien quiere decir "hecho" sin nada detras.
    expect(() => ejecutada("Campana enviada", { referencia: "", origen: "x" })).toThrow();
    expect(() => ejecutada("Campana enviada", { referencia: "id-1", origen: "" })).toThrow();
  });

  it("VERIFIED sin comprobacion POSTERIOR se rechaza: eso es EXECUTED", () => {
    // "Lo he enviado" y "lo he enviado y he comprobado que llego" no son la
    // misma afirmacion. Confundirlas es como se acaba diciendo que se enviaron
    // correos que nadie recibio.
    expect(() =>
      verificada("Post publicado", {
        referencia: "post-9",
        origen: "api",
        comprobacionPosterior: "",
      }),
    ).toThrow(/comprobacion posterior/i);
  });

  it("un estado SIN efecto no puede llevar evidencia", () => {
    // La direccion contraria importa igual: evidencia colgando de una propuesta
    // se lee como prueba de algo que no paso.
    const mentira = {
      estado: "PROPOSED",
      resumen: "Enviar la campana",
      motivo: "pendiente",
      evidencia: { referencia: "envio-123", origen: "smtp" },
    } as ResultadoDeAccion;
    expect(() => validarResultado(mentira)).toThrow(/no puede llevar evidencia/i);
  });

  it("SIMULATED sin decir por que no fue real se rechaza", () => {
    expect(() => simulada("Informe de ventas", "")).toThrow();
  });

  it("un estado inventado no cuela", () => {
    const falso = { estado: "DONE", resumen: "algo" } as unknown as ResultadoDeAccion;
    expect(() => validarResultado(falso)).toThrow(/estado desconocido/i);
  });

  it("un resultado sin resumen se rechaza", () => {
    expect(() => validarResultado({ estado: "PROPOSED", resumen: "  ", motivo: "x" })).toThrow();
  });

  it("EL CONTROL POSITIVO: los cinco constructores legitimos producen resultados validos", () => {
    // Sin esto, un contrato que rechazara TODO pasaria las pruebas de arriba y
    // dejaria el sistema incapaz de afirmar nada.
    expect(validarResultado(propuesta("Sugerir 3 titulares", "solo propuesta")).estado)
      .toBe("PROPOSED");
    expect(validarResultado(simulada("Prevision de ROI", "sin proveedor de datos")).estado)
      .toBe("SIMULATED");
    expect(validarResultado(listaParaAprobar("Borrar 400 contactos", "accion destructiva")).estado)
      .toBe("READY_FOR_APPROVAL");
    expect(
      validarResultado(ejecutada("Correo enviado", { referencia: "msg-77", origen: "saas_sms_log" }))
        .estado,
    ).toBe("EXECUTED");
    expect(
      validarResultado(
        verificada("Post publicado", {
          referencia: "post-9",
          origen: "api",
          comprobacionPosterior: "GET devolvio el post con estado published",
        }),
      ).estado,
    ).toBe("VERIFIED");
  });

  it("el texto para humanos NUNCA dice hecho si no lo esta", () => {
    // Ultimo sitio donde la mentira puede colarse: el resumen se pinta en
    // pantalla y nadie mira el campo `estado`.
    const sinEfecto = [
      propuesta("Publicar en LinkedIn", "solo propuesta"),
      simulada("Publicar en LinkedIn", "sin credenciales"),
      listaParaAprobar("Publicar en LinkedIn", "publicacion real"),
    ];
    for (const r of sinEfecto) {
      const t = comoTextoHonesto(r).toLowerCase();
      expect(t, r.estado).not.toMatch(/\bpublicado\b|\benviado\b|\bhecho\b/);
      expect(t, r.estado).toMatch(/propuesta|simulaci|pendiente de aprobaci/);
    }
  });

  it("el texto de EXECUTED lleva la evidencia a la vista", () => {
    const t = comoTextoHonesto(
      ejecutada("Correo enviado", { referencia: "msg-77", origen: "saas_sms_log" }),
    );
    expect(t).toContain("msg-77");
    expect(t).toContain("saas_sms_log");
  });
});

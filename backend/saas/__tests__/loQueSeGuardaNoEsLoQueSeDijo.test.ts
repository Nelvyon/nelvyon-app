/**
 * De una ejecucion de agente no queda guardado lo que se le dijo.
 *
 * ── QUE SE PROTEGE ──────────────────────────────────────────────────────────
 *
 * `saas_agent_runs.input` es texto libre que escribe una persona. Ahi acaba lo
 * que pegue: una clave de API que queria que el agente usara, una cabecera
 * `Authorization` copiada de unas herramientas de desarrollo, un DSN con la
 * contrasena dentro.
 *
 * Y no se quedaba en la tabla: `SaasUnifiedAuditExportService` volcaba `input` y
 * `output` tal cual en el export, asi que un secreto pegado por descuido salia
 * otra vez por una funcion pensada para cumplir.
 *
 * ── LA PRUEBA QUE MAS IMPORTA ───────────────────────────────────────────────
 *
 * No es que el texto se acorte: es que el SECRETO no aparezca. Se atacan las
 * formas reales —Stripe, OpenAI, GitHub, Slack, AWS, DSN, cabecera, cookie— y
 * ninguna puede quedar en lo que se guarda.
 *
 * COSTE EXTERNO: 0 EUR. Nada sale de aqui.
 */
import { describe, expect, it } from "vitest";

import {
  TOPE_DE_VISTA_PREVIA,
  resumenPersistible,
  textoPersistible,
} from "../loQuePersisteDeUnaEjecucion";

/** Formas reales de credencial, no inventadas. */
const SECRETOS: ReadonlyArray<[string, string]> = [
  ["Stripe restringida", "rk_live_FICTICIA_DE_PRUEBA_0000000000"],
  ["Stripe secreta", "sk_live_FICTICIA_DE_PRUEBA_AAAAAAAAAA"],
  ["OpenAI", "sk-proj-FICTICIA-DE-PRUEBA-000000"],
  ["GitHub", "ghp_FICTICIAdePRUEBA00000000000000"],
  ["Slack", "xoxb-FICTICIA-DE-PRUEBA-0000000"],
  ["AWS", "AKIAIOSFODNN7EXAMPLE"],
];

describe("lo que se guarda no lleva el secreto", () => {
  it("ninguna forma de clave sobrevive a la vista previa", () => {
    for (const [nombre, clave] of SECRETOS) {
      const guardado = textoPersistible(`Usa esta clave para conectarte: ${clave}`);
      expect(guardado, `${nombre} quedo guardada entera`).not.toContain(clave);
      expect(guardado).toContain("REDACTADO");
    }
  });

  it("un DSN con contrasena no queda en claro", () => {
    const guardado = textoPersistible(
      "Conecta a postgresql://usuario:CLAVE_FICTICIA_DE_PRUEBA@db.interno:5432/produccion",
    );
    expect(guardado, "la contrasena del DSN quedo guardada").not.toContain("CLAVE_FICTICIA_DE_PRUEBA");
    expect(guardado, "se perdio el contexto entero, no solo el secreto").toContain("usuario");
  });

  it("una cabecera Authorization y una cookie no quedan en claro", () => {
    const conCabecera = textoPersistible("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abcdefghijkl");
    expect(conCabecera).not.toContain("eyJhbGciOiJIUzI1NiJ9");

    const conCookie = textoPersistible("cookie: session=abcdefghijklmnopqrstuvwxyz");
    expect(conCookie).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});

describe("se guarda menos, y se dice que es menos", () => {
  it("un texto largo se acorta y queda marcado como extracto", () => {
    // Que quede MARCADO importa: quien lea la auditoria tiene que saber que ve
    // un extracto, no creer que ese era el mensaje completo.
    const largo = "a".repeat(TOPE_DE_VISTA_PREVIA * 3);
    const guardado = textoPersistible(largo);
    expect(guardado.length).toBeLessThan(largo.length);
    expect(guardado).toContain("extracto redactado");
    expect(guardado, "no dice cuanto media el original").toContain(String(largo.length));
  });

  it("un texto corto se conserva legible", () => {
    // Si acortara siempre, la auditoria dejaria de servir para lo unico que
    // sirve: saber que se pidio.
    const guardado = textoPersistible("Redacta un correo de bienvenida");
    expect(guardado).toContain("Redacta un correo de bienvenida");
  });

  it("sin texto no se inventa nada", () => {
    expect(textoPersistible("")).toBe("");
    expect(textoPersistible(null)).toBe("");
    expect(textoPersistible(undefined)).toBe("");
  });
});

describe("la huella agrupa sin conservar", () => {
  it("dos textos iguales dan la misma huella", () => {
    const a = resumenPersistible("Genera un plan de contenidos");
    const b = resumenPersistible("Genera un plan de contenidos");
    expect(a.huella).toBe(b.huella);
  });

  it("dos textos distintos dan huellas distintas", () => {
    const a = resumenPersistible("Genera un plan de contenidos");
    const b = resumenPersistible("Genera un plan de anuncios");
    expect(a.huella).not.toBe(b.huella);
  });

  it("la huella es del texto YA REDACTADO, no del original", () => {
    // La decision menos obvia, y la que mas protege. Una huella del original
    // dejaria confirmar un secreto que ya se sospeche: se prueban candidatos
    // hasta que cuadre, y los secretos cortos caen. Como se hashea lo redactado,
    // dos claves DISTINTAS producen la misma huella y ese oraculo no existe.
    const a = resumenPersistible("clave: sk_live_FICTICIA_DE_PRUEBA_AAAAAAAAAA");
    const b = resumenPersistible("clave: sk_live_FICTICIA_DE_PRUEBA_ZZZZZZZZZZ");
    expect(a.huella).toBe(b.huella);
  });

  it("la longitud declarada es la del ORIGINAL", () => {
    // Es informacion util —cuanto escribio— y no es sensible. Si midiera lo
    // redactado, mentiria sobre el tamano de lo que llego.
    const original = `clave: ${"x".repeat(500)}`;
    expect(resumenPersistible(original).longitud).toBe(original.length);
  });
});

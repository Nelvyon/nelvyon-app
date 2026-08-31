/**
 * UN INTENTO DE ESCRIBIR EN UN CONTACTO AJENO NO SE DESCARTA EN SILENCIO.
 *
 * CÓMO SE ENCONTRÓ. Buscando módulos de los que depende mucha gente y que no
 * prueba nadie. `agentRunHook.ts` salió el primero de 6.227 ficheros: **187
 * importadores y cero pruebas**. Es el gancho que corre después de cada
 * ejecución de agente.
 *
 * QUÉ TENÍA. Un `catch` vacío con el comentario «CRM opcional». Eso metía en el
 * mismo saco dos cosas que no se parecen en nada:
 *
 *   · el CRM no está disponible — tolerable y esperado;
 *   · `assertContactOwner` ha dicho que NO — alguien ha intentado escribir
 *     sobre un contacto que no es suyo.
 *
 * LO QUE **NO** ERA. No era un agujero de aislamiento: la comprobación de
 * propiedad está en `CrmService.logActivity` y se ejecuta antes del `INSERT`,
 * así que la escritura no llegaba a ocurrir. Se comprobó leyendo el servicio
 * antes de tocar nada, y estas pruebas lo fijan para que siga siendo verdad.
 *
 * LO QUE SÍ ERA: un defecto de observabilidad en un camino de seguridad,
 * multiplicado por 189 sitios de llamada. Un rechazo de autorización es
 * exactamente el suceso que hay que poder reconstruir después.
 *
 * LO QUE ESTAS PRUEBAS NO PERMITEN CAMBIAR: que la función propague. Ciento
 * ochenta y nueve sitios dependen de que un apunte de CRM fallido no tumbe el
 * trabajo que el cliente pidió. Se prueba en las dos direcciones — avisa, y no
 * rompe.
 *
 * COSTE EXTERNO: 0 €. El servicio de CRM va doblado; no se toca ninguna base.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  observarFallosDeCrm,
  tryLogCrmAgentOutput,
  type FalloDeRegistroCrm,
} from "../crm/agentRunHook";
import { CrmService } from "../crm/CrmService";

/** Recoge lo que se avisa, para poder comprobarlo en vez de mirar la consola. */
function conObservador() {
  const vistos: FalloDeRegistroCrm[] = [];
  const restaurar = observarFallosDeCrm((f) => vistos.push(f));
  return { vistos, restaurar };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cuando el CRM acepta", () => {
  it("registra la actividad con el contacto, el usuario y el agente", async () => {
    const espia = vi.spyOn(CrmService, "logActivity").mockResolvedValue({} as never);
    await tryLogCrmAgentOutput("u1", { contactId: "c1" }, { agentId: "seo", result: "un plan" });
    expect(espia).toHaveBeenCalledWith("c1", "u1", "agent_output", "un plan", "seo");
  });

  it("un resultado que no es texto se serializa", async () => {
    const espia = vi.spyOn(CrmService, "logActivity").mockResolvedValue({} as never);
    await tryLogCrmAgentOutput("u1", { contactId: "c1" }, { agentId: "ads", result: { a: 1 } });
    expect(espia.mock.calls[0][3]).toBe('{"a":1}');
  });
});

describe("cuando no hay contacto, no pasa nada y no se avisa de nada", () => {
  it("sin contactId no llama al CRM", async () => {
    const espia = vi.spyOn(CrmService, "logActivity").mockResolvedValue({} as never);
    const { vistos, restaurar } = conObservador();
    try {
      await tryLogCrmAgentOutput("u1", { algo: "otra cosa" }, { agentId: "seo" });
      await tryLogCrmAgentOutput("u1", { contactId: "   " }, { agentId: "seo" });
      expect(espia).not.toHaveBeenCalled();
      // Y NO se avisa: la mayoría de los encargos no llevan contacto, y avisar
      // de cada uno convertiría el aviso en ruido que nadie lee.
      expect(vistos).toEqual([]);
    } finally {
      restaurar();
    }
  });

  it("un encargo nulo o de otro tipo no revienta", async () => {
    const espia = vi.spyOn(CrmService, "logActivity").mockResolvedValue({} as never);
    for (const entrada of [null, undefined, 42, "texto suelto", []]) {
      await expect(tryLogCrmAgentOutput("u1", entrada, { agentId: "x" })).resolves.toBeUndefined();
    }
    expect(espia).not.toHaveBeenCalled();
  });
});

describe("cuando el CRM rechaza", () => {
  it("LA REGLA: un contacto que no es tuyo deja rastro", async () => {
    // Es el mensaje exacto de `assertContactOwner`, que es deliberadamente
    // genérico para no revelar si el contacto existe.
    vi.spyOn(CrmService, "logActivity").mockRejectedValue(new Error("Contacto no encontrado"));
    const { vistos, restaurar } = conObservador();
    try {
      await tryLogCrmAgentOutput("otro_usuario", { contactId: "c_ajeno" }, { agentId: "seo" });
    } finally {
      restaurar();
    }
    expect(vistos).toHaveLength(1);
    expect(vistos[0].contactId).toBe("c_ajeno");
    expect(vistos[0].userId).toBe("otro_usuario");
    expect(vistos[0].agentId).toBe("seo");
    expect(vistos[0].motivo).toContain("Contacto no encontrado");
  });

  it("y NO propaga: 189 sitios dependen de que esto no tumbe su trabajo", async () => {
    // La otra mitad del contrato. Sin esta prueba, «avisar» podría convertirse
    // en «lanzar» y romper el encargo del cliente por un apunte de CRM.
    vi.spyOn(CrmService, "logActivity").mockRejectedValue(new Error("base caida"));
    const { restaurar } = conObservador();
    try {
      await expect(
        tryLogCrmAgentOutput("u1", { contactId: "c1" }, { agentId: "seo" }),
      ).resolves.toBeUndefined();
    } finally {
      restaurar();
    }
  });

  it("si hasta avisar falla, tampoco propaga", async () => {
    // Un observador roto no puede ser peor que no tener observador.
    vi.spyOn(CrmService, "logActivity").mockRejectedValue(new Error("base caida"));
    const restaurar = observarFallosDeCrm(() => {
      throw new Error("el observador tambien falla");
    });
    try {
      await expect(
        tryLogCrmAgentOutput("u1", { contactId: "c1" }, { agentId: "seo" }),
      ).resolves.toBeUndefined();
    } finally {
      restaurar();
    }
  });

  it("el aviso no arrastra el resultado del agente", async () => {
    // Puede tener miles de caracteres y contenido del cliente. Para saber qué
    // falló basta con quién, dónde y por qué.
    vi.spyOn(CrmService, "logActivity").mockRejectedValue(new Error("no"));
    const { vistos, restaurar } = conObservador();
    const secretoDelCliente = "facturacion interna del cliente, no debe viajar al aviso";
    try {
      await tryLogCrmAgentOutput("u1", { contactId: "c1" }, { agentId: "x", result: secretoDelCliente });
    } finally {
      restaurar();
    }
    expect(JSON.stringify(vistos)).not.toContain(secretoDelCliente);
  });
});

describe("la comprobación de propiedad sigue estando donde debe", () => {
  it("el gancho NO decide sobre permisos: delega en CrmService", async () => {
    /**
     * Esta prueba fija la frontera. Si alguien «arreglara» el gancho añadiendo
     * aquí su propia comprobación de propiedad, habría dos reglas de
     * autorización en dos sitios, y tarde o temprano dirían cosas distintas.
     *
     * El gancho llama siempre; quien decide es el servicio.
     */
    const espia = vi.spyOn(CrmService, "logActivity").mockResolvedValue({} as never);
    await tryLogCrmAgentOutput("un_usuario_cualquiera", { contactId: "c_de_otro" }, { agentId: "x" });
    expect(espia).toHaveBeenCalledTimes(1);
    expect(espia.mock.calls[0][0]).toBe("c_de_otro");
    expect(espia.mock.calls[0][1]).toBe("un_usuario_cualquiera");
  });
});

/**
 * El Business Brain llega al agente. A todos, no a uno.
 *
 * ── LO QUE PASABA ───────────────────────────────────────────────────────────
 *
 * Cuatro piezas construidas y encajadas entre sí:
 *
 *   · `CerebroDeNegocioService` guarda las dimensiones del cliente;
 *   · `dimensionesDeServicio` declara cuáles le tocan a cada uno de los 29;
 *   · `contextoDeNegocio` compone el texto, con huecos nombrados y procedencia;
 *   · `CLAVE_CEREBRO` lo prepone sin depender de que la plantilla se acuerde.
 *
 * Y el cerebro no llegaba a NINGÚN agente. Ni siquiera a web, el único que sabía
 * recibirlo: `webPremiumIntakeStrings(payload, cerebro?)` tenía el parámetro
 * como opcional y ningún llamante se lo pasaba jamás.
 *
 * Cuatro piezas conectadas entre sí y desconectadas de la realidad. Nada
 * fallaba: los agentes trabajaban con el contexto del encargo, que basta para
 * producir algo aprovechable, y por eso podía durar meses sin que nadie lo
 * notara.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * La diferencia entre «no sabemos nada de este cliente» y «no hemos podido
 * preguntarlo». La primera se dice en voz alta —callarla invita al modelo a
 * rellenar los huecos—; la segunda se calla, porque afirmar que un cliente no
 * tiene historia cuando la base no contesta es peor que no decir nada.
 *
 * COSTE EXTERNO: 0 EUR. No toca la base ni llama a ningún modelo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const leer = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: { getInstance: () => ({ query }) },
}));

vi.mock("../../cerebro/CerebroDeNegocioService", async (original) => {
  const real = (await original()) as Record<string, unknown>;
  return { ...real, CerebroDeNegocioService: class { leer = leer; } };
});

const CLI = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";

/** Un cerebro con la forma que devuelve el servicio real. */
function cerebroCon(dimensiones: Array<[string, unknown]>) {
  return {
    workspaceId: 7,
    clientId: CLI,
    dimensiones: new Map(
      dimensiones.map(([id, valor]) => [
        id,
        { valor, procedencia: "cliente", confianza: 1, actualizado: new Date().toISOString() },
      ]),
    ),
    caducadas: [] as string[],
  };
}

describe("el cerebro llega al agente", () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue([{ workspace_id: 7 }]);
    leer.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("LA REGLA: con cerebro, el bloque trae lo que sabemos del cliente", async () => {
    leer.mockResolvedValue(cerebroCon([["objetivo_negocio", { texto: "llenar la sala los martes" }]]));
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    const { bloque } = await bloqueDeCerebro(CLI, "seo_premium");

    expect(bloque.length, "el bloque salió vacío teniendo cerebro").toBeGreaterThan(0);
  });

  it("un cliente SIN cerebro se declara en voz alta, no en silencio", async () => {
    // Un bloque vacío se lee como «no hay restricciones», que es el peor mensaje
    // posible para un cliente de un sector regulado.
    leer.mockResolvedValue(cerebroCon([]));
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    const { bloque } = await bloqueDeCerebro(CLI, "seo_premium");

    expect(bloque, "un cliente sin cerebro salió como silencio").not.toBe("");
    expect(bloque.toLowerCase()).toMatch(/no inventes|no se sabe|no hay/);
  });

  it("LA DISTINCIÓN: si NO SE PUEDE leer, se calla en vez de afirmar", async () => {
    // Decir «no sabemos nada de este cliente» porque la base no contesta haría
    // que el agente escribiera como si el cliente no tuviera historia, y puede
    // que tenga seis meses de ella.
    leer.mockRejectedValue(new Error("la base no está"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    const { bloque } = await bloqueDeCerebro(CLI, "seo_premium");

    expect(bloque, "afirmó que no se sabe nada sin haber podido preguntar").toBe("");
    expect(aviso, "el agente se quedó sin cerebro y nadie se enteró").toHaveBeenCalled();
  });

  it("y ese aviso no filtra la cadena de conexión", async () => {
    leer.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://usuario:SECRETO@host:5432/db"),
    );
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    await bloqueDeCerebro(CLI, "seo_premium");

    const texto = aviso.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(texto).not.toContain("SECRETO");
  });

  it("sin workspace no se afirma nada: no se ha comprobado", async () => {
    query.mockResolvedValue([]);
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    expect((await bloqueDeCerebro(CLI, "seo_premium")).bloque).toBe("");
    expect(leer, "intentó leer un cerebro sin saber de qué workspace").not.toHaveBeenCalled();
  });

  it("un `clientId` que no es uuid no llega a la base", async () => {
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    expect((await bloqueDeCerebro("cliente-de-prueba", "seo_premium")).bloque).toBe("");
    expect(query).not.toHaveBeenCalled();
  });

  it("el idioma y el mercado salen APARTE del bloque", async () => {
    // La puerta de calidad los compara con lo que salió escrito, y un texto no
    // se puede comparar con un texto. Metidos dentro del bloque no servirían
    // para eso, y `en-el-idioma-del-cliente` seguiría sin aplicarse nunca.
    leer.mockResolvedValue(
      cerebroCon([
        ["idioma", { texto: "fr" }],
        ["mercado", { texto: "FR" }],
      ]),
    );
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    const r = await bloqueDeCerebro(CLI, "seo_premium");

    expect(r.idioma).toBe("fr");
    expect(r.mercado).toBe("FR");
  });

  it("un dato CADUCADO no cuenta como sabido", async () => {
    // Un idioma de hace tres años puede no ser el de ahora, y escribir en el
    // equivocado por un dato viejo es peor que preguntar.
    const c = cerebroCon([["idioma", { texto: "fr" }]]);
    c.caducadas = ["idioma"];
    leer.mockResolvedValue(c);
    const { bloqueDeCerebro } = await import("../bloqueDeCerebro");

    expect((await bloqueDeCerebro(CLI, "seo_premium")).idioma).toBeNull();
  });

  // ── EL CAMINO COMPLETO ────────────────────────────────────────────────────

  it("el bloque sobrevive al mapa de variables del lote 2", async () => {
    // Es donde ya se perdió una vez el contexto del encargo, y de golpe para
    // doce servicios: `eliteLote2CommonVars` reconstruye el mapa con nombres en
    // mayúsculas y las claves que empiezan por `__` son justo las que se caen.
    const { eliteLote2CommonVars } = await import("../agents/lote2PromptUtils");
    const { CLAVE_CEREBRO } = await import("../agents/elitePayloadStrings");

    const v = eliteLote2CommonVars({ [CLAVE_CEREBRO]: "LO QUE SABEMOS DEL CLIENTE" });

    expect(v[CLAVE_CEREBRO], "el cerebro se perdió al cambiar los nombres").toContain(
      "LO QUE SABEMOS",
    );
  });

  it("y acaba DELANTE de la plantilla, sin depender de que ésta lo coloque", async () => {
    const { buildPrompt } = await import("../agents/lote2PromptUtils");
    const { CLAVE_CEREBRO } = await import("../agents/elitePayloadStrings");

    const salida = buildPrompt("INSTRUCCIONES DEL SERVICIO", {
      [CLAVE_CEREBRO]: "LO QUE SABEMOS DEL CLIENTE",
    });

    expect(salida.indexOf("LO QUE SABEMOS")).toBeLessThan(salida.indexOf("INSTRUCCIONES"));
  });

  it("las 29 disciplinas declaran qué dimensiones usan", async () => {
    // Si un servicio no declarara ninguna, recibiría sólo las imprescindibles y
    // el cerebro le llegaría igual a él que a los otros 28 — que es justo el
    // mega-payload indiscriminado que esto evita.
    const { dimensionesDeServicio } = await import("../../cerebro/dimensiones");
    const mapa = (await import("../../calidad/mapaDeServicio.json")).default as {
      qaDe: Record<string, string>;
    };

    for (const serviceId of Object.keys(mapa.qaDe)) {
      const dims = dimensionesDeServicio(serviceId);
      expect(dims.length, `${serviceId} no usa ninguna dimensión`).toBeGreaterThan(0);
    }
  });

  it("y no todas reciben lo mismo: el contexto se acota por servicio", async () => {
    // CONTROL. Si `dimensionesDeServicio` devolviera siempre lo mismo, todo lo
    // anterior pasaría y estaríamos mandando el presupuesto de Ads al agente de
    // web, que no lo hace más listo: le añade ruido.
    const { dimensionesDeServicio } = await import("../../cerebro/dimensiones");

    const seo = dimensionesDeServicio("seo_premium").map((d) => d.id).sort();
    const web = dimensionesDeServicio("web_premium").map((d) => d.id).sort();

    expect(seo.join(","), "todas las disciplinas reciben exactamente lo mismo").not.toBe(
      web.join(","),
    );
  });
});

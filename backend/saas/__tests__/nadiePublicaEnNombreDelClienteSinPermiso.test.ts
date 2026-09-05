/**
 * Publicar en la cuenta de un cliente exige que el interruptor este subido.
 *
 * ── QUE SE PROTEGE ──────────────────────────────────────────────────────────
 *
 * `publishPost` llamaba a `graph.facebook.com` y a LinkedIn con el token real
 * del cliente sin cruzar ninguna puerta, y `processDueScheduled` lo invoca
 * desde el cron: un post programado salia SOLO. Todos los demas canales
 * —correo, SMS, WhatsApp, Google Ads, Meta Ads— tenian su interruptor; las
 * redes no.
 *
 * ── LO QUE MAS IMPORTA DE ESTA BATERIA ──────────────────────────────────────
 *
 * No basta con que no publique: importa QUE PASA CON EL POST. Si la puerta
 * cerrada lo marcara `failed`, tener el interruptor bajado destruiria trabajo
 * bueno. Por eso se comprueba que la fila NO se toca y que el estado sigue
 * siendo el que era.
 *
 * COSTE EXTERNO: 0 EUR. `fetchFn` es un doble; si se llamara, la prueba falla.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { SaasSocialService } from "../SaasSocialService";
import { consultaFalsa, type Fila } from "../../db/__tests__/consultaFalsa";
import {
  PublicacionSocialDesactivadaError,
  publicacionSocialPermitida,
} from "../publicacionSocialPermitida";

const TENANT = "tenant-social";

const filaDePost: Fila = {
  id: "post-1",
  tenant_id: TENANT,
  platform: "meta",
  content: "Hola",
  media_urls: [],
  status: "scheduled",
  access_token: "token-del-cliente",
  page_id: "page-1",
};

/** Un `fetch` que revienta: si el codigo llega a la red, se sabe. */
const fetchQueNoDeberiaSonar = vi.fn(async (): Promise<Response> => {
  throw new Error("se llamo a la red con el interruptor bajado");
});

afterEach(() => {
  vi.unstubAllEnvs();
  fetchQueNoDeberiaSonar.mockClear();
});

describe("el interruptor de publicacion social", () => {
  it("EL CONTROL: encendido a proposito, SI publica", async () => {
    // Sin este control, un interruptor que apagara siempre pasaria todas las
    // pruebas de abajo y dejaria el producto sin poder publicar nunca.
    vi.stubEnv("NELVYON_SOCIAL_PUBLISH_ENABLED", "1");
    expect(publicacionSocialPermitida()).toBe(true);

    const fetchOk = vi.fn(
      async () => new Response(JSON.stringify({ id: "externo-1" }), { status: 200 }),
    );
    const db = { query: consultaFalsa([[filaDePost], []]) };
    const svc = new SaasSocialService(db as never, fetchOk as never);

    const r = await svc.publishPost(TENANT, "post-1");
    expect(r.ok, "con el interruptor subido tiene que publicar").toBe(true);
    expect(fetchOk).toHaveBeenCalled();
  });

  it("apagado explicitamente, NO publica y no toca la red", async () => {
    vi.stubEnv("NELVYON_SOCIAL_PUBLISH_ENABLED", "0");
    const db = { query: consultaFalsa([[filaDePost]]) };
    const svc = new SaasSocialService(db as never, fetchQueNoDeberiaSonar as never);

    await expect(svc.publishPost(TENANT, "post-1")).rejects.toBeInstanceOf(
      PublicacionSocialDesactivadaError,
    );
    expect(fetchQueNoDeberiaSonar).not.toHaveBeenCalled();
  });

  it("fuera de produccion esta cerrado por DEFECTO, sin declarar nada", async () => {
    // Es donde viven las fixtures y las pruebas. El valor por defecto tiene que
    // ser el seguro: publicar en la cuenta de un cliente no se hace por
    // accidente al ejecutar una suite.
    vi.stubEnv("NODE_ENV", "test");
    expect(publicacionSocialPermitida()).toBe(false);
  });

  it("NO marca el post como fallido: se queda esperando a que abran la puerta", async () => {
    // Lo que de verdad importa. Si la puerta cerrada lo marcara `failed`, bajar
    // el interruptor destruiria trabajo bueno en vez de aplazarlo.
    vi.stubEnv("NELVYON_SOCIAL_PUBLISH_ENABLED", "0");
    const query = consultaFalsa([[filaDePost]]);
    const svc = new SaasSocialService({ query } as never, fetchQueNoDeberiaSonar as never);

    await expect(svc.publishPost(TENANT, "post-1")).rejects.toBeInstanceOf(
      PublicacionSocialDesactivadaError,
    );
    const sql = query.mock.calls.map((c) => String(c[0])).join(" | ");
    expect(sql, "no deberia haber consultado nada").not.toMatch(/UPDATE saas_social_posts/i);
  });
});

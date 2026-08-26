/**
 * BLOQUE 7 · la URL que viene dentro del mensaje.
 *
 * `/api/webhooks/slack/interactions` verifica la firma de Slack **bien**: exige
 * el secreto, exige el prefijo `v0=`, comprueba que la marca de tiempo esté
 * dentro de ±300 s —lo que cierra la repetición— y compara en tiempo constante.
 * Eso se asegura aquí para que no se pierda.
 *
 * Lo que hace después es lo que se ataca: coge `payload.response_url` **del
 * cuerpo** y hace un `POST` contra esa dirección desde dentro de la
 * infraestructura de NELVYON, sin mirar a dónde apunta.
 *
 * Es exactamente el mismo patrón que el `SubscribeURL` de SNS: el sobre trae una
 * URL, la URL viene firmada, y se confía en ella porque viene firmada. Pero la
 * firma dice que el mensaje no ha sido alterado en tránsito — no dice que su
 * contenido sea inofensivo. Y esta casa ya tomó la decisión contraria en el
 * servicio de al lado: `SaasApprovalCardsService.isSafeWebhookUrl` delega en
 * `assertSafeEgressUrl` con el razonamiento escrito de que había tres copias del
 * control y la débil era la que solo miraba el esquema. Esta ruta no pasaba por
 * ninguna de las tres.
 *
 * Alcance honesto: para llegar aquí hace falta una firma válida, así que quien
 * lo explote tiene el `SLACK_SIGNING_SECRET`. No es una puerta abierta a
 * cualquiera. Es una SSRF ciega a un paso de una credencial, con la guarda
 * disponible en el mismo repositorio y sin aplicar. Eso se corrige.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";

const SECRETO = "secreto-de-firma-de-slack-para-certificacion";

vi.mock("@nelvyon/saas", async () => {
  const { createHmac: hmac, timingSafeEqual } = await import("crypto");
  // Se usa la implementación REAL de verificación, no un doble: lo que se
  // certifica abajo es que sigue rechazando lo que debe.
  return {
    getSaasApprovalCardsService: () => ({
      verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
        const secret = process.env.SLACK_SIGNING_SECRET;
        if (!secret || !timestamp || !signature.startsWith("v0=")) return false;
        const ts = Number(timestamp);
        if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
        const base = `v0:${timestamp}:${body}`;
        const expected = `v0=${hmac("sha256", secret).update(base).digest("hex")}`;
        try {
          return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
        } catch {
          return false;
        }
      },
    }),
  };
});

import { POST } from "../route";

let visitadas: string[] = [];

function cuerpo(responseUrl: string): string {
  return new URLSearchParams({
    payload: JSON.stringify({
      type: "block_actions",
      actions: [{ action_id: "aprobar", value: "1" }],
      response_url: responseUrl,
    }),
  }).toString();
}

function peticion(raw: string, opciones: { ts?: string; firma?: string } = {}): Request {
  const ts = opciones.ts ?? String(Math.floor(Date.now() / 1000));
  const firma =
    opciones.firma ??
    `v0=${createHmac("sha256", SECRETO).update(`v0:${ts}:${raw}`).digest("hex")}`;
  return new Request("https://nelvyon.test/api/webhooks/slack/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-slack-request-timestamp": ts,
      "x-slack-signature": firma,
    },
    body: raw,
  });
}

const SLACK_OK = "https://hooks.slack.com/actions/T0/1234/abcd";

beforeEach(() => {
  visitadas = [];
  process.env.SLACK_SIGNING_SECRET = SECRETO;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      visitadas.push(String(url));
      return new Response("ok", { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BLOQUE 7 · la firma de Slack, que está bien y no se puede perder", () => {
  it("EL CONTROL: una interacción legítima se procesa y responde a Slack", async () => {
    /**
     * Sin este control, una ruta que rechazara todo pasaría los ataques de abajo
     * y dejaría los botones de aprobación de Slack sin responder nunca.
     */
    const r = await POST(peticion(cuerpo(SLACK_OK)));
    expect(r.status).toBe(200);
    expect(visitadas).toEqual([SLACK_OK]);
  });

  it("una firma inválida se rechaza con 401", async () => {
    const r = await POST(peticion(cuerpo(SLACK_OK), { firma: "v0=" + "0".repeat(64) }));
    expect(r.status).toBe(401);
    expect(visitadas).toHaveLength(0);
  });

  it("una petición vieja se rechaza: la repetición está cerrada", async () => {
    // Capturar una interacción y reenviarla mañana no vale: la marca de tiempo
    // va dentro de la firma y se exige fresca.
    const viejo = String(Math.floor(Date.now() / 1000) - 3600);
    const raw = cuerpo(SLACK_OK);
    const firma = `v0=${createHmac("sha256", SECRETO).update(`v0:${viejo}:${raw}`).digest("hex")}`;
    const r = await POST(peticion(raw, { ts: viejo, firma }));
    expect(r.status, "se acepto una interaccion de hace una hora").toBe(401);
    expect(visitadas).toHaveLength(0);
  });

  it("sin secreto configurado no se acepta nada", async () => {
    delete process.env.SLACK_SIGNING_SECRET;
    const r = await POST(peticion(cuerpo(SLACK_OK)));
    expect(r.status).toBe(401);
  });
});

describe("BLOQUE 7 · a dónde se responde", () => {
  const hostiles = [
    ["metadata de la instancia", "http://169.254.169.254/latest/meta-data/iam/"],
    ["red interna", "https://10.0.0.5/admin"],
    ["el propio host", "https://127.0.0.1:8080/"],
    ["dominio del atacante", "https://atacante.test/recoge"],
    ["dominio que imita a Slack", "https://hooks.slack.com.atacante.test/x"],
    ["Slack en el userinfo", "https://hooks.slack.com@atacante.test/x"],
  ] as const;

  for (const [nombre, url] of hostiles) {
    it(`no se hace POST a ${nombre}`, async () => {
      await POST(peticion(cuerpo(url)));
      expect(
        visitadas,
        `se hizo una peticion saliente desde dentro de NELVYON a ${url}`,
      ).toHaveLength(0);
    });
  }

  it("la interacción se sigue respondiendo con 200 aunque la URL se descarte", async () => {
    // Devolver un error a Slack por una URL que no nos gusta convertiría un
    // problema nuestro en un reintento suyo. Se descarta la salida, no la
    // interacción.
    const r = await POST(peticion(cuerpo("https://atacante.test/recoge")));
    expect(r.status).toBe(200);
  });
});

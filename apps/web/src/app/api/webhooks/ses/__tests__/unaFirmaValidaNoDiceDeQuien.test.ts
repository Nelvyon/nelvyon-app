/**
 * BLOQUE 7 · una firma válida no dice de QUIÉN.
 *
 * `/api/webhooks/ses` recibe notificaciones de rebote, queja y entrega de SES a
 * través de SNS, y las verifica con esmero: comprueba `SignatureVersion`, baja
 * el certificado y **valida la URL del certificado contra un patrón anclado**
 * (`https://sns.<region>.amazonaws.com/`), que es justo la defensa que la
 * mayoría se deja. Esa parte está bien y aquí se asegura para que no se pierda.
 *
 * El problema es el que queda cuando la firma verifica: **AWS firma para todo el
 * mundo**. Cualquiera con una cuenta gratuita puede crear su propio topic SNS,
 * apuntarlo a este endpoint y publicar. El certificado será de AWS de verdad, la
 * URL pasará el patrón, y la firma verificará — porque es auténtica. Lo único
 * que distingue el topic de NELVYON del topic del atacante es el `TopicArn`, que
 * va dentro de la cadena firmada... y que **nadie compara con nada**.
 *
 * Y no hace falta que NELVYON acepte nada: el manejador **auto-confirma toda
 * suscripción** que le llegue (`fetch(envelope.SubscribeURL)`), así que el
 * atacante engancha su topic él solo.
 *
 * Lo que se consigue con eso no es ruido: `extractIds` saca el `tenantId` de las
 * cabeceras del correo —del mensaje, es decir del atacante— y lo mete tal cual
 * en `UPDATE saas_campania_recipients ... WHERE tenant_id = $1`. Un anónimo con
 * una cuenta de AWS marca como rebotados los destinatarios de las campañas de
 * cualquier inquilino. Es escritura entre inquilinos desde fuera del producto.
 *
 * NO SE ATACA A AWS NI A NADIE. El par de claves se genera aquí y la descarga
 * del certificado se sustituye en el proceso. Lo que se sustituye es **de quién
 * es la clave**, que es precisamente lo irrelevante: la propiedad que se pone a
 * prueba es que una firma auténtica de un topic desconocido debe rechazarse.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSign, generateKeyPairSync } from "crypto";

const consultas: Array<{ sql: string; params: unknown[] }> = [];

vi.mock("../../../../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        consultas.push({ sql, params });
        return { rows: [], rowCount: 0 };
      }),
    }),
  },
}));

import { POST } from "../route";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = publicKey.export({ type: "spki", format: "pem" }).toString();

// El topic de verdad de NELVYON y el que se monta el atacante en su cuenta.
const TOPIC_NELVYON = "arn:aws:sns:eu-west-1:111111111111:nelvyon-ses-events";
const TOPIC_ATACANTE = "arn:aws:sns:eu-west-1:999999999999:topic-del-atacante";

const CERT_URL = "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-abc123.pem";

type Sobre = Record<string, string>;

/** La cadena canónica que SNS firma. Misma construcción que el propio route. */
function cadenaFirmada(msg: Sobre): string {
  const campos =
    msg.Type === "Notification"
      ? ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return campos
    .filter((f) => msg[f] !== undefined)
    .map((f) => `${f}\n${msg[f]}\n`)
    .join("");
}

function firmado(msg: Sobre): Sobre {
  const s = createSign("SHA1");
  s.update(cadenaFirmada(msg));
  return {
    ...msg,
    SignatureVersion: "1",
    SigningCertURL: CERT_URL,
    Signature: s.sign(privateKey, "base64"),
  };
}

/** Un rebote que apunta al inquilino que el atacante elija. */
function rebote(tenantId: string): string {
  return JSON.stringify({
    notificationType: "Bounce",
    bounce: { bouncedRecipients: [{ emailAddress: "cliente@victima.test" }] },
    mail: {
      headers: [
        { name: "X-Tenant-Id", value: tenantId },
        { name: "X-Campania-Id", value: "campania-de-la-victima" },
        { name: "X-Recipient-Id", value: "contacto-de-la-victima" },
      ],
    },
  });
}

function notificacion(topic: string, tenantId: string): Sobre {
  return firmado({
    Type: "Notification",
    MessageId: "m-1",
    TopicArn: topic,
    Timestamp: "2026-08-26T10:00:00.000Z",
    Message: rebote(tenantId),
  });
}

function peticion(sobre: unknown): Request {
  return new Request("https://nelvyon.test/api/webhooks/ses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sobre),
  });
}

let fetchDe: string[] = [];

beforeEach(() => {
  consultas.length = 0;
  fetchDe = [];
  delete process.env.SKIP_SNS_VERIFY;
  process.env.SES_SNS_TOPIC_ARN = TOPIC_NELVYON;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const u = String(url);
      fetchDe.push(u);
      // Se sirve el certificado solo desde donde AWS lo serviría de verdad.
      if (u === CERT_URL) return new Response(PEM, { status: 200 });
      return new Response("", { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const escrituras = () => consultas.filter((c) => /UPDATE/i.test(c.sql));

describe("BLOQUE 7 · lo que SÍ está bien y no se puede perder", () => {
  it("EL CONTROL: una notificación legítima del topic de NELVYON se procesa", async () => {
    /**
     * Sin este control, un endpoint que rechazara todo pasaría cada ataque de
     * abajo y dejaría a NELVYON sin enterarse de un solo rebote — que es cómo se
     * arruina la reputación de envío de todos los clientes a la vez.
     */
    const r = await POST(peticion(notificacion(TOPIC_NELVYON, "tenant-propio")) as never);
    expect(r.status).toBe(200);
    expect(escrituras().length).toBeGreaterThan(0);
  });

  it("sin firma válida se rechaza con 403", async () => {
    const sobre = notificacion(TOPIC_NELVYON, "tenant-propio");
    sobre.Signature = Buffer.from("basura").toString("base64");
    const r = await POST(peticion(sobre) as never);
    expect(r.status).toBe(403);
    expect(escrituras()).toHaveLength(0);
  });

  it("un certificado servido fuera de AWS se rechaza", async () => {
    // Esta defensa YA existe y está bien anclada. Se asegura para que nadie la
    // relaje al añadir el resto.
    for (const url of [
      "https://sns.eu-west-1.amazonaws.com.atacante.test/cert.pem",
      "https://atacante.test/sns.eu-west-1.amazonaws.com/cert.pem",
      "http://sns.eu-west-1.amazonaws.com/cert.pem",
      "https://sns.eu-west-1.amazonaws.com@atacante.test/cert.pem",
    ]) {
      const sobre = notificacion(TOPIC_NELVYON, "tenant-propio");
      sobre.SigningCertURL = url;
      const r = await POST(peticion(sobre) as never);
      expect(r.status, `se acepto un certificado de ${url}`).toBe(403);
    }
  });
});

describe("BLOQUE 7 · el topic del atacante", () => {
  it("una notificación FIRMADA de un topic desconocido NO se procesa", async () => {
    /**
     * El ataque. Firma auténtica, certificado en una URL de AWS legítima, y un
     * `TopicArn` que no es el de NELVYON. Es lo que sale de crear un topic en tu
     * propia cuenta de AWS y apuntarlo aquí.
     */
    const r = await POST(peticion(notificacion(TOPIC_ATACANTE, "tenant-propio")) as never);
    expect(
      escrituras(),
      "un topic ajeno con firma valida escribio en la base de datos",
    ).toHaveLength(0);
    expect(r.status).not.toBe(200);
  });

  it("un topic desconocido no puede tocar los datos de OTRO inquilino", async () => {
    /**
     * Lo que de verdad se gana con el ataque: `extractIds` saca el `tenantId` de
     * las cabeceras del correo y lo mete en el `WHERE`. Marcar como rebotados
     * los destinatarios de la campaña de otro es sabotaje de entregabilidad
     * contra un cliente, desde fuera y sin cuenta en NELVYON.
     */
    await POST(peticion(notificacion(TOPIC_ATACANTE, "tenant-DE-LA-VICTIMA")) as never);
    const contra = escrituras().filter((c) =>
      c.params.some((p) => p === "tenant-DE-LA-VICTIMA"),
    );
    expect(
      contra,
      "se escribio contra el inquilino que eligio el atacante desde un topic ajeno",
    ).toHaveLength(0);
  });

  it("NO se auto-confirma la suscripción de un topic desconocido", async () => {
    /**
     * Esto es lo que convierte lo anterior en trivial: el manejador visita
     * `SubscribeURL` de cualquier sobre que le llegue, así que el atacante
     * engancha su topic sin que nadie en NELVYON haga nada.
     */
    const sobre = firmado({
      Type: "SubscriptionConfirmation",
      MessageId: "m-2",
      TopicArn: TOPIC_ATACANTE,
      Timestamp: "2026-08-26T10:00:00.000Z",
      Token: "t-1",
      SubscribeURL: "https://sns.eu-west-1.amazonaws.com/?Action=ConfirmSubscription&Token=t-1",
      Message: "You have chosen to subscribe",
    });
    await POST(peticion(sobre) as never);
    expect(
      fetchDe.filter((u) => u.includes("ConfirmSubscription")),
      "se confirmo sola la suscripcion de un topic ajeno",
    ).toHaveLength(0);
  });

  it("EL CONTROL: la suscripción del topic PROPIO sí se confirma", async () => {
    // Cerrar la confirmación del todo dejaría el webhook imposible de dar de
    // alta. La corrección tiene que distinguir, no prohibir.
    const sobre = firmado({
      Type: "SubscriptionConfirmation",
      MessageId: "m-3",
      TopicArn: TOPIC_NELVYON,
      Timestamp: "2026-08-26T10:00:00.000Z",
      Token: "t-2",
      SubscribeURL: "https://sns.eu-west-1.amazonaws.com/?Action=ConfirmSubscription&Token=t-2",
      Message: "You have chosen to subscribe",
    });
    await POST(peticion(sobre) as never);
    expect(fetchDe.filter((u) => u.includes("ConfirmSubscription"))).toHaveLength(1);
  });

  it("`SubscribeURL` fuera de AWS no se visita", async () => {
    /**
     * El sobre trae DOS URLs y solo una se valida. `SigningCertURL` pasa por un
     * patrón anclado; su hermana `SubscribeURL` se visita tal cual. Que hoy solo
     * sea alcanzable con firma válida no la hace correcta: son la misma clase de
     * dato y merecen la misma comprobación.
     */
    const sobre = firmado({
      Type: "SubscriptionConfirmation",
      MessageId: "m-4",
      TopicArn: TOPIC_NELVYON,
      Timestamp: "2026-08-26T10:00:00.000Z",
      Token: "t-3",
      SubscribeURL: "http://169.254.169.254/latest/meta-data/",
      Message: "You have chosen to subscribe",
    });
    await POST(peticion(sobre) as never);
    expect(
      fetchDe.filter((u) => u.includes("169.254.169.254")),
      "se visito una URL arbitraria sacada del sobre: SSRF a la metadata de la instancia",
    ).toHaveLength(0);
  });
});

describe("BLOQUE 7 · el interruptor que apaga la verificación", () => {
  it("`SKIP_SNS_VERIFY` no puede apagar la firma en producción", async () => {
    /**
     * `if (process.env.SKIP_SNS_VERIFY !== "true")` no mira el entorno. Una
     * variable de entorno mal puesta —o heredada de un fichero de pruebas— deja
     * el webhook abierto de par en par sin que nada lo delate.
     *
     * La ruta hermana de WhatsApp ya hace lo correcto («required in
     * production»): el patrón existe en la casa, aquí no se aplicaba.
     */
    vi.stubEnv("NODE_ENV", "production");
    process.env.SKIP_SNS_VERIFY = "true";
    try {
      const sobre = notificacion(TOPIC_NELVYON, "tenant-propio");
      sobre.Signature = Buffer.from("basura").toString("base64");
      const r = await POST(peticion(sobre) as never);
      expect(
        escrituras(),
        "una variable de entorno apago la verificacion de firma en produccion",
      ).toHaveLength(0);
      expect(r.status).not.toBe(200);
    } finally {
      delete process.env.SKIP_SNS_VERIFY;
      vi.unstubAllEnvs();
    }
  });
});

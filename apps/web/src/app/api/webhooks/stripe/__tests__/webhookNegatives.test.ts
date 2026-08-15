import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

/**
 * Negativos del webhook principal de Stripe.
 *
 * El fichero vive JUNTO a la ruta a propósito. Desde `backend/stripe/__tests__`
 * el `vi.mock` de `DbClient` no llegaba a aplicarse al módulo que la ruta
 * resuelve, así que `DbClient.getInstance().query` usaba el cliente real, fallaba
 * por falta de `DATABASE_URL` y la ruta devolvía un 503 genérico. Un 503 no
 * certifica nada: los tests de replay habrían quedado verdes sin llegar nunca al
 * claim. Aquí el especificador del mock es el mismo camino que usa `route.ts`,
 * de modo que test y módulo bajo prueba comparten grafo de resolución.
 *
 * Todo atraviesa la ruta REAL con firma REAL. No se mockea el verificador de
 * firma ni el resultado del claim: lo único sustituido es Postgres, y su doble
 * reproduce la semántica del `ON CONFLICT` — incluida su atomicidad, que es lo
 * que permite modelar el replay concurrente sin serializar la carrera a mano.
 */

const SECRET = "whsec_secreto_de_pruebas_para_negativos";

/**
 * `vi.hoisted` es obligatorio: las factorías de `vi.mock` se elevan al inicio del
 * fichero, así que un `const` normal quedaría en TDZ, la factoría lanzaría y se
 * usaría el DbClient REAL.
 */
const { estado } = vi.hoisted(() => ({
  estado: {
    /** Nº de veces que la ruta pidió una instancia AL DOBLE. Si es 0, el mock no intercepta. */
    instancias: 0,
    consultas: [] as Array<{ sql: string; params: unknown[] }>,
    /** Tabla `stripe_webhook_events` falsa. */
    eventos: new Map<string, { status: string; receivedAt: number }>(),
    /**
     * Side effect observable: nº de veces que el pipeline EMITIÓ el UPSERT de
     * `subscriptions`. Se cuenta la emisión, no el cambio de fila, porque el
     * upsert lleva su propia guarda de recencia
     * (`last_stripe_event_at < EXCLUDED...`) que en un replay del MISMO evento
     * también rechazaría la segunda escritura. Contar filas mezclaría dos
     * controles independientes y dejaría la idempotencia sin certificar.
     */
    upsertsEmitidos: 0,
    fila: null as Record<string, unknown> | null,
  },
}));

const AHORA = () => Date.now();
const DIEZ_MIN = 10 * 60 * 1000;

vi.mock("../../../../../../../../backend/db/DbClient", () => ({
  DbClient: {
    getInstance: () => {
      estado.instancias += 1;
      return {
        query: async (sql: string, params: unknown[] = []) => {
          estado.consultas.push({ sql: sql.replace(/\s+/g, " ").trim(), params });

          // --- claim de idempotencia -------------------------------------
          if (/INSERT INTO stripe_webhook_events/i.test(sql)) {
            const id = String(params[0]);
            const previo = estado.eventos.get(id);
            if (!previo) {
              estado.eventos.set(id, { status: "processing", receivedAt: AHORA() });
              return [{ status: "processing" }];
            }
            // Se honra la condición REALMENTE presente en la sentencia: si
            // alguien relaja el WHERE, el doble concede el claim y el replay
            // pasa a duplicar. Eso es lo que mata la mutación.
            const bloqueaProcesados = /status NOT IN \('processed'\)/i.test(sql);
            const bloqueaEnCurso = /status\s*<>\s*'processing'/i.test(sql);
            const noProcesado = !bloqueaProcesados || previo.status !== "processed";
            const noEnCurso =
              !bloqueaEnCurso ||
              previo.status !== "processing" ||
              previo.receivedAt < AHORA() - DIEZ_MIN;
            if (noProcesado && noEnCurso) {
              estado.eventos.set(id, { status: previo.status, receivedAt: AHORA() });
              return [{ status: previo.status }];
            }
            return []; // cero filas -> duplicado
          }

          if (/UPDATE stripe_webhook_events/i.test(sql)) {
            const id = String(params[0]);
            const previo = estado.eventos.get(id);
            if (previo && /status = 'processed'/i.test(sql)) {
              estado.eventos.set(id, { status: "processed", receivedAt: previo.receivedAt });
            }
            return [];
          }

          // --- side effect del procesamiento -----------------------------
          if (/INSERT INTO subscriptions/i.test(sql)) {
            estado.upsertsEmitidos += 1;
            const nuevo = params[7] as Date | undefined;
            const previo = estado.fila?.last_stripe_event_at as Date | undefined;
            const tieneGuarda =
              /subscriptions\.last_stripe_event_at\s*<\s*EXCLUDED\.last_stripe_event_at/i.test(sql);
            if (tieneGuarda && previo && nuevo && nuevo.getTime() <= previo.getTime()) return [];
            estado.fila = {
              user_id: params[0],
              stripe_subscription_id: params[1],
              plan: params[3],
              status: params[4],
              last_stripe_event_at: nuevo,
              last_stripe_event_id: params[8],
            };
            return [];
          }

          // Email del usuario: sin fila, `notifyPlanActivated` no envía nada.
          return [];
        },
      };
    },
  },
}));

import { POST } from "../route";

/** Firma con el esquema oficial: t=<ts>,v1=HMAC-SHA256(ts.payload). */
function firmar(payload: string, ts = Math.floor(Date.now() / 1000)): string {
  const mac = crypto.createHmac("sha256", SECRET).update(`${ts}.${payload}`).digest("hex");
  return `t=${ts},v1=${mac}`;
}

function evento(id: string, tipo = "customer.subscription.updated", completo = true): string {
  const object = completo
    ? {
        id: "sub_neg",
        object: "subscription",
        customer: "cus_neg",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1893456000,
        metadata: { user_id: "11111111-1111-4111-8111-111111111111" },
        items: { data: [{ price: { id: "price_starter" } }] },
      }
    : { id: "sub_neg", object: "subscription" }; // sin metadata ni items
  return JSON.stringify({
    id,
    object: "event",
    created: Math.floor(Date.now() / 1000),
    type: tipo,
    data: { object },
  });
}

function peticion(payload: string, firma: string | null): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (firma !== null) headers.set("stripe-signature", firma);
  return new Request("https://nelvyon.test/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers,
  });
}

const claims = () => estado.consultas.filter((c) => /INSERT INTO stripe_webhook_events/i.test(c.sql));

beforeEach(() => {
  estado.instancias = 0;
  estado.consultas = [];
  estado.eventos.clear();
  estado.upsertsEmitidos = 0;
  estado.fila = null;
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_para_pruebas";
  process.env.STRIPE_PRICE_ID_STARTER = "price_starter";
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

/**
 * Sin esto, el resto del fichero no vale nada: si el doble no intercepta, la
 * ruta devuelve 503 antes de tocar ninguna lógica y los negativos quedarían
 * verdes por el motivo equivocado. No basta con que desaparezca el 503.
 */
describe("sanity — el doble de Postgres SÍ intercepta a la ruta", () => {
  it("la ruta pide instancia al doble, le emite el claim real y consume su respuesta", async () => {
    const payload = evento("evt_sanity", "customer.subscription.updated");
    const res = await POST(peticion(payload, firmar(payload)) as never);

    // 1. La ruta obtuvo su DbClient DEL MOCK.
    expect(estado.instancias).toBeGreaterThan(0);

    // 2. Le llegó el claim real, con el event.id real como $1.
    const claim = claims()[0];
    expect(claim).toBeDefined();
    expect(claim!.params[0]).toBe("evt_sanity");
    expect(claim!.sql).toMatch(/ON CONFLICT \(stripe_event_id\) DO UPDATE/i);

    // 3. La ruta CONSUMIÓ la respuesta del doble: al conceder el claim siguió
    //    adelante, ejecutó el side effect y marcó el evento como procesado.
    expect(res.status).toBe(200);
    expect(estado.upsertsEmitidos).toBe(1);
    expect(estado.eventos.get("evt_sanity")?.status).toBe("processed");
    expect(estado.fila?.plan).toBe("starter");
  });
});

describe("negativo 3 — firma ausente", () => {
  it("sin cabecera stripe-signature: cero side effects y cero claim", async () => {
    const res = await POST(peticion(evento("evt_sin_firma"), null) as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(estado.upsertsEmitidos).toBe(0);
    // Ni siquiera llega a reclamar el evento.
    expect(claims()).toHaveLength(0);
  });
});

describe("negativo 5 — raw body modificado conservando la firma original", () => {
  it("firma válida del payload ORIGINAL + body alterado: rechazo sin mutación", async () => {
    const original = evento("evt_body");
    const firmaDelOriginal = firmar(original);
    // El atacante altera el cuerpo pero reutiliza la firma legítima.
    const alterado = original.replace('"status":"active"', '"status":"canceled"');
    expect(alterado).not.toBe(original);

    const res = await POST(peticion(alterado, firmaDelOriginal) as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(estado.upsertsEmitidos).toBe(0);
    expect(claims()).toHaveLength(0);
  });
});

describe("negativo 6 — timestamp fuera de tolerancia", () => {
  it("HMAC criptográficamente correcto pero con t antiguo: cero procesamiento", async () => {
    const payload = evento("evt_viejo");
    // Firma correcta para ese timestamp: lo que falla es la ventana temporal,
    // validada por la lógica real de Stripe, no por un mock.
    const hace2h = Math.floor(Date.now() / 1000) - 7200;
    const res = await POST(peticion(payload, firmar(payload, hace2h)) as never);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(estado.upsertsEmitidos).toBe(0);
    expect(claims()).toHaveLength(0);
  });

  it("la tolerancia es de UN SOLO LADO: un t futuro con firma válida sí se acepta", async () => {
    const payload = evento("evt_futuro");
    const dentro2h = Math.floor(Date.now() / 1000) + 7200;
    const res = await POST(peticion(payload, firmar(payload, dentro2h)) as never);

    // Comportamiento verificado en la librería oficial (`Webhooks.js`):
    //     timestampAge = now - t;  if (tolerance > 0 && timestampAge > tolerance) throw
    // Una edad negativa nunca supera la tolerancia, así que el lado futuro no
    // está acotado. Es diseño de Stripe, no un defecto de NELVYON, y no es
    // explotable: fabricar ese `t` exige calcular HMAC(t.payload) con el secreto
    // del endpoint. Quien lo tenga ya no necesita jugar con relojes.
    //
    // Lo que el control protege de verdad —replay de un payload legítimo
    // capturado, que siempre lleva un `t` PASADO— queda cubierto por el test
    // anterior. Este fija el comportamiento observado para que un cambio de
    // versión de la librería que altere la ventana se detecte aquí.
    expect(res.status).toBe(200);
    expect(estado.upsertsEmitidos).toBe(1);
  });
});

describe("negativo 11 — replay secuencial", () => {
  it("el mismo event.id dos veces produce UN solo side effect", async () => {
    const payload = evento("evt_replay_seq");
    const firma = firmar(payload);

    const r1 = await POST(peticion(payload, firma) as never);
    expect(r1.status).toBe(200);
    expect(estado.upsertsEmitidos).toBe(1);

    const r2 = await POST(peticion(payload, firma) as never);
    const cuerpo = (await r2.json()) as { skipped?: string };

    // La segunda entrega NO vuelve a ejecutar el pipeline.
    expect(estado.upsertsEmitidos).toBe(1);
    expect(cuerpo.skipped).toBe("duplicate");
    // Y el claim sí se intentó las dos veces: la protección está en la
    // sentencia, no en un cortocircuito previo.
    expect(claims()).toHaveLength(2);
  });
});

describe("negativo 12 — replay concurrente", () => {
  it("dos entregas simultáneas del mismo event.id: un único claim y un único side effect", async () => {
    const payload = evento("evt_replay_conc");
    const firma = firmar(payload);

    // Se lanzan sin await entre medias: ambas compiten de verdad por el claim,
    // interleavándose en cada punto de suspensión de la ruta. El doble evalúa e
    // inserta sin await intermedio, que es como Postgres resuelve el conflicto
    // sobre la clave única.
    const [r1, r2] = await Promise.all([
      POST(peticion(payload, firma) as never),
      POST(peticion(payload, firma) as never),
    ]);

    expect(estado.upsertsEmitidos).toBe(1);
    expect(claims()).toHaveLength(2); // las dos lo intentaron...
    const cuerpos = (await Promise.all([r1.json(), r2.json()])) as Array<{ skipped?: string }>;
    const duplicados = cuerpos.filter((c) => c.skipped === "duplicate");
    expect(duplicados).toHaveLength(1); // ...pero solo una ganó
  });
});

describe("negativo 13 — evento desconocido e incompleto", () => {
  it("tipo de evento desconocido: se acusa recibo pero no muta datos", async () => {
    const payload = evento("evt_desconocido", "cosa.que.no.existe");
    const res = await POST(peticion(payload, firmar(payload)) as never);
    expect(res.status).toBe(200);
    expect(estado.upsertsEmitidos).toBe(0);
    expect(estado.fila).toBeNull();
  });

  it("evento conocido SIN metadata ni items: fail-closed, cero mutación", async () => {
    const payload = evento("evt_incompleto", "customer.subscription.updated", false);
    const res = await POST(peticion(payload, firmar(payload)) as never);
    // Rama distinta a la anterior: el tipo SÍ se reconoce, pero falta el
    // `metadata.user_id` que ata la suscripción a un usuario. No se inventa un
    // usuario ni se escribe con un identificador vacío.
    expect(res.status).toBe(200);
    expect(estado.upsertsEmitidos).toBe(0);
    expect(estado.fila).toBeNull();
  });
});

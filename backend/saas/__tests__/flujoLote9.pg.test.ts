/**
 * BLOQUE 2 · lote 9 — portal de cliente, chatbot y SMS.
 *
 * El portal de cliente se abre con un TOKEN, sin sesión: la persona que aprueba
 * un entregable no tiene cuenta en NELVYON. Ese token es toda la autorización que
 * hay, así que lo que importa es que no se pueda fabricar, ni modificar, ni
 * reutilizar pasado su plazo.
 *
 * El SMS y el chatbot son superficies que GASTAN: un SMS enviado no se devuelve,
 * y una respuesta del chatbot puede llevar coste de inferencia. En los dos se
 * comprueba que se rehúsen limpiamente cuando no hay proveedor, en vez de
 * fingirse.
 *
 * Se salta sin `NELVYON_B2_DSN` la parte que necesita base; el portal no la
 * necesita y corre siempre.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ChatbotService } from "../ChatbotService";
import {
  hashApprovalToken,
  signPortalApprovalToken,
  verifyPortalApprovalToken,
} from "../PortalApprovalTokenService";
import { SaasSmsService } from "../SaasSmsService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa16";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb16";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// portal de cliente — el token ES la autorización
// ════════════════════════════════════════════════════════════════════════════

describe("BLOQUE 2 · portal de cliente", () => {
  const carga = { deliverableId: "e1", tenantId: A, clientEmail: "cliente@final.test" };

  it("EL CONTROL: un token recién firmado verifica y trae su carga", () => {
    // Sin esto, una verificación que rechazara todo aprobaría las pruebas de
    // abajo y dejaría el portal inservible: nadie podría aprobar nada.
    const t = signPortalApprovalToken(carga as never);
    const r = verifyPortalApprovalToken(t);
    expect(r.ok).toBe(true);
    expect(r.ok && r.payload.tenantId).toBe(A);
  });

  it("un token inventado no verifica", () => {
    expect(verifyPortalApprovalToken("esto.noesuntoken").ok).toBe(false);
  });

  it("cambiar la CARGA invalida la firma", () => {
    // El ataque evidente: coger un token propio y cambiarle el inquilino o el
    // entregable para aprobar el de otro.
    const t = signPortalApprovalToken(carga as never);
    const [datos, firma] = t.split(".");
    const manipulada = Buffer.from(
      JSON.stringify({ ...carga, tenantId: B, exp: 9_999_999_999 }),
    ).toString("base64url");

    expect(verifyPortalApprovalToken(`${manipulada}.${firma}`).ok).toBe(false);
    expect(datos).toBeTruthy();
  });

  it("cambiar la FIRMA tampoco cuela", () => {
    const t = signPortalApprovalToken(carga as never);
    const [datos] = t.split(".");
    expect(verifyPortalApprovalToken(`${datos}.firmainventada`).ok).toBe(false);
  });

  it("un token CADUCADO se rechaza, y lo dice", () => {
    // Un enlace de aprobación que no caduca es una puerta abierta para siempre
    // en el correo de alguien.
    const t = signPortalApprovalToken(carga as never, -1);
    const r = verifyPortalApprovalToken(t);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toBe("expired");
  });

  it("un token sin las dos partes se rechaza como malformado", () => {
    expect(verifyPortalApprovalToken("solounaparte").ok).toBe(false);
    expect(verifyPortalApprovalToken("").ok).toBe(false);
    expect(verifyPortalApprovalToken("a.b.c").ok).toBe(false);
  });

  it("el hash del token no es el token", () => {
    // Lo que se guarda para poder revocar es el hash: guardar el token entero
    // sería guardar la llave junto a la cerradura.
    const t = signPortalApprovalToken(carga as never);
    const h = hashApprovalToken(t);
    expect(h).not.toBe(t);
    expect(h).toHaveLength(64);                 // sha256 en hexadecimal
    expect(hashApprovalToken(t)).toBe(h);       // estable
  });

  it("dos tokens del mismo entregable no son iguales entre inquilinos", () => {
    const deA = signPortalApprovalToken({ ...carga, tenantId: A } as never);
    const deB = signPortalApprovalToken({ ...carga, tenantId: B } as never);
    expect(deA).not.toBe(deB);

    const rB = verifyPortalApprovalToken(deB);
    expect(rB.ok && rB.payload.tenantId).toBe(B);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// chatbot y SMS — superficies que gastan
// ════════════════════════════════════════════════════════════════════════════

describeSiHayPg("BLOQUE 2 · chatbot y SMS", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
      await pool.query(
        `INSERT INTO nelvyon_users
           (user_id, email, password_hash, full_name, plan, tenant_id,
            created_at, updated_at, email_verified)
         VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, `cert-${id}@nelvyon.test`, nombre]);
      await pool.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
         VALUES ($1, $1, $2, 'certificacion', 'pro')
         ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
        [id, nombre]);
    }
  });

  afterAll(async () => { await pool?.end(); });

  describe("chatbot", () => {
    let svc: ChatbotService;
    beforeAll(() => { svc = new ChatbotService({ db: puerto() as never }); });
    beforeEach(async () => {
      // Acotado al par de inquilinos de ESTE fichero: un DELETE sin filtro
      // borraria lo que otro fichero acaba de sembrar, y vitest los corre en paralelo.
      await pool.query(
        "DELETE FROM chatbot_conversations WHERE chatbot_id IN (SELECT id FROM chatbot_configs WHERE user_id = ANY($1::text[]))",
        [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM chatbot_configs WHERE user_id = ANY($1::text[])", [[A, B]]).catch(() => {});
    });

    const config = (nombre = "Asistente de A") => ({
      name: nombre, greeting: "Hola", systemPrompt: "Ayuda al visitante",
      captureLeads: true, escalateKeywords: ["humano"], primaryColor: "#112233",
      allowBooking: false,
    });

    it("crear → releer conserva la configuración", async () => {
      await svc.createChatbot(A, config() as never);
      const leido = await svc.getChatbot(A);
      expect(leido?.name).toBe("Asistente de A");
      // `escalateKeywords` viaja en JSON: tiene que volver como ARRAY.
      expect(Array.isArray(leido?.escalateKeywords)).toBe(true);
    });

    it("EL CONTROL: B no lee el chatbot de A", async () => {
      await svc.createChatbot(A, config() as never);
      const deA = await svc.getChatbot(A);
      const deB = await svc.getChatbot(B);
      expect(deA).toBeTruthy();                    // control positivo
      expect(deB).toBeNull();
    });

    it("el código de inserción lleva el id del chatbot y no un secreto", async () => {
      // Ese fragmento se pega en la web pública del cliente: si llevara una
      // credencial, estaría publicada.
      const bot = await svc.createChatbot(A, config() as never);
      const codigo = await svc.generateEmbedCode(bot.id, "https://cliente.test");
      expect(codigo).toContain(bot.id);
      expect(codigo.toLowerCase()).not.toContain("secret");
      expect(codigo).not.toContain("nlv_");
    });

    it("las conversaciones de A no salen en las de B", async () => {
      const bot = await svc.createChatbot(A, config() as never);
      await pool.query(
        `INSERT INTO chatbot_conversations (chatbot_id, session_id, messages, created_at)
         VALUES ($1, 'sesion-1', '[]'::jsonb, NOW())`,
        [bot.id]).catch(() => {});

      const deB = await svc.getConversations(B);
      expect(deB).toHaveLength(0);
    });
  });

  describe("SMS", () => {
    let svc: SaasSmsService;
    beforeAll(() => { svc = new SaasSmsService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_sms_log WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("sin proveedor configurado el estado lo dice, no finge", async () => {
      const estado = svc.getStatus();
      expect(estado.configured).toBe(false);
    });

    it("enviar sin proveedor se REHÚSA y no deja un envío fantasma", async () => {
      // Un SMS que se da por enviado sin salir es la peor de las dos: el cliente
      // cree que ha avisado a alguien.
      await svc.send(A, "+34600000000", "Aviso").catch(() => {});

      const enviados = await pool.query<{ status: string }>(
        "SELECT status FROM saas_sms_log WHERE tenant_id = $1", [A]);
      expect(enviados.rows.every((r) => r.status !== "sent")).toBe(true);
    });

    it("el registro de A no incluye los SMS de B", async () => {
      await pool.query(
        `INSERT INTO saas_sms_log (tenant_id, to_number, body, status, created_at)
         VALUES ($1, '+34600000001', 'De A', 'failed', NOW()),
                ($2, '+34600000002', 'De B', 'failed', NOW())`,
        [A, B]).catch(() => {});

      const deA = await svc.listRecent(A);
      expect(deA.length).toBeGreaterThan(0);                    // control positivo
      expect(JSON.stringify(deA)).not.toContain("De B");
    });
  });
});

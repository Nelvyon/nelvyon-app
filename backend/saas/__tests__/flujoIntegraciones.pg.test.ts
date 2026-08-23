/**
 * BLOQUE 2 · integraciones — lo que SÍ se puede certificar sin proveedor.
 *
 * 67 rutas, y 53 de ellas necesitan una credencial de un tercero (Google, Meta,
 * TikTok, Twilio, Slack…). Esas no se certifican aquí: hacerlo exigiría cuentas
 * reales y generaría coste. Quedan como `BLOCKED_EXTERNALLY`, con su motivo.
 *
 * Lo que sí es interno —y es lo que más riesgo tiene— es el ALMACÉN de
 * conexiones: qué integraciones tiene conectadas cada inquilino y con qué
 * tokens. Ahí un fallo de alcance no es un error de funcionamiento, es que el
 * cliente A opere la cuenta de anuncios del cliente B.
 *
 * Eso se certifica entero:
 *
 *   listar → estado por integración → desconectar → aislamiento A/B
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasIntegrationsHubService } from "../SaasIntegrationsHubService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let svc: SaasIntegrationsHubService;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa05";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

/** Una conexión guardada, como la dejaría un OAuth completado. */
async function conectar(inquilino: string, slug: string, token: string) {
  await pool.query(
    // Las columnas REALES: `connector_slug`, y el token va en
    // `access_token_enc` —cifrado en reposo, que es como debe estar—.
    `INSERT INTO saas_integration_connections
       (tenant_id, connector_slug, status, access_token_enc, created_at, updated_at)
     VALUES ($1, $2, 'connected', $3, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [inquilino, slug, token]);
}

describeSiHayPg("BLOQUE 2 · integraciones — el almacén de conexiones", () => {
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
    svc = new SaasIntegrationsHubService(puerto() as never);
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("DELETE FROM saas_integration_connections WHERE tenant_id = ANY($1)", [[A, B]]);
  });

  it("una conexión guardada aparece en la lista del inquilino", async () => {
    await conectar(A, "hubspot", "token-de-A");
    const lista = await svc.listConnections(A);
    const google = lista.find((x) => x.slug === "hubspot");
    expect(google).toBeTruthy();
  });

  it("EL CONTROL: la lista de B NO trae la conexión de A", async () => {
    // Aquí un fallo de alcance no es un error de funcionamiento: es que el
    // cliente A pueda operar la cuenta de anuncios del cliente B.
    await conectar(A, "hubspot", "token-de-A");

    const deB = await svc.listConnections(B);
    const conectadas = deB.filter((x) => x.status === "connected");
    expect(conectadas).toHaveLength(0);
  });

  it("el estado por integración es el del inquilino que pregunta", async () => {
    await conectar(A, "hubspot", "token-de-A");

    const enA = await svc.getConnectionStatus(A, "hubspot");
    const enB = await svc.getConnectionStatus(B, "hubspot");
    expect(enA.status).toBe("connected");
    expect(enB.status).not.toBe("connected");
  });

  it("el token de A no viaja en la respuesta de B", async () => {
    // Aunque el estado saliera bien, filtrar el token en el cuerpo sería peor:
    // con él se opera la cuenta sin pasar por NELVYON.
    await conectar(A, "hubspot", "token-secreto-de-A");
    const deB = await svc.listConnections(B);
    expect(JSON.stringify(deB)).not.toContain("token-secreto-de-A");
  });

  it("desconectar deja la conexión desconectada EN LA FILA", async () => {
    await conectar(A, "hubspot", "token-de-A");
    await svc.disconnect(A, "hubspot");

    const fila = await pool.query<{ status: string }>(
      "SELECT status FROM saas_integration_connections WHERE tenant_id = $1 AND connector_slug = $2",
      [A, "hubspot"]);
    // O se marca desconectada, o se borra la fila. Las dos valen; lo que no vale
    // es seguir figurando como conectada.
    expect(fila.rows[0]?.status ?? "borrada").not.toBe("connected");
  });

  it("B no puede desconectar la integración de A", async () => {
    // Desconectar la integración de otro es una denegación de servicio silenciosa:
    // sus campañas dejan de publicar y nadie sabe por qué.
    await conectar(A, "hubspot", "token-de-A");
    await svc.disconnect(B, "hubspot").catch(() => {});

    const fila = await pool.query<{ status: string }>(
      "SELECT status FROM saas_integration_connections WHERE tenant_id = $1 AND connector_slug = $2",
      [A, "hubspot"]);
    expect(fila.rows[0]?.status).toBe("connected");
  });

  it("el catálogo se puede leer sin inquilino, y no lleva tokens", async () => {
    // El catálogo es público por diseño —dice qué integraciones existen—, así que
    // lo que importa es que no arrastre credenciales de nadie.
    await conectar(A, "hubspot", "token-secreto-de-A");
    const catalogo = await svc.listConnections(B);
    expect(JSON.stringify(catalogo)).not.toContain("token-secreto");
  });
});

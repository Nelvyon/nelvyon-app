/**
 * BLOQUE 7 · aprobar con un clic, una sola vez, y solo lo tuyo.
 *
 * `POST /api/public/portal/approve` es el enlace que le llega al cliente final
 * por correo: un botón que aprueba o rechaza un entregable sin sesión, sin
 * contraseña y sin portal. El token ES la credencial, y la acción que ejecuta no
 * es leer nada: cambia el estado de un entregable y dispara lo que cuelgue de
 * él.
 *
 * Tres propiedades, y las tres se rompen de forma distinta:
 *
 *   1. **Una sola vez.** Los correos se reenvían, los clientes hacen doble clic,
 *      y los escáneres antivirus de las empresas VISITAN los enlaces de los
 *      correos antes de entregarlos. Sin uso único, una aprobación se ejecuta
 *      varias veces.
 *   2. **Antes de tocar nada.** No basta con marcar el token como usado: hay que
 *      marcarlo ANTES del efecto. Si se marca después, dos peticiones a la vez
 *      pasan las dos por el hueco.
 *   3. **Solo lo tuyo.** El entregable, el workspace y el cliente salen del token
 *      firmado, nunca del cuerpo. Y aun así se vuelve a comprobar que el
 *      entregable pertenezca a ese cliente.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const consultas: Array<{ sql: string; params: unknown[] }> = [];
const efectos: Array<{ accion: string; deliverableId: string; workspaceId: number; clientId: string }> = [];

/** Filas que devuelve la reclamación del token. Se cambia por test. */
let reclamacion: Array<{ id: string }> = [{ id: "tok-1" }];
let entregable: Array<{ client_id: string }> = [{ client_id: "cli-1" }];

vi.mock("../../../../../../../../../backend/db/DbJobsClient", () => ({
  DbJobsClient: {
    getInstance: () => ({
      query: async (sql: string, params: unknown[] = []) => {
        consultas.push({ sql, params });
        if (/UPDATE os_deliverable_approval_tokens/i.test(sql)) return reclamacion;
        if (/FROM os_deliverables/i.test(sql)) return entregable;
        return [];
      },
    }),
  },
}));

vi.mock("@/lib/portal/portalDeliverablesStore", () => ({
  approvePortalDeliverableBff: vi.fn(async (o: Record<string, unknown>) => {
    efectos.push({ accion: "approve", ...o } as (typeof efectos)[number]);
    return { id: o.deliverableId, status: "approved" };
  }),
  rejectPortalDeliverableBff: vi.fn(async (o: Record<string, unknown>) => {
    efectos.push({ accion: "reject", ...o } as (typeof efectos)[number]);
    return { id: o.deliverableId, status: "rejected" };
  }),
}));

import {
  signPortalApprovalToken,
} from "../../../../../../../../../backend/saas/PortalApprovalTokenService";
import { POST } from "../route";

const SECRETO = "secreto-hmac-de-certificacion-bloque-7-con-longitud-de-sobra";

function peticion(cuerpo: Record<string, unknown>): Request {
  return new Request("https://nelvyon.test/api/public/portal/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

function tokenBueno(over: Record<string, unknown> = {}): string {
  return signPortalApprovalToken({
    did: "11111111-1111-4111-8111-111111111111",
    wid: 42,
    cid: "cli-1",
    act: "approve",
    ...over,
  } as never);
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRETO;
  process.env.TRACKING_SECRET = SECRETO;
  consultas.length = 0;
  efectos.length = 0;
  reclamacion = [{ id: "tok-1" }];
  entregable = [{ client_id: "cli-1" }];
});

describe("BLOQUE 7 · EL CONTROL: el cliente aprueba su entregable", () => {
  it("un token legítimo aprueba", async () => {
    /**
     * Sin este control, una ruta que rechazara todo pasaría cada ataque de abajo
     * y dejaría a los clientes sin poder aprobar nada — que es el producto.
     */
    const r = await POST(peticion({ token: tokenBueno() }));
    expect(r.status).toBe(200);
    expect(efectos).toHaveLength(1);
    expect(efectos[0].accion).toBe("approve");
    expect(efectos[0].workspaceId).toBe(42);
  });
});

describe("BLOQUE 7 · una sola vez", () => {
  it("un token ya usado no vuelve a ejecutar", async () => {
    /**
     * La reclamación es un `UPDATE ... WHERE used_at IS NULL RETURNING id`: si no
     * devuelve fila, el token ya se gastó. Aquí se simula esa segunda vez.
     */
    reclamacion = [];
    const r = await POST(peticion({ token: tokenBueno() }));
    expect(r.status).toBe(410);
    expect(efectos, "un token gastado volvio a aprobar el entregable").toHaveLength(0);
  });

  it("la reclamación ocurre ANTES de cualquier efecto", async () => {
    /**
     * El orden es la propiedad, no la existencia. Si el token se marcara después
     * del efecto, dos peticiones simultáneas pasarían las dos por el hueco — y
     * los escáneres de correo de las empresas hacen justamente eso: visitan los
     * enlaces en paralelo.
     */
    await POST(peticion({ token: tokenBueno() }));
    const iReclama = consultas.findIndex((c) =>
      /UPDATE os_deliverable_approval_tokens/i.test(c.sql),
    );
    expect(iReclama, "no hubo reclamacion del token").toBeGreaterThanOrEqual(0);
    expect(efectos).toHaveLength(1);
    // Y la reclamación es la PRIMERA consulta que se hace.
    expect(
      iReclama,
      "se consulto algo antes de reclamar el token de un solo uso",
    ).toBe(0);
  });

  it("la reclamación exige que el token no esté usado NI caducado", async () => {
    await POST(peticion({ token: tokenBueno() }));
    const sql = consultas[0]?.sql ?? "";
    expect(sql).toMatch(/used_at IS NULL/i);
    expect(sql).toMatch(/expires_at >\s*NOW\(\)/i);
    expect(sql).toMatch(/RETURNING/i);
  });
});

describe("BLOQUE 7 · solo lo tuyo", () => {
  it("el entregable del cuerpo NO manda: manda el del token", async () => {
    /**
     * El ataque de asignación masiva por tercera vez en este bloque. Se manda un
     * `did` y un `wid` distintos en el cuerpo y se comprueba que lo que se
     * ejecuta es lo que dice el token firmado.
     */
    await POST(
      peticion({
        token: tokenBueno(),
        did: "99999999-9999-4999-8999-999999999999",
        wid: 777,
        cid: "cli-DE-OTRO",
        deliverableId: "99999999-9999-4999-8999-999999999999",
        workspaceId: 777,
      }),
    );
    expect(efectos).toHaveLength(1);
    expect(efectos[0].deliverableId).toBe("11111111-1111-4111-8111-111111111111");
    expect(efectos[0].workspaceId).toBe(42);
    expect(efectos[0].clientId).toBe("cli-1");
  });

  it("si el entregable NO es de ese cliente, se rechaza", async () => {
    // El token podría ser válido y apuntar a un entregable que ha cambiado de
    // manos. Se vuelve a comprobar contra la fila.
    entregable = [{ client_id: "cli-DE-OTRO" }];
    const r = await POST(peticion({ token: tokenBueno() }));
    expect(r.status).toBe(403);
    expect(efectos, "se aprobo el entregable de otro cliente").toHaveLength(0);
  });

  it("si el entregable no existe, se rechaza", async () => {
    entregable = [];
    const r = await POST(peticion({ token: tokenBueno() }));
    expect(r.status).toBe(403);
    expect(efectos).toHaveLength(0);
  });

  it("un token inventado, roto o ausente no ejecuta nada", async () => {
    for (const t of ["", "a.b", "a.b.c", "sinpunto", tokenBueno().slice(0, -4)]) {
      consultas.length = 0;
      efectos.length = 0;
      const r = await POST(peticion({ token: t }));
      expect(r.status, `colo el token ${JSON.stringify(t)}`).toBe(400);
      expect(efectos).toHaveLength(0);
      expect(consultas, "se toco la base con un token invalido").toHaveLength(0);
    }
  });

  it("reescribir el token para apuntar a otro entregable rompe la firma", async () => {
    const bueno = tokenBueno();
    const [, sig] = bueno.split(".");
    const otro = Buffer.from(
      JSON.stringify({
        did: "99999999-9999-4999-8999-999999999999",
        wid: 42,
        cid: "cli-1",
        act: "approve",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const r = await POST(peticion({ token: `${otro}.${sig}` }));
    expect(r.status).toBe(400);
    expect(efectos, "se aprobo otro entregable reescribiendo el token").toHaveLength(0);
  });
});

describe("BLOQUE 7 · rechazar exige motivo", () => {
  it("un rechazo sin comentario no se ejecuta", async () => {
    // Un rechazo sin motivo deja al equipo sin saber qué corregir, y convierte
    // el botón en una forma de bloquear trabajo sin explicar nada.
    const r = await POST(peticion({ token: tokenBueno({ act: "reject" }), decision: "reject" }));
    expect(r.status).toBe(400);
    expect(efectos).toHaveLength(0);
  });

  it("con comentario sí, y el comentario se acota", async () => {
    await POST(
      peticion({
        token: tokenBueno({ act: "reject" }),
        decision: "reject",
        feedback: "x".repeat(5000),
      }),
    );
    expect(efectos).toHaveLength(1);
    expect(efectos[0].accion).toBe("reject");
    expect(
      ((efectos[0] as unknown as { feedback: string }).feedback ?? "").length,
      "el comentario entro sin acotar",
    ).toBeLessThanOrEqual(2000);
  });
});

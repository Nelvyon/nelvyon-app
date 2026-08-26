/**
 * BLOQUE 7 · los campos hermanos de una entrada de memoria.
 *
 * `POST /api/saas/shared-memory` escribe en la memoria que después leen los
 * agentes. El inquilino lo pone bien —`tenantId: ctx.tenant.id`, y el servicio
 * además lo vuelve a forzar y rechaza el cruce— pero **tres campos hermanos
 * salen del cuerpo de la petición**:
 *
 *     userId:      (body.userId as string) ?? ctx.claims.userId
 *     workspaceId: (body.workspaceId as string) ?? null
 *     agentId:     (body.agentId as string) ?? null
 *
 * Es el mismo defecto que el certificado de entrega, un piso más abajo: se
 * comprueba con rigor el campo que identifica al inquilino y se confía en los de
 * al lado que identifican **a quién pertenece dentro del inquilino**.
 *
 * Qué se puede hacer con ello, sin salir del inquilino:
 *
 *   - `userId` es filtro de búsqueda (`search({ userId })`). Un miembro puede
 *     hacer que una entrada suya aparezca en la búsqueda por usuario de OTRO.
 *     La memoria es contexto que los agentes tratan como hecho establecido: no
 *     es un campo decorativo, es procedencia.
 *   - `workspaceId` es una unidad de aislamiento REAL en el resto del producto
 *     (`workspace_members`), y aquí nadie comprueba que el que se manda sea el
 *     tuyo. Se acepta el número que venga.
 *
 * El límite de inquilino NO cae —eso se prueba abajo con un control explícito,
 * porque una corrección que rompiera lo que ya funciona no sería corrección— y
 * `createdBy` sí sale de la sesión, así que la auditoría no miente. El defecto
 * es de atribución dentro del inquilino, y se corrige en la raíz: los campos
 * que dicen «de quién es» salen de la misma clase de fuente que el inquilino.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const escrito: Array<Record<string, unknown>> = [];

const SESION = {
  userId: "u-atacante",
  tenantId: "tenant-A",
  email: "a@ejemplo.test",
  plan: "pro",
};

vi.mock("@nelvyon/saas", () => ({
  requireSaasContext: vi.fn(async () => ({
    claims: SESION,
    tenant: { id: "tenant-A", userId: "u-atacante", workspaceId: 4242 },
    role: "member",
  })),
  saasErrorBody: (e: unknown) => ({ error: String(e) }),
  saasErrorStatus: () => 500,
  getSaasSharedMemoryService: () => ({
    status: () => ({ enabled: true }),
    write: vi.fn(async (_ctx: unknown, input: Record<string, unknown>) => {
      escrito.push(input);
      return { id: "mem-1", ...input };
    }),
  }),
  SharedMemoryApprovalRequiredError: class extends Error {},
  SharedMemoryDeniedError: class extends Error {},
  SharedMemoryNotEnabledError: class extends Error {},
}));

import { POST } from "../route";

function peticion(cuerpo: Record<string, unknown>): Request {
  return new Request("https://nelvyon.test/api/saas/shared-memory", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

const CONTENIDO = "El cliente prefiere que le llamemos por la manana y nunca los viernes.";

beforeEach(() => {
  escrito.length = 0;
});

describe("BLOQUE 7 · escribir memoria a nombre de otro", () => {
  it("EL CONTROL: una escritura normal sigue funcionando", async () => {
    /**
     * Sin esto, una ruta que rechazara todo pasaría los ataques de abajo y
     * dejaría la memoria compartida inservible.
     */
    const r = await POST(peticion({ key: "preferencias", content: CONTENIDO }));
    expect(r.status).toBe(201);
    expect(escrito).toHaveLength(1);
    expect(escrito[0].content).toBe(CONTENIDO);
  });

  it("EL CONTROL: el inquilino sigue saliendo de la sesión", async () => {
    await POST(peticion({ key: "k", content: CONTENIDO, tenantId: "tenant-VICTIMA" }));
    expect(escrito[0].tenantId).toBe("tenant-A");
  });

  it("el `userId` del cuerpo NO decide de quién es la memoria", async () => {
    await POST(
      peticion({ key: "k", content: CONTENIDO, userId: "u-victima-del-mismo-inquilino" }),
    );
    expect(
      escrito[0].userId,
      "se escribio memoria atribuida a otro usuario: aparece en SU busqueda por usuario",
    ).toBe("u-atacante");
  });

  it("el `workspaceId` del cuerpo NO decide en qué workspace cae", async () => {
    await POST(peticion({ key: "k", content: CONTENIDO, workspaceId: "970002" }));
    expect(
      escrito[0].workspaceId,
      "se escribio memoria en un workspace elegido por el cliente sin comprobar pertenencia",
    ).not.toBe("970002");
  });

  it("el workspace que se graba es el del inquilino verificado", async () => {
    // No basta con ignorar el valor hostil: hay que poner el correcto, y sale
    // del inquilino que ya resolvio `requireSaasContext` contra la pertenencia.
    await POST(peticion({ key: "k", content: CONTENIDO, workspaceId: "970002" }));
    expect(escrito[0].workspaceId).toBe("4242");
  });

  it("disfrazar el valor tampoco cuela", async () => {
    for (const hostil of [" u-victima ", "U-VICTIMA", "u-victima\n"]) {
      escrito.length = 0;
      await POST(peticion({ key: "k", content: CONTENIDO, userId: hostil }));
      expect(
        escrito[0].userId,
        `se colo un usuario ajeno disfrazado: ${JSON.stringify(hostil)}`,
      ).toBe("u-atacante");
    }
  });
});

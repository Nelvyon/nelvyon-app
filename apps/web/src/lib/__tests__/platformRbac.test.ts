import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Certificación de la frontera de autorización de `/api/platform/*`.
 *
 * El plano autorizaba con autenticación + PERTENENCIA: el rol de
 * `workspace_members` nunca se leía, así que cualquier miembro activo podía
 * lanzar un cobro real. Estos tests fijan la propiedad que faltaba:
 *
 *     pertenecer al workspace != poder ejecutar la acción
 *
 * La capa central se prueba una vez y a fondo aquí; cada ruta tiene después su
 * propio test de que declara la capability correcta.
 */
const { estado } = vi.hoisted(() => ({
  estado: {
    /** Rol CRUDO que devuelve la base, tal cual está en la columna VARCHAR sin CHECK. */
    rolEnDb: null as string | null,
    /** Identidad del JWT verificado. */
    userId: "user-A",
    consultas: [] as Array<{ userId: string; workspaceId: number }>,
    autenticaOk: true,
  },
}));

vi.mock("../platformDbFallback", () => ({
  resolvePlatformWorkspaceRole: async (userId: string, workspaceId: number) => {
    estado.consultas.push({ userId, workspaceId });
    // El doble honra la propiedad real: el rol se resuelve para ESE usuario en
    // ESE workspace. Un workspace ajeno no devuelve rol.
    return workspaceId === 10 && userId === estado.userId ? estado.rolEnDb : null;
  },
}));

vi.mock("@nelvyon/auth", () => ({
  authenticate: async () => {
    if (!estado.autenticaOk) throw new Error("Unauthorized");
    return { userId: estado.userId, email: "a@test.local" };
  },
}));

vi.mock("@nelvyon/admin", () => ({ getNelvyonAdminService: () => ({ isUserAdmin: async () => false }) }));
vi.mock("@nelvyon/os-agents", () => ({ OsAgentError: class OsAgentError extends Error {} }));

import { requirePlatformContext } from "../platformBffAuth";
import {
  canPlatformPerform,
  normalizePlatformRole,
  platformCapabilitiesFor,
  type PlatformAction,
  type PlatformRole,
} from "../platformRbac";

const peticion = (workspaceId: string | null = "10") =>
  new Request("https://nelvyon.test/api/platform/x", {
    method: "POST",
    headers: workspaceId === null ? {} : { "x-workspace-id": workspaceId },
  });

beforeEach(() => {
  estado.rolEnDb = "owner";
  estado.userId = "user-A";
  estado.consultas = [];
  estado.autenticaOk = true;
});

// ───────────────────────────────────────────────────────── matriz rol → acción
describe("matriz rol → capability", () => {
  const MATRIZ: Array<[PlatformAction, PlatformRole[]]> = [
    ["platform.crm.write", ["owner", "admin", "member"]],
    ["platform.support.write", ["owner", "admin", "member", "viewer"]],
    ["partners.billing.manage", ["owner", "admin"]],
    ["partners.billing.charge", ["owner"]],
    ["partners.portal.invite", ["owner", "admin"]],
    ["partners.connect.manage", ["owner"]],
    ["platform.reputation.manage", ["owner", "admin"]],
  ];
  const TODOS: PlatformRole[] = ["owner", "admin", "member", "viewer"];

  it.each(MATRIZ)("%s la tienen exactamente los roles acordados", (accion, permitidos) => {
    for (const rol of TODOS) {
      expect(canPlatformPerform(rol, accion), `${rol} / ${accion}`).toBe(permitidos.includes(rol));
    }
  });

  it("owner es superconjunto de admin, y admin de member", () => {
    const owner = new Set(platformCapabilitiesFor("owner"));
    for (const c of platformCapabilitiesFor("admin")) expect(owner.has(c)).toBe(true);
    const admin = new Set(platformCapabilitiesFor("admin"));
    for (const c of platformCapabilitiesFor("member")) expect(admin.has(c)).toBe(true);
  });

  it("el dinero está separado de la configuración: admin configura pero NO cobra", () => {
    expect(canPlatformPerform("admin", "partners.billing.manage")).toBe(true);
    expect(canPlatformPerform("admin", "partners.billing.charge")).toBe(false);
  });
});

// ───────────────────────────────────────────── normalización fail-closed del rol
describe("un rol desconocido no hereda autoridad", () => {
  it.each(["superadmin", "root", "sudo", "", "   ", "owner-x", "administrator", "0"])(
    "%j no se normaliza a ningún rol",
    (basura) => {
      expect(normalizePlatformRole(basura)).toBeNull();
    },
  );

  it("null/undefined tampoco", () => {
    expect(normalizePlatformRole(null)).toBeNull();
    expect(normalizePlatformRole(undefined)).toBeNull();
  });

  it("un rol desconocido se queda con CERO capabilities, no con las de member", () => {
    // La columna es VARCHAR sin CHECK: degradar en silencio a `member` sería
    // conceder privilegios por accidente.
    expect(platformCapabilitiesFor(null)).toEqual([]);
    expect(canPlatformPerform(null, "platform.crm.write")).toBe(false);
    expect(canPlatformPerform(null, "partners.billing.charge")).toBe(false);
  });

  it("`operator` es un rol propio, no un alias de member", () => {
    // Antes se colapsaba, y eso concedía al operator MENOS de lo que el
    // upstream ya le permite: `require_workspace_operator` le deja mutar
    // mientras esta capa decía que no. La divergencia no protegía nada e
    // impedía declarar capabilities fieles. Ver `rolesDesacoplados.test.ts`.
    expect(normalizePlatformRole("operator")).toBe("operator");
    expect(normalizePlatformRole("OWNER")).toBe("owner");
  });
});

// ────────────────────────────────────────────────── la frontera, extremo a extremo
describe("requirePlatformContext — A/B sobre la capa central", () => {
  const estadoDe = (r: unknown) => (r as { status: number }).status;

  it("owner + workspace propio + capability correcta -> ALLOW", async () => {
    estado.rolEnDb = "owner";
    const ctx = await requirePlatformContext(peticion(), "partners.billing.charge");
    expect(ctx).not.toHaveProperty("status");
    expect((ctx as { role: string }).role).toBe("owner");
    expect((ctx as { workspaceId: number }).workspaceId).toBe(10);
  });

  it("member + mismo workspace + operación financiera -> DENY", async () => {
    estado.rolEnDb = "member";
    const r = await requirePlatformContext(peticion(), "partners.billing.charge");
    expect(estadoDe(r)).toBe(403);
  });

  it("admin + partners.billing.manage -> ALLOW", async () => {
    estado.rolEnDb = "admin";
    const ctx = await requirePlatformContext(peticion(), "partners.billing.manage");
    expect(ctx).not.toHaveProperty("status");
  });

  it("admin + partners.billing.charge -> DENY (owner-only)", async () => {
    estado.rolEnDb = "admin";
    const r = await requirePlatformContext(peticion(), "partners.billing.charge");
    expect(estadoDe(r)).toBe(403);
  });

  it("owner del workspace B intentando actuar sobre A -> DENY", async () => {
    estado.rolEnDb = "owner";
    // Es owner de 10, pero pide el 99. La cabecera es manipulable; la identidad no.
    const r = await requirePlatformContext(peticion("99"), "partners.billing.charge");
    expect(estadoDe(r)).toBe(403);
    expect(estado.consultas.at(-1)).toEqual({ userId: "user-A", workspaceId: 99 });
  });

  it("capability incorrecta para el rol -> DENY", async () => {
    estado.rolEnDb = "viewer";
    const r = await requirePlatformContext(peticion(), "platform.crm.write");
    expect(estadoDe(r)).toBe(403);
  });

  it("rol desconocido en la columna -> DENY", async () => {
    estado.rolEnDb = "jefe_supremo";
    const r = await requirePlatformContext(peticion(), "platform.support.write");
    // `support.write` la tienen los cuatro roles: si esto pasara, sería porque
    // el rol desconocido se degradó a uno válido.
    expect(estadoDe(r)).toBe(403);
  });

  it("membresía inactive/pending/deleted -> DENY", async () => {
    // El filtro `wm.status='active'` vive en la consulta; el doble lo modela
    // devolviendo null cuando no hay membresía activa.
    estado.rolEnDb = null;
    const r = await requirePlatformContext(peticion(), "platform.support.write");
    expect(estadoDe(r)).toBe(403);
  });

  it("sin sesión -> 401, y ni siquiera se consulta el workspace", async () => {
    estado.autenticaOk = false;
    await expect(requirePlatformContext(peticion(), "platform.crm.write")).rejects.toThrow();
    expect(estado.consultas).toHaveLength(0);
  });

  it("sin cabecera X-Workspace-Id -> 400 antes de tocar la base", async () => {
    const r = await requirePlatformContext(peticion(null), "platform.crm.write");
    expect(estadoDe(r)).toBe(400);
    expect(estado.consultas).toHaveLength(0);
  });

  it.each(["0", "-1", "abc", "1e999", "  "])(
    "workspace id inválido %j -> 400",
    async (raw) => {
      const r = await requirePlatformContext(peticion(raw), "platform.crm.write");
      expect(estadoDe(r)).toBe(400);
    },
  );

  it("el contexto devuelto expone las capabilities efectivas del rol", async () => {
    estado.rolEnDb = "admin";
    const ctx = await requirePlatformContext(peticion(), "platform.crm.write");
    const caps = (ctx as { capabilities: readonly string[] }).capabilities;
    expect(caps).toContain("partners.billing.manage");
    expect(caps).not.toContain("partners.billing.charge");
  });
});

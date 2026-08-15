import { NextResponse } from "next/server";

import type { JwtPayload } from "@nelvyon/auth";
import { authenticate } from "@nelvyon/auth";
import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";

import { listPlatformWorkspaceIds, resolvePlatformWorkspaceRole } from "./platformDbFallback";
import {
  canPlatformPerform,
  normalizePlatformRole,
  platformCapabilitiesFor,
  type PlatformAction,
  type PlatformRole,
} from "./platformRbac";

/**
 * AUTENTICACIÓN, no autorización.
 *
 * El nombre ha inducido a error: durante mucho tiempo rutas mutantes lo usaron
 * creyendo estar autorizadas cuando solo comprobaba que hubiera sesión. Una
 * ruta que muta debe usar `requirePlatformContext(req, action)`; esta primitiva
 * queda para lecturas sin contexto de workspace y como escalón interno.
 */
export async function requirePlatformClaims(
  req: Request,
): Promise<JwtPayload | NextResponse> {
  try {
    return await authenticate(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

/**
 * Contexto autorizado de una petición al plano `platform/*`.
 * Solo se construye si la capability pedida está concedida.
 */
export type PlatformContext = {
  claims: JwtPayload;
  workspaceId: number;
  role: PlatformRole;
  capabilities: readonly PlatformAction[];
};

/**
 * Frontera común de autorización de `/api/platform/*`.
 *
 * Sustituye al par `requirePlatformClaims` + `assertUserCanAccessWorkspace`, que
 * comprobaba autenticación y PERTENENCIA pero nunca el rol. Aquí una ruta no
 * puede obtener contexto sin declarar qué autoridad necesita.
 *
 * Falla cerrado en cada escalón, y en este orden: sin sesión → 401; sin
 * `X-Workspace-Id` válido → 400; sin acceso al workspace → 403; con un rol que
 * no se reconoce → 403; sin la capability → 403. El workspace llega por
 * cabecera y es por tanto manipulable, pero se valida contra la identidad del
 * JWT: pedir uno ajeno devuelve 403, no lo concede.
 */
export async function requirePlatformContext(
  req: Request,
  action: PlatformAction,
  opts: {
    /**
     * Si falta `X-Workspace-Id`, resolver el primer workspace del usuario en vez
     * de responder 400.
     *
     * Existe para NO romper las rutas que hoy usan `dbResolveWorkspaceId`: la UI
     * envía la cabecera de forma condicional (`if (workspaceId)`) y
     * `ensureWorkspace` es best-effort, así que exigirla dejaría sin servicio a
     * usuarios legítimos —`member` incluido— antes de que el workspace activo
     * esté cargado. No relaja la seguridad: el workspace implícito sale de la
     * lista del PROPIO usuario, nunca de la petición, y el rol se resuelve
     * igual.
     *
     * Las rutas financieras lo dejan en `false` a propósito: cobrar sobre "tu
     * primer workspace" porque faltaba una cabecera es peor que fallar.
     */
    allowImplicitWorkspace?: boolean;
  } = {},
): Promise<PlatformContext | NextResponse> {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const raw = req.headers.get("x-workspace-id")?.trim();
  let workspaceId = Number(raw ?? "");
  if (!raw || !Number.isFinite(workspaceId) || workspaceId <= 0) {
    if (!opts.allowImplicitWorkspace) {
      return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
    }
    const propios = await listPlatformWorkspaceIds(claims.userId);
    if (propios.length === 0) {
      return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
    }
    workspaceId = propios[0]!;
  }

  const rawRole = await resolvePlatformWorkspaceRole(claims.userId, workspaceId);
  if (rawRole === null) {
    // No es miembro activo, o el workspace no existe. Mismo 403 en ambos casos:
    // distinguirlos revelaría qué workspaces existen.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = normalizePlatformRole(rawRole);
  if (!role || !canPlatformPerform(role, action)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { claims, workspaceId, role, capabilities: platformCapabilitiesFor(role) };
}

/** Platform admin only — for OS cron triggers and learning loops. */
export async function requirePlatformAdmin(
  req: Request,
): Promise<JwtPayload | NextResponse> {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;
  const isAdmin = await getNelvyonAdminService().isUserAdmin(claims.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return claims;
}

/** FastAPI may 401/403 when workspace context mismatches — treat as degraded upstream. */
export function upstreamFailed(status: number): boolean {
  return (
    status === 401 ||
    status === 403 ||
    status >= 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

import { NextResponse } from "next/server";

import { platformApiBase, readSessionToken } from "@/lib/platformFastApiProxy";
import { requirePlatformClaims, upstreamFailed } from "@/lib/platformBffAuth";
import {
  dbListWorkspaces,
  platformDbFallbackEnabled,
} from "@/lib/platformDbFallback";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UNAVAILABLE = {
  error: "No se pudo cargar el workspace. Inténtalo de nuevo en unos minutos.",
};

/** Traslada el límite de peticiones del upstream conservando su `Retry-After`. */
function rateLimited(upstream: Response): NextResponse {
  const res = NextResponse.json(
    { error: "Demasiadas peticiones. Espera unos segundos y vuelve a intentarlo." },
    { status: 429 },
  );
  const retry = upstream.headers.get("retry-after");
  if (retry) res.headers.set("Retry-After", retry);
  return res;
}

async function upstreamFetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${platformApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Same-origin workspace list — FastAPI first, Postgres fallback when API staging is down. */
export async function GET(req: Request) {
  let claims;
  try {
    claims = await requirePlatformClaims(req);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
  if (claims instanceof NextResponse) return claims;

  const token = await readSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let upstream = await upstreamFetch(token, "/api/v1/workspace/list");
    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Un límite de peticiones se responde como tal.
    //
    // Antes caía al 503 final: el cliente leía «servicio no disponible» cuando
    // lo cierto era «vas demasiado rápido, reintenta». En producción esto
    // convirtió un 429 del API en un 503 del BFF y mandó a investigar una caída
    // que no existía. Un código de estado que miente sobre la causa cuesta
    // horas de diagnóstico.
    if (upstream.status === 429) {
      return rateLimited(upstream);
    }

    let listadoUpstreamCorrecto = false;
    if (upstream.ok) {
      const rows = await upstream.json();
      if (Array.isArray(rows)) {
        listadoUpstreamCorrecto = true;
        if (rows.length > 0) {
          return NextResponse.json(rows);
        }
      }
    }

    const create = await upstreamFetch(token, "/api/v1/workspace/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mi Workspace", slug: "default" }),
    });

    if (create.ok) {
      const created = await create.json();
      return NextResponse.json([
        {
          ...created,
          role: created.role ?? "owner",
          members_count: created.members_count ?? 1,
        },
      ]);
    }
    if (create.status === 429) {
      return rateLimited(create);
    }

    upstream = await upstreamFetch(token, "/api/v1/workspace/list");
    if (upstream.status === 429) {
      return rateLimited(upstream);
    }
    if (upstream.ok) {
      const rows = await upstream.json();
      if (Array.isArray(rows)) {
        listadoUpstreamCorrecto = true;
        if (rows.length > 0) {
          return NextResponse.json(rows);
        }
      }
    }

    if (platformDbFallbackEnabled() && (upstreamFailed(upstream.status) || upstreamFailed(create.status))) {
      const rows = await dbListWorkspaces(claims);
      if (rows.length > 0) {
        return NextResponse.json(rows);
      }
    }

    // El upstream contestó bien y dijo que no hay ninguno: esa es la respuesta.
    //
    // No es maquillaje. La lista vacía solo se devuelve cuando el API respondió
    // 200 con un array —es decir, cuando SABEMOS que el usuario no tiene
    // workspaces—, y el intento de crear uno falló por una razón del cliente,
    // no por indisponibilidad. Si el upstream falló de verdad, se sigue al 503.
    if (listadoUpstreamCorrecto && !upstreamFailed(create.status)) {
      return NextResponse.json([]);
    }

    return NextResponse.json(UNAVAILABLE, { status: 503 });
  } catch {
    if (platformDbFallbackEnabled()) {
      try {
        const rows = await dbListWorkspaces(claims);
        if (rows.length > 0) {
          return NextResponse.json(rows);
        }
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(UNAVAILABLE, { status: 503 });
  }
}

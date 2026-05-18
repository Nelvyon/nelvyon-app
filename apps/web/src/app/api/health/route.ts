import { readFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

let cachedVersion: string | undefined;

function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    cachedVersion = pkg.version ?? "0.0.0";
  } catch {
    cachedVersion = process.env.npm_package_version ?? "0.1.0";
  }
  return cachedVersion;
}

/** Liveness probe para Railway y balanceadores (ligero, sin dependencias externas). */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: getAppVersion(),
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: NO_STORE },
  );
}

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Handler for deprecated pages/api/saas routes.
 * All SaaS API surface has moved to /api/saas/* (Next.js App Router).
 */
export function deprecatedRoute(appRouterPath: string) {
  return function handler(_req: NextApiRequest, res: NextApiResponse) {
    return res.status(410).json({
      error: "Deprecated. Use /api/saas/...",
      migration: appRouterPath,
    });
  };
}

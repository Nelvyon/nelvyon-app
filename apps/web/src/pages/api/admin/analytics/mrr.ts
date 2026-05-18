import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getAdminAnalyticsService } from "../../../../../../../backend/admin/AdminAnalyticsService";
import { getNelvyonAdminService } from "../../../../../../../backend/admin/NelvyonAdminService";

type AdminUser = { userId: string; role: "admin" | "member" };
type AdminReq = NextApiRequest & { user?: AdminUser };

async function requireAdmin(req: AdminReq, res: NextApiResponse): Promise<AdminUser | null> {
  const token = req.cookies.nelvyon_token;
  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return null;
  }
  const auth = getAuthService();
  const user = await auth.verifyToken(token);
  const isAdmin = await getNelvyonAdminService().isUserAdmin(user.userId);
  req.user = { userId: user.userId, role: isAdmin ? "admin" : "member" };
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return req.user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const admin = await requireAdmin(req as AdminReq, res);
    if (!admin) return;

    const mrr = await getAdminAnalyticsService().getMRR();
    return res.status(200).json(mrr);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getBookingService } from "../../../../../../../backend/saas/BookingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { bookingId?: string } | undefined;
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId) return res.status(400).json({ error: "bookingId requerido" });

    const message = await getBookingService().sendReminder(user.userId, bookingId);
    return res.status(200).json({ message });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("not found")) return res.status(404).json({ error: "Cita no encontrada" });
    return res.status(500).json({ error: "Error interno" });
  }
}

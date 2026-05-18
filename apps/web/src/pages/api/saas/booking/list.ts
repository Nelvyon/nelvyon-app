import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { BookingFilters } from "../../../../../../../backend/saas/BookingService";
import { getBookingService } from "../../../../../../../backend/saas/BookingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate.trim() : "";
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate.trim() : "";

    const filters: BookingFilters = {};
    if (statusRaw === "confirmed" || statusRaw === "cancelled" || statusRaw === "rescheduled") {
      filters.status = statusRaw;
    }
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const bookings = await getBookingService().getBookings(user.userId, filters);
    return res.status(200).json({ bookings });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}

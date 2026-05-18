import type { NextApiRequest, NextApiResponse } from "next";

import { getBookingService } from "../../../../../../../backend/saas/BookingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as { bookingId?: string; token?: string } | undefined;
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!bookingId || !token) {
      return res.status(400).json({ error: "bookingId y token son requeridos" });
    }

    const booking = await getBookingService().cancelBooking(bookingId, token);
    if (!booking) return res.status(404).json({ error: "Cita no encontrada o ya cancelada" });

    return res.status(200).json({ booking });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

import { getBookingService } from "../../../../../../../backend/saas/BookingService";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const date = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!userId || !UUID_RE.test(userId)) {
      return res.status(400).json({ error: "userId UUID inválido" });
    }
    if (!date || !isValidDate(date)) {
      return res.status(400).json({ error: "date YYYY-MM-DD requerido" });
    }

    const slots = await getBookingService().getAvailableSlots(userId, date);
    return res.status(200).json({ slots });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}

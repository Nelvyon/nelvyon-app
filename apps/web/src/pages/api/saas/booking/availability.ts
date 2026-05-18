import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { AvailabilityConfig } from "../../../../../../../backend/saas/BookingService";
import { getBookingService } from "../../../../../../../backend/saas/BookingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const svc = getBookingService();

    if (req.method === "GET") {
      const availability = await svc.getAvailability(user.userId);
      return res.status(200).json({ availability });
    }

    if (req.method === "POST") {
      const body = req.body as Partial<AvailabilityConfig> | undefined;
      if (!body || typeof body.slotDuration !== "number" || typeof body.timezone !== "string") {
        return res.status(400).json({ error: "slotDuration y timezone son requeridos" });
      }
      const config: AvailabilityConfig = {
        slotDuration: body.slotDuration,
        timezone: body.timezone.trim(),
        monday: body.monday,
        tuesday: body.tuesday,
        wednesday: body.wednesday,
        thursday: body.thursday,
        friday: body.friday,
        saturday: body.saturday,
        sunday: body.sunday,
      };
      const availability = await svc.createAvailability(user.userId, config);
      return res.status(200).json({ availability });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}

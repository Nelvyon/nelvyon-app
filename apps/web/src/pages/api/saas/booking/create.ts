import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { CreateBookingInput } from "../../../../../../../backend/saas/BookingService";
import { getBookingService } from "../../../../../../../backend/saas/BookingService";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as Record<string, unknown> | undefined;
    const token = req.cookies.nelvyon_token;

    let ownerUserId: string | null = null;
    if (token) {
      const user = await getAuthService().verifyToken(token);
      ownerUserId = user.userId;
    }

    const bodyUserId = typeof body?.userId === "string" ? body.userId.trim() : "";
    if (!ownerUserId) {
      if (!bodyUserId || !UUID_RE.test(bodyUserId)) {
        return res.status(401).json({ error: "Autenticación o userId del calendario requerido" });
      }
      ownerUserId = bodyUserId;
    }

    const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : "";
    const clientEmail = typeof body?.clientEmail === "string" ? body.clientEmail.trim() : "";
    const date = typeof body?.date === "string" ? body.date.trim() : "";
    const time = typeof body?.time === "string" ? body.time.trim() : "";
    if (!clientName || !clientEmail || !date || !time) {
      return res.status(400).json({ error: "clientName, clientEmail, date y time son requeridos" });
    }

    const input: CreateBookingInput = {
      clientName,
      clientEmail,
      clientPhone: typeof body?.clientPhone === "string" ? body.clientPhone.trim() || undefined : undefined,
      date,
      time,
      duration: typeof body?.duration === "number" && Number.isFinite(body.duration) ? body.duration : undefined,
      notes: typeof body?.notes === "string" ? body.notes.trim() || undefined : undefined,
    };

    const booking = await getBookingService().createBooking(ownerUserId, input);
    return res.status(201).json({ booking });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

/** Legacy Pages route — Paddle disabled (MIG 308). Use /api/webhooks/stripe. */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(410).json({
    error: "Paddle billing is disabled. Configure Stripe webhooks at /api/webhooks/stripe.",
  });
}

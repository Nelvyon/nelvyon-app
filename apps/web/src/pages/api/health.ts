import type { NextApiRequest, NextApiResponse } from "next";

import { DbClient } from "../../../../../backend/db/DbClient";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = DbClient.getInstance();
    await db.query("SELECT 1");
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    });
  } catch {
    return res.status(503).json({ status: "error", timestamp: new Date().toISOString() });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasNotificationService } from "../../../../../../../backend/saas/SaasNotificationService";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  let user: { userId: string; tenantId: string };
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) {
      res.status(401).end();
      return;
    }
    user = await getAuthService().verifyToken(token);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      res.status(401).end();
      return;
    }
    res.status(500).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof (res as NodeJS.WritableStream & { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as NodeJS.WritableStream & { flushHeaders: () => void }).flushHeaders();
  }

  const send = async () => {
    try {
      const notifications = await saasNotificationService.getRecentUnread(user.userId, user.tenantId, 10);
      res.write(`data: ${JSON.stringify({ notifications })}\n\n`);
    } catch {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "poll_failed" })}\n\n`);
    }
  };

  await send();
  const interval = setInterval(() => {
    void send();
  }, 3000);

  req.on("close", () => {
    clearInterval(interval);
    try {
      res.end();
    } catch {
      /* ignore */
    }
  });
}

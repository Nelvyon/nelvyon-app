import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { MusicInput } from "../../../../../../../backend/os-agents/sectors/music";
import {
  getArtistBioAgent,
  getCollaborationOutreachAgent,
  getMusicFanEngagementAgent,
  getLyricsPromptAgent,
  getMusicPressReleaseAgent,
  getMusicVideoConceptAgent,
  getSocialMediaMusicAgent,
  getSpotifyPitchAgent,
  getTourPromotionAgent,
} from "../../../../../../../backend/os-agents/sectors/music";

type AgentId =
  | "artist-bio"
  | "music-press-release"
  | "lyrics-prompt"
  | "social-media-music"
  | "spotify-pitch"
  | "fan-engagement"
  | "tour-promotion"
  | "music-video-concept"
  | "collaboration-outreach";

const IDS: AgentId[] = [
  "artist-bio",
  "music-press-release",
  "lyrics-prompt",
  "social-media-music",
  "spotify-pitch",
  "fan-engagement",
  "tour-promotion",
  "music-video-concept",
  "collaboration-outreach",
];

async function saveResult(userId: string, agentId: AgentId, input: MusicInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO music_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: MusicInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { artistName: "", genre: "otro", targetAudience: "", tone: "auténtico", releaseType: "single" };

    let result;
    switch (agentId as AgentId) {
      case "artist-bio": result = await getArtistBioAgent().run(user.userId, input); break;
      case "music-press-release": result = await getMusicPressReleaseAgent().run(user.userId, input); break;
      case "lyrics-prompt": result = await getLyricsPromptAgent().run(user.userId, input); break;
      case "social-media-music": result = await getSocialMediaMusicAgent().run(user.userId, input); break;
      case "spotify-pitch": result = await getSpotifyPitchAgent().run(user.userId, input); break;
      case "fan-engagement": result = await getMusicFanEngagementAgent().run(user.userId, input); break;
      case "tour-promotion": result = await getTourPromotionAgent().run(user.userId, input); break;
      case "music-video-concept": result = await getMusicVideoConceptAgent().run(user.userId, input); break;
      case "collaboration-outreach": result = await getCollaborationOutreachAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}


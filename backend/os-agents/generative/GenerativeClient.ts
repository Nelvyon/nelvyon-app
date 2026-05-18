export type GenerativeResult = {
  url: string;
  metadata?: Record<string, unknown>;
};

export type ImageGenerationOptions = {
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd";
};

export type VideoGenerationOptions = {
  model?: string;
};

export type ThreeDGenerationOptions = {
  artStyle?: "realistic" | "sculpture";
};

export type VoiceGenerationOptions = {
  voiceId?: string;
};

const PLACEHOLDER_BASE = "https://placeholder.nelvyon.com";
const RUNWAY_VERSION = "2024-11-06";
const RUNWAY_TIMEOUT_MS = 120_000;
const RUNWAY_POLL_MS = 5_000;
const MESHY_TIMEOUT_MS = 120_000;
const MESHY_POLL_MS = 5_000;
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** Vitest workers set VITEST=true; never bill external generative APIs during unit tests. */
function useGenerativeMocks(): boolean {
  return process.env.VITEST === "true";
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function readObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

export class GenerativeClient {
  static async generateImage(prompt: string, options?: ImageGenerationOptions): Promise<GenerativeResult> {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key || useGenerativeMocks()) {
      return { url: `${PLACEHOLDER_BASE}/image.jpg` };
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size: options?.size ?? "1024x1024",
        quality: options?.quality ?? "hd",
        n: 1,
      }),
    });
    if (!res.ok) {
      throw new Error(`DALL-E request failed (${res.status})`);
    }
    const body = (await res.json()) as unknown;
    const data = readObject(body)?.data;
    const first = Array.isArray(data) ? readObject(data[0]) : null;
    const url = first ? readString(first.url) : null;
    if (!url) {
      throw new Error("DALL-E response missing url");
    }
    const revisedPrompt = first ? readString(first.revised_prompt) : null;
    return {
      url,
      metadata: revisedPrompt ? { revised_prompt: revisedPrompt } : undefined,
    };
  }

  static async generateVideo(prompt: string, options?: VideoGenerationOptions): Promise<GenerativeResult> {
    const key = process.env.RUNWAY_API_KEY?.trim();
    if (!key || useGenerativeMocks()) {
      return { url: `${PLACEHOLDER_BASE}/video.mp4` };
    }

    const createRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Runway-Version": RUNWAY_VERSION,
      },
      body: JSON.stringify({
        promptText: prompt,
        model: options?.model ?? "gen4_turbo",
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Runway create task failed (${createRes.status})`);
    }
    const created = (await createRes.json()) as unknown;
    const taskId = readString(readObject(created)?.id);
    if (!taskId) {
      throw new Error("Runway response missing task id");
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < RUNWAY_TIMEOUT_MS) {
      const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": RUNWAY_VERSION,
        },
      });
      if (!pollRes.ok) {
        throw new Error(`Runway poll failed (${pollRes.status})`);
      }
      const poll = (await pollRes.json()) as unknown;
      const pollObj = readObject(poll);
      const status = readString(pollObj?.status);
      if (status === "SUCCEEDED") {
        const output = pollObj?.output;
        const first = Array.isArray(output) ? readObject(output[0]) : null;
        const url = first ? readString(first.url) ?? readString(first.output_url) : null;
        if (!url) {
          throw new Error("Runway success response missing video url");
        }
        return { url, metadata: { taskId } };
      }
      if (status === "FAILED") {
        throw new Error("Runway task failed");
      }
      await sleep(RUNWAY_POLL_MS);
    }

    throw new Error("Runway task timed out");
  }

  static async generate3D(prompt: string, options?: ThreeDGenerationOptions): Promise<GenerativeResult> {
    const key = process.env.MESHY_API_KEY?.trim();
    if (!key) {
      return { url: `${PLACEHOLDER_BASE}/model.glb` };
    }

    const createRes = await fetch("https://api.meshy.ai/v2/text-to-3d", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        art_style: options?.artStyle ?? "realistic",
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Meshy create task failed (${createRes.status})`);
    }
    const created = (await createRes.json()) as unknown;
    const taskId = readString(readObject(created)?.result) ?? readString(readObject(created)?.id);
    if (!taskId) {
      throw new Error("Meshy response missing task id");
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < MESHY_TIMEOUT_MS) {
      const pollRes = await fetch(`https://api.meshy.ai/v2/text-to-3d/${taskId}`, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });
      if (!pollRes.ok) {
        throw new Error(`Meshy poll failed (${pollRes.status})`);
      }
      const poll = (await pollRes.json()) as unknown;
      const pollObj = readObject(poll);
      const status = readString(pollObj?.status);
      if (status === "SUCCEEDED") {
        const modelUrl = readString(pollObj?.model_urls && readObject(pollObj.model_urls)?.glb) ?? readString(pollObj?.glb_url);
        if (!modelUrl) {
          throw new Error("Meshy success response missing model url");
        }
        return { url: modelUrl, metadata: { taskId } };
      }
      if (status === "FAILED") {
        throw new Error("Meshy task failed");
      }
      await sleep(MESHY_POLL_MS);
    }

    throw new Error("Meshy task timed out");
  }

  static async generateVoice(text: string, options?: VoiceGenerationOptions): Promise<GenerativeResult> {
    const key = process.env.ELEVENLABS_API_KEY?.trim();
    if (!key || useGenerativeMocks()) {
      return { url: `${PLACEHOLDER_BASE}/audio.mp3` };
    }

    const voiceId = options?.voiceId ?? DEFAULT_VOICE_ID;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
      }),
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs request failed (${res.status})`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dataUrl = `data:audio/mpeg;base64,${toBase64(bytes)}`;
    return { url: dataUrl, metadata: { voiceId } };
  }
}

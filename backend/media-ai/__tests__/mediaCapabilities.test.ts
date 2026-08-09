import { describe, expect, it } from "vitest";

/**
 * STT, imagen y TTS no pueden salir a proveedores externos por el mero hecho de
 * que exista una clave en el entorno. Ese era el defecto: `OPENAI_API_KEY`
 * bastaba para que cada transcripción fuese a Whisper, y `CreativeService`
 * encadenaba Midjourney → DALL·E automáticamente.
 */
import {
  MediaCapabilityNotConfigured,
  externalMediaAllowed,
  isMediaCapabilityAvailable,
  mediaCapabilityStatus,
  resolveMediaProvider,
  type MediaCapability,
} from "../mediaCapabilities";

const CAPS: MediaCapability[] = ["stt", "image", "tts"];
const VACIO = {} as NodeJS.ProcessEnv;

describe("sin ninguna variable configurada", () => {
  it.each(CAPS)("%s queda NOT_CONFIGURED", (cap) => {
    const p = resolveMediaProvider(cap, VACIO);
    expect(p.kind).toBe("not_configured");
    expect(isMediaCapabilityAvailable(cap, VACIO)).toBe(false);
  });

  it("el estado publicable no filtra configuración interna", () => {
    expect(mediaCapabilityStatus("stt", VACIO)).toEqual({
      capability: "stt",
      status: "not_configured",
      provider: null,
    });
  });
});

describe("una clave externa suelta NO activa el proveedor externo", () => {
  it("OPENAI_API_KEY no habilita Whisper", () => {
    const env = { OPENAI_API_KEY: "sk-x" } as NodeJS.ProcessEnv;
    expect(resolveMediaProvider("stt", env).kind).toBe("not_configured");
  });

  it("OPENAI_API_KEY + MIDJOURNEY_API_KEY no habilitan imagen", () => {
    const env = { OPENAI_API_KEY: "sk-x", MIDJOURNEY_API_KEY: "mj-x" } as NodeJS.ProcessEnv;
    expect(resolveMediaProvider("image", env).kind).toBe("not_configured");
  });

  it("ELEVENLABS_API_KEY no habilita TTS", () => {
    const env = { ELEVENLABS_API_KEY: "el-x" } as NodeJS.ProcessEnv;
    expect(resolveMediaProvider("tts", env).kind).toBe("not_configured");
  });
});

describe("proveedor local de NELVYON", () => {
  it.each([
    ["stt", "NELVYON_STT_URL"],
    ["image", "NELVYON_IMAGE_URL"],
    ["tts", "NELVYON_TTS_URL"],
  ] as const)("%s usa el proveedor local cuando está configurado", (cap, envName) => {
    const env = { [envName]: "http://127.0.0.1:9000/" } as unknown as NodeJS.ProcessEnv;
    const p = resolveMediaProvider(cap, env);
    expect(p.kind).toBe("local");
    if (p.kind === "local") expect(p.baseUrl).toBe("http://127.0.0.1:9000");
    expect(mediaCapabilityStatus(cap, env).provider).toBe("nelvyon-local");
  });

  it("el proveedor local tiene precedencia sobre cualquier externo autorizado", () => {
    const env = {
      NELVYON_STT_URL: "http://127.0.0.1:9000",
      NELVYON_ALLOW_EXTERNAL_MEDIA: "1",
      OPENAI_API_KEY: "sk-x",
    } as NodeJS.ProcessEnv;
    expect(resolveMediaProvider("stt", env).kind).toBe("local");
  });
});

describe("doble opt-in explícito para proveedores externos", () => {
  it("el interruptor solo no basta: hace falta la clave", () => {
    const env = { NELVYON_ALLOW_EXTERNAL_MEDIA: "1" } as NodeJS.ProcessEnv;
    expect(externalMediaAllowed(env)).toBe(true);
    expect(resolveMediaProvider("stt", env).kind).toBe("not_configured");
  });

  it("interruptor + clave habilitan el externo, y queda identificado", () => {
    const env = {
      NELVYON_ALLOW_EXTERNAL_MEDIA: "1",
      OPENAI_API_KEY: "sk-x",
    } as NodeJS.ProcessEnv;
    const p = resolveMediaProvider("stt", env);
    expect(p.kind).toBe("external");
    if (p.kind === "external") expect(p.id).toBe("openai-whisper");
    expect(mediaCapabilityStatus("stt", env).provider).toBe("openai-whisper");
  });

  it("un valor distinto de '1' no autoriza nada", () => {
    for (const v of ["0", "true", "yes", ""]) {
      const env = {
        NELVYON_ALLOW_EXTERNAL_MEDIA: v,
        ELEVENLABS_API_KEY: "el-x",
      } as NodeJS.ProcessEnv;
      expect(resolveMediaProvider("tts", env).kind).toBe("not_configured");
    }
  });
});

describe("error explícito", () => {
  it("MediaCapabilityNotConfigured lleva capacidad y motivo, sin éxito vacío", () => {
    const p = resolveMediaProvider("image", VACIO);
    if (p.kind !== "not_configured") throw new Error("se esperaba not_configured");
    const err = new MediaCapabilityNotConfigured("image", p.reason);
    expect(err.code).toBe("media_capability_not_configured");
    expect(err.capability).toBe("image");
    expect(err.message).toContain("NELVYON_IMAGE_URL");
  });
});

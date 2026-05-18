// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TranscriptionService,
  getTranscriptionService,
  resetTranscriptionServiceForTests,
} from "../TranscriptionService";

const USER_ID = "00000000-0000-0000-0000-000000000011";

const ANALYSIS_JSON = JSON.stringify({
  summary: "Resumen de prueba",
  keyPoints: ["A", "B"],
  actionItems: ["Hacer X"],
  decisions: ["Decidimos Y"],
  sentiment: "neutral",
  duration_estimate: "~10 min",
  topics: ["t1", "t2"],
});

const DB_ROW = {
  id: "22222222-2222-2222-2222-222222222222",
  user_id: USER_ID,
  audio_url: "https://x.test/a.mp3",
  language: "es",
  context: "meeting",
  transcript_text: "Hola mundo",
  summary: "Resumen de prueba",
  key_points: ["A", "B"],
  action_items: ["Hacer X"],
  decisions: ["Decidimos Y"],
  topics: ["t1", "t2"],
  sentiment: "neutral",
  duration_estimate: "~10 min",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
};

describe("TranscriptionService", () => {
  beforeEach(() => {
    resetTranscriptionServiceForTests();
    vi.clearAllMocks();
  });

  it("transcribeAudio usa transcribeFn inyectada", async () => {
    const transcribeFn = vi.fn().mockResolvedValue({ text: "txt", duration: 120, language: "es" });
    const s = new TranscriptionService({ transcribeFn });
    const r = await s.transcribeAudio(USER_ID, "https://a.com/x.mp3", "es");
    expect(r.text).toBe("txt");
    expect(transcribeFn).toHaveBeenCalledWith("https://a.com/x.mp3", "es");
  });

  it("analyzeTranscription parsea JSON del LLM", async () => {
    const complete = vi.fn().mockResolvedValue(ANALYSIS_JSON);
    const s = new TranscriptionService({ llm: { complete } });
    const a = await s.analyzeTranscription(USER_ID, "larga transcripción", "podcast");
    expect(a.summary).toBe("Resumen de prueba");
    expect(a.keyPoints).toEqual(["A", "B"]);
    expect(complete).toHaveBeenCalled();
    const opts = complete.mock.calls[0][1];
    expect(opts.temperature).toBe(0.2);
  });

  it("processTranscription encadena transcribe + analyze + save", async () => {
    const transcribeFn = vi.fn().mockResolvedValue({ text: "Hola mundo", duration: 600, language: "es" });
    const complete = vi.fn().mockResolvedValue(ANALYSIS_JSON);
    const query = vi.fn().mockResolvedValueOnce([DB_ROW]);
    const s = new TranscriptionService({ db: { query }, llm: { complete }, transcribeFn });
    const rec = await s.processTranscription(USER_ID, "https://x.test/a.mp3", "es", "meeting");
    expect(rec.id).toBe(DB_ROW.id);
    expect(transcribeFn).toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO transcriptions");
  });

  it("saveTranscription inserta y devuelve fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([DB_ROW]);
    const s = new TranscriptionService({ db: { query } });
    const rec = await s.saveTranscription(
      USER_ID,
      { audioUrl: "https://x.test/a.mp3", language: "es", context: "meeting" },
      { text: "Hola mundo", duration: 600, language: "es" },
      JSON.parse(ANALYSIS_JSON),
    );
    expect(rec.transcriptText).toBe("Hola mundo");
    expect(query.mock.calls[0][1][0]).toBe(USER_ID);
  });

  it("getTranscriptions lista con preview", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: "33333333-3333-3333-3333-333333333333",
        context: "interview",
        duration_estimate: "~5 min",
        summary: "x".repeat(200),
        created_at: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    const s = new TranscriptionService({ db: { query } });
    const list = await s.getTranscriptions(USER_ID);
    expect(list[0].preview.endsWith("…")).toBe(true);
    expect(list[0].context).toBe("interview");
  });

  it("getTranscription devuelve null si no hay fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const s = new TranscriptionService({ db: { query } });
    const r = await s.getTranscription("11111111-1111-1111-1111-111111111111", USER_ID);
    expect(r).toBeNull();
  });

  it("getTranscription devuelve detalle", async () => {
    const query = vi.fn().mockResolvedValueOnce([DB_ROW]);
    const s = new TranscriptionService({ db: { query } });
    const r = await s.getTranscription(DB_ROW.id, USER_ID);
    expect(r?.summary).toBe("Resumen de prueba");
  });

  it("getTranscriptionService singleton", () => {
    const a = getTranscriptionService();
    const b = getTranscriptionService();
    expect(a).toBe(b);
    resetTranscriptionServiceForTests();
    const c = getTranscriptionService();
    expect(c).not.toBe(a);
  });
});

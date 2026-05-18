/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";
import { buildContentBundleFiles } from "../artifacts/contentBundleBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";

const executionJson = JSON.stringify({
  pieces: [
    { type: "blog", title: "Artículo pilar", hook: "Descubre el método", outline: "Intro\nCuerpo", cta: "Leer más" },
    { type: "video", title: "Guión corto", hook: "Hook viral", outline: "0-3s hook", cta: "Seguir" },
  ],
});

describe("contentBundleBuilder", () => {
  it("genera index.html y HTML por pieza", () => {
    const files = buildContentBundleFiles(executionJson, { clientName: "Acme" });
    expect(isValidHtmlDocument(files["index.html"])).toBe(true);
    expect(isValidHtmlDocument(files["pieces/piece-01.html"]!)).toBe(true);
    expect(files["index.html"]).toContain("Artículo pilar");
    expect(files["pieces/piece-02.html"]).toContain("Guión corto");
  });

  it("ZIP incluye índice y piezas", () => {
    const files = buildContentBundleFiles(executionJson, { clientName: "Acme" });
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("index.html");
    expect(names).toContain("pieces/piece-01.html");
    expect(names).toContain("assets/styles.css");
  });
});

/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { buildAdsBundleFiles } from "../artifacts/adsBundleBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";
import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";

const creativeJson = JSON.stringify({
  headlines: ["Escala tu ROI", "Más leads cualificados"],
  descriptions: ["Performance medible en 14 días."],
  ctaSet: ["Solicitar demo"],
});

describe("adsBundleBuilder", () => {
  it("organiza creatividades por plataforma y formato", () => {
    const files = buildAdsBundleFiles(creativeJson, { clientName: "Acme", adPlatforms: "meta,google" });
    expect(isValidHtmlDocument(files["index.html"])).toBe(true);
    expect(isValidHtmlDocument(files["meta/feed.html"])).toBe(true);
    expect(isValidHtmlDocument(files["google/banner.html"])).toBe(true);
    expect(files["meta/feed.html"]).toContain("Escala tu ROI");
  });

  it("ZIP incluye galería e index", () => {
    const files = buildAdsBundleFiles(creativeJson, { clientName: "Acme" });
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("index.html");
    expect(names).toContain("meta/feed.html");
    expect(names).toContain("tiktok/banner.html");
    expect(names.filter((n) => n.endsWith(".html")).length).toBeGreaterThanOrEqual(10);
  });
});

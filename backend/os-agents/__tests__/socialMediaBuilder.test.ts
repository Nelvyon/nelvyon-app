/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";
import { buildSocialMediaFiles } from "../artifacts/socialMediaBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";

const calendarJson = JSON.stringify({
  weeks: [
    {
      days: [
        { day: "Lun 1", theme: "Tips", format: "reel", hook: "3 errores comunes", cta: "Guarda", platform: "instagram" },
        { day: "Mar 2", theme: "Caso", format: "feed", hook: "Resultado cliente", cta: "DM", platform: "linkedin" },
      ],
    },
  ],
});

const strategyJson = JSON.stringify({
  platformPlaybooks: [{ platform: "instagram", objective: "awareness" }],
});

describe("socialMediaBuilder", () => {
  it("genera calendar.html y posts por día", () => {
    const files = buildSocialMediaFiles(calendarJson, strategyJson, { clientName: "Acme" });
    expect(isValidHtmlDocument(files["calendar.html"])).toBe(true);
    expect(isValidHtmlDocument(files["posts/post-01.html"]!)).toBe(true);
    expect(files["posts/post-01.html"]).toContain("3 errores comunes");
    expect(files["calendar.html"]).toContain("Calendario editorial");
  });

  it("ZIP incluye calendario y carpeta posts", () => {
    const files = buildSocialMediaFiles(calendarJson, strategyJson, { clientName: "Acme" });
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toContain("calendar.html");
    expect(names).toContain("posts/post-01.html");
    expect(names).toContain("assets/styles.css");
  });
});

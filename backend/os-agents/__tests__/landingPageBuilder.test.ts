/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { buildLandingPageFiles } from "../artifacts/landingPageBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";
import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";

const designJson = JSON.stringify({
  colorPalette: { primary: "#111827", secondary: "#6b7280", accent: "#7c3aed" },
});

const contentJson = JSON.stringify({
  homepage: {
    heroHeadline: "Convierte más leads",
    heroSubheadline: "Landing CRO premium",
    heroCta: "Agendar demo",
    sections: [{ name: "Cliente A", body: "+40% MQL", headline: "Caso éxito" }],
  },
  contact: { headline: "Contacto", cta: "Enviar" },
});

describe("landingPageBuilder", () => {
  it("genera index.html y styles.css con hero, prueba social y formulario", () => {
    const files = buildLandingPageFiles(contentJson, designJson, "Acme");
    expect(isValidHtmlDocument(files["index.html"])).toBe(true);
    expect(files["index.html"]).toContain("Convierte más leads");
    expect(files["index.html"]).toContain("proof-card");
    expect(files["index.html"]).toContain('type="email"');
    expect(files["assets/styles.css"]).toContain(":root");
  });

  it("empaqueta en ZIP", () => {
    const files = buildLandingPageFiles(contentJson, designJson, "Acme");
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toEqual(["assets/styles.css", "index.html"]);
  });
});

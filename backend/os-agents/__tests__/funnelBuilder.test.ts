/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { buildFunnelFiles } from "../artifacts/funnelBuilder";
import { isValidHtmlDocument } from "../artifacts/htmlUtils";
import { createArtifactZip, listZipEntryNames } from "../artifacts/artifactPublisher";

const conversionJson = JSON.stringify({
  funnelStages: [
    { name: "Opt-in", headline: "Guía gratis", body: "Descarga ahora", cta: "Descargar" },
    { name: "Oferta", headline: "Plan Pro", body: "Mejor valor", cta: "Ver plan" },
    { name: "Checkout", headline: "Pago seguro", body: "Finaliza aquí", cta: "Pagar" },
  ],
});

const designJson = JSON.stringify({
  colorPalette: { primary: "#0f172a", accent: "#7c3aed" },
});

describe("funnelBuilder", () => {
  it("genera paso1–3 y JS de navegación", () => {
    const files = buildFunnelFiles(conversionJson, designJson, "Acme");
    for (const step of ["paso1.html", "paso2.html", "paso3.html"] as const) {
      expect(isValidHtmlDocument(files[step])).toBe(true);
    }
    expect(files["paso1.html"]).toContain("paso2.html");
    expect(files["assets/funnel.js"]).toContain("sessionStorage");
    expect(files["paso3.html"]).toContain("funnel-progress");
  });

  it("ZIP contiene 5 archivos", () => {
    const files = buildFunnelFiles(conversionJson, designJson, "Acme");
    const names = listZipEntryNames(createArtifactZip(files));
    expect(names).toHaveLength(5);
    expect(names).toContain("paso1.html");
    expect(names).toContain("assets/funnel.js");
  });
});

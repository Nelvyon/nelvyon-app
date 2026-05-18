/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import {
  buildStaticSiteFiles,
  createStaticSiteZip,
  isValidHtmlDocument,
  listZipEntryNames,
  parseLooseJson,
} from "../agents/webStaticBuilder";

const designJson = JSON.stringify({
  colorPalette: {
    primary: "#111827",
    secondary: "#6b7280",
    accent: "#7c3aed",
    background: "#ffffff",
    text: "#1f2937",
  },
  typography: { heading: "Inter", body: "Inter" },
});

const contentJson = JSON.stringify({
  homepage: {
    heroHeadline: "Crece más rápido",
    heroSubheadline: "Marketing digital premium",
    heroCta: "Agendar llamada",
    sections: [{ name: "Prueba", headline: "Resultados", body: "KPIs claros", cta: "Ver más" }],
  },
  about: {
    headline: "Nuestra historia",
    story: "Nacimos para escalar marcas.",
    values: [{ name: "Transparencia", description: "Datos primero" }],
  },
  services: [
    {
      name: "SEO",
      headline: "SEO técnico",
      description: "Visibilidad orgánica",
      benefits: ["Auditoría", "Contenido"],
    },
  ],
  contact: {
    headline: "Hablemos",
    subheadline: "Respuesta en 24h",
    cta: "Enviar",
  },
});

describe("webStaticBuilder", () => {
  it("parseLooseJson tolera comillas simples", () => {
    const parsed = parseLooseJson("{ 'foo': 'bar' }", { foo: "" });
    expect(parsed.foo).toBe("bar");
  });

  it("genera 4 HTML y 2 assets", () => {
    const files = buildStaticSiteFiles(contentJson, designJson, "Acme Corp");
    expect(Object.keys(files).sort()).toEqual([
      "about.html",
      "assets/main.js",
      "assets/styles.css",
      "contact.html",
      "index.html",
      "services.html",
    ]);
    for (const key of ["index.html", "about.html", "services.html", "contact.html"] as const) {
      expect(isValidHtmlDocument(files[key])).toBe(true);
      expect(files[key]).toContain("<!DOCTYPE html>");
      expect(files[key]).toContain("<html");
      expect(files[key]).toContain("<head");
      expect(files[key]).toContain("<body");
    }
    expect(files["assets/styles.css"]).toContain(":root");
    expect(files["assets/main.js"]).toContain("nav-toggle");
  });

  it("páginas tienen secciones distintas", () => {
    const files = buildStaticSiteFiles(contentJson, designJson, "Acme");
    expect(files["index.html"]).toContain("Crece más rápido");
    expect(files["about.html"]).toContain("Nuestra historia");
    expect(files["services.html"]).toContain("SEO técnico");
    expect(files["contact.html"]).toContain('type="email"');
  });

  it("ZIP contiene todos los archivos", () => {
    const files = buildStaticSiteFiles(contentJson, designJson, "Acme");
    const zip = createStaticSiteZip(files);
    const names = listZipEntryNames(zip);
    expect(names).toContain("index.html");
    expect(names).toContain("about.html");
    expect(names).toContain("services.html");
    expect(names).toContain("contact.html");
    expect(names).toContain("assets/styles.css");
    expect(names).toContain("assets/main.js");
    expect(names).toHaveLength(6);
  });
});

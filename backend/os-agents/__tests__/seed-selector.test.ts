import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { getSectorSeeds, getSeedByIndex } from "../seeds/seed-selector";

// Build a temporary fixture directory that mirrors the real seed layout
let tmpRoot: string;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nelvyon-seeds-"));

  // Synthetic seeds
  const syntheticDir = path.join(tmpRoot, "os-agents", "seeds");
  fs.mkdirSync(syntheticDir, { recursive: true });
  fs.writeFileSync(
    path.join(syntheticDir, "restaurantes.json"),
    JSON.stringify([
      { id: "r1", headline: "Sabor auténtico", meta_title: "Rest {{city}}", cta_label: "Reservar", chatbot_greeting: "¡Hola!" },
      { id: "r2", headline: "Cocina de autor", meta_title: "Mejor rest", cta_label: "Ver menú", chatbot_greeting: "¿Ayuda?" },
    ]),
  );
  fs.writeFileSync(
    path.join(syntheticDir, "clinicas.json"),
    JSON.stringify([
      { id: "c1", headline: "Tu salud primero", meta_title: "Clínica {{city}}", cta_label: "Pedir cita", chatbot_greeting: "¿Cita?" },
    ]),
  );
  fs.writeFileSync(
    path.join(syntheticDir, "ecommerce.json"),
    JSON.stringify([
      { id: "e1", headline: "Compra fácil", meta_title: "Tienda online", cta_label: "Comprar", chatbot_greeting: "¿Buscas algo?" },
    ]),
  );

  // Envato seeds dir (empty — no on-disk seeds)
  const envatoDir = path.join(tmpRoot, "data", "envato-seeds");
  fs.mkdirSync(envatoDir, { recursive: true });
});

describe("getSectorSeeds — synthetic fallback", () => {
  it("returns restaurantes seeds from synthetic JSON", () => {
    const seeds = getSectorSeeds("restaurantes", 20, tmpRoot);
    expect(seeds.length).toBe(2);
    expect(seeds[0].source).toBe("synthetic");
    expect(seeds[0].headline).toBe("Sabor auténtico");
  });

  it("returns clinicas seeds", () => {
    const seeds = getSectorSeeds("clinicas", 20, tmpRoot);
    expect(seeds).toHaveLength(1);
    expect(seeds[0].cta_label).toBe("Pedir cita");
  });

  it("returns ecommerce seeds", () => {
    const seeds = getSectorSeeds("ecommerce", 20, tmpRoot);
    expect(seeds[0].headline).toBe("Compra fácil");
  });

  it("respects limit", () => {
    const seeds = getSectorSeeds("restaurantes", 1, tmpRoot);
    expect(seeds).toHaveLength(1);
  });

  it("returns empty array for unknown sector", () => {
    const seeds = getSectorSeeds("nonexistent-xyz", 20, tmpRoot);
    expect(seeds).toEqual([]);
  });
});

describe("getSectorSeeds — envato priority", () => {
  it("prefers envato seeds over synthetic when present", () => {
    const envatoSectorDir = path.join(tmpRoot, "data", "envato-seeds", "restaurantes");
    fs.mkdirSync(envatoSectorDir, { recursive: true });
    fs.writeFileSync(
      path.join(envatoSectorDir, "item-01.json"),
      JSON.stringify({ id: "env-01", headline: "Envato headline", cta_label: "Envato CTA", chatbot_greeting: "Envato bot" }),
    );
    const seeds = getSectorSeeds("restaurantes", 20, tmpRoot);
    expect(seeds[0].source).toBe("envato");
    expect(seeds[0].headline).toBe("Envato headline");
    // Clean up so other tests are unaffected
    fs.rmSync(envatoSectorDir, { recursive: true, force: true });
  });
});

describe("getSeedByIndex", () => {
  it("returns first seed at index 0", () => {
    const seed = getSeedByIndex("restaurantes", 0, tmpRoot);
    expect(seed?.id).toBe("r1");
  });

  it("wraps around: index 3 % 2 = 1 → second seed", () => {
    const seed = getSeedByIndex("restaurantes", 3, tmpRoot);
    expect(seed?.id).toBe("r2");
  });

  it("returns null for unknown sector", () => {
    expect(getSeedByIndex("unknown-xyz", 0, tmpRoot)).toBeNull();
  });
});

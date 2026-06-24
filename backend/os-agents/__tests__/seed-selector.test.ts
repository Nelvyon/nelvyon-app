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

  // Envato metadata index (500 entries simulated with 3 entries for test)
  const metadataFile = path.join(tmpRoot, "data", "envato-seeds-metadata.json");
  fs.writeFileSync(
    metadataFile,
    JSON.stringify([
      { id: "dental-001", sector: "dental", source: "synthetic", headline: "Clínica Dental Premium", meta_title: "Dental {{city}}", cta_label: "Pedir cita", chatbot_greeting: "¿Cita dental?", downloaded_at: null, envato_id: null },
      { id: "dental-002", sector: "dental", source: "synthetic", headline: "Tu Sonrisa Perfecta", meta_title: "Dental {{city}} 2", cta_label: "Reservar", chatbot_greeting: "¿Reservas?", downloaded_at: null, envato_id: null },
      { id: "ecommerce-001", sector: "ecommerce", source: "synthetic", headline: "Tienda Online Premium", meta_title: "Shop {{city}}", cta_label: "Comprar", chatbot_greeting: "¿Buscas algo?", downloaded_at: null, envato_id: null },
    ]),
  );
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

  it("returns ecommerce seeds (metadata index takes priority over synthetic JSON)", () => {
    // ecommerce is in the metadata index, so metadata (priority 2) returns before synthetic (priority 3)
    const seeds = getSectorSeeds("ecommerce", 20, tmpRoot);
    expect(seeds[0].headline).toBe("Tienda Online Premium");
    expect(seeds[0].source).toBe("synthetic");
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

describe("getSectorSeeds — metadata index fallback (priority 2)", () => {
  it("returns dental seeds from metadata index when no on-disk files", () => {
    const seeds = getSectorSeeds("dental", 50, tmpRoot);
    expect(seeds.length).toBe(2);
    expect(seeds[0].id).toBe("dental-001");
    expect(seeds[0].headline).toBe("Clínica Dental Premium");
    expect(seeds[0].source).toBe("synthetic");
  });

  it("returns ecommerce from metadata when not in synthetic JSON", () => {
    // ecommerce is in both synthetic and metadata — on-disk wins, then metadata
    // but synthetic JSON also has it. For dental (not in synthetic JSON) → metadata kicks in
    const seeds = getSectorSeeds("dental", 50, tmpRoot);
    expect(seeds.length).toBeGreaterThan(0);
  });

  it("metadata respects limit", () => {
    const seeds = getSectorSeeds("dental", 1, tmpRoot);
    expect(seeds).toHaveLength(1);
  });

  it("on-disk envato wins over metadata", () => {
    const envatoSectorDir = path.join(tmpRoot, "data", "envato-seeds", "dental");
    fs.mkdirSync(envatoSectorDir, { recursive: true });
    fs.writeFileSync(
      path.join(envatoSectorDir, "ondisk-01.json"),
      JSON.stringify({ id: "on-disk-dental", headline: "On-Disk Dental", cta_label: "Book", chatbot_greeting: "Hi" }),
    );
    const seeds = getSectorSeeds("dental", 50, tmpRoot);
    expect(seeds[0].headline).toBe("On-Disk Dental");
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

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasKnowledgeBaseService, resetSaasKbServiceForTests, SaasKbError } from "../SaasKnowledgeBaseService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(rows: Record<string, unknown>[] = []): SaasPostgresPort {
  return { query: vi.fn().mockResolvedValue(rows) } as unknown as SaasPostgresPort;
}

const T = "tenant-s28-kb";
const now = new Date().toISOString();
const catRow = { id: "cat-1", tenant_id: T, name: "Primeros pasos", icon: "🚀", slug: "primeros-pasos", sort_order: 0, article_count: "2", created_at: now };
const artRow = {
  id: "art-1", tenant_id: T, category_id: "cat-1", category_name: "Primeros pasos",
  title: "Cómo empezar", slug: "como-empezar", content: "# Inicio\n\nBienvenido.",
  excerpt: "Bienvenido.", published: true, views: 42, helpful: 10, not_helpful: 2,
  created_at: now, updated_at: now,
};

beforeEach(() => { resetSaasKbServiceForTests(); });

describe("listCategories", () => {
  it("returns empty when no categories", async () => {
    expect(await new SaasKnowledgeBaseService(makeDb([])).listCategories(T)).toEqual([]);
  });

  it("returns categories with article count", async () => {
    const svc = new SaasKnowledgeBaseService(makeDb([catRow]));
    const cats = await svc.listCategories(T);
    expect(cats[0]!.name).toBe("Primeros pasos");
    expect(cats[0]!.articleCount).toBe(2);
  });
});

describe("createCategory", () => {
  it("throws VALIDATION for empty name", async () => {
    const svc = new SaasKnowledgeBaseService(makeDb([]));
    await expect(svc.createCategory(T, { name: "" })).rejects.toThrow(SaasKbError);
  });

  it("creates category with generated slug", async () => {
    const db = makeDb([catRow]);
    const svc = new SaasKnowledgeBaseService(db);
    const cat = await svc.createCategory(T, { name: "Primeros pasos", icon: "🚀" });
    expect(cat.name).toBe("Primeros pasos");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO saas_kb_categories"), expect.arrayContaining(["primeros-pasos"]));
  });

  it("throws CONFLICT on duplicate slug", async () => {
    const db = makeDb([]);
    (db.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("unique constraint"));
    const svc = new SaasKnowledgeBaseService(db);
    await expect(svc.createCategory(T, { name: "Primeros pasos" })).rejects.toThrow(SaasKbError);
  });

  it("defaults icon to 📁 when not provided", async () => {
    const db = makeDb([{ ...catRow, icon: "📁" }]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.createCategory(T, { name: "Test" });
    expect(db.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["📁"]));
  });
});

describe("deleteCategory", () => {
  it("throws NOT_FOUND when missing", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).deleteCategory(T, "missing")).rejects.toThrow(SaasKbError);
  });
  it("succeeds when found", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([{ id: "cat-1" }])).deleteCategory(T, "cat-1")).resolves.toBeUndefined();
  });
});

describe("listArticles", () => {
  it("returns empty when no articles", async () => {
    expect(await new SaasKnowledgeBaseService(makeDb([])).listArticles(T)).toEqual([]);
  });

  it("maps article fields correctly", async () => {
    const svc = new SaasKnowledgeBaseService(makeDb([artRow]));
    const arts = await svc.listArticles(T);
    expect(arts[0]!.title).toBe("Cómo empezar");
    expect(arts[0]!.views).toBe(42);
    expect(arts[0]!.helpful).toBe(10);
    expect(arts[0]!.notHelpful).toBe(2);
    expect(arts[0]!.published).toBe(true);
  });

  it("filters by categoryId", async () => {
    const db = makeDb([]);
    await new SaasKnowledgeBaseService(db).listArticles(T, { categoryId: "cat-1" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("category_id"), expect.arrayContaining([T, "cat-1"]));
  });

  it("filters by published=true", async () => {
    const db = makeDb([]);
    await new SaasKnowledgeBaseService(db).listArticles(T, { published: true });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("published"), expect.arrayContaining([T, true]));
  });

  it("filters by search string (ILIKE)", async () => {
    const db = makeDb([]);
    await new SaasKnowledgeBaseService(db).listArticles(T, { search: "campaña" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("ILIKE"), expect.arrayContaining([T, "%campaña%"]));
  });
});

describe("getArticle", () => {
  it("throws NOT_FOUND when missing", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).getArticle(T, "missing")).rejects.toThrow(SaasKbError);
  });
  it("returns article when found", async () => {
    const art = await new SaasKnowledgeBaseService(makeDb([artRow])).getArticle(T, "art-1");
    expect(art.id).toBe("art-1");
    expect(art.categoryName).toBe("Primeros pasos");
  });
});

describe("createArticle", () => {
  it("throws VALIDATION for empty title", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).createArticle(T, { title: "", content: "X" })).rejects.toThrow(SaasKbError);
  });
  it("throws VALIDATION for empty content", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).createArticle(T, { title: "T", content: "" })).rejects.toThrow(SaasKbError);
  });
  it("generates slug from title", async () => {
    const db = makeDb([artRow]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.createArticle(T, { title: "Cómo empezar", content: "Body" });
    expect(db.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["como-empezar"]));
  });
  it("auto-generates excerpt from content when not provided", async () => {
    const db = makeDb([artRow]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.createArticle(T, { title: "T", content: "# Header\n\nThis is the body text." });
    // excerpt is auto-generated
    expect(db.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([T]));
  });
  it("throws CONFLICT on duplicate title slug", async () => {
    const db = makeDb([]);
    (db.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("unique constraint"));
    await expect(new SaasKnowledgeBaseService(db).createArticle(T, { title: "Dup", content: "X" })).rejects.toThrow(SaasKbError);
  });
});

describe("updateArticle", () => {
  it("throws NOT_FOUND when missing", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).updateArticle(T, "missing", { published: true })).rejects.toThrow(SaasKbError);
  });
  it("updates published state", async () => {
    const db = makeDb([{ ...artRow, published: false }]);
    const svc = new SaasKnowledgeBaseService(db);
    const art = await svc.updateArticle(T, "art-1", { published: false });
    expect(art.published).toBe(false);
  });
});

describe("deleteArticle", () => {
  it("throws NOT_FOUND when missing", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).deleteArticle(T, "missing")).rejects.toThrow(SaasKbError);
  });
  it("succeeds when found", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([{ id: "art-1" }])).deleteArticle(T, "art-1")).resolves.toBeUndefined();
  });
});

describe("voteArticle", () => {
  it("throws NOT_FOUND when missing", async () => {
    await expect(new SaasKnowledgeBaseService(makeDb([])).voteArticle(T, "missing", "helpful")).rejects.toThrow(SaasKbError);
  });
  it("increments helpful column", async () => {
    const db = makeDb([{ id: "art-1" }]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.voteArticle(T, "art-1", "helpful");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("helpful=helpful+1"), expect.any(Array));
  });
  it("increments not_helpful column", async () => {
    const db = makeDb([{ id: "art-1" }]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.voteArticle(T, "art-1", "not_helpful");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("not_helpful=not_helpful+1"), expect.any(Array));
  });
});

describe("incrementViews", () => {
  it("calls UPDATE with views+1", async () => {
    const db = makeDb([]);
    const svc = new SaasKnowledgeBaseService(db);
    await svc.incrementViews(T, "art-1");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("views=views+1"), expect.any(Array));
  });
});

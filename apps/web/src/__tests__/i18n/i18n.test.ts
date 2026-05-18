import en from "../../../messages/en.json";
import es from "../../../messages/es.json";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (isObject(acc) ? acc[key] : undefined), obj);
}

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const commonKeys = [
  "common.save",
  "common.cancel",
  "common.delete",
  "common.edit",
  "common.loading",
  "common.error",
  "common.success",
  "common.retry",
  "common.back",
  "common.next",
  "common.finish",
  "common.search",
  "common.filter",
  "common.empty_state",
  "common.view_all",
];

const heroKeys = ["hero.title", "hero.subtitle", "hero.cta_primary", "hero.cta_secondary"];
const authKeys = [
  "auth.login.title",
  "auth.login.email",
  "auth.login.password",
  "auth.login.submit",
  "auth.login.no_account",
  "auth.register.title",
  "auth.register.name",
  "auth.register.email",
  "auth.register.password",
  "auth.register.submit",
  "auth.register.has_account",
];

describe("i18n dictionaries", () => {
  it("messages/es.json existe y es JSON válido", () => {
    expect(es).toBeDefined();
    expect(typeof es).toBe("object");
  });

  it("messages/en.json existe y es JSON válido", () => {
    expect(en).toBeDefined();
    expect(typeof en).toBe("object");
  });

  it("es.json tiene todas las claves de common.*", () => {
    commonKeys.forEach((k) => expect(getByPath(es as Record<string, unknown>, k)).toBeDefined());
  });

  it("en.json tiene todas las claves de common.*", () => {
    commonKeys.forEach((k) => expect(getByPath(en as Record<string, unknown>, k)).toBeDefined());
  });

  it("es.json tiene todas las claves de hero.*", () => {
    heroKeys.forEach((k) => expect(getByPath(es as Record<string, unknown>, k)).toBeDefined());
  });

  it("en.json tiene todas las claves de hero.*", () => {
    heroKeys.forEach((k) => expect(getByPath(en as Record<string, unknown>, k)).toBeDefined());
  });

  it("es.json tiene todas las claves de auth.*", () => {
    authKeys.forEach((k) => expect(getByPath(es as Record<string, unknown>, k)).toBeDefined());
  });

  it("en.json tiene todas las claves de auth.*", () => {
    authKeys.forEach((k) => expect(getByPath(en as Record<string, unknown>, k)).toBeDefined());
  });

  it("Todas las claves de es.json existen en en.json", () => {
    const allEs = flatten(es as Record<string, unknown>);
    allEs.forEach((k) => expect(getByPath(en as Record<string, unknown>, k)).toBeDefined());
  });

  it("Ningún valor en es.json o en.json está vacío", () => {
    const allEs = flatten(es as Record<string, unknown>);
    const allEn = flatten(en as Record<string, unknown>);
    [...allEs.map((k) => getByPath(es as Record<string, unknown>, k)), ...allEn.map((k) => getByPath(en as Record<string, unknown>, k))].forEach((value) => {
      expect(typeof value).toBe("string");
      expect((value as string).trim().length).toBeGreaterThan(0);
    });
  });
});

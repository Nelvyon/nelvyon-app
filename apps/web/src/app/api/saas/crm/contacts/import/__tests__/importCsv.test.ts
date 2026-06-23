import { describe, it, expect } from "vitest";

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]!).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ""; });
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

describe("CSV import parser", () => {
  it("parses basic CSV", () => {
    const csv = `name,email,phone\nAlice,alice@test.com,+34600000001\nBob,bob@test.com,`;
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe("Alice");
    expect(rows[0]?.email).toBe("alice@test.com");
    expect(rows[1]?.name).toBe("Bob");
    expect(rows[1]?.phone).toBe("");
  });

  it("handles quoted fields with commas", () => {
    const csv = `name,company\n"Smith, John","ACME, Inc."`;
    const rows = parseCSV(csv);
    expect(rows[0]?.name).toBe("Smith, John");
    expect(rows[0]?.company).toBe("ACME, Inc.");
  });

  it("handles escaped quotes inside fields", () => {
    const csv = `name,notes\n"He said ""hello""",ok`;
    const rows = parseCSV(csv);
    expect(rows[0]?.name).toBe('He said "hello"');
  });

  it("returns empty for header-only CSV", () => {
    const csv = `name,email`;
    expect(parseCSV(csv)).toEqual([]);
  });

  it("returns empty for blank CSV", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("handles Windows CRLF line endings", () => {
    const csv = "name,email\r\nAlice,a@b.com\r\n";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("a@b.com");
  });
});

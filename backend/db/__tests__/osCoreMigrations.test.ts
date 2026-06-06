import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_316 = path.resolve(
  __dirname,
  "../../db/migrations/316_os_projects.sql",
);

describe("316_os_projects migration", () => {
  const sql = fs.readFileSync(MIGRATION_316, "utf8");

  it("es idempotente (IF NOT EXISTS)", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_projects/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_os_projects_workspace/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_os_projects_client/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_os_projects_status/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_os_projects_due_date/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_os_projects_updated_at/i);
  });

  it("define FK hacia os_clients", () => {
    expect(sql).toMatch(/client_id\s+UUID NOT NULL REFERENCES os_clients\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/ON DELETE RESTRICT/i);
  });

  it("define CHECK status y priority", () => {
    expect(sql).toMatch(/CHECK \(status IN \('draft', 'active', 'paused', 'completed', 'cancelled', 'archived'\)\)/);
    expect(sql).toMatch(/CHECK \(priority IN \('low', 'medium', 'high', 'urgent'\)\)/);
  });

  it("incluye columnas mínimas requeridas", () => {
    for (const col of [
      "workspace_id",
      "client_id",
      "name",
      "description",
      "start_date",
      "due_date",
      "budget",
      "metadata",
      "archived_at",
    ]) {
      expect(sql).toContain(col);
    }
  });

  it("no crea FK ni dependencias sobre nelvyon_projects", () => {
    expect(sql).not.toMatch(/REFERENCES\s+nelvyon_projects/i);
    expect(sql).not.toMatch(/CREATE TABLE\s+(IF NOT EXISTS\s+)?nelvyon_projects/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+nelvyon_projects/i);
  });
});

describe("315_os_clients migration (prereq)", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../db/migrations/315_os_clients.sql"),
    "utf8",
  );

  it("existe como prerequisito de 316", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_clients/i);
  });
});

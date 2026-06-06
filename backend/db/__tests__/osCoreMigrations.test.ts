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

describe("317_os_tasks migration", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../db/migrations/317_os_tasks.sql"),
    "utf8",
  );

  it("renombra legacy 281 si aplica y crea tabla canónica", () => {
    expect(sql).toMatch(/RENAME TO os_tasks_legacy_281/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_tasks/i);
  });

  it("define FKs hacia os_projects y os_clients", () => {
    expect(sql).toMatch(/project_id\s+UUID REFERENCES os_projects/i);
    expect(sql).toMatch(/client_id\s+UUID REFERENCES os_clients/i);
  });

  it("define CHECK status y priority", () => {
    expect(sql).toMatch(/'pending', 'in_progress', 'blocked', 'completed', 'archived'/);
    expect(sql).toMatch(/'low', 'medium', 'high', 'urgent'/);
  });

  it("incluye índices principales", () => {
    for (const idx of [
      "idx_os_tasks_workspace",
      "idx_os_tasks_project",
      "idx_os_tasks_client",
      "idx_os_tasks_status",
      "idx_os_tasks_priority",
      "idx_os_tasks_due_date",
      "idx_os_tasks_updated_at",
    ]) {
      expect(sql).toContain(idx);
    }
  });
});

describe("318_os_deliverables migration", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../db/migrations/318_os_deliverables.sql"),
    "utf8",
  );

  it("crea tabla canónica idempotente", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_deliverables/i);
  });

  it("define FKs hacia os_clients, os_projects y os_tasks", () => {
    expect(sql).toMatch(/client_id\s+UUID NOT NULL REFERENCES os_clients/i);
    expect(sql).toMatch(/project_id\s+UUID NOT NULL REFERENCES os_projects/i);
    expect(sql).toMatch(/task_id\s+UUID REFERENCES os_tasks/i);
  });

  it("define CHECK status y visibility", () => {
    expect(sql).toMatch(/'draft', 'in_review', 'delivered', 'approved', 'published', 'rejected', 'archived'/);
    expect(sql).toMatch(/'internal', 'client_visible'/);
  });

  it("incluye índices principales", () => {
    for (const idx of [
      "idx_os_deliverables_workspace",
      "idx_os_deliverables_client",
      "idx_os_deliverables_project",
      "idx_os_deliverables_task",
      "idx_os_deliverables_status",
      "idx_os_deliverables_visibility",
      "idx_os_deliverables_updated_at",
    ]) {
      expect(sql).toContain(idx);
    }
  });
});

describe("319_os_portal migration", () => {
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../db/migrations/319_os_portal.sql"),
    "utf8",
  );

  it("crea tablas os_portal_invites y os_portal_users", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_portal_invites/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS os_portal_users/i);
  });

  it("define FKs hacia os_clients", () => {
    expect(sql).toMatch(/client_id\s+UUID NOT NULL REFERENCES os_clients/i);
  });

  it("incluye token_hash e índices portal", () => {
    expect(sql).toContain("token_hash");
    for (const idx of [
      "idx_os_portal_invites_token_hash",
      "idx_os_portal_invites_workspace_client",
      "idx_os_portal_users_workspace_email",
      "idx_os_portal_users_client",
    ]) {
      expect(sql).toContain(idx);
    }
  });
});

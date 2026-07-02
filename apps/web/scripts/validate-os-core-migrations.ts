/**
 * Valida migración OS-1-01 (315) y tabla os_clients.
 * Uso: DATABASE_URL=... pnpm -C apps/web validate:os-core-migrations
 */
import { DbClient } from "../../../backend/db/DbClient";
import { loadEnvFiles } from "../../../backend/db/loadEnvFiles";

const REQUIRED_MIGRATIONS = [
  "315_os_clients.sql",
  "316_os_projects.sql",
  "317_os_tasks.sql",
  "318_os_deliverables.sql",
  "319_os_portal.sql",
  "320_os_deliverable_reviews.sql",
  "321_os_deliverable_versions.sql",
  "322_os_rls.sql",
] as const;

const OS_RLS_TABLES = [
  "os_clients",
  "os_projects",
  "os_tasks",
  "os_deliverables",
  "os_portal_invites",
  "os_portal_users",
  "os_deliverable_reviews",
  "os_deliverable_versions",
] as const;

const OS_CLIENTS_COLUMNS = [
  "id",
  "workspace_id",
  "created_by_user_id",
  "business_name",
  "status",
  "legacy_nelvyon_client_id",
  "metadata",
  "created_at",
  "updated_at",
] as const;

const OS_PROJECTS_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "name",
  "description",
  "status",
  "priority",
  "start_date",
  "due_date",
  "budget",
  "metadata",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const OS_PROJECTS_INDEXES = [
  "idx_os_projects_workspace",
  "idx_os_projects_client",
  "idx_os_projects_status",
  "idx_os_projects_due_date",
  "idx_os_projects_updated_at",
] as const;

const OS_TASKS_COLUMNS = [
  "id",
  "workspace_id",
  "project_id",
  "client_id",
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "due_date",
  "completed_at",
  "metadata",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const OS_TASKS_INDEXES = [
  "idx_os_tasks_workspace",
  "idx_os_tasks_project",
  "idx_os_tasks_client",
  "idx_os_tasks_status",
  "idx_os_tasks_priority",
  "idx_os_tasks_due_date",
  "idx_os_tasks_updated_at",
] as const;

const OS_DELIVERABLES_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "project_id",
  "task_id",
  "title",
  "description",
  "type",
  "status",
  "visibility",
  "file_url",
  "storage_key",
  "version",
  "review_notes",
  "delivered_at",
  "approved_at",
  "published_at",
  "client_reviewed_at",
  "approved_by_portal_user_id",
  "metadata",
  "created_at",
  "updated_at",
  "archived_at",
] as const;

const OS_DELIVERABLES_INDEXES = [
  "idx_os_deliverables_workspace",
  "idx_os_deliverables_client",
  "idx_os_deliverables_project",
  "idx_os_deliverables_task",
  "idx_os_deliverables_status",
  "idx_os_deliverables_visibility",
  "idx_os_deliverables_updated_at",
] as const;

const OS_DELIVERABLE_REVIEWS_COLUMNS = [
  "id",
  "workspace_id",
  "deliverable_id",
  "portal_user_id",
  "decision",
  "feedback",
  "created_at",
] as const;

const OS_DELIVERABLE_REVIEWS_INDEXES = [
  "idx_os_deliverable_reviews_deliverable",
  "idx_os_deliverable_reviews_workspace",
  "idx_os_deliverable_reviews_portal_user",
] as const;

const OS_DELIVERABLE_VERSIONS_COLUMNS = [
  "id",
  "workspace_id",
  "deliverable_id",
  "version",
  "status",
  "file_url",
  "review_notes",
  "metadata",
  "created_at",
] as const;

const OS_DELIVERABLE_VERSIONS_INDEXES = [
  "idx_os_deliverable_versions_deliverable",
  "idx_os_deliverable_versions_workspace",
] as const;

const OS_PORTAL_INVITES_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "email",
  "token_hash",
  "role",
  "expires_at",
  "accepted_at",
  "created_by_user_id",
  "created_at",
] as const;

const OS_PORTAL_USERS_COLUMNS = [
  "id",
  "workspace_id",
  "client_id",
  "email",
  "password_hash",
  "name",
  "status",
  "invite_id",
  "last_login_at",
  "created_at",
  "updated_at",
] as const;

const OS_PORTAL_INDEXES = [
  "idx_os_portal_invites_token_hash",
  "idx_os_portal_invites_workspace_client",
  "idx_os_portal_users_workspace_email",
  "idx_os_portal_users_client",
] as const;

async function tableExists(db: ReturnType<typeof DbClient.getInstance>, table: string): Promise<boolean> {
  const rows = await db.query<{ reg: string | null }>(
    "SELECT to_regclass($1)::text AS reg",
    [`public.${table}`],
  );
  return Boolean(rows[0]?.reg);
}

async function checkColumns(
  db: ReturnType<typeof DbClient.getInstance>,
  table: string,
  required: readonly string[],
): Promise<boolean> {
  const colRows = await db.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  const present = new Set(colRows.map((r) => r.column_name));
  let ok = true;
  for (const col of required) {
    if (!present.has(col)) {
      console.error(`[validate-os-core] FALTA columna ${table}.${col}`);
      ok = false;
    }
  }
  if (ok) {
    console.log(`[validate-os-core] OK columnas ${table} (${required.length})`);
  }
  return ok;
}

async function checkCheckConstraint(
  db: ReturnType<typeof DbClient.getInstance>,
  table: string,
  constraintHint: string,
  mustInclude: string[],
): Promise<boolean> {
  const rows = await db.query<{ def: string }>(
    `SELECT pg_get_constraintdef(c.oid) AS def
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = $1
       AND c.contype = 'c' AND c.conname LIKE $2`,
    [table, `%${constraintHint}%`],
  );
  const ok = rows.some((r) => mustInclude.every((token) => r.def?.includes(token)));
  if (!ok) {
    console.error(
      `[validate-os-core] CHECK ${constraintHint} no encontrado en ${table} (esperado: ${mustInclude.join(", ")})`,
    );
  } else {
    console.log(`[validate-os-core] OK CHECK ${table}.${constraintHint}`);
  }
  return ok;
}

async function main(): Promise<void> {
  loadEnvFiles();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error("[validate-os-core] DATABASE_URL is required.");
    process.exit(1);
  }

  const db = DbClient.getInstance();
  let ok = true;

  console.log("[validate-os-core] Comprobando migraciones registradas…");
  for (const name of REQUIRED_MIGRATIONS) {
    const migRows = await db.query<{ name: string }>(
      "SELECT name FROM _migrations WHERE name = $1",
      [name],
    );
    if (migRows.length === 0) {
      console.error(`[validate-os-core] FALTA migración en _migrations: ${name}`);
      ok = false;
    } else {
      console.log(`[validate-os-core] OK _migrations: ${name}`);
    }
  }

  const hasClients = await tableExists(db, "os_clients");
  if (!hasClients) {
    console.error("[validate-os-core] FALTA tabla: os_clients");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_clients");
    console.log(`[validate-os-core] OK tabla os_clients (filas: ${countRows[0]?.n ?? "0"})`);
    ok = (await checkColumns(db, "os_clients", OS_CLIENTS_COLUMNS)) && ok;
    ok =
      (await checkCheckConstraint(db, "os_clients", "status", ["'active'", "'archived'"])) && ok;
  }

  const hasProjects = await tableExists(db, "os_projects");
  if (!hasProjects) {
    console.error("[validate-os-core] FALTA tabla: os_projects");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_projects");
    console.log(`[validate-os-core] OK tabla os_projects (filas: ${countRows[0]?.n ?? "0"})`);
    ok = (await checkColumns(db, "os_projects", OS_PROJECTS_COLUMNS)) && ok;

    ok =
      (await checkCheckConstraint(db, "os_projects", "status", [
        "'draft'",
        "'active'",
        "'archived'",
      ])) && ok;
    ok =
      (await checkCheckConstraint(db, "os_projects", "priority", [
        "'low'",
        "'medium'",
        "'urgent'",
      ])) && ok;

    const fkRows = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_projects'
         AND c.contype = 'f'`,
    );
    const fkOk = fkRows.some(
      (r) => r.def?.includes("os_clients") && r.def?.includes("client_id"),
    );
    if (!fkOk) {
      console.error("[validate-os-core] FALTA FK os_projects.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK client_id → os_clients");
    }

    for (const idx of OS_PROJECTS_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  const hasTasks = await tableExists(db, "os_tasks");
  if (!hasTasks) {
    console.error("[validate-os-core] FALTA tabla: os_tasks");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>("SELECT COUNT(*)::text AS n FROM os_tasks");
    console.log(`[validate-os-core] OK tabla os_tasks (filas: ${countRows[0]?.n ?? "0"})`);
    ok = (await checkColumns(db, "os_tasks", OS_TASKS_COLUMNS)) && ok;

    ok =
      (await checkCheckConstraint(db, "os_tasks", "status", [
        "'pending'",
        "'completed'",
        "'archived'",
      ])) && ok;
    ok =
      (await checkCheckConstraint(db, "os_tasks", "priority", [
        "'low'",
        "'medium'",
        "'urgent'",
      ])) && ok;

    const taskFkRows = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_tasks'
         AND c.contype = 'f'`,
    );
    const fkProject = taskFkRows.some(
      (r) => r.def?.includes("os_projects") && r.def?.includes("project_id"),
    );
    const fkClient = taskFkRows.some(
      (r) => r.def?.includes("os_clients") && r.def?.includes("client_id"),
    );
    if (!fkProject) {
      console.error("[validate-os-core] FALTA FK os_tasks.project_id → os_projects(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK project_id → os_projects");
    }
    if (!fkClient) {
      console.error("[validate-os-core] FALTA FK os_tasks.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK client_id → os_clients");
    }

    for (const idx of OS_TASKS_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  const hasDeliverables = await tableExists(db, "os_deliverables");
  if (!hasDeliverables) {
    console.error("[validate-os-core] FALTA tabla: os_deliverables");
    ok = false;
  } else {
    const countRows = await db.query<{ n: string }>(
      "SELECT COUNT(*)::text AS n FROM os_deliverables",
    );
    console.log(
      `[validate-os-core] OK tabla os_deliverables (filas: ${countRows[0]?.n ?? "0"})`,
    );
    ok = (await checkColumns(db, "os_deliverables", OS_DELIVERABLES_COLUMNS)) && ok;

    ok =
      (await checkCheckConstraint(db, "os_deliverables", "status", [
        "'published'",
        "'approved_by_client'",
        "'changes_requested'",
      ])) && ok;
    ok =
      (await checkCheckConstraint(db, "os_deliverables", "visibility", [
        "'internal'",
        "'client_visible'",
      ])) && ok;

    const delFkRows = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_deliverables'
         AND c.contype = 'f'`,
    );
    const fkClient = delFkRows.some(
      (r) => r.def?.includes("os_clients") && r.def?.includes("client_id"),
    );
    const fkProject = delFkRows.some(
      (r) => r.def?.includes("os_projects") && r.def?.includes("project_id"),
    );
    const fkTask = delFkRows.some(
      (r) => r.def?.includes("os_tasks") && r.def?.includes("task_id"),
    );
    if (!fkClient) {
      console.error("[validate-os-core] FALTA FK os_deliverables.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK client_id → os_clients");
    }
    if (!fkProject) {
      console.error("[validate-os-core] FALTA FK os_deliverables.project_id → os_projects(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK project_id → os_projects");
    }
    if (!fkTask) {
      console.error("[validate-os-core] FALTA FK os_deliverables.task_id → os_tasks(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK task_id → os_tasks");
    }

    for (const idx of OS_DELIVERABLES_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  const hasPortalInvites = await tableExists(db, "os_portal_invites");
  const hasPortalUsers = await tableExists(db, "os_portal_users");
  if (!hasPortalInvites) {
    console.error("[validate-os-core] FALTA tabla: os_portal_invites");
    ok = false;
  } else {
    ok = (await checkColumns(db, "os_portal_invites", OS_PORTAL_INVITES_COLUMNS)) && ok;
    const invFk = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_portal_invites' AND c.contype = 'f'`,
    );
    if (!invFk.some((r) => r.def?.includes("os_clients") && r.def?.includes("client_id"))) {
      console.error("[validate-os-core] FALTA FK os_portal_invites.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK os_portal_invites.client_id → os_clients");
    }
  }
  if (!hasPortalUsers) {
    console.error("[validate-os-core] FALTA tabla: os_portal_users");
    ok = false;
  } else {
    ok = (await checkColumns(db, "os_portal_users", OS_PORTAL_USERS_COLUMNS)) && ok;
    ok =
      (await checkCheckConstraint(db, "os_portal_users", "status", [
        "'active'",
        "'disabled'",
      ])) && ok;
    const usrFk = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_portal_users' AND c.contype = 'f'`,
    );
    if (!usrFk.some((r) => r.def?.includes("os_clients") && r.def?.includes("client_id"))) {
      console.error("[validate-os-core] FALTA FK os_portal_users.client_id → os_clients(id)");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK os_portal_users.client_id → os_clients");
    }
  }
  if (hasPortalInvites && hasPortalUsers) {
    console.log("[validate-os-core] OK tablas portal (os_portal_invites + os_portal_users)");
    for (const idx of OS_PORTAL_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  const hasReviews = await tableExists(db, "os_deliverable_reviews");
  if (!hasReviews) {
    console.error("[validate-os-core] FALTA tabla: os_deliverable_reviews");
    ok = false;
  } else {
    ok = (await checkColumns(db, "os_deliverable_reviews", OS_DELIVERABLE_REVIEWS_COLUMNS)) && ok;
    ok =
      (await checkCheckConstraint(db, "os_deliverable_reviews", "decision", [
        "'approve'",
        "'reject'",
      ])) && ok;
    const revFk = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_deliverable_reviews' AND c.contype = 'f'`,
    );
    if (!revFk.some((r) => r.def?.includes("os_deliverables") && r.def?.includes("deliverable_id"))) {
      console.error("[validate-os-core] FALTA FK os_deliverable_reviews.deliverable_id → os_deliverables");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK deliverable_id → os_deliverables");
    }
    if (!revFk.some((r) => r.def?.includes("os_portal_users") && r.def?.includes("portal_user_id"))) {
      console.error("[validate-os-core] FALTA FK os_deliverable_reviews.portal_user_id → os_portal_users");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK portal_user_id → os_portal_users");
    }
    for (const idx of OS_DELIVERABLE_REVIEWS_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  const hasVersions = await tableExists(db, "os_deliverable_versions");
  if (!hasVersions) {
    console.error("[validate-os-core] FALTA tabla: os_deliverable_versions");
    ok = false;
  } else {
    ok = (await checkColumns(db, "os_deliverable_versions", OS_DELIVERABLE_VERSIONS_COLUMNS)) && ok;
    const verFk = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND t.relname = 'os_deliverable_versions' AND c.contype = 'f'`,
    );
    if (!verFk.some((r) => r.def?.includes("os_deliverables") && r.def?.includes("deliverable_id"))) {
      console.error("[validate-os-core] FALTA FK os_deliverable_versions.deliverable_id → os_deliverables");
      ok = false;
    } else {
      console.log("[validate-os-core] OK FK deliverable_id → os_deliverables (versions)");
    }
    for (const idx of OS_DELIVERABLE_VERSIONS_INDEXES) {
      const idxRows = await db.query<{ reg: string | null }>(
        "SELECT to_regclass($1)::text AS reg",
        [`public.${idx}`],
      );
      if (!idxRows[0]?.reg) {
        console.error(`[validate-os-core] FALTA índice: ${idx}`);
        ok = false;
      } else {
        console.log(`[validate-os-core] OK índice ${idx}`);
      }
    }
  }

  console.log("[validate-os-core] Comprobando RLS OS (322)…");
  for (const tbl of OS_RLS_TABLES) {
    if (!(await tableExists(db, tbl))) {
      continue;
    }
    const rlsRows = await db.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = $1`,
      [tbl],
    );
    if (!rlsRows[0]?.relrowsecurity) {
      console.error(`[validate-os-core] FALTA RLS habilitado en ${tbl}`);
      ok = false;
    } else {
      console.log(`[validate-os-core] OK RLS ${tbl}`);
    }
    const polRows = await db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1
         AND policyname LIKE $2`,
      [tbl, `${tbl}_os_%`],
    );
    const polCount = Number(polRows[0]?.n ?? "0");
    if (polCount < 4) {
      console.error(
        `[validate-os-core] FALTA políticas OS en ${tbl} (esperado ≥4, tiene ${polCount})`,
      );
      ok = false;
    } else {
      console.log(`[validate-os-core] OK políticas ${tbl} (${polCount})`);
    }
  }

  const fnRows = await db.query<{ reg: string | null }>(
    "SELECT to_regprocedure('public.nelvyon_apply_os_workspace_rls(text)')::text AS reg",
  );
  if (!fnRows[0]?.reg) {
    console.error("[validate-os-core] FALTA función nelvyon_apply_os_workspace_rls");
    ok = false;
  } else {
    console.log("[validate-os-core] OK función nelvyon_apply_os_workspace_rls");
  }

  await db.end();
  if (!ok) {
    console.error("[validate-os-core] Validación fallida.");
    process.exit(1);
  }
  console.log(
    "[validate-os-core] Validación OK (315–322: clients, projects, tasks, deliverables, portal, reviews, versions, RLS).",
  );
}

main().catch((err: unknown) => {
  console.error("[validate-os-core] FATAL:", err);
  process.exit(1);
});

"""322_os_rls.sql — workspace RLS on canonical OS tables."""
from pathlib import Path

MIGRATION = Path(__file__).resolve().parents[1] / "db" / "migrations" / "322_os_rls.sql"

OS_TABLES = [
    "os_clients",
    "os_projects",
    "os_tasks",
    "os_deliverables",
    "os_portal_invites",
    "os_portal_users",
    "os_deliverable_reviews",
    "os_deliverable_versions",
]

HELPERS = [
    "nelvyon_jwt_sub_text",
    "nelvyon_current_workspace_id",
    "nelvyon_user_in_workspace",
    "nelvyon_workspace_can_mutate",
    "nelvyon_os_workspace_select",
    "nelvyon_os_workspace_mutate",
    "nelvyon_apply_os_workspace_rls",
]


def test_migration_file_exists():
    assert MIGRATION.is_file()


def test_rls_covers_all_os_tables():
    sql = MIGRATION.read_text(encoding="utf-8")
    for tbl in OS_TABLES:
        assert tbl in sql


def test_rls_helpers_defined():
    sql = MIGRATION.read_text(encoding="utf-8")
    for fn in HELPERS:
        assert fn in sql


def test_rls_policies_per_operation():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "_os_select" in sql
    assert "_os_insert" in sql
    assert "_os_update" in sql
    assert "_os_delete" in sql
    assert "FORCE ROW LEVEL SECURITY" in sql

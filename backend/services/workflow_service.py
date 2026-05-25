"""
Frente 51 — Visual workflow automation service.

Workflow model: nodes[] + edges[] stored in DB (workflows + workflow_nodes + visual_workflow_executions).
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind
from services.crm_service import CRMService
from services.ses_service import get_ses_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False

TRIGGER_TYPES = frozenset(
    {"form_submit", "email_open", "link_click", "contact_created", "date", "webhook"}
)
ACTION_TYPES = frozenset(
    {
        "send_email",
        "send_sms",
        "send_whatsapp",
        "add_tag",
        "remove_tag",
        "update_crm",
        "create_task",
        "wait_delay",
        "if_condition",
        "split_ab",
        "notify_slack",
        "webhook_out",
    }
)


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj if obj is not None else {}, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    data = dict(row._mapping)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif isinstance(v, (dict, list)):
            continue
        elif hasattr(v, "hex"):
            data[k] = str(v)
    return data


class WorkflowService:
    """Visual drag-and-drop workflow CRUD + execution engine."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "workflows.sql"
        if sql_path.is_file():
            async with db_manager.get_session() as session:
                bind = session.get_bind()
                dialect = bind.dialect.name if bind is not None else "postgresql"
                raw = sql_path.read_text(encoding="utf-8")
                if dialect == "sqlite":
                    raw = raw.replace("JSONB", "TEXT").replace("::jsonb", "")
                    raw = raw.replace("DOUBLE PRECISION", "REAL")
                    raw = raw.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "")
                for stmt in raw.split(";"):
                    s = stmt.strip()
                    if s:
                        try:
                            await session.execute(text(s))
                        except Exception as exc:
                            logger.debug("workflows schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    # ─── CRUD ────────────────────────────────────────────────────────────────

    async def create_workflow(
        self,
        *,
        user_id: str,
        workspace_id: int,
        name: str,
        description: str = "",
        nodes: list[dict[str, Any]] | None = None,
        edges: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        trigger_type = self._infer_trigger_type(nodes or [])
        ins = await self.session.execute(
            text(
                f"""
                INSERT INTO workflows (
                    user_id, workspace_id, name, description, trigger_type,
                    nodes_json, edges_json, status, is_active, runs_count, created_at
                )
                VALUES (
                    :user_id, :ws, :name, :desc, :trigger_type,
                    {json_bind(self.session, "nodes")}, {json_bind(self.session, "edges")},
                    'draft', FALSE, 0, :now
                )
                RETURNING *
                """
            ),
            {
                "user_id": user_id,
                "ws": workspace_id,
                "name": name.strip(),
                "desc": description or "",
                "trigger_type": trigger_type,
                "nodes": _json_dumps(nodes or []),
                "edges": _json_dumps(edges or []),
                "now": datetime.now(timezone.utc),
            },
        )
        wf = _row(ins.mappings().first())
        wf_id = int(wf["id"])
        await self._sync_nodes(wf_id, nodes or [])
        await self.session.commit()
        return await self.get_workflow(wf_id, user_id, workspace_id)

    async def list_workflows(
        self, user_id: str, workspace_id: int, skip: int = 0, limit: int = 50
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        cnt = await self.session.execute(
            text("SELECT COUNT(*) FROM workflows WHERE workspace_id = :ws AND user_id = :uid"),
            {"ws": workspace_id, "uid": user_id},
        )
        total = int(cnt.scalar() or 0)
        rows = await self.session.execute(
            text(
                """
                SELECT id, name, description, trigger_type, status, is_active,
                       runs_count, last_run_at, created_at, updated_at
                FROM workflows
                WHERE workspace_id = :ws AND user_id = :uid
                ORDER BY created_at DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            {"ws": workspace_id, "uid": user_id, "skip": skip, "limit": limit},
        )
        return {"items": [_row(r) for r in rows.mappings()], "total": total, "skip": skip, "limit": limit}

    async def get_workflow(self, workflow_id: int, user_id: str, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        row = await self.session.execute(
            text(
                """
                SELECT * FROM workflows
                WHERE id = :id AND workspace_id = :ws AND user_id = :uid
                """
            ),
            {"id": workflow_id, "ws": workspace_id, "uid": user_id},
        )
        wf = _row(row.mappings().first())
        if not wf:
            raise ValueError("Workflow not found")
        nodes = wf.get("nodes_json")
        edges = wf.get("edges_json")
        if isinstance(nodes, str):
            nodes = json.loads(nodes or "[]")
        if isinstance(edges, str):
            edges = json.loads(edges or "[]")
        wf["nodes"] = nodes or []
        wf["edges"] = edges or []
        return wf

    async def update_workflow(
        self,
        workflow_id: int,
        user_id: str,
        workspace_id: int,
        *,
        name: str | None = None,
        description: str | None = None,
        nodes: list[dict[str, Any]] | None = None,
        edges: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        existing = await self.get_workflow(workflow_id, user_id, workspace_id)
        sets = ["updated_at = :now"]
        params: dict[str, Any] = {
            "id": workflow_id,
            "ws": workspace_id,
            "uid": user_id,
            "now": datetime.now(timezone.utc),
        }
        if name is not None:
            sets.append("name = :name")
            params["name"] = name.strip()
        if description is not None:
            sets.append("description = :desc")
            params["desc"] = description
        if nodes is not None:
            sets.append(f"nodes_json = {json_bind(self.session, 'nodes')}")
            params["nodes"] = _json_dumps(nodes)
            sets.append("trigger_type = :trigger_type")
            params["trigger_type"] = self._infer_trigger_type(nodes)
            await self._sync_nodes(workflow_id, nodes)
        if edges is not None:
            sets.append(f"edges_json = {json_bind(self.session, 'edges')}")
            params["edges"] = _json_dumps(edges)
        await self.session.execute(
            text(f"UPDATE workflows SET {', '.join(sets)} WHERE id = :id AND workspace_id = :ws AND user_id = :uid"),
            params,
        )
        await self.session.commit()
        return await self.get_workflow(workflow_id, user_id, workspace_id)

    async def activate_workflow(self, workflow_id: int, user_id: str, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        wf = await self.get_workflow(workflow_id, user_id, workspace_id)
        await self._set_tenant(workspace_id)
        await self.session.execute(
            text(
                """
                UPDATE workflows SET is_active = TRUE, status = 'active', updated_at = :now
                WHERE id = :id AND workspace_id = :ws
                """
            ),
            {"id": workflow_id, "ws": workspace_id, "now": datetime.now(timezone.utc)},
        )
        await self._register_triggers(workflow_id, workspace_id, wf.get("nodes") or [])
        await self.session.commit()
        return await self.get_workflow(workflow_id, user_id, workspace_id)

    async def list_executions(
        self, workflow_id: int, user_id: str, workspace_id: int, skip: int = 0, limit: int = 50
    ) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        await self.get_workflow(workflow_id, user_id, workspace_id)
        cnt = await self.session.execute(
            text("SELECT COUNT(*) FROM visual_workflow_executions WHERE workflow_id = :wf"),
            {"wf": workflow_id},
        )
        total = int(cnt.scalar() or 0)
        rows = await self.session.execute(
            text(
                """
                SELECT * FROM visual_workflow_executions
                WHERE workflow_id = :wf
                ORDER BY started_at DESC
                OFFSET :skip LIMIT :limit
                """
            ),
            {"wf": workflow_id, "skip": skip, "limit": limit},
        )
        items = []
        for r in rows.mappings():
            item = _row(r)
            for key in ("trigger_data", "steps_log"):
                if isinstance(item.get(key), str):
                    try:
                        item[key] = json.loads(item[key])
                    except json.JSONDecodeError:
                        pass
            items.append(item)
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    # ─── Execution ───────────────────────────────────────────────────────────

    async def execute_workflow(
        self, workflow_id: int, trigger_data: dict[str, Any], *, user_id: str | None = None, workspace_id: int | None = None
    ) -> dict[str, Any]:
        await self.ensure_schema()
        if workspace_id is None or user_id is None:
            row = await self.session.execute(text("SELECT * FROM workflows WHERE id = :id"), {"id": workflow_id})
            wf_row = _row(row.mappings().first())
            if not wf_row:
                raise ValueError("Workflow not found")
            workspace_id = int(wf_row["workspace_id"])
            user_id = str(wf_row["user_id"])
        await self._set_tenant(workspace_id)
        wf = await self.get_workflow(workflow_id, user_id, workspace_id)
        if not wf.get("is_active") and not trigger_data.get("_manual"):
            return {"status": "skipped", "reason": "workflow inactive"}

        nodes: list[dict] = wf.get("nodes") or []
        edges: list[dict] = wf.get("edges") or []
        if not nodes:
            return {"status": "skipped", "reason": "empty workflow"}

        exec_ins = await self.session.execute(
            text(
                f"""
                INSERT INTO visual_workflow_executions (
                    workflow_id, workspace_id, user_id, trigger_type, trigger_data, status
                )
                VALUES (:wf, :ws, :uid, :tt, {json_bind(self.session, 'td')}, 'running')
                RETURNING id
                """
            ),
            {
                "wf": workflow_id,
                "ws": workspace_id,
                "uid": user_id,
                "tt": trigger_data.get("trigger_type") or wf.get("trigger_type"),
                "td": _json_dumps(trigger_data),
            },
        )
        execution_id = int(exec_ins.scalar_one())
        steps_log: list[dict] = []
        status = "completed"
        error_message = None

        try:
            start_nodes = self._find_start_nodes(nodes, trigger_data.get("trigger_type") or wf.get("trigger_type"))
            if not start_nodes:
                start_nodes = [n for n in nodes if n.get("category") == "trigger"][:1]
            visited: set[str] = set()
            for start in start_nodes:
                await self._walk_graph(
                    start["id"],
                    nodes,
                    edges,
                    trigger_data,
                    steps_log,
                    visited,
                    workspace_id,
                    user_id,
                    execution_id,
                )
            await self.session.execute(
                text("UPDATE workflows SET runs_count = COALESCE(runs_count, 0) + 1, last_run_at = :now WHERE id = :id"),
                {"id": workflow_id, "now": datetime.now(timezone.utc)},
            )
        except Exception as exc:
            status = "failed"
            error_message = str(exc)
            logger.exception("Workflow %s execution failed: %s", workflow_id, exc)

        await self.session.execute(
            text(
                f"""
                UPDATE visual_workflow_executions
                SET status = :status, steps_log = {json_bind(self.session, 'steps')},
                    error_message = :err, completed_at = :now
                WHERE id = :eid
                """
            ),
            {
                "eid": execution_id,
                "status": status,
                "steps": _json_dumps(steps_log),
                "err": error_message,
                "now": datetime.now(timezone.utc),
            },
        )
        await self.session.commit()
        return {"execution_id": execution_id, "status": status, "steps": steps_log, "error": error_message}

    async def fire_triggers(self, trigger_type: str, trigger_data: dict[str, Any], workspace_id: int) -> list[dict]:
        """Dispatch all active workflows registered for this trigger type."""
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        rows = await self.session.execute(
            text(
                """
                SELECT r.workflow_id, r.trigger_config, w.user_id
                FROM workflow_trigger_registry r
                JOIN workflows w ON w.id = r.workflow_id
                WHERE r.workspace_id = :ws AND r.trigger_type = :tt
                  AND r.is_active = TRUE AND w.is_active = TRUE
                """
            ),
            {"ws": workspace_id, "tt": trigger_type},
        )
        results = []
        payload = {**trigger_data, "trigger_type": trigger_type}
        for row in rows.mappings():
            cfg = row._mapping.get("trigger_config")
            if isinstance(cfg, str):
                try:
                    cfg = json.loads(cfg)
                except json.JSONDecodeError:
                    cfg = {}
            if cfg and not self._trigger_config_matches(cfg, payload):
                continue
            wf_id = int(row._mapping["workflow_id"])
            uid = str(row._mapping["user_id"])
            try:
                result = await self.execute_workflow(wf_id, payload, user_id=uid, workspace_id=workspace_id)
                results.append({"workflow_id": wf_id, **result})
            except Exception as exc:
                logger.warning("fire_triggers workflow %s: %s", wf_id, exc)
                results.append({"workflow_id": wf_id, "status": "failed", "error": str(exc)})
        return results

    def evaluate_condition(self, node: dict[str, Any], contact_data: dict[str, Any]) -> bool:
        """Evaluate if_condition node against contact/trigger data."""
        config = node.get("config") or node.get("data") or {}
        field = str(config.get("field") or "score")
        operator = str(config.get("operator") or "eq")
        expected = config.get("value")
        actual = contact_data.get(field)
        if actual is None and field in ("tags", "tag"):
            tags = contact_data.get("tags") or []
            actual = tags
        try:
            if operator == "eq":
                return actual == expected
            if operator == "neq":
                return actual != expected
            if operator == "gt":
                return float(actual or 0) > float(expected or 0)
            if operator == "gte":
                return float(actual or 0) >= float(expected or 0)
            if operator == "lt":
                return float(actual or 0) < float(expected or 0)
            if operator == "lte":
                return float(actual or 0) <= float(expected or 0)
            if operator == "contains":
                return str(expected or "") in str(actual or "")
            if operator == "in":
                return actual in (expected if isinstance(expected, list) else [expected])
        except (TypeError, ValueError):
            return False
        return False

    # ─── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _infer_trigger_type(nodes: list[dict]) -> str:
        for n in nodes:
            if n.get("category") == "trigger" or n.get("type") == "trigger":
                return str(n.get("nodeType") or n.get("node_type") or n.get("label") or "manual")
        return "manual"

    async def _sync_nodes(self, workflow_id: int, nodes: list[dict]) -> None:
        await self.session.execute(
            text("DELETE FROM workflow_nodes WHERE workflow_id = :wf"),
            {"wf": workflow_id},
        )
        for n in nodes:
            pos = n.get("position") or {}
            await self.session.execute(
                text(
                    f"""
                    INSERT INTO workflow_nodes (
                        workflow_id, node_id, node_type, category, label, config,
                        position_x, position_y
                    )
                    VALUES (
                        :wf, :nid, :nt, :cat, :label,
                        {json_bind(self.session, 'cfg')},
                        :px, :py
                    )
                    """
                ),
                {
                    "wf": workflow_id,
                    "nid": str(n.get("id")),
                    "nt": str(n.get("nodeType") or n.get("node_type") or n.get("type") or "action"),
                    "cat": str(n.get("category") or "action"),
                    "label": str(n.get("label") or n.get("nodeType") or ""),
                    "cfg": _json_dumps(n.get("config") or n.get("data") or {}),
                    "px": float(pos.get("x") or 0),
                    "py": float(pos.get("y") or 0),
                },
            )

    async def _register_triggers(self, workflow_id: int, workspace_id: int, nodes: list[dict]) -> None:
        await self.session.execute(
            text("DELETE FROM workflow_trigger_registry WHERE workflow_id = :wf"),
            {"wf": workflow_id},
        )
        for n in nodes:
            cat = n.get("category") or ""
            node_type = str(n.get("nodeType") or n.get("node_type") or "")
            if cat != "trigger" and n.get("type") != "trigger":
                continue
            if node_type not in TRIGGER_TYPES:
                continue
            cfg = n.get("config") or n.get("data") or {}
            await self.session.execute(
                text(
                    f"""
                    INSERT INTO workflow_trigger_registry (
                        workflow_id, workspace_id, trigger_type, trigger_config, is_active
                    )
                    VALUES (:wf, :ws, :tt, {json_bind(self.session, 'cfg')}, TRUE)
                    ON CONFLICT (workflow_id, trigger_type) DO UPDATE
                    SET trigger_config = EXCLUDED.trigger_config, is_active = TRUE
                    """
                ),
                {"wf": workflow_id, "ws": workspace_id, "tt": node_type, "cfg": _json_dumps(cfg)},
            )

    @staticmethod
    def _trigger_config_matches(config: dict, payload: dict) -> bool:
        for key, expected in config.items():
            if key.startswith("_"):
                continue
            actual = payload.get(key)
            if isinstance(expected, list):
                if actual not in expected:
                    return False
            elif actual != expected:
                return False
        return True

    @staticmethod
    def _find_start_nodes(nodes: list[dict], trigger_type: str | None) -> list[dict]:
        matches = []
        for n in nodes:
            nt = str(n.get("nodeType") or n.get("node_type") or "")
            if (n.get("category") == "trigger" or n.get("type") == "trigger") and (
                not trigger_type or nt == trigger_type or trigger_type == "manual"
            ):
                matches.append(n)
        return matches

    def _outgoing(self, node_id: str, edges: list[dict], source_handle: str | None = None) -> list[str]:
        targets = []
        for e in edges:
            if str(e.get("source")) != node_id:
                continue
            sh = e.get("sourceHandle")
            if source_handle is not None and sh and sh != source_handle:
                continue
            targets.append(str(e.get("target")))
        return targets

    def _node_by_id(self, nodes: list[dict], node_id: str) -> dict | None:
        for n in nodes:
            if str(n.get("id")) == node_id:
                return n
        return None

    async def _walk_graph(
        self,
        node_id: str,
        nodes: list[dict],
        edges: list[dict],
        context: dict[str, Any],
        steps_log: list[dict],
        visited: set[str],
        workspace_id: int,
        user_id: str,
        execution_id: int,
    ) -> None:
        if node_id in visited:
            return
        visited.add(node_id)
        node = self._node_by_id(nodes, node_id)
        if not node:
            return

        node_type = str(node.get("nodeType") or node.get("node_type") or node.get("type") or "")
        category = node.get("category") or ""
        step: dict[str, Any] = {"node_id": node_id, "node_type": node_type, "status": "ok"}

        if category == "end" or node_type == "end":
            steps_log.append({**step, "action": "end"})
            return

        if node_type == "if_condition":
            result = self.evaluate_condition(node, context)
            step["result"] = result
            steps_log.append(step)
            handle = "true" if result else "false"
            next_ids = self._outgoing(node_id, edges, handle) or self._outgoing(node_id, edges)
            for nid in next_ids:
                await self._walk_graph(nid, nodes, edges, context, steps_log, visited, workspace_id, user_id, execution_id)
            return

        if node_type == "split_ab":
            variants = (node.get("config") or node.get("data") or {}).get("variants") or ["a", "b"]
            chosen = random.choice(variants)
            step["branch"] = chosen
            steps_log.append(step)
            next_ids = self._outgoing(node_id, edges, str(chosen)) or self._outgoing(node_id, edges)
            for nid in next_ids:
                await self._walk_graph(nid, nodes, edges, context, steps_log, visited, workspace_id, user_id, execution_id)
            return

        if node_type == "wait_delay":
            config = node.get("config") or node.get("data") or {}
            delay_seconds = int(config.get("delay_seconds") or config.get("minutes", 0) * 60 or 60)
            step["delay_seconds"] = delay_seconds
            steps_log.append(step)
            next_ids = self._outgoing(node_id, edges)
            if delay_seconds > 0 and next_ids:
                asyncio.create_task(
                    self._resume_after_delay(
                        execution_id, workflow_id=None, delay_seconds=delay_seconds,
                        start_node_id=next_ids[0], nodes=nodes, edges=edges,
                        context=context, workspace_id=workspace_id, user_id=user_id,
                    )
                )
            return

        if category == "action" or node_type in ACTION_TYPES:
            try:
                action_result = await self._execute_action(node_type, node, context, workspace_id, user_id)
                step["result"] = action_result
            except Exception as exc:
                step["status"] = "failed"
                step["error"] = str(exc)
                steps_log.append(step)
                raise
            steps_log.append(step)

        for nid in self._outgoing(node_id, edges):
            await self._walk_graph(nid, nodes, edges, context, steps_log, visited, workspace_id, user_id, execution_id)

    async def _resume_after_delay(
        self,
        execution_id: int,
        workflow_id: int | None,
        delay_seconds: int,
        start_node_id: str,
        nodes: list[dict],
        edges: list[dict],
        context: dict[str, Any],
        workspace_id: int,
        user_id: str,
    ) -> None:
        await asyncio.sleep(min(delay_seconds, 3600))
        from core.database import db_manager

        async with db_manager.get_session() as session:
            svc = WorkflowService(session, workspace_id)
            steps: list[dict] = []
            visited: set[str] = set()
            await svc._walk_graph(
                start_node_id, nodes, edges, context, steps, visited, workspace_id, user_id, execution_id
            )
            await session.execute(
                text(
                    f"""
                    UPDATE visual_workflow_executions
                    SET steps_log = {json_bind(session, 'steps')},
                        status = 'completed', completed_at = :now
                    WHERE id = :eid
                    """
                ),
                {"eid": execution_id, "steps": _json_dumps(steps), "now": datetime.now(timezone.utc)},
            )
            await session.commit()

    async def _execute_action(
        self,
        action_type: str,
        node: dict,
        context: dict[str, Any],
        workspace_id: int,
        user_id: str,
    ) -> dict[str, Any]:
        config = node.get("config") or node.get("data") or {}

        if action_type == "send_email":
            ses = get_ses_service()
            to_email = config.get("to_email") or context.get("email") or ""
            if to_email:
                await ses.send_email(
                    str(to_email),
                    str(config.get("subject") or "Workflow notification"),
                    str(config.get("body_html") or config.get("message") or "<p>Workflow email</p>"),
                )
            return {"to": to_email, "queued": bool(to_email)}

        if action_type == "send_sms":
            try:
                from services.sms_service import get_sms_service

                phone = config.get("phone") or context.get("phone") or ""
                if phone:
                    await get_sms_service().send_sms(str(phone), str(config.get("message") or "Workflow SMS"))
                return {"phone": phone, "sent": bool(phone)}
            except Exception as exc:
                logger.debug("send_sms skipped: %s", exc)
                return {"skipped": True, "reason": str(exc)}

        if action_type == "send_whatsapp":
            try:
                from services.whatsapp_service import get_whatsapp_service

                phone = config.get("phone") or context.get("phone") or ""
                if phone:
                    await get_whatsapp_service().send_message(str(phone), str(config.get("message") or "Workflow"))
                return {"phone": phone, "sent": bool(phone)}
            except Exception as exc:
                return {"skipped": True, "reason": str(exc)}

        if action_type in ("add_tag", "remove_tag"):
            contact_id = config.get("contact_id") or context.get("contact_id")
            tag = str(config.get("tag") or "")
            if contact_id and tag:
                crm = CRMService(self.session, workspace_id)
                contact = await crm.get_contact_by_id(str(contact_id))
                tags = list(contact.get("tags") or [])
                if action_type == "add_tag" and tag not in tags:
                    tags.append(tag)
                elif action_type == "remove_tag":
                    tags = [t for t in tags if t != tag]
                await crm.update_contact(str(contact_id), tags=tags)
            return {"contact_id": contact_id, "tag": tag}

        if action_type == "update_crm":
            contact_id = config.get("contact_id") or context.get("contact_id")
            if contact_id:
                crm = CRMService(self.session, workspace_id)
                fields = {k: v for k, v in config.items() if k not in ("contact_id",) and v is not None}
                await crm.update_contact(str(contact_id), **fields)
            return {"contact_id": contact_id, "updated": bool(contact_id)}

        if action_type == "create_task":
            contact_id = config.get("contact_id") or context.get("contact_id")
            if contact_id:
                crm = CRMService(self.session, workspace_id)
                await crm.create_activity(
                    contact_id=str(contact_id),
                    type=str(config.get("type") or "task"),
                    description=str(config.get("description") or config.get("title") or "Workflow task"),
                )
            return {"contact_id": contact_id, "title": config.get("title")}

        if action_type == "notify_slack":
            webhook_url = config.get("webhook_url") or ""
            if webhook_url:
                try:
                    import httpx

                    async with httpx.AsyncClient(timeout=10) as client:
                        await client.post(
                            str(webhook_url),
                            json={"text": str(config.get("message") or "Workflow notification")},
                        )
                except Exception as exc:
                    return {"sent": False, "error": str(exc)}
            return {"sent": bool(webhook_url)}

        if action_type == "webhook_out":
            url = config.get("url") or ""
            if url:
                try:
                    import httpx

                    async with httpx.AsyncClient(timeout=15) as client:
                        resp = await client.post(str(url), json={**context, "workflow_node": node.get("id")})
                    return {"url": url, "status_code": resp.status_code}
                except Exception as exc:
                    return {"url": url, "error": str(exc)}
            return {"skipped": True}

        if category := node.get("category"):
            if category == "trigger":
                return {"trigger": action_type}
        return {"action": action_type, "skipped": action_type not in ACTION_TYPES}


async def dispatch_workflow_trigger(
    session: AsyncSession,
    workspace_id: int,
    trigger_type: str,
    trigger_data: dict[str, Any],
) -> list[dict]:
    """Public hook for form/campaign/CRM integrations."""
    svc = WorkflowService(session, workspace_id)
    return await svc.fire_triggers(trigger_type, trigger_data, workspace_id)


def get_workflow_service(session: AsyncSession, workspace_id: int | None = None) -> WorkflowService:
    return WorkflowService(session, workspace_id)

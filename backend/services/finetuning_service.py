"""
Frente 53 — Per-workspace fine-tuning: data collection, OpenAI jobs, model routing.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.sql_compat import json_bind, uuid_bind
from services.push_service import get_push_service
from services.supabase_service import get_supabase_service
from services.tenant_service import TenantService

logger = logging.getLogger(__name__)

_SCHEMA_READY = False
MIN_TRAINING_EXAMPLES = 10
AUTO_RETRAIN_MIN_NEW = 50
RETRAIN_INTERVAL_DAYS = 30
BASE_FT_MODEL = "gpt-4o-mini-2024-07-18"
FALLBACK_MODEL = "gpt-4o"
FINETUNING_BUCKET = "fine-tuning"
SYSTEM_PROMPT = (
    "Eres el asistente de marca personalizado de este workspace NELVYON. "
    "Responde en español con tono profesional, claro y alineado con la voz de la marca."
)

_pending_polls: dict[str, asyncio.Task] = {}


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj if obj is not None else {}, ensure_ascii=False, default=str)


def _row(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    try:
        data = dict(row._mapping)
    except AttributeError:
        data = dict(row)
    for k, v in list(data.items()):
        if isinstance(v, datetime):
            data[k] = v.isoformat()
        elif hasattr(v, "hex"):
            data[k] = str(v)
        elif isinstance(v, str) and k == "metrics":
            try:
                data[k] = json.loads(v)
            except json.JSONDecodeError:
                pass
    return data


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("APP_AI_KEY", "").strip()
    if not key:
        return None
    base = os.environ.get("OPENAI_BASE_URL", "").strip() or None
    return AsyncOpenAI(api_key=key, base_url=base)


async def get_model_for_workspace(session: AsyncSession, workspace_id: int) -> str:
    """Return workspace fine-tuned model id or gpt-4o fallback."""
    await FineTuningService.ensure_schema()
    try:
        result = await session.execute(
            text(
                """
                SELECT model_id FROM workspace_models
                WHERE workspace_id = :ws AND is_active = TRUE
                  AND status IN ('succeeded', 'active')
                  AND model_id IS NOT NULL AND model_id != ''
                ORDER BY updated_at DESC
                LIMIT 1
                """
            ),
            {"ws": int(workspace_id)},
        )
        row = result.mappings().first()
        if row:
            model_id = str(row._mapping.get("model_id") or "").strip()
            if model_id.startswith("ft:"):
                return model_id
    except Exception as exc:
        logger.debug("get_model_for_workspace: %s", exc)
    return FALLBACK_MODEL


class FineTuningService:
    """Collect training data, run OpenAI fine-tuning, activate workspace models."""

    def __init__(self, session: AsyncSession, workspace_id: int | None = None):
        self.session = session
        self.workspace_id = int(workspace_id) if workspace_id is not None else None

    @classmethod
    async def ensure_schema(cls) -> None:
        global _SCHEMA_READY
        if _SCHEMA_READY:
            return
        from core.database import db_manager

        if not db_manager.async_session_maker:
            await db_manager.ensure_initialized()
        sql_path = Path(__file__).resolve().parent.parent / "migrations" / "workspace_models.sql"
        if sql_path.is_file() and db_manager.async_session_maker:
            async with db_manager.async_session_maker() as session:
                bind = session.get_bind()
                dialect = bind.dialect.name if bind is not None else "postgresql"
                raw = sql_path.read_text(encoding="utf-8")
                if dialect == "sqlite":
                    raw = raw.replace("JSONB", "TEXT").replace("::jsonb", "")
                    raw = raw.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', "")
                for stmt in raw.split(";"):
                    s = stmt.strip()
                    if s:
                        try:
                            await session.execute(text(s))
                        except Exception as exc:
                            logger.debug("workspace_models schema stmt skipped: %s", exc)
                await session.commit()
        _SCHEMA_READY = True

    async def _set_tenant(self, workspace_id: int) -> None:
        await TenantService(self.session).set_tenant_context(workspace_id)

    # ─── Data collection ─────────────────────────────────────────────────────

    async def _gather_all_examples(self, workspace_id: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
        examples: list[dict[str, Any]] = []
        sources: dict[str, int] = {}

        email = await self._collect_email_campaigns(workspace_id)
        examples.extend(email)
        sources["email_campaigns"] = len(email)

        chat_examples = await self._collect_chatbot_conversations(workspace_id)
        examples.extend(chat_examples)
        sources["chatbot"] = len(chat_examples)

        social_examples = await self._collect_social_posts(workspace_id)
        examples.extend(social_examples)
        sources["social"] = len(social_examples)

        helpdesk_examples = await self._collect_helpdesk_resolutions(workspace_id)
        examples.extend(helpdesk_examples)
        sources["helpdesk"] = len(helpdesk_examples)
        return examples, sources

    async def collect_training_data(self, workspace_id: int) -> dict[str, Any]:
        """Gather positive examples from campaigns, chatbot, social, helpdesk."""
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        examples, sources = await self._gather_all_examples(workspace_id)

        if len(examples) < MIN_TRAINING_EXAMPLES:
            raise ValueError(
                f"Se necesitan al menos {MIN_TRAINING_EXAMPLES} ejemplos positivos para entrenar. "
                f"Encontrados: {len(examples)}. Fuentes: {sources}"
            )

        jsonl_lines = [json.dumps(ex, ensure_ascii=False) for ex in examples]
        jsonl_body = "\n".join(jsonl_lines).encode("utf-8")
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        storage_path = f"{workspace_id}/training_data_{ts}.jsonl"

        supabase = get_supabase_service()
        upload = await supabase.upload_bytes(
            FINETUNING_BUCKET,
            storage_path,
            jsonl_body,
            content_type="application/jsonl",
        )

        return {
            "workspace_id": workspace_id,
            "examples_count": len(examples),
            "sources": sources,
            "dataset_path": storage_path,
            "storage": upload,
            "preview": examples[:3],
        }

    async def _collect_email_campaigns(self, workspace_id: int) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT subject, content, sent_count, open_count
                    FROM campaigns
                    WHERE workspace_id = :ws AND sent_count > 0
                      AND subject IS NOT NULL AND content IS NOT NULL
                      AND (open_count * 100.0 / NULLIF(sent_count, 0)) > 30
                    ORDER BY created_at DESC
                    LIMIT 80
                    """
                ),
                {"ws": workspace_id},
            )
            for r in rows.mappings():
                subject = (r["subject"] or "").strip()
                content = (r["content"] or "").strip()
                if not subject or not content:
                    continue
                out.append(
                    self._training_record(
                        f"Redacta un email de campaña con asunto relacionado: {subject}",
                        f"Asunto: {subject}\n\n{content}",
                        source="email_campaign",
                    )
                )
        except Exception as exc:
            logger.debug("email campaign collect skipped: %s", exc)
        return out

    async def _collect_chatbot_conversations(self, workspace_id: int) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT messages FROM chatbot_conversations
                    WHERE workspace_id = :ws AND satisfaction >= 4
                    ORDER BY last_message_at DESC
                    LIMIT 60
                    """
                ),
                {"ws": workspace_id},
            )
            for r in rows.mappings():
                raw = r["messages"]
                if isinstance(raw, str):
                    try:
                        raw = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                if not isinstance(raw, list):
                    continue
                user_parts = [m.get("content", "") for m in raw if m.get("role") == "user"]
                asst_parts = [m.get("content", "") for m in raw if m.get("role") == "assistant"]
                if not user_parts or not asst_parts:
                    continue
                user_msg = user_parts[-1].strip()
                asst_msg = asst_parts[-1].strip()
                if len(user_msg) < 4 or len(asst_msg) < 4:
                    continue
                out.append(self._training_record(user_msg, asst_msg, source="chatbot"))
        except Exception as exc:
            logger.debug("chatbot collect skipped: %s", exc)
        return out

    async def _collect_social_posts(self, workspace_id: int) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT sp.content,
                           COALESCE(SUM(spa.likes + spa.comments + spa.shares), 0) AS engagement
                    FROM social_posts sp
                    LEFT JOIN social_post_analytics spa ON spa.post_id = sp.id
                    WHERE sp.tenant_id = :ws AND sp.status = 'published'
                      AND sp.content IS NOT NULL AND TRIM(sp.content) != ''
                    GROUP BY sp.id, sp.content
                    HAVING COALESCE(SUM(spa.likes + spa.comments + spa.shares), 0) >= 20
                    ORDER BY engagement DESC
                    LIMIT 40
                    """
                ),
                {"ws": workspace_id},
            )
            for r in rows.mappings():
                content = (r["content"] or "").strip()
                if len(content) < 10:
                    continue
                out.append(
                    self._training_record(
                        "Genera un post para redes sociales sobre nuestro producto o servicio.",
                        content,
                        source="social",
                    )
                )
        except Exception as exc:
            logger.debug("social collect skipped: %s", exc)
        return out

    async def _collect_helpdesk_resolutions(self, workspace_id: int) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT t.subject, tm_in.content AS user_msg, tm_out.content AS agent_msg
                    FROM tickets t
                    JOIN ticket_messages tm_in
                      ON tm_in.ticket_id = t.id AND tm_in.direction = 'inbound'
                    JOIN ticket_messages tm_out
                      ON tm_out.ticket_id = t.id AND tm_out.direction = 'outbound'
                     AND tm_out.created_at >= tm_in.created_at
                    WHERE t.workspace_id = :ws AND t.status IN ('resolved', 'closed')
                    ORDER BY t.resolved_at DESC NULLS LAST, t.created_at DESC
                    LIMIT 50
                    """
                ),
                {"ws": workspace_id},
            )
            for r in rows.mappings():
                user_msg = (r["user_msg"] or r["subject"] or "").strip()
                agent_msg = (r["agent_msg"] or "").strip()
                if len(user_msg) < 4 or len(agent_msg) < 4:
                    continue
                out.append(self._training_record(user_msg, agent_msg, source="helpdesk"))
        except Exception as exc:
            logger.debug("helpdesk collect skipped: %s", exc)
        return out

    @staticmethod
    def _training_record(user_content: str, assistant_content: str, *, source: str) -> dict[str, Any]:
        return {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content[:4000]},
                {"role": "assistant", "content": assistant_content[:4000]},
            ],
            "metadata": {"source": source},
        }

    # ─── Fine-tuning jobs ────────────────────────────────────────────────────

    async def start_finetuning(self, workspace_id: int) -> dict[str, Any]:
        """Collect data, upload to OpenAI, create fine-tuning job."""
        await self.ensure_schema()
        await self._set_tenant(workspace_id)

        collected = await self.collect_training_data(workspace_id)
        job_row_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        await self.session.execute(
            text(
                f"""
                INSERT INTO workspace_models (
                    id, workspace_id, status, dataset_path, examples_count,
                    base_model, metrics, last_collected_at, created_at, updated_at
                )
                VALUES (
                    {uuid_bind(self.session, "id")}, :ws, 'collecting', :path, :count,
                    :base, {json_bind(self.session, "metrics")}, :now, :now, :now
                )
                """
            ),
            {
                "id": job_row_id,
                "ws": workspace_id,
                "path": collected["dataset_path"],
                "count": collected["examples_count"],
                "base": BASE_FT_MODEL,
                "metrics": _json_dumps({"sources": collected["sources"]}),
                "now": now,
            },
        )
        await self.session.commit()

        client = _openai_client()
        if not client:
            mock_model = f"ft:{BASE_FT_MODEL}:mock:{workspace_id}:{uuid.uuid4().hex[:8]}"
            await self._activate_model(
                job_row_id,
                workspace_id,
                mock_model,
                metrics={
                    "mock": True,
                    "examples_used": collected["examples_count"],
                    "sources": collected["sources"],
                    "improvement_pct": 0,
                },
            )
            return {
                "job_id": job_row_id,
                "status": "active",
                "model_id": mock_model,
                "mock": True,
                "examples_count": collected["examples_count"],
            }

        jsonl_body = await self._load_dataset_bytes(collected["dataset_path"])
        file_resp = await client.files.create(
            file=("training.jsonl", io.BytesIO(jsonl_body)),
            purpose="fine-tune",
        )
        ft_job = await client.fine_tuning.jobs.create(
            training_file=file_resp.id,
            model=BASE_FT_MODEL,
        )

        await self.session.execute(
            text(
                f"""
                UPDATE workspace_models
                SET status = 'running', openai_file_id = :fid, openai_job_id = :jid,
                    updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")}
                """
            ),
            {"id": job_row_id, "fid": file_resp.id, "jid": ft_job.id, "now": now},
        )
        await self.session.commit()

        self._schedule_job_poll(job_row_id, workspace_id, ft_job.id)
        return {
            "job_id": job_row_id,
            "openai_job_id": ft_job.id,
            "status": "running",
            "examples_count": collected["examples_count"],
            "dataset_path": collected["dataset_path"],
        }

    async def check_finetuning_status(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        row = await self._latest_job(workspace_id)
        if not row:
            return {"workspace_id": workspace_id, "status": "none", "message": "No hay entrenamiento en curso"}

        openai_job_id = row.get("openai_job_id")
        if openai_job_id and row.get("status") in ("queued", "running", "uploading"):
            client = _openai_client()
            if client:
                try:
                    job = await client.fine_tuning.jobs.retrieve(openai_job_id)
                    await self._sync_openai_job(str(row["id"]), workspace_id, job)
                    row = await self._get_job(str(row["id"]))
                except Exception as exc:
                    logger.warning("OpenAI job poll failed: %s", exc)

        return self._public_job_status(row)

    async def get_finetuned_model(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        active = await self._active_model(workspace_id)
        if active:
            metrics = active.get("metrics") or {}
            if isinstance(metrics, str):
                try:
                    metrics = json.loads(metrics)
                except json.JSONDecodeError:
                    metrics = {}
            safe_metrics = {k: v for k, v in metrics.items() if k not in ("model_id", "openai_job_id")}
            return {
                "workspace_id": workspace_id,
                "custom_model_active": True,
                "status": active.get("status"),
                "is_active": True,
                "examples_count": int(active.get("examples_count") or 0),
                "created_at": active.get("created_at"),
                "metrics": safe_metrics,
            }
        return {
            "workspace_id": workspace_id,
            "custom_model_active": False,
            "status": "none",
            "is_active": False,
        }

    async def list_auto_retrain_candidates(self, *, max_age_days: int = RETRAIN_INTERVAL_DAYS) -> list[int]:
        await self.ensure_schema()
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        try:
            rows = await self.session.execute(
                text(
                    """
                    SELECT DISTINCT workspace_id FROM workspace_models
                    WHERE is_active = TRUE AND status IN ('active', 'succeeded')
                      AND updated_at <= :cutoff
                    """
                ),
                {"cutoff": cutoff},
            )
            return [int(r._mapping["workspace_id"]) for r in rows.mappings()]
        except Exception:
            return []

    async def start_auto_retrain(self, workspace_id: int) -> dict[str, Any]:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        active = await self._active_model(workspace_id)
        prev_count = int((active or {}).get("examples_count") or 0)
        examples, _sources = await self._gather_all_examples(workspace_id)
        new_count = len(examples)
        if new_count < MIN_TRAINING_EXAMPLES:
            return {"status": "skipped", "reason": "insufficient_total_examples", "count": new_count}
        if new_count - prev_count < AUTO_RETRAIN_MIN_NEW:
            return {"status": "skipped", "reason": "insufficient_new_examples", "new_count": new_count - prev_count}
        result = await self.start_finetuning(workspace_id)
        result["auto_retrain"] = True
        return result

    async def count_new_positive_examples(self, workspace_id: int, since_count: int = 0) -> int:
        await self.ensure_schema()
        await self._set_tenant(workspace_id)
        examples, _ = await self._gather_all_examples(workspace_id)
        return max(0, len(examples) - since_count)

    # ─── Internal ────────────────────────────────────────────────────────────

    async def _load_dataset_bytes(self, path: str) -> bytes:
        supabase = get_supabase_service()
        if supabase.is_mock:
            return b'{"messages":[{"role":"system","content":"test"},{"role":"user","content":"hola"},{"role":"assistant","content":"hola"}]}\n'
        data = await supabase.download_bytes(FINETUNING_BUCKET, path)
        if not data:
            raise ValueError("No se pudo descargar el dataset de entrenamiento")
        return data

    async def _latest_job(self, workspace_id: int) -> dict[str, Any]:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM workspace_models
                WHERE workspace_id = :ws
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"ws": workspace_id},
        )
        return _row(result.mappings().first())

    async def _get_job(self, job_id: str) -> dict[str, Any]:
        result = await self.session.execute(
            text(f"SELECT * FROM workspace_models WHERE id = {uuid_bind(self.session, 'id')}"),
            {"id": job_id},
        )
        row = _row(result.mappings().first())
        if not row:
            raise ValueError("Fine-tuning job not found")
        return row

    async def _active_model(self, workspace_id: int) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                SELECT * FROM workspace_models
                WHERE workspace_id = :ws AND is_active = TRUE
                ORDER BY updated_at DESC
                LIMIT 1
                """
            ),
            {"ws": workspace_id},
        )
        row = _row(result.mappings().first())
        return row or None

    async def _sync_openai_job(self, job_row_id: str, workspace_id: int, job: Any) -> None:
        status = getattr(job, "status", None) or "running"
        fine_tuned = getattr(job, "fine_tuned_model", None)
        trained_tokens = getattr(job, "trained_tokens", None)
        error = getattr(getattr(job, "error", None), "message", None) if getattr(job, "error", None) else None

        if status == "succeeded" and fine_tuned:
            prev = await self._active_model(workspace_id)
            prev_metrics = prev.get("metrics") if prev else {}
            if isinstance(prev_metrics, str):
                try:
                    prev_metrics = json.loads(prev_metrics)
                except json.JSONDecodeError:
                    prev_metrics = {}
            new_row = await self._get_job(job_row_id)
            new_count = int(new_row.get("examples_count") or 0)
            prev_count = int((prev or {}).get("examples_count") or 0)
            improved = (not prev) or new_count >= prev_count
            metrics = {
                "trained_tokens": trained_tokens,
                "previous_model_id": (prev or {}).get("model_id"),
                "previous_examples": prev_count,
                "examples_used": new_count,
                "improvement_pct": round((new_count - prev_count) / max(prev_count, 1) * 100, 1),
                "improved": improved,
            }
            if improved:
                await self._activate_model(job_row_id, workspace_id, fine_tuned, metrics=metrics)
            else:
                await self.session.execute(
                    text(
                        f"""
                        UPDATE workspace_models
                        SET status = 'failed', error_message = :err, metrics = {json_bind(self.session, "m")},
                            updated_at = :now
                        WHERE id = {uuid_bind(self.session, "id")}
                        """
                    ),
                    {
                        "id": job_row_id,
                        "err": "Nuevo modelo no supera al anterior en volumen de ejemplos",
                        "m": _json_dumps(metrics),
                        "now": datetime.now(timezone.utc),
                    },
                )
                await self.session.commit()
            return

        if status == "failed":
            await self.session.execute(
                text(
                    f"""
                    UPDATE workspace_models
                    SET status = 'failed', error_message = :err, updated_at = :now
                    WHERE id = {uuid_bind(self.session, "id")}
                    """
                ),
                {"id": job_row_id, "err": error or "Fine-tuning failed", "now": datetime.now(timezone.utc)},
            )
            await self.session.commit()
            return

        await self.session.execute(
            text(
                f"""
                UPDATE workspace_models SET status = :st, updated_at = :now
                WHERE id = {uuid_bind(self.session, "id")}
                """
            ),
            {"id": job_row_id, "st": status, "now": datetime.now(timezone.utc)},
        )
        await self.session.commit()

    async def _activate_model(
        self,
        job_row_id: str,
        workspace_id: int,
        model_id: str,
        *,
        metrics: dict[str, Any],
    ) -> None:
        now = datetime.now(timezone.utc)
        await self.session.execute(
            text("UPDATE workspace_models SET is_active = FALSE WHERE workspace_id = :ws"),
            {"ws": workspace_id},
        )
        await self.session.execute(
            text(
                f"""
                UPDATE workspace_models
                SET model_id = :mid, status = 'active', is_active = TRUE,
                    metrics = {json_bind(self.session, "m")}, updated_at = :now, error_message = NULL
                WHERE id = {uuid_bind(self.session, "id")}
                """
            ),
            {"id": job_row_id, "mid": model_id, "m": _json_dumps(metrics), "now": now},
        )
        await self.session.commit()

        try:
            push = get_push_service(self.session, workspace_id)
            await push.send_to_workspace(
                "Tu modelo IA personalizado está listo",
                f"Modelo activo entrenado con {metrics.get('examples_used', '?')} ejemplos.",
                url="/dashboard/ai-model",
            )
        except Exception as exc:
            logger.debug("finetuning push skipped: %s", exc)

    def _schedule_job_poll(self, job_row_id: str, workspace_id: int, openai_job_id: str) -> None:
        key = f"{workspace_id}:{job_row_id}"
        existing = _pending_polls.pop(key, None)
        if existing and not existing.done():
            existing.cancel()

        async def _poll() -> None:
            client = _openai_client()
            if not client:
                return
            for _ in range(240):
                await asyncio.sleep(30)
                try:
                    from core.database import db_manager

                    if not db_manager.async_session_maker:
                        await db_manager.ensure_initialized()
                    async with db_manager.async_session_maker() as session:
                        svc = FineTuningService(session, workspace_id)
                        job = await client.fine_tuning.jobs.retrieve(openai_job_id)
                        await svc._sync_openai_job(job_row_id, workspace_id, job)
                        if job.status in ("succeeded", "failed", "cancelled"):
                            break
                except Exception as exc:
                    logger.debug("finetuning poll: %s", exc)

        _pending_polls[key] = asyncio.create_task(_poll())

    @staticmethod
    def _public_job_status(row: dict[str, Any]) -> dict[str, Any]:
        metrics = row.get("metrics") or {}
        if isinstance(metrics, str):
            try:
                metrics = json.loads(metrics)
            except json.JSONDecodeError:
                metrics = {}
        status = row.get("status") or "pending"
        progress = 0
        if status in ("collecting", "uploading"):
            progress = 15
        elif status == "queued":
            progress = 35
        elif status == "running":
            progress = 65
        elif status in ("succeeded", "active"):
            progress = 100
        elif status == "failed":
            progress = 100
        return {
            "job_id": row.get("id"),
            "workspace_id": row.get("workspace_id"),
            "status": status,
            "progress_pct": progress,
            "custom_model_active": bool(
                str(row.get("model_id") or "").startswith("ft:")
                and status in ("succeeded", "active")
            ),
            "examples_count": int(row.get("examples_count") or 0),
            "error_message": row.get("error_message") if status == "failed" else None,
            "metrics": {k: v for k, v in metrics.items() if k not in ("model_id", "openai_job_id")},
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }


def get_finetuning_service(session: AsyncSession, workspace_id: int | None = None) -> FineTuningService:
    return FineTuningService(session, workspace_id)

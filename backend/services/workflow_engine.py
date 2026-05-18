"""
Workflow Engine Service — Real workflow execution with triggers and actions.
Supports: deal_created, deal_stage_changed, contact_created, manual triggers.
Actions: move_deal, create_activity, create_notification, send_email, create_contact.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.workflow_rules import WorkflowRules, WorkflowExecutions
from models.deals import Deals
from models.contacts import Contacts
from models.activities import Activities

logger = logging.getLogger(__name__)


class WorkflowEngineService:
    """Real workflow engine that evaluates rules and executes actions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Rule CRUD ───

    async def create_rule(self, data: Dict[str, Any], user_id: str, workspace_id: int) -> WorkflowRules:
        try:
            data["user_id"] = user_id
            data["workspace_id"] = workspace_id
            rule = WorkflowRules(**data)
            self.db.add(rule)
            await self.db.commit()
            await self.db.refresh(rule)
            logger.info(
                "Workflow rule created: id=%s, trigger=%s, action=%s",
                rule.id,
                rule.trigger_type,
                rule.action_type,
            )
            return rule
        except IntegrityError as e:
            await self.db.rollback()
            logger.warning("create_rule integrity: %s", e, exc_info=True)
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error("create_rule failed: %s", e, exc_info=True)
            raise

    async def update_rule(self, rule_id: int, data: Dict[str, Any], user_id: str, workspace_id: int) -> Optional[WorkflowRules]:
        try:
            result = await self.db.execute(
                select(WorkflowRules).where(
                    WorkflowRules.id == rule_id,
                    WorkflowRules.user_id == user_id,
                    WorkflowRules.workspace_id == workspace_id,
                )
            )
            rule = result.scalar_one_or_none()
            if not rule:
                return None
            for k, v in data.items():
                if v is not None and hasattr(rule, k):
                    setattr(rule, k, v)
            await self.db.commit()
            await self.db.refresh(rule)
            return rule
        except IntegrityError as e:
            await self.db.rollback()
            logger.warning("update_rule id=%s integrity: %s", rule_id, e, exc_info=True)
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error("update_rule id=%s failed: %s", rule_id, e, exc_info=True)
            raise

    async def delete_rule(self, rule_id: int, user_id: str, workspace_id: int) -> bool:
        try:
            result = await self.db.execute(
                select(WorkflowRules).where(
                    WorkflowRules.id == rule_id,
                    WorkflowRules.user_id == user_id,
                    WorkflowRules.workspace_id == workspace_id,
                )
            )
            rule = result.scalar_one_or_none()
            if not rule:
                return False
            await self.db.delete(rule)
            await self.db.commit()
            return True
        except IntegrityError as e:
            await self.db.rollback()
            logger.warning("delete_rule id=%s integrity: %s", rule_id, e, exc_info=True)
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error("delete_rule id=%s failed: %s", rule_id, e, exc_info=True)
            raise

    async def list_rules(self, user_id: str, workspace_id: int, skip: int = 0, limit: int = 50) -> Dict[str, Any]:
        count_q = select(func.count()).select_from(WorkflowRules).where(
            WorkflowRules.user_id == user_id,
            WorkflowRules.workspace_id == workspace_id,
        )
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(WorkflowRules)
            .where(WorkflowRules.user_id == user_id, WorkflowRules.workspace_id == workspace_id)
            .order_by(desc(WorkflowRules.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(q)
        items = result.scalars().all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    async def get_rule(self, rule_id: int, user_id: str, workspace_id: int) -> Optional[WorkflowRules]:
        result = await self.db.execute(
            select(WorkflowRules).where(
                WorkflowRules.id == rule_id,
                WorkflowRules.user_id == user_id,
                WorkflowRules.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    # ─── Execution History ───

    async def list_executions(self, user_id: str, workspace_id: int, skip: int = 0, limit: int = 50) -> Dict[str, Any]:
        count_q = select(func.count()).select_from(WorkflowExecutions).where(
            WorkflowExecutions.user_id == user_id,
            WorkflowExecutions.workspace_id == workspace_id,
        )
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(WorkflowExecutions)
            .where(WorkflowExecutions.user_id == user_id, WorkflowExecutions.workspace_id == workspace_id)
            .order_by(desc(WorkflowExecutions.executed_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(q)
        items = result.scalars().all()
        return {"items": items, "total": total, "skip": skip, "limit": limit}

    # ─── Trigger Evaluation ───

    async def trigger(self, trigger_type: str, trigger_data: Dict[str, Any], user_id: str, workspace_id: int) -> List[Dict[str, Any]]:
        """
        Evaluate all active rules matching the trigger_type for this user,
        and execute matching actions. Returns list of execution results.
        """
        q = select(WorkflowRules).where(
            WorkflowRules.user_id == user_id,
            WorkflowRules.workspace_id == workspace_id,
            WorkflowRules.is_active == True,
            WorkflowRules.trigger_type == trigger_type,
        )
        result = await self.db.execute(q)
        rules = result.scalars().all()

        executions = []
        for rule in rules:
            if self._matches_conditions(rule, trigger_data):
                exec_result = await self._execute_action(rule, trigger_data, user_id, workspace_id)
                executions.append(exec_result)

        return executions

    def _matches_conditions(self, rule: WorkflowRules, trigger_data: Dict[str, Any]) -> bool:
        """Check if trigger_data matches the rule's trigger_config conditions."""
        if not rule.trigger_config:
            return True  # No conditions = always match

        try:
            conditions = json.loads(rule.trigger_config)
        except (json.JSONDecodeError, TypeError):
            return True

        for key, expected in conditions.items():
            if key in trigger_data:
                actual = trigger_data[key]
                if isinstance(expected, list):
                    if actual not in expected:
                        return False
                elif actual != expected:
                    return False
        return True

    async def _execute_action(self, rule: WorkflowRules, trigger_data: Dict[str, Any], user_id: str, workspace_id: int) -> Dict[str, Any]:
        """Execute the action defined in the rule and log the execution."""
        action_type = rule.action_type
        action_config = {}
        if rule.action_config:
            try:
                action_config = json.loads(rule.action_config)
            except (json.JSONDecodeError, TypeError):
                pass

        status = "success"
        error_message = None
        action_result = {}

        try:
            if action_type == "move_deal":
                action_result = await self._action_move_deal(trigger_data, action_config, user_id, workspace_id)
            elif action_type == "create_activity":
                action_result = await self._action_create_activity(trigger_data, action_config, user_id, workspace_id)
            elif action_type == "create_notification":
                action_result = await self._action_create_notification(trigger_data, action_config, user_id, workspace_id)
            elif action_type == "send_email":
                action_result = await self._action_queue_email(trigger_data, action_config, user_id, workspace_id)
            elif action_type == "create_contact":
                action_result = await self._action_create_contact(trigger_data, action_config, user_id, workspace_id)
            else:
                status = "skipped"
                error_message = f"Unknown action type: {action_type}"
        except ValueError as e:
            status = "failed"
            error_message = str(e)
            logger.warning(
                "Workflow action validation failed: rule=%s, action=%s, error=%s",
                rule.id,
                action_type,
                e,
                exc_info=True,
            )
        except IntegrityError as e:
            status = "failed"
            error_message = "Data conflict during workflow action"
            logger.warning(
                "Workflow action integrity error: rule=%s, action=%s, error=%s",
                rule.id,
                action_type,
                e,
                exc_info=True,
            )
        except Exception as e:
            status = "failed"
            error_message = str(e)
            logger.error(
                "Workflow action failed: rule=%s, action=%s, error=%s",
                rule.id,
                action_type,
                e,
                exc_info=True,
            )

        # Log execution + persist (single transaction with action side-effects)
        execution = WorkflowExecutions(
            user_id=user_id,
            workspace_id=workspace_id,
            rule_id=rule.id,
            rule_name=rule.name,
            trigger_type=rule.trigger_type,
            trigger_data=json.dumps(trigger_data, default=str),
            action_type=action_type,
            action_result=json.dumps(action_result, default=str),
            status=status,
            error_message=error_message,
        )
        try:
            self.db.add(execution)
            rule.runs_count = (rule.runs_count or 0) + 1
            rule.last_run_at = datetime.now(timezone.utc)
            await self.db.commit()
        except IntegrityError as e:
            await self.db.rollback()
            logger.warning(
                "Workflow execution persist integrity: rule=%s, error=%s",
                rule.id,
                e,
                exc_info=True,
            )
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(
                "Workflow execution persist failed: rule=%s, error=%s",
                rule.id,
                e,
                exc_info=True,
            )
            raise

        return {
            "rule_id": rule.id,
            "rule_name": rule.name,
            "action_type": action_type,
            "status": status,
            "result": action_result,
            "error": error_message,
        }

    # ─── Action Implementations ───

    async def _action_move_deal(self, trigger_data: Dict, config: Dict, user_id: str, workspace_id: int) -> Dict:
        deal_id = trigger_data.get("deal_id") or config.get("deal_id")
        new_stage = config.get("stage", "qualified")
        if not deal_id:
            return {"error": "No deal_id provided"}

        result = await self.db.execute(
            select(Deals).where(
                Deals.id == int(deal_id),
                Deals.user_id == user_id,
                Deals.workspace_id == workspace_id,
            )
        )
        deal = result.scalar_one_or_none()
        if not deal:
            return {"error": f"Deal {deal_id} not found"}

        old_stage = deal.stage
        deal.stage = new_stage
        deal.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        return {"deal_id": deal.id, "old_stage": old_stage, "new_stage": new_stage}

    async def _action_create_activity(self, trigger_data: Dict, config: Dict, user_id: str, workspace_id: int) -> Dict:
        activity = Activities(
            user_id=user_id,
            workspace_id=workspace_id,
            contact_id=trigger_data.get("contact_id") or config.get("contact_id"),
            type=config.get("type", "workflow_action"),
            title=config.get("title", f"Auto: {trigger_data.get('trigger_type', 'workflow')}"),
            description=config.get("description", f"Triggered by workflow. Data: {json.dumps(trigger_data, default=str)[:500]}"),
            is_completed=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(activity)
        await self.db.flush()
        return {"activity_id": activity.id, "title": activity.title}

    async def _action_create_notification(self, trigger_data: Dict, config: Dict, user_id: str, workspace_id: int) -> Dict:
        """Create an activity of type 'notification' as internal notification."""
        activity = Activities(
            user_id=user_id,
            workspace_id=workspace_id,
            type="notification",
            title=config.get("title", "Notificación de Workflow"),
            description=config.get("message", f"Workflow triggered: {trigger_data.get('trigger_type', '')}"),
            is_completed=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(activity)
        await self.db.flush()
        return {"notification_id": activity.id, "title": activity.title}

    async def _action_queue_email(self, trigger_data: Dict, config: Dict, user_id: str, workspace_id: int) -> Dict:
        """Queue an email for sending. Uses EmailQueue table."""
        from models.workflow_rules import EmailQueue

        email = EmailQueue(
            user_id=user_id,
            workspace_id=workspace_id,
            to_email=config.get("to_email", trigger_data.get("email", "")),
            to_name=config.get("to_name", trigger_data.get("contact_name", "")),
            subject=config.get("subject", "Notificación de NELVYON"),
            body_html=config.get("body_html", f"<p>{config.get('message', 'Workflow notification')}</p>"),
            body_text=config.get("body_text", config.get("message", "Workflow notification")),
            email_type="workflow_notification",
            status="pending",
        )
        self.db.add(email)
        await self.db.flush()
        return {"email_id": email.id, "to": email.to_email, "status": "queued"}

    async def _action_create_contact(self, trigger_data: Dict, config: Dict, user_id: str, workspace_id: int) -> Dict:
        contact = Contacts(
            user_id=user_id,
            workspace_id=workspace_id,
            first_name=config.get("first_name", trigger_data.get("first_name", "Auto")),
            last_name=config.get("last_name", trigger_data.get("last_name", "")),
            email=config.get("email", trigger_data.get("email", "auto@nelvyon.com")),
            phone=config.get("phone", ""),
            status="active",
            source="workflow",
            notes=f"Created by workflow. Trigger: {trigger_data.get('trigger_type', '')}",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(contact)
        await self.db.flush()
        return {"contact_id": contact.id, "name": f"{contact.first_name} {contact.last_name}"}
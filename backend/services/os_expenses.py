import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.os_cashflow import Os_cashflow
from models.os_expenses import Os_expenses
from services.workspace_mixin import WorkspaceAwareMixin

logger = logging.getLogger(__name__)


class Os_expensesService(WorkspaceAwareMixin):
    """NELVYON OS operational expenses — workspace-scoped (Fase 2F)."""

    model = Os_expenses

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _enforce_workspace_id_policy(
        self, data: Dict[str, Any], workspace_id: Optional[int]
    ) -> None:
        if workspace_id is None:
            return
        raw = data.pop("workspace_id", None)
        if raw is None:
            return
        try:
            body_ws = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("workspace_id in body must be a valid integer or omitted") from exc
        if body_ws != int(workspace_id):
            raise ValueError(
                "workspace_id in request body must match X-Workspace-Id, or omit workspace_id"
            )

    async def _sync_cashflow_outflow(
        self,
        expense: Os_expenses,
        user_id: str,
        workspace_id: int,
    ) -> None:
        """Create or update os_cashflow outflow when expense is pagado."""
        q = select(Os_cashflow).where(
            Os_cashflow.workspace_id == workspace_id,
            Os_cashflow.source_type == "expense",
            Os_cashflow.source_id == expense.id,
        )
        result = await self.db.execute(q)
        existing = result.scalar_one_or_none()
        flow_date = expense.paid_at or expense.expense_date
        desc = f"Gasto: {expense.title}"
        amount = expense.amount
        if existing:
            existing.amount = amount
            existing.currency = expense.currency or "EUR"
            existing.flow_date = flow_date
            existing.description = desc
            existing.updated_at = datetime.now(timezone.utc)
        else:
            row = Os_cashflow(
                user_id=user_id,
                workspace_id=workspace_id,
                direction="out",
                amount=amount,
                currency=expense.currency or "EUR",
                flow_date=flow_date,
                source_type="expense",
                source_id=expense.id,
                category=expense.category,
                description=desc,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            self.db.add(row)
        await self.db.commit()

    async def _remove_cashflow_for_expense(self, expense_id: int, workspace_id: int) -> None:
        q = select(Os_cashflow).where(
            Os_cashflow.workspace_id == workspace_id,
            Os_cashflow.source_type == "expense",
            Os_cashflow.source_id == expense_id,
        )
        result = await self.db.execute(q)
        row = result.scalar_one_or_none()
        if row:
            await self.db.delete(row)
            await self.db.commit()

    async def create(
        self, data: Dict[str, Any], user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Os_expenses]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to create an os_expenses row")
        payload = dict(data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        created = await self.ws_create(payload, user_id=user_id, workspace_id=workspace_id)
        if created and (created.status or "").lower() == "pagado":
            await self._sync_cashflow_outflow(created, user_id, workspace_id)
        return created

    async def get_by_id(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> Optional[Os_expenses]:
        return await self.ws_get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self.ws_get_list(
            skip=skip,
            limit=limit,
            user_id=user_id,
            workspace_id=workspace_id,
            query_dict=query_dict,
            sort=sort,
        )

    async def update(
        self,
        obj_id: int,
        update_data: Dict[str, Any],
        user_id: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Optional[Os_expenses]:
        if user_id is None or workspace_id is None:
            raise ValueError("user_id and workspace_id are required to update os_expenses")
        payload = dict(update_data)
        await self._enforce_workspace_id_policy(payload, workspace_id)
        prev = await self.get_by_id(obj_id, user_id=user_id, workspace_id=workspace_id)
        updated = await self.ws_update(obj_id, payload, user_id=user_id, workspace_id=workspace_id)
        if not updated:
            return None
        status = (updated.status or "").lower()
        prev_status = (prev.status or "").lower() if prev else ""
        if status == "pagado":
            await self._sync_cashflow_outflow(updated, user_id, workspace_id)
        elif prev_status == "pagado" and status != "pagado":
            await self._remove_cashflow_for_expense(updated.id, workspace_id)
        return updated

    async def delete(
        self, obj_id: int, user_id: Optional[str] = None, workspace_id: Optional[int] = None
    ) -> bool:
        if workspace_id is not None:
            await self._remove_cashflow_for_expense(obj_id, workspace_id)
        return await self.ws_delete(obj_id, user_id=user_id, workspace_id=workspace_id)

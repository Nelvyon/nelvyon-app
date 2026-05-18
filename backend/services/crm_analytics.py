"""
CRM Analytics Service — Real-time metrics and data integrity for CRM module.

Provides:
- Pipeline analytics (deal value by stage, conversion rates, velocity)
- Contact analytics (growth, segmentation, engagement scoring)
- Data integrity checks (orphaned records, missing relationships)
- CRM health score calculation

All queries are workspace-aware and use indexed columns for performance.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, case, cast, Float, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.activities import Activities
from models.contacts import Contacts
from models.contracts import Contracts
from models.conversations import Conversations
from models.deals import Deals

logger = logging.getLogger(__name__)


class CRMAnalyticsService:
    """Production-grade CRM analytics with workspace isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_filters(self, model, user_id: str, workspace_id: Optional[int] = None) -> list:
        """Build base filter conditions for workspace isolation."""
        filters = [model.user_id == user_id]
        if workspace_id is not None and hasattr(model, "workspace_id"):
            filters.append(model.workspace_id == workspace_id)
        return filters

    # ── Pipeline Analytics ──

    async def get_pipeline_summary(
        self, user_id: str, workspace_id: Optional[int] = None, pipeline: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get deal pipeline summary: count and value by stage."""
        filters = self._base_filters(Deals, user_id, workspace_id)
        if pipeline:
            filters.append(Deals.pipeline == pipeline)

        query = (
            select(
                Deals.stage,
                func.count(Deals.id).label("count"),
                func.coalesce(func.sum(Deals.value), 0).label("total_value"),
                func.coalesce(func.avg(Deals.value), 0).label("avg_value"),
                func.coalesce(func.avg(Deals.probability), 0).label("avg_probability"),
            )
            .where(and_(*filters))
            .group_by(Deals.stage)
            .order_by(func.count(Deals.id).desc())
        )

        result = await self.db.execute(query)
        stages = []
        total_pipeline_value = 0
        total_deals = 0
        weighted_value = 0

        for row in result.all():
            stage_value = float(row.total_value or 0)
            stage_count = int(row.count)
            avg_prob = float(row.avg_probability or 0)
            total_pipeline_value += stage_value
            total_deals += stage_count
            weighted_value += stage_value * (avg_prob / 100) if avg_prob else 0

            stages.append({
                "stage": row.stage,
                "count": stage_count,
                "total_value": round(stage_value, 2),
                "avg_value": round(float(row.avg_value or 0), 2),
                "avg_probability": round(avg_prob, 1),
                "weighted_value": round(stage_value * (avg_prob / 100), 2) if avg_prob else 0,
            })

        return {
            "stages": stages,
            "total_deals": total_deals,
            "total_pipeline_value": round(total_pipeline_value, 2),
            "weighted_pipeline_value": round(weighted_value, 2),
        }

    async def get_deal_velocity(
        self, user_id: str, workspace_id: Optional[int] = None, days: int = 30
    ) -> Dict[str, Any]:
        """Calculate deal velocity metrics over a time period."""
        filters = self._base_filters(Deals, user_id, workspace_id)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        filters.append(Deals.created_at >= cutoff)

        # Deals created in period
        created_query = select(func.count(Deals.id)).where(and_(*filters))
        created_result = await self.db.execute(created_query)
        deals_created = created_result.scalar() or 0

        # Deals won (stage = 'won' or 'closed_won')
        won_filters = filters + [Deals.stage.in_(["won", "closed_won", "closed-won"])]
        won_query = select(
            func.count(Deals.id),
            func.coalesce(func.sum(Deals.value), 0),
        ).where(and_(*won_filters))
        won_result = await self.db.execute(won_query)
        won_row = won_result.one()
        deals_won = int(won_row[0] or 0)
        revenue_won = float(won_row[1] or 0)

        # Deals lost
        lost_filters = filters + [Deals.stage.in_(["lost", "closed_lost", "closed-lost"])]
        lost_query = select(func.count(Deals.id)).where(and_(*lost_filters))
        lost_result = await self.db.execute(lost_query)
        deals_lost = lost_result.scalar() or 0

        # Win rate
        closed_total = deals_won + deals_lost
        win_rate = (deals_won / closed_total * 100) if closed_total > 0 else 0

        return {
            "period_days": days,
            "deals_created": deals_created,
            "deals_won": deals_won,
            "deals_lost": deals_lost,
            "revenue_won": round(revenue_won, 2),
            "win_rate": round(win_rate, 1),
            "avg_deal_value": round(revenue_won / deals_won, 2) if deals_won > 0 else 0,
            "velocity_per_day": round(deals_created / days, 2) if days > 0 else 0,
        }

    # ── Contact Analytics ──

    async def get_contact_segmentation(
        self, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Segment contacts by status, source, and engagement score."""
        filters = self._base_filters(Contacts, user_id, workspace_id)

        # By status
        status_query = (
            select(Contacts.status, func.count(Contacts.id))
            .where(and_(*filters))
            .group_by(Contacts.status)
            .order_by(func.count(Contacts.id).desc())
        )
        status_result = await self.db.execute(status_query)
        by_status = {row[0] or "unknown": row[1] for row in status_result.all()}

        # By source
        source_query = (
            select(Contacts.source, func.count(Contacts.id))
            .where(and_(*filters))
            .group_by(Contacts.source)
            .order_by(func.count(Contacts.id).desc())
        )
        source_result = await self.db.execute(source_query)
        by_source = {row[0] or "unknown": row[1] for row in source_result.all()}

        # Score distribution
        score_query = (
            select(
                case(
                    (Contacts.score >= 80, "hot"),
                    (Contacts.score >= 50, "warm"),
                    (Contacts.score >= 20, "cool"),
                    (Contacts.score.is_(None), "unscored"),
                    else_="cold",
                ).label("segment"),
                func.count(Contacts.id),
            )
            .where(and_(*filters))
            .group_by("segment")
        )
        score_result = await self.db.execute(score_query)
        by_engagement = {row[0]: row[1] for row in score_result.all()}

        # Total
        total_query = select(func.count(Contacts.id)).where(and_(*filters))
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        return {
            "total_contacts": total,
            "by_status": by_status,
            "by_source": by_source,
            "by_engagement": by_engagement,
        }

    async def get_contact_growth(
        self, user_id: str, workspace_id: Optional[int] = None, days: int = 30
    ) -> Dict[str, Any]:
        """Contact growth over time (daily new contacts)."""
        filters = self._base_filters(Contacts, user_id, workspace_id)
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        filters.append(Contacts.created_at >= cutoff)

        # Daily growth
        daily_query = (
            select(
                func.date(Contacts.created_at).label("day"),
                func.count(Contacts.id).label("count"),
            )
            .where(and_(*filters))
            .group_by(func.date(Contacts.created_at))
            .order_by(func.date(Contacts.created_at))
        )
        daily_result = await self.db.execute(daily_query)
        daily = [{"date": str(row.day), "count": row.count} for row in daily_result.all()]

        total_new = sum(d["count"] for d in daily)

        return {
            "period_days": days,
            "total_new_contacts": total_new,
            "avg_per_day": round(total_new / days, 1) if days > 0 else 0,
            "daily": daily,
        }

    # ── Data Integrity ──

    async def check_data_integrity(
        self, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Run data integrity checks across CRM entities."""
        issues: List[Dict[str, Any]] = []

        # 1. Deals with invalid contact_id
        deal_filters = self._base_filters(Deals, user_id, workspace_id)
        orphan_deals_query = (
            select(func.count(Deals.id))
            .where(and_(
                *deal_filters,
                Deals.contact_id.isnot(None),
                ~Deals.contact_id.in_(
                    select(Contacts.id).where(and_(*self._base_filters(Contacts, user_id, workspace_id)))
                ),
            ))
        )
        orphan_deals_result = await self.db.execute(orphan_deals_query)
        orphan_deals = orphan_deals_result.scalar() or 0
        if orphan_deals > 0:
            issues.append({
                "type": "orphaned_deals",
                "severity": "warning",
                "count": orphan_deals,
                "description": f"{orphan_deals} deals reference non-existent contacts",
                "fix": "Review and reassign or remove contact_id from orphaned deals",
            })

        # 2. Contacts without email
        no_email_query = (
            select(func.count(Contacts.id))
            .where(and_(
                *self._base_filters(Contacts, user_id, workspace_id),
                (Contacts.email.is_(None)) | (Contacts.email == ""),
            ))
        )
        no_email_result = await self.db.execute(no_email_query)
        no_email = no_email_result.scalar() or 0
        if no_email > 0:
            issues.append({
                "type": "contacts_missing_email",
                "severity": "warning",
                "count": no_email,
                "description": f"{no_email} contacts have no email address",
                "fix": "Add email addresses or mark as incomplete",
            })

        # 3. Duplicate emails
        dup_query = (
            select(func.count())
            .select_from(
                select(func.lower(Contacts.email))
                .where(and_(*self._base_filters(Contacts, user_id, workspace_id)))
                .group_by(func.lower(Contacts.email))
                .having(func.count(Contacts.id) > 1)
                .subquery()
            )
        )
        dup_result = await self.db.execute(dup_query)
        dup_groups = dup_result.scalar() or 0
        if dup_groups > 0:
            issues.append({
                "type": "duplicate_contacts",
                "severity": "info",
                "count": dup_groups,
                "description": f"{dup_groups} email addresses have duplicate contacts",
                "fix": "Use /api/v1/crm/duplicates and /api/v1/crm/merge to consolidate",
            })

        # 4. Deals without stage
        no_stage_query = (
            select(func.count(Deals.id))
            .where(and_(
                *deal_filters,
                (Deals.stage.is_(None)) | (Deals.stage == ""),
            ))
        )
        no_stage_result = await self.db.execute(no_stage_query)
        no_stage = no_stage_result.scalar() or 0
        if no_stage > 0:
            issues.append({
                "type": "deals_missing_stage",
                "severity": "error",
                "count": no_stage,
                "description": f"{no_stage} deals have no pipeline stage",
                "fix": "Assign a valid stage to all deals",
            })

        # 5. Stale deals (no update in 90+ days, still open)
        stale_cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        stale_query = (
            select(func.count(Deals.id))
            .where(and_(
                *deal_filters,
                Deals.updated_at < stale_cutoff,
                ~Deals.stage.in_(["won", "lost", "closed_won", "closed_lost", "closed-won", "closed-lost"]),
            ))
        )
        stale_result = await self.db.execute(stale_query)
        stale_deals = stale_result.scalar() or 0
        if stale_deals > 0:
            issues.append({
                "type": "stale_deals",
                "severity": "info",
                "count": stale_deals,
                "description": f"{stale_deals} open deals haven't been updated in 90+ days",
                "fix": "Review stale deals and update or close them",
            })

        # Calculate health score
        total_issues = sum(i["count"] for i in issues)
        error_count = sum(i["count"] for i in issues if i["severity"] == "error")
        warning_count = sum(i["count"] for i in issues if i["severity"] == "warning")

        # Health score: start at 100, deduct for issues
        health_score = max(0, 100 - (error_count * 5) - (warning_count * 2) - (total_issues // 10))

        return {
            "health_score": health_score,
            "total_issues": total_issues,
            "issues": issues,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }
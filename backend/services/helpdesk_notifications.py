"""
Helpdesk Notification Service — SLA tracking and notification triggers.

Provides:
- Ticket lifecycle notifications (created, assigned, resolved, closed)
- SLA monitoring (first response time, resolution time)
- Priority-based escalation rules
- Notification dispatch (internal + email when configured)
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.helpdesk_contract import normalize_ticket_priority, normalize_ticket_status
from models.helpdesk_tickets import Helpdesk_tickets

logger = logging.getLogger(__name__)

# SLA targets by priority (in minutes)
SLA_TARGETS = {
    "urgent": {"first_response": 15, "resolution": 120},
    "high": {"first_response": 60, "resolution": 480},
    "medium": {"first_response": 240, "resolution": 1440},
    "low": {"first_response": 480, "resolution": 4320},
}

# Valid ticket status transitions
VALID_TICKET_TRANSITIONS = {
    "open": ["in_progress", "waiting", "resolved", "closed"],
    "in_progress": ["waiting", "resolved", "closed", "open"],
    "waiting": ["in_progress", "resolved", "closed", "open"],
    "resolved": ["closed", "open"],  # Can reopen
    "closed": ["open"],  # Can reopen
}


class HelpdeskNotificationService:
    """Manages helpdesk ticket notifications, SLA tracking, and lifecycle events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Ticket Lifecycle ───

    async def on_ticket_created(self, ticket_id: int, user_id: str, workspace_id: int) -> Dict[str, Any]:
        """Handle ticket creation: set SLA targets, queue notifications."""
        ticket = await self._get_ticket(ticket_id, user_id, workspace_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        try:
            priority = normalize_ticket_priority(ticket.priority or "medium")
        except ValueError:
            priority = "medium"
        sla = SLA_TARGETS.get(priority, SLA_TARGETS["medium"])

        now = datetime.now(timezone.utc)
        sla_first_response_deadline = now + timedelta(minutes=sla["first_response"])
        sla_resolution_deadline = now + timedelta(minutes=sla["resolution"])

        # Store SLA info as notification record
        notification = {
            "type": "ticket_created",
            "ticket_id": ticket_id,
            "subject": ticket.subject,
            "priority": priority,
            "sla_first_response_deadline": sla_first_response_deadline.isoformat(),
            "sla_resolution_deadline": sla_resolution_deadline.isoformat(),
            "created_at": now.isoformat(),
        }

        await self._store_notification(user_id, notification)

        return {
            "ticket_id": ticket_id,
            "sla_targets": sla,
            "first_response_deadline": sla_first_response_deadline.isoformat(),
            "resolution_deadline": sla_resolution_deadline.isoformat(),
            "notification_queued": True,
        }

    async def on_ticket_assigned(
        self, ticket_id: int, user_id: str, workspace_id: int, assigned_to: str,
    ) -> Dict[str, Any]:
        """Handle ticket assignment: notify assignee."""
        ticket = await self._get_ticket(ticket_id, user_id, workspace_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        normalized = (assigned_to or "").strip() or None
        ticket.assigned_to = normalized

        try:
            notif_priority = normalize_ticket_priority(ticket.priority or "medium")
        except ValueError:
            notif_priority = "medium"
        notification = {
            "type": "ticket_assigned",
            "ticket_id": ticket_id,
            "subject": ticket.subject,
            "assigned_to": normalized or "",
            "assigned_by": user_id,
            "priority": notif_priority,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        notif_uid = normalized or user_id
        await self._store_notification(notif_uid, notification)

        # Record first response time if this is the first assignment
        if not ticket.first_response_minutes and ticket.created_at:
            created = ticket.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            delta = datetime.now(timezone.utc) - created
            ticket.first_response_minutes = int(delta.total_seconds() / 60)

        await self.db.commit()

        return {
            "ticket_id": ticket_id,
            "assigned_to": normalized or "",
            "notification_queued": True,
            "first_response_minutes": ticket.first_response_minutes,
        }

    async def on_ticket_resolved(self, ticket_id: int, user_id: str, workspace_id: int) -> Dict[str, Any]:
        """Handle ticket resolution: record resolution time, notify."""
        ticket = await self._get_ticket(ticket_id, user_id, workspace_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        now = datetime.now(timezone.utc)
        ticket.resolved_at = now

        # Calculate resolution time
        resolution_minutes = None
        if ticket.created_at:
            created = ticket.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            delta = now - created
            resolution_minutes = int(delta.total_seconds() / 60)

        notification = {
            "type": "ticket_resolved",
            "ticket_id": ticket_id,
            "subject": ticket.subject,
            "resolved_by": user_id,
            "resolution_minutes": resolution_minutes,
            "created_at": now.isoformat(),
        }

        await self._store_notification(ticket.user_id, notification)
        await self.db.commit()

        return {
            "ticket_id": ticket_id,
            "resolved_at": now.isoformat(),
            "resolution_minutes": resolution_minutes,
            "notification_queued": True,
        }

    # ─── Status Transition ───

    def validate_ticket_transition(self, current_status: str, new_status: str) -> bool:
        """Validate if a ticket status transition is allowed."""
        try:
            current = normalize_ticket_status(current_status)
            new = normalize_ticket_status(new_status)
        except ValueError:
            return False
        allowed = VALID_TICKET_TRANSITIONS.get(current, [])
        return new in allowed

    def get_allowed_ticket_transitions(self, current_status: str) -> List[str]:
        """Get allowed next statuses for a ticket."""
        try:
            current = normalize_ticket_status(current_status)
        except ValueError:
            current = "open"
        return VALID_TICKET_TRANSITIONS.get(current, [])

    async def transition_ticket(
        self,
        ticket_id: int,
        user_id: str,
        workspace_id: int,
        new_status: str,
        resolution_notes: str = "",
    ) -> Dict[str, Any]:
        """Transition a ticket status with validation and notifications."""
        ticket = await self._get_ticket(ticket_id, user_id, workspace_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} not found")

        try:
            current_status = normalize_ticket_status(ticket.status)
            new_status_lower = normalize_ticket_status(new_status)
        except ValueError as e:
            raise ValueError(str(e)) from e

        if not self.validate_ticket_transition(current_status, new_status_lower):
            allowed = self.get_allowed_ticket_transitions(current_status)
            raise ValueError(
                f"Invalid transition: '{current_status}' → '{new_status_lower}'. "
                f"Allowed: {allowed}"
            )

        ticket.status = new_status_lower
        if resolution_notes:
            ticket.resolution_notes = resolution_notes

        # Handle special transitions
        if new_status_lower == "resolved":
            result = await self.on_ticket_resolved(ticket_id, user_id, workspace_id)
        else:
            await self.db.commit()
            result = {}

        return {
            "ticket_id": ticket_id,
            "previous_status": current_status,
            "new_status": new_status_lower,
            "allowed_next_statuses": self.get_allowed_ticket_transitions(new_status_lower),
            **result,
        }

    # ─── SLA Monitoring ───

    async def check_sla_breaches(self, user_id: str, workspace_id: int) -> Dict[str, Any]:
        """Check for SLA breaches across open tickets in a workspace."""
        now = datetime.now(timezone.utc)
        breaches = []
        warnings = []

        # Get all open/in_progress tickets
        result = await self.db.execute(
            select(Helpdesk_tickets).where(
                Helpdesk_tickets.user_id == user_id,
                Helpdesk_tickets.workspace_id == workspace_id,
                Helpdesk_tickets.status.in_(["open", "in_progress", "waiting"]),
            )
        )
        tickets = result.scalars().all()

        for ticket in tickets:
            try:
                priority = normalize_ticket_priority(ticket.priority or "medium")
            except ValueError:
                priority = "medium"
            sla = SLA_TARGETS.get(priority, SLA_TARGETS["medium"])

            if ticket.created_at:
                created = ticket.created_at
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                elapsed_minutes = int((now - created).total_seconds() / 60)

                # Check first response SLA
                if not ticket.first_response_minutes:
                    if elapsed_minutes > sla["first_response"]:
                        breaches.append({
                            "ticket_id": ticket.id,
                            "subject": ticket.subject,
                            "type": "first_response",
                            "priority": priority,
                            "target_minutes": sla["first_response"],
                            "elapsed_minutes": elapsed_minutes,
                        })
                    elif elapsed_minutes > sla["first_response"] * 0.8:
                        warnings.append({
                            "ticket_id": ticket.id,
                            "subject": ticket.subject,
                            "type": "first_response_warning",
                            "priority": priority,
                            "target_minutes": sla["first_response"],
                            "elapsed_minutes": elapsed_minutes,
                        })

                # Check resolution SLA
                if elapsed_minutes > sla["resolution"]:
                    breaches.append({
                        "ticket_id": ticket.id,
                        "subject": ticket.subject,
                        "type": "resolution",
                        "priority": priority,
                        "target_minutes": sla["resolution"],
                        "elapsed_minutes": elapsed_minutes,
                    })
                elif elapsed_minutes > sla["resolution"] * 0.8:
                    warnings.append({
                        "ticket_id": ticket.id,
                        "subject": ticket.subject,
                        "type": "resolution_warning",
                        "priority": priority,
                        "target_minutes": sla["resolution"],
                        "elapsed_minutes": elapsed_minutes,
                    })

        return {
            "total_open_tickets": len(tickets),
            "breaches": breaches,
            "warnings": warnings,
            "breach_count": len(breaches),
            "warning_count": len(warnings),
            "checked_at": now.isoformat(),
        }

    # ─── Internal Helpers ───

    async def _get_ticket(
        self, ticket_id: int, user_id: str, workspace_id: int
    ) -> Optional[Helpdesk_tickets]:
        """Get a ticket by ID with ownership check."""
        result = await self.db.execute(
            select(Helpdesk_tickets).where(
                Helpdesk_tickets.id == ticket_id,
                Helpdesk_tickets.user_id == user_id,
                Helpdesk_tickets.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def _store_notification(self, user_id: str, notification: Dict[str, Any]) -> None:
        """Store a notification in the security_events table (used as notification log)."""
        try:
            await self.db.execute(
                text("""
                    INSERT INTO security_events
                    (user_id, event_type, severity, source, description, details_json, status, created_at)
                    VALUES (:uid, :etype, 'info', 'helpdesk', :desc, :details, 'logged', NOW())
                """),
                {
                    "uid": user_id,
                    "etype": f"helpdesk.{notification['type']}",
                    "desc": f"Ticket #{notification.get('ticket_id', '?')}: {notification.get('subject', '')}",
                    "details": json.dumps(notification, default=str),
                },
            )
            await self.db.commit()
        except Exception as e:
            logger.warning(f"Failed to store helpdesk notification: {e}")
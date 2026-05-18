"""
Email Service — Production-grade SendGrid integration for NELVYON.

Features:
- SendGrid SDK integration (sendgrid 6.x) with HTTP API fallback
- Retry logic with exponential backoff (up to 3 attempts)
- RFC 8058 unsubscribe headers for campaign emails
- Bounce/open/click tracking for campaigns
- Health check endpoint to verify SendGrid connectivity
- Email validation before sending
- Structured logging for all operations
- Graceful fallback when SendGrid is not configured
"""

import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.workflow_rules import EmailQueue

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [1, 5, 15]  # seconds between retries (exponential)

# Email validation regex (RFC 5322 simplified)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}"
    r"[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)


def validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email))


class EmailService:
    """Production email service with SendGrid SDK, retry logic, and health monitoring."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.api_key = os.environ.get("SENDGRID_API_KEY", "")
        self.from_email = os.environ.get("SENDGRID_FROM_EMAIL", "nelvyon@noreply.com")
        self.from_name = os.environ.get("SENDGRID_FROM_NAME", "NELVYON")
        self.has_sendgrid = bool(self.api_key)
        self._sg_client = None

    def _get_sg_client(self):
        """Lazy-initialize SendGrid client."""
        if self._sg_client is None and self.has_sendgrid:
            try:
                import sendgrid
                self._sg_client = sendgrid.SendGridAPIClient(api_key=self.api_key)
                logger.info("SendGrid SDK client initialized")
            except ImportError:
                logger.warning("sendgrid package not installed, falling back to HTTP API")
            except Exception as e:
                logger.error(f"Failed to initialize SendGrid client: {e}")
        return self._sg_client

    async def health_check(self) -> dict:
        """
        Verify SendGrid connectivity and API key validity.

        Calls the SendGrid /v3/user/profile endpoint to verify the key works.
        """
        if not self.has_sendgrid:
            return {
                "status": "not_configured",
                "sendgrid_api_key_set": False,
                "from_email": self.from_email,
                "message": "Set SENDGRID_API_KEY environment variable to enable email sending.",
            }

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.sendgrid.com/v3/user/profile",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=10,
                )

                if resp.status_code == 200:
                    return {
                        "status": "operational",
                        "sendgrid_api_key_set": True,
                        "sendgrid_api_key_valid": True,
                        "from_email": self.from_email,
                        "from_name": self.from_name,
                        "sdk_available": self._get_sg_client() is not None,
                        "message": "SendGrid is connected and operational.",
                    }
                elif resp.status_code == 401:
                    return {
                        "status": "auth_error",
                        "sendgrid_api_key_set": True,
                        "sendgrid_api_key_valid": False,
                        "message": "SendGrid API key is invalid. Check SENDGRID_API_KEY.",
                    }
                else:
                    return {
                        "status": "error",
                        "sendgrid_api_key_set": True,
                        "http_status": resp.status_code,
                        "message": f"SendGrid returned HTTP {resp.status_code}",
                    }
        except ImportError:
            return {
                "status": "dependency_missing",
                "message": "httpx package not installed. Run: pip install httpx",
            }
        except Exception as e:
            return {
                "status": "connection_error",
                "sendgrid_api_key_set": True,
                "error": str(e),
                "message": "Could not connect to SendGrid API.",
            }

    async def send_email(
        self,
        user_id: str,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        to_name: Optional[str] = None,
        email_type: str = "transactional",
        campaign_id: Optional[int] = None,
        workspace_id: Optional[int] = None,
    ) -> dict:
        """
        Send an email via SendGrid SDK or queue it if not configured.
        Includes input validation and retry logic.
        """
        # Validate email
        if not validate_email(to_email):
            return {
                "email_id": None,
                "status": "validation_error",
                "to": to_email,
                "message": f"Invalid email address: {to_email}",
            }

        if not subject or not subject.strip():
            return {
                "email_id": None,
                "status": "validation_error",
                "to": to_email,
                "message": "Subject cannot be empty",
            }

        # Create queue entry for tracking
        email = EmailQueue(
            user_id=user_id,
            workspace_id=workspace_id,
            to_email=to_email,
            to_name=to_name or "",
            subject=subject,
            body_html=body_html,
            body_text=body_text or "",
            email_type=email_type,
            status="pending",
        )
        self.db.add(email)
        await self.db.flush()
        await self.db.refresh(email)

        if self.has_sendgrid:
            success = False
            last_error = ""

            for attempt in range(MAX_RETRIES):
                try:
                    success = await self._send_via_sendgrid_sdk(
                        to_email, to_name, subject, body_html, body_text, email_type,
                    )
                    if success:
                        break
                    last_error = "SendGrid returned non-success status"
                except Exception as e:
                    last_error = str(e)[:500]
                    logger.warning(
                        f"SendGrid attempt {attempt + 1}/{MAX_RETRIES} failed: {e}"
                    )
                    if attempt < MAX_RETRIES - 1:
                        import asyncio
                        await asyncio.sleep(RETRY_DELAYS[attempt])
                        continue

            if success:
                email.status = "sent"
                email.sent_at = datetime.now(timezone.utc)
                logger.info(f"Email sent: to={to_email} subject='{subject}' type={email_type}")
            else:
                email.status = "failed"
                email.error_message = last_error
                logger.error(
                    f"Email to {to_email} failed after {MAX_RETRIES} attempts: {last_error}"
                )
        else:
            email.status = "no_api_key"
            email.error_message = "SENDGRID_API_KEY not configured. Email queued."
            logger.info(f"Email queued (no API key): to={to_email}, subject={subject}")

        await self.db.commit()

        return {
            "email_id": email.id,
            "status": email.status,
            "to": to_email,
            "message": "Email sent" if email.status == "sent" else f"Email queued ({email.status})",
        }

    async def _send_via_sendgrid_sdk(
        self, to_email: str, to_name: Optional[str],
        subject: str, body_html: str, body_text: Optional[str],
        email_type: str = "transactional",
    ) -> bool:
        """Send via SendGrid Python SDK (preferred) or HTTP API fallback."""
        sg = self._get_sg_client()

        if sg is not None:
            return await self._send_with_sdk(
                sg, to_email, to_name, subject, body_html, body_text, email_type
            )
        else:
            return await self._send_with_http(
                to_email, to_name, subject, body_html, body_text, email_type
            )

    async def _send_with_sdk(
        self, sg, to_email: str, to_name: Optional[str],
        subject: str, body_html: str, body_text: Optional[str],
        email_type: str,
    ) -> bool:
        """Send using the SendGrid Python SDK."""
        try:
            from sendgrid.helpers.mail import (
                Mail, Email, To, Content, Header, TrackingSettings,
                ClickTracking, OpenTracking,
            )

            from_email = Email(self.from_email, self.from_name)
            to = To(to_email, to_name or "")
            content_list = []
            if body_text:
                content_list.append(Content("text/plain", body_text))
            content_list.append(Content("text/html", body_html))

            message = Mail(
                from_email=from_email,
                to_emails=to,
                subject=subject,
            )

            for c in content_list:
                message.add_content(c)

            # Add unsubscribe headers for campaign emails (RFC 8058)
            if email_type == "campaign":
                message.add_header(Header(
                    "List-Unsubscribe",
                    "<mailto:unsubscribe@nelvyon.com?subject=unsubscribe>"
                ))
                message.add_header(Header(
                    "List-Unsubscribe-Post",
                    "List-Unsubscribe=One-Click"
                ))
                # Enable tracking for campaigns
                message.tracking_settings = TrackingSettings(
                    click_tracking=ClickTracking(True, True),
                    open_tracking=OpenTracking(True),
                )

            # SendGrid SDK send is synchronous, run in executor
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, sg.send, message)

            if response.status_code in (200, 201, 202):
                logger.debug(f"SendGrid SDK: sent to {to_email} (HTTP {response.status_code})")
                return True

            logger.warning(
                f"SendGrid SDK returned {response.status_code}: {response.body}"
            )
            return False

        except ImportError as e:
            logger.warning(f"SendGrid SDK import error: {e}, falling back to HTTP")
            return await self._send_with_http(
                to_email, to_name, subject, body_html, body_text, email_type
            )
        except Exception as e:
            logger.error(f"SendGrid SDK error: {e}")
            raise

    async def _send_with_http(
        self, to_email: str, to_name: Optional[str],
        subject: str, body_html: str, body_text: Optional[str],
        email_type: str = "transactional",
    ) -> bool:
        """Send via SendGrid HTTP API (fallback when SDK is not available)."""
        try:
            import httpx

            payload = {
                "personalizations": [{"to": [{"email": to_email, "name": to_name or ""}]}],
                "from": {"email": self.from_email, "name": self.from_name},
                "subject": subject,
                "content": [],
            }

            if body_text:
                payload["content"].append({"type": "text/plain", "value": body_text})
            payload["content"].append({"type": "text/html", "value": body_html})

            if email_type == "campaign":
                payload["headers"] = {
                    "List-Unsubscribe": "<mailto:unsubscribe@nelvyon.com?subject=unsubscribe>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                }
                payload["tracking_settings"] = {
                    "click_tracking": {"enable": True},
                    "open_tracking": {"enable": True},
                }

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=15,
                )

                if resp.status_code in (200, 201, 202):
                    return True

                logger.warning(f"SendGrid HTTP returned {resp.status_code}: {resp.text[:200]}")
                return False

        except ImportError:
            logger.warning("httpx not installed, cannot send via SendGrid HTTP API")
            return False
        except Exception as e:
            logger.error(f"SendGrid HTTP API error: {e}")
            raise

    async def send_welcome_email(
        self,
        user_id: str,
        to_email: str,
        user_name: str = "",
        workspace_id: Optional[int] = None,
    ) -> dict:
        """Send a welcome email to a new user."""
        subject = "¡Bienvenido a NELVYON! 🚀"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">¡Bienvenido a NELVYON, {user_name}!</h1>
            </div>
            <div style="padding: 20px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Tu cuenta ha sido creada exitosamente. Estás listo para transformar tu negocio con IA.
                </p>
                <h3 style="color: #374151;">Próximos pasos:</h3>
                <ol style="color: #374151; line-height: 1.8;">
                    <li>Configura tu primer cliente en el CRM</li>
                    <li>Crea tu primer proyecto</li>
                    <li>Activa los workflows automáticos</li>
                    <li>Explora los agentes IA</li>
                </ol>
                <p style="margin-top: 20px; text-align: center;">
                    <a href="https://nelvyon.com/saas/dashboard"
                       style="background: #6366f1; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Ir al Dashboard
                    </a>
                </p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                — El equipo de NELVYON
            </p>
        </div>
        """
        return await self.send_email(
            user_id, to_email, subject, body_html, email_type="welcome", workspace_id=workspace_id
        )

    async def send_workflow_notification(
        self, user_id: str, to_email: str, workflow_name: str, action_summary: str,
    ) -> dict:
        """Send a workflow notification email."""
        subject = f"Workflow ejecutado: {workflow_name}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Workflow Ejecutado ⚡</h2>
            <p><strong>Workflow:</strong> {workflow_name}</p>
            <p><strong>Resultado:</strong> {action_summary}</p>
            <p style="color: #888; margin-top: 20px;">— NELVYON Automation</p>
        </div>
        """
        return await self.send_email(user_id, to_email, subject, body_html, email_type="workflow_notification")

    async def send_ticket_notification(
        self,
        user_id: str,
        to_email: str,
        ticket_subject: str,
        ticket_id: int,
        event_type: str = "created",
        workspace_id: Optional[int] = None,
    ) -> dict:
        """Send a helpdesk ticket notification email."""
        event_labels = {
            "created": "Nuevo Ticket Creado",
            "assigned": "Ticket Asignado",
            "resolved": "Ticket Resuelto",
            "closed": "Ticket Cerrado",
            "updated": "Ticket Actualizado",
        }
        label = event_labels.get(event_type, "Actualización de Ticket")
        subject = f"[Ticket #{ticket_id}] {label}: {ticket_subject}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; padding: 15px; border-radius: 8px; text-align: center;">
                <h2 style="color: white; margin: 0;">🎫 {label}</h2>
            </div>
            <div style="padding: 20px;">
                <p><strong>Ticket:</strong> #{ticket_id}</p>
                <p><strong>Asunto:</strong> {ticket_subject}</p>
                <p><strong>Estado:</strong> {event_type}</p>
                <p style="margin-top: 20px; text-align: center;">
                    <a href="https://nelvyon.com/saas/helpdesk/{ticket_id}"
                       style="background: #f59e0b; color: white; padding: 10px 20px;
                              text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Ver Ticket
                    </a>
                </p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                — NELVYON Helpdesk
            </p>
        </div>
        """
        return await self.send_email(
            user_id,
            to_email,
            subject,
            body_html,
            email_type="helpdesk_notification",
            workspace_id=workspace_id,
        )

    async def retry_failed_emails(
        self, user_id: str, limit: int = 50, workspace_id: Optional[int] = None
    ) -> dict:
        """Retry sending failed emails."""
        if not self.has_sendgrid:
            return {"retried": 0, "message": "SendGrid not configured"}

        q = select(EmailQueue).where(
            EmailQueue.user_id == user_id,
            EmailQueue.status.in_(["failed", "no_api_key"]),
        )
        if workspace_id is not None:
            q = q.where(EmailQueue.workspace_id == workspace_id)
        result = await self.db.execute(q.limit(limit))
        emails = result.scalars().all()

        retried = 0
        succeeded = 0
        for email in emails:
            try:
                success = await self._send_via_sendgrid_sdk(
                    email.to_email, email.to_name,
                    email.subject, email.body_html, email.body_text,
                    email.email_type or "transactional",
                )
                if success:
                    email.status = "sent"
                    email.sent_at = datetime.now(timezone.utc)
                    email.error_message = None
                    succeeded += 1
                else:
                    email.error_message = "Retry failed"
                retried += 1
            except Exception as e:
                email.error_message = f"Retry error: {str(e)[:200]}"
                retried += 1

        await self.db.commit()
        return {"retried": retried, "succeeded": succeeded, "remaining_failed": retried - succeeded}

    async def get_email_stats(self, user_id: str, workspace_id: Optional[int] = None) -> dict:
        """Get email sending statistics for a user (opcionalmente acotado a un workspace)."""

        def _ws_filter(q):
            if workspace_id is None:
                return q
            return q.where(EmailQueue.workspace_id == workspace_id)

        total_q = _ws_filter(
            select(func.count()).select_from(EmailQueue).where(EmailQueue.user_id == user_id)
        )
        total = (await self.db.execute(total_q)).scalar() or 0

        sent_q = _ws_filter(
            select(func.count()).select_from(EmailQueue).where(
                EmailQueue.user_id == user_id,
                EmailQueue.status == "sent",
            )
        )
        sent = (await self.db.execute(sent_q)).scalar() or 0

        pending_q = _ws_filter(
            select(func.count()).select_from(EmailQueue).where(
                EmailQueue.user_id == user_id,
                EmailQueue.status.in_(["pending", "no_api_key"]),
            )
        )
        pending = (await self.db.execute(pending_q)).scalar() or 0

        failed_q = _ws_filter(
            select(func.count()).select_from(EmailQueue).where(
                EmailQueue.user_id == user_id,
                EmailQueue.status == "failed",
            )
        )
        failed = (await self.db.execute(failed_q)).scalar() or 0

        return {
            "total": total,
            "sent": sent,
            "pending": pending,
            "failed": failed,
            "sendgrid_configured": self.has_sendgrid,
            "sdk_available": self._get_sg_client() is not None,
        }
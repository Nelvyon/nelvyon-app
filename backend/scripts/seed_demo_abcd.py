#!/usr/bin/env python3
"""
BLOCK DEMO-SEED-ABCD-1 — Seed / reset reproducible para demo A+B+C+D.

Uso (desde el directorio backend, con venv y variables como en README-dev):
  python scripts/seed_demo_abcd.py
  python scripts/seed_demo_abcd.py --reset

Requiere DATABASE_URL y usuario demo (por defecto ADMIN_USER_ID + ADMIN_USER_EMAIL o ADMIN_EMAIL).
No toca Billing ni datos fuera de los workspaces demo W1/W2 (slugs fijos).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("ENVIRONMENT", "development")

from sqlalchemy import delete, select  # noqa: E402

from core.database import db_manager  # noqa: E402
from models.auth import User  # noqa: E402
from models.campaigns import Campaigns  # noqa: E402
from models.contacts import Contacts  # noqa: E402
from models.conversations import Conversations  # noqa: E402
from models.deals import Deals  # noqa: E402
from models.helpdesk_tickets import Helpdesk_tickets  # noqa: E402
from models.messages import Messages  # noqa: E402
from models.workflow_rules import WorkflowExecutions, WorkflowRules  # noqa: E402
from models.workflows import Workflows  # noqa: E402
from models.workspace_members import Workspace_members  # noqa: E402
from models.workspaces import Workspaces  # noqa: E402
from services.database import initialize_database  # noqa: E402

DEMO_SLUG_W1 = "nelvyon-demo-w1"
DEMO_SLUG_W2 = "nelvyon-demo-w2"
DEMO_NAME_W1 = "NELVYON - Workspace A"
DEMO_NAME_W2 = "NELVYON - Workspace B"
MARKER_EMAIL = "demo-abcd-marker@nelvyon.local"


def _demo_user() -> tuple[str, str]:
    uid = (
        os.getenv("DEMO_SEED_USER_ID")
        or os.getenv("ADMIN_USER_ID")
        or os.getenv("ADMIN_EMAIL", "qa@nelvyon.local")
    ).strip()
    email = (
        os.getenv("DEMO_SEED_USER_EMAIL")
        or os.getenv("ADMIN_USER_EMAIL")
        or os.getenv("ADMIN_EMAIL", "qa@nelvyon.local")
    ).strip()
    return uid, email


async def _ensure_user(session, user_id: str, email: str) -> None:
    r = await session.execute(select(User).where(User.id == user_id))
    u = r.scalar_one_or_none()
    if u:
        u.email = email
        u.role = "super_admin"
        u.name = u.name or "Demo Nelvyon"
    else:
        session.add(
            User(
                id=user_id,
                email=email,
                name="Demo Nelvyon",
                role="super_admin",
                last_login=datetime.now(timezone.utc),
            )
        )
    await session.commit()


async def _resolve_demo_workspace_ids(session, user_id: str) -> list[int]:
    r = await session.execute(
        select(Workspaces.id).where(
            Workspaces.user_id == user_id,
            Workspaces.slug.in_((DEMO_SLUG_W1, DEMO_SLUG_W2)),
        )
    )
    return list(r.scalars().all())


async def _reset_demo_workspaces(session, user_id: str) -> None:
    w_ids = await _resolve_demo_workspace_ids(session, user_id)
    if not w_ids:
        return

    conv_ids = list(
        (
            await session.execute(select(Conversations.id).where(Conversations.workspace_id.in_(w_ids)))
        ).scalars().all()
    )
    if conv_ids:
        await session.execute(delete(Messages).where(Messages.conversation_id.in_(conv_ids)))
    await session.execute(delete(Conversations).where(Conversations.workspace_id.in_(w_ids)))

    rule_ids = list(
        (
            await session.execute(select(WorkflowRules.id).where(WorkflowRules.workspace_id.in_(w_ids)))
        ).scalars().all()
    )
    await session.execute(delete(WorkflowExecutions).where(WorkflowExecutions.workspace_id.in_(w_ids)))
    if rule_ids:
        await session.execute(delete(WorkflowExecutions).where(WorkflowExecutions.rule_id.in_(rule_ids)))
    await session.execute(delete(WorkflowRules).where(WorkflowRules.workspace_id.in_(w_ids)))

    await session.execute(delete(Helpdesk_tickets).where(Helpdesk_tickets.workspace_id.in_(w_ids)))
    await session.execute(delete(Deals).where(Deals.workspace_id.in_(w_ids)))
    await session.execute(delete(Contacts).where(Contacts.workspace_id.in_(w_ids)))
    await session.execute(delete(Campaigns).where(Campaigns.workspace_id.in_(w_ids)))
    await session.execute(delete(Workflows).where(Workflows.workspace_id.in_(w_ids)))
    await session.execute(delete(Workspace_members).where(Workspace_members.workspace_id.in_(w_ids)))
    await session.execute(delete(Workspaces).where(Workspaces.id.in_(w_ids)))
    await session.commit()


async def _already_seeded(session, user_id: str, w1_id: int) -> bool:
    r = await session.execute(
        select(Contacts.id).where(
            Contacts.workspace_id == w1_id,
            Contacts.user_id == user_id,
            Contacts.email == MARKER_EMAIL,
        )
    )
    return r.scalar_one_or_none() is not None


async def _seed(session, user_id: str) -> tuple[int, int]:
    now = datetime.now(timezone.utc)

    w1 = Workspaces(
        user_id=user_id,
        name=DEMO_NAME_W1,
        slug=DEMO_SLUG_W1,
        status="active",
        plan="pro",
        created_at=now,
    )
    w2 = Workspaces(
        user_id=user_id,
        name=DEMO_NAME_W2,
        slug=DEMO_SLUG_W2,
        status="active",
        plan="pro",
        created_at=now,
    )
    session.add(w1)
    session.add(w2)
    await session.flush()
    w1_id, w2_id = w1.id, w2.id

    # --- A CRM ---
    c1 = Contacts(
        user_id=user_id,
        workspace_id=w1_id,
        first_name="Alex",
        last_name="Demo",
        email=MARKER_EMAIL,
        company_name="Acme Demo",
        status="active",
        source="demo_seed",
        score=80,
        created_at=now,
        updated_at=now,
    )
    c2 = Contacts(
        user_id=user_id,
        workspace_id=w1_id,
        first_name="Blanca",
        last_name="Pipeline",
        email="blanca.pipeline@nelvyon.local",
        status="active",
        source="demo_seed",
        created_at=now,
        updated_at=now,
    )
    c3 = Contacts(
        user_id=user_id,
        workspace_id=w2_id,
        first_name="Carlos",
        last_name="Workspace B",
        email="carlos.w2@nelvyon.local",
        status="active",
        source="demo_seed",
        created_at=now,
        updated_at=now,
    )
    session.add_all([c1, c2, c3])
    await session.flush()

    session.add_all(
        [
            Deals(
                user_id=user_id,
                workspace_id=w1_id,
                contact_id=c1.id,
                title="Deal - Lead",
                value=1200.0,
                stage="lead",
                currency="EUR",
                created_at=now,
                updated_at=now,
            ),
            Deals(
                user_id=user_id,
                workspace_id=w1_id,
                contact_id=c2.id,
                title="Deal - Propuesta",
                value=8500.0,
                stage="proposal",
                currency="EUR",
                created_at=now,
                updated_at=now,
            ),
            Deals(
                user_id=user_id,
                workspace_id=w1_id,
                contact_id=c1.id,
                title="Deal - Ganado",
                value=15000.0,
                stage="closed_won",
                currency="EUR",
                created_at=now,
                updated_at=now,
            ),
        ]
    )

    # --- B workflows entidad + regla motor ---
    nodes = json.dumps({"trigger_config": "{}", "actions": "[]"}, default=str)
    session.add(
        Workflows(
            user_id=user_id,
            workspace_id=w1_id,
            name="Demo - Workflow entidad",
            description="Seed DEMO-ABCD",
            trigger_type="manual",
            nodes_json=nodes,
            status="active",
            runs_count=0,
            created_at=now,
        )
    )
    session.add(
        WorkflowRules(
            user_id=user_id,
            workspace_id=w1_id,
            name="Demo — Regla manual",
            description="Crea actividad de prueba",
            trigger_type="manual",
            trigger_config="{}",
            action_type="create_activity",
            action_config=json.dumps({"title": "Actividad demo"}),
            is_active=True,
            runs_count=0,
        )
    )

    session.add_all(
        [
            Campaigns(
                user_id=user_id,
                workspace_id=w1_id,
                name="Demo — Campaña borrador",
                type="email",
                status="draft",
                subject="Lanzamiento Q2",
                content="Cuerpo de campaña demo.",
                recipients_count=0,
                sent_count=0,
                created_at=now,
            ),
            Campaigns(
                user_id=user_id,
                workspace_id=w1_id,
                name="Demo — Campaña enviada",
                type="email",
                status="sent",
                subject="Newsletter demo",
                content="Gracias por confiar en Nelvyon.",
                recipients_count=50,
                sent_count=48,
                open_count=12,
                created_at=now,
            ),
        ]
    )

    # --- C Inbox ---
    conv = Conversations(
        user_id=user_id,
        workspace_id=w1_id,
        contact_name="Cliente Inbox Demo",
        channel="web",
        subject="Conversacion demo A-C (W1)",
        last_message="Hola, necesito ayuda con el CRM",
        last_message_at=now,
        status="open",
        unread_count=1,
        priority="medium",
        created_at=now,
    )
    session.add(conv)
    await session.flush()
    session.add(
        Messages(
            user_id=user_id,
            workspace_id=w1_id,
            conversation_id=conv.id,
            sender_type="customer",
            sender_name="Cliente Demo",
            content="Primer mensaje del hilo demo.",
            channel="web",
            status="delivered",
            created_at=now,
        )
    )
    session.add(
        Messages(
            user_id=user_id,
            workspace_id=w1_id,
            conversation_id=conv.id,
            sender_type="agent",
            sender_name="Agente Demo",
            content="Gracias, te ayudamos enseguida.",
            channel="web",
            status="sent",
            created_at=now,
        )
    )

    # --- W2: mini A+B+C+D para demo al cambiar workspace ---
    session.add(
        Deals(
            user_id=user_id,
            workspace_id=w2_id,
            contact_id=c3.id,
            title="Deal W2 - Calificado",
            value=3200.0,
            stage="qualified",
            currency="EUR",
            created_at=now,
            updated_at=now,
        )
    )
    session.add(
        Workflows(
            user_id=user_id,
            workspace_id=w2_id,
            name="Demo W2 - Workflow entidad",
            description="Seed DEMO-ABCD workspace B",
            trigger_type="manual",
            nodes_json=nodes,
            status="active",
            runs_count=0,
            created_at=now,
        )
    )
    session.add(
        Campaigns(
            user_id=user_id,
            workspace_id=w2_id,
            name="Demo W2 - Campaña borrador",
            type="email",
            status="draft",
            subject="Onboarding clientes W2",
            content="Borrador demo workspace B.",
            recipients_count=0,
            sent_count=0,
            created_at=now,
        )
    )
    conv_w2 = Conversations(
        user_id=user_id,
        workspace_id=w2_id,
        contact_name="Cliente Inbox Demo W2",
        channel="email",
        subject="Conversacion demo W2",
        last_message="Seguimiento desde workspace B",
        last_message_at=now,
        status="open",
        unread_count=0,
        priority="low",
        created_at=now,
    )
    session.add(conv_w2)
    await session.flush()
    session.add(
        Messages(
            user_id=user_id,
            workspace_id=w2_id,
            conversation_id=conv_w2.id,
            sender_type="customer",
            sender_name="Cliente W2",
            content="Hola, confirmamos la reunion.",
            channel="email",
            status="delivered",
            created_at=now,
        )
    )
    session.add(
        Messages(
            user_id=user_id,
            workspace_id=w2_id,
            conversation_id=conv_w2.id,
            sender_type="agent",
            sender_name="Equipo Demo",
            content="Perfecto, nos vemos alli.",
            channel="email",
            status="sent",
            created_at=now,
        )
    )
    session.add_all(
        [
            Helpdesk_tickets(
                user_id=user_id,
                workspace_id=w2_id,
                subject="[DEMO W2] Ticket abierto",
                description="Cola visible en workspace B.",
                status="open",
                priority="high",
                category="General",
                channel="email",
                created_at=now - timedelta(hours=1),
                first_response_minutes=None,
            ),
            Helpdesk_tickets(
                user_id=user_id,
                workspace_id=w2_id,
                subject="[DEMO W2] Ticket resuelto",
                description="Cerrado para metricas resueltos.",
                status="resolved",
                priority="low",
                category="General",
                channel="web",
                created_at=now - timedelta(days=2),
                first_response_minutes=12,
                resolved_at=now - timedelta(days=1),
            ),
        ]
    )

    # --- D Helpdesk (breach + warning + ok) ---
    old = now - timedelta(minutes=400)  # > medium first_response 240 → breach
    mid = now - timedelta(minutes=200)  # entre 80% y 100% de 240 → warning first_response
    recent = now - timedelta(minutes=30)

    session.add_all(
        [
            Helpdesk_tickets(
                user_id=user_id,
                workspace_id=w1_id,
                subject="[DEMO] SLA breach - sin primera respuesta",
                description="Ticket antiguo abierto para forzar breach de primera respuesta.",
                status="open",
                priority="medium",
                category="General",
                channel="web",
                created_at=old,
                first_response_minutes=None,
            ),
            Helpdesk_tickets(
                user_id=user_id,
                workspace_id=w1_id,
                subject="[DEMO] SLA warning - cerca del limite",
                description="Abierto hace ~200 min, prioridad medium.",
                status="open",
                priority="medium",
                category="General",
                channel="web",
                created_at=mid,
                first_response_minutes=None,
            ),
            Helpdesk_tickets(
                user_id=user_id,
                workspace_id=w1_id,
                subject="[DEMO] Ticket en curso",
                description="Asignado con primera respuesta registrada.",
                status="in_progress",
                priority="low",
                category="General",
                channel="web",
                created_at=recent,
                first_response_minutes=5,
                assigned_to="demo-agent",
            ),
        ]
    )

    await session.commit()
    return w1_id, w2_id


async def main_async(reset: bool) -> None:
    await initialize_database()
    user_id, email = _demo_user()
    async with db_manager.async_session_maker() as session:
        await _ensure_user(session, user_id, email)

        if reset:
            await _reset_demo_workspaces(session, user_id)
        else:
            w1_row = (
                await session.execute(
                    select(Workspaces).where(
                        Workspaces.user_id == user_id,
                        Workspaces.slug == DEMO_SLUG_W1,
                    )
                )
            ).scalar_one_or_none()
            if w1_row and await _already_seeded(session, user_id, w1_row.id):
                print(
                    "Demo ABCD ya presente (marker contact). "
                    "Usa --reset para borrar y volver a cargar.",
                    file=sys.stderr,
                )
                return
            if w1_row:
                await _reset_demo_workspaces(session, user_id)

        w1_id, w2_id = await _seed(session, user_id)
        print(
            json.dumps(
                {
                    "ok": True,
                    "user_id": user_id,
                    "user_email": email,
                    "workspace_w1": {"id": w1_id, "name": DEMO_NAME_W1, "slug": DEMO_SLUG_W1},
                    "workspace_w2": {"id": w2_id, "name": DEMO_NAME_W2, "slug": DEMO_SLUG_W2},
                },
                indent=2,
                ensure_ascii=False,
            )
        )


def main() -> None:
    p = argparse.ArgumentParser(description="Seed demo A+B+C+D (NELVYON)")
    p.add_argument(
        "--reset",
        action="store_true",
        help="Elimina solo los workspaces demo W1/W2 y sus datos, y vuelve a sembrar.",
    )
    args = p.parse_args()
    asyncio.run(main_async(reset=args.reset))


if __name__ == "__main__":
    main()

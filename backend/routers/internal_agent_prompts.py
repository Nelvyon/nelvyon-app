"""Internal-only agent prompt vault — never exposed to public clients."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.agent_prompt_service import get_agent_prompt_service

router = APIRouter(prefix="/api/internal/agent-prompts", tags=["internal"])


def _verify_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    expected = os.environ.get("INTERNAL_AGENT_PROMPT_SECRET", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Vault unavailable")
    if (x_internal_secret or "").strip() != expected:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/{agent_id}")
async def get_agent_prompts(
    agent_id: str,
    _: None = Depends(_verify_internal_secret),
    db: AsyncSession = Depends(get_db),
):
    svc = get_agent_prompt_service(db)
    try:
        return await svc.get_prompt_payload(agent_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Not found") from None
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Vault unavailable") from None

"""Request models for agent streaming endpoints."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AgentStreamRequest(BaseModel):
    messages: List[Dict[str, Any]]
    service_id: Optional[str] = None
    client_id: Optional[str] = None
    client_context: Optional[Dict[str, Any]] = None
    model: Optional[str] = Field(
        default=None,
        description="OpenAI-compatible model id; defaults to APP_AI_MODEL or gpt-4o",
    )

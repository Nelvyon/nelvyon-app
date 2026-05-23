"""Social platform publisher result types."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class PublishResult:
    success: bool
    platform_post_id: str | None = None
    error: str | None = None
    pending_auth: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "platform_post_id": self.platform_post_id,
            "error": self.error,
            "pending_auth": self.pending_auth,
        }

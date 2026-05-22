"""Amazon SES API — cold email send, bulk, stats, domain verification."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from dependencies.workspace import WorkspaceContext, require_workspace
from services.ses_service import get_ses_service

router = APIRouter(prefix="/api/ses", tags=["ses"])


class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=1, max_length=998)
    html_body: str = Field(..., min_length=1)
    from_email: Optional[EmailStr] = None


class BulkRecipient(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=1, max_length=998)
    html_body: str = Field(..., min_length=1)
    from_email: Optional[EmailStr] = None


class BulkSendRequest(BaseModel):
    recipients: List[BulkRecipient] = Field(..., min_length=1, max_length=5000)


class VerifyDomainRequest(BaseModel):
    domain: str = Field(..., min_length=3, max_length=253)


@router.post("/send")
async def send_email(
    body: SendEmailRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Send a single cold email via Amazon SES."""
    service = get_ses_service()
    try:
        return await service.send_email(
            to=str(body.to),
            subject=body.subject.strip(),
            html_body=body.html_body,
            from_email=str(body.from_email) if body.from_email else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES send failed: {e}",
        ) from e


@router.post("/bulk")
async def send_bulk_emails(
    body: BulkSendRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Send cold emails in batches of 50."""
    service = get_ses_service()
    recipients = [
        {
            "to": str(r.to),
            "subject": r.subject.strip(),
            "html_body": r.html_body,
            "from_email": str(r.from_email) if r.from_email else None,
        }
        for r in body.recipients
    ]
    try:
        return await service.send_bulk_emails(recipients)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES bulk send failed: {e}",
        ) from e


@router.get("/stats")
async def get_sending_stats(
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Return SES send statistics (delivery/bounce/complaint aggregates)."""
    service = get_ses_service()
    try:
        return await service.get_sending_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES stats failed: {e}",
        ) from e


@router.post("/verify-domain")
async def verify_domain(
    body: VerifyDomainRequest,
    _ctx: WorkspaceContext = Depends(require_workspace),
) -> Dict[str, Any]:
    """Start SES domain identity verification (add DNS TXT record from response)."""
    service = get_ses_service()
    try:
        return await service.verify_domain(body.domain.strip())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES domain verification failed: {e}",
        ) from e

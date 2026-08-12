"""Amazon SES API — cold email send, bulk, stats, domain verification."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from dependencies.auth import get_super_admin_user
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from schemas.auth import UserResponse
from core.messaging_integration import assert_workspace_email_sender
from services.ses_service import get_ses_service

router = APIRouter(prefix="/api/ses", tags=["ses"])


class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=1, max_length=998)
    html_body: str = Field(..., min_length=1)
    # `from_email` YA NO se acepta del cuerpo. Lo elegia quien llamaba, sin
    # comprobar que el workspace tuviera derecho a esa direccion: servia para
    # suplantar tanto a otro tenant como a NELVYON. La identidad remitente sale
    # ahora de la integracion verificada del workspace.


class BulkRecipient(BaseModel):
    to: EmailStr
    subject: str = Field(..., min_length=1, max_length=998)
    html_body: str = Field(..., min_length=1)


class BulkSendRequest(BaseModel):
    recipients: List[BulkRecipient] = Field(..., min_length=1, max_length=5000)


class VerifyDomainRequest(BaseModel):
    domain: str = Field(..., min_length=3, max_length=253)


@router.post("/send")
async def send_email(
    body: SendEmailRequest,
    ctx: WorkspaceContext = Depends(require_workspace_operator),
) -> Dict[str, Any]:
    """Send a single cold email via Amazon SES."""
    # El email en frio va dirigido a los prospectos DEL CLIENTE, asi que la
    # identidad remitente es del cliente. Sin remitente propio se corta antes de
    # instanciar el cliente SES: no se cae a SES_FROM_EMAIL.
    remitente = await assert_workspace_email_sender(ctx.workspace_id)
    service = get_ses_service()
    try:
        return await service.send_email(
            to=str(body.to),
            subject=body.subject.strip(),
            html_body=body.html_body,
            from_email=remitente.from_email,
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
    ctx: WorkspaceContext = Depends(require_workspace_operator),
) -> Dict[str, Any]:
    """Send cold emails in batches of 50."""
    remitente = await assert_workspace_email_sender(ctx.workspace_id)
    service = get_ses_service()
    recipients = [
        {
            "to": str(r.to),
            "subject": r.subject.strip(),
            "html_body": r.html_body,
            "from_email": remitente.from_email,
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
    # Cuenta SES CORPORATIVA: cuota, reputacion, supresiones e identidades
    # verificadas son de la cuenta unica de NELVYON, no del workspace. Un rol
    # de workspace no acredita autoridad sobre ella, ni para leer: agregarian
    # el envio de todos los tenants.
    _admin: UserResponse = Depends(get_super_admin_user),
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
    # Verificar un dominio ANADE una identidad a la cuenta SES de NELVYON, y no
    # queda registro de que workspace la posee. Mientras esa relacion no exista,
    # es una operacion de plataforma, no de workspace.
    _admin: UserResponse = Depends(get_super_admin_user),
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


@router.get("/suppressions")
async def list_suppressions(
    limit: int = 200,
    # Cuenta SES CORPORATIVA: cuota, reputacion, supresiones e identidades
    # verificadas son de la cuenta unica de NELVYON, no del workspace. Un rol
    # de workspace no acredita autoridad sobre ella, ni para leer: agregarian
    # el envio de todos los tenants.
    _admin: UserResponse = Depends(get_super_admin_user),
) -> Dict[str, Any]:
    """List suppressed email addresses (bounces/complaints)."""
    service = get_ses_service()
    return {"suppressions": await service.list_suppressions(limit=limit)}


@router.get("/reputation")
async def get_reputation(
    # Cuenta SES CORPORATIVA: cuota, reputacion, supresiones e identidades
    # verificadas son de la cuenta unica de NELVYON, no del workspace. Un rol
    # de workspace no acredita autoridad sobre ella, ni para leer: agregarian
    # el envio de todos los tenants.
    _admin: UserResponse = Depends(get_super_admin_user),
) -> Dict[str, Any]:
    """SES sending reputation and bounce rate."""
    service = get_ses_service()
    try:
        return await service.get_reputation()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SES reputation failed: {e}",
        ) from e

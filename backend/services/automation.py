import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.automation_jobs import Automation_jobs
from models.automation_webhooks import Automation_webhooks
from models.nelvyon_clients import Nelvyon_clients
from models.nelvyon_projects import Nelvyon_projects
from models.nelvyon_outputs import Nelvyon_outputs
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage

logger = logging.getLogger(__name__)

VOLUME_MODEL = "deepseek-v3.2"

JOB_TYPE_PROMPTS = {
    "web": "Genera una estructura web profesional con SEO optimizado, hero section, servicios, testimonios, FAQ y contacto.",
    "ecommerce": "Genera una tienda online con catálogo de productos, carrito, checkout optimizado y fichas de producto persuasivas.",
    "social": "Genera contenido para redes sociales: Instagram, Facebook, LinkedIn, TikTok, X/Twitter con hooks, captions y hashtags.",
    "ads": "Genera campañas publicitarias para Meta Ads, Google Ads, LinkedIn Ads y TikTok Ads con variantes A/B.",
    "email": "Genera campañas de email marketing con secuencias automatizadas, subject lines A/B y copy de conversión.",
    "funnel": "Genera un embudo de venta completo con landing page, optin, sales page, checkout, upsell y thank you page.",
    "branding": "Genera identidad de marca completa: logo concept, paleta de colores, tipografía, tono de voz y aplicaciones.",
    "audit": "Genera una auditoría digital completa: SEO, web, social media, ads, branding y competencia.",
    "proposal": "Genera una propuesta comercial premium con diagnóstico, servicios recomendados, inversión y ROI proyectado.",
    "custom": "Genera contenido personalizado según las instrucciones del cliente.",
}

SYSTEM_PROMPT = """ERES EL MOTOR DE AUTOMATIZACIÓN MÁS AVANZADO DEL MUNDO PARA MARKETING DIGITAL.
Tu output debe ser PROFESIONAL, PERSONALIZADO y listo para entregar al cliente.

REGLAS:
1. PERSONALIZACIÓN: Cada palabra debe reflejar el negocio específico del cliente
2. CERO GENÉRICOS: Prohibido frases vacías como "líder en el sector"
3. COPY DE CONVERSIÓN: Cada frase debe mover al usuario hacia la acción
4. ESTRUCTURA CLARA: Usa JSON válido con secciones bien organizadas
5. CALIDAD PREMIUM: Output listo para entregar sin edición adicional

Responde SOLO en JSON válido."""


class AutomationService:
    """Core automation pipeline service for NELVYON OS."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._ai: Optional[AIHubService] = None

    @property
    def ai(self) -> AIHubService:
        """Lazy-init: stats/list/retry paths must not require APP_AI_* env vars."""
        if self._ai is None:
            self._ai = AIHubService()
        return self._ai

    async def get_client(
        self, client_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Optional[Nelvyon_clients]:
        conds = [
            Nelvyon_clients.id == client_id,
            Nelvyon_clients.user_id == user_id,
        ]
        if workspace_id is not None:
            conds.append(Nelvyon_clients.workspace_id == workspace_id)
        result = await self.db.execute(select(Nelvyon_clients).where(*conds))
        return result.scalar_one_or_none()

    async def get_client_by_id_no_auth(self, client_id: int) -> Optional[Nelvyon_clients]:
        """Get client without user auth check (for webhook processing)."""
        result = await self.db.execute(
            select(Nelvyon_clients).where(Nelvyon_clients.id == client_id)
        )
        return result.scalar_one_or_none()

    def build_client_context(self, client: Nelvyon_clients) -> str:
        parts = [f"NEGOCIO: {client.business_name}", f"SECTOR: {client.sector}"]
        for field, label in [
            ("country", "PAÍS"), ("city", "CIUDAD"), ("ideal_customer", "CLIENTE IDEAL"),
            ("value_proposition", "PROPUESTA DE VALOR"), ("differentiator", "DIFERENCIADOR"),
            ("services", "SERVICIOS"), ("objectives", "OBJETIVOS"), ("brand_tone", "TONO"),
            ("visual_style", "ESTILO VISUAL"), ("brand_colors", "COLORES"),
            ("competition", "COMPETENCIA"), ("language", "IDIOMA"), ("market", "MERCADO"),
        ]:
            val = getattr(client, field, None)
            if val:
                parts.append(f"{label}: {val}")
        return "\n".join(parts)

    async def process_job(
        self,
        user_id: str,
        client_id: int,
        job_type: str,
        input_data: Optional[str] = None,
        source: str = "manual",
        webhook_id: Optional[str] = None,
        priority: str = "normal",
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Core pipeline: create job → AI generate → save output → return result."""
        start_time = time.time()

        if source != "webhook":
            client = await self.get_client(client_id, user_id, workspace_id)
        else:
            client = await self.get_client_by_id_no_auth(client_id)
        client_name = client.business_name if client else "Cliente desconocido"

        # Create the job record
        job = Automation_jobs(
            user_id=user_id,
            workspace_id=workspace_id,
            client_id=client_id,
            client_name=client_name,
            job_type=job_type,
            status="processing",
            input_data=input_data or "{}",
            output_data="",
            source=source,
            webhook_id=webhook_id or "",
            priority=priority,
            error_message="",
            processing_time_ms=0,
            created_at=datetime.now(),
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        try:
            if not client:
                raise ValueError(f"Cliente ID {client_id} no encontrado")

            ctx = self.build_client_context(client)
            lang = client.language or "es"
            type_prompt = JOB_TYPE_PROMPTS.get(job_type, JOB_TYPE_PROMPTS["custom"])

            extra_instructions = ""
            if input_data:
                try:
                    parsed = json.loads(input_data)
                    if isinstance(parsed, dict) and parsed.get("instructions"):
                        extra_instructions = f"\n\nINSTRUCCIONES ADICIONALES DEL CLIENTE:\n{parsed['instructions']}"
                except (json.JSONDecodeError, TypeError):
                    extra_instructions = f"\n\nINSTRUCCIONES ADICIONALES:\n{input_data}"

            user_prompt = f"""PERFIL DEL CLIENTE:
{ctx}

TIPO DE TRABAJO: {job_type}
TAREA: {type_prompt}
IDIOMA: {lang}
{extra_instructions}

Genera el contenido COMPLETO y PROFESIONAL en JSON válido."""

            request = GenTxtRequest(
                messages=[
                    ChatMessage(role="system", content=SYSTEM_PROMPT),
                    ChatMessage(role="user", content=user_prompt),
                ],
                model=VOLUME_MODEL,
            )
            response = await self.ai.gentxt(request)
            content = response.content

            elapsed_ms = int((time.time() - start_time) * 1000)

            # Save output
            output = Nelvyon_outputs(
                user_id=user_id,
                workspace_id=workspace_id,
                project_id=0,
                client_id=client_id,
                output_type=job_type,
                title=f"Auto: {job_type} — {client_name}",
                content=content,
                qa_score=0,
                qa_status="pending",
                qa_feedback="",
                qa_attempts=0,
                version=1,
                extra_data=json.dumps({"source": source, "job_id": job.id}),
                created_at=datetime.now(),
            )
            self.db.add(output)
            await self.db.commit()
            await self.db.refresh(output)

            # Update job
            job.status = "completed"
            job.output_data = content[:5000]
            job.output_id = output.id
            job.processing_time_ms = elapsed_ms
            job.delivered_at = datetime.now().isoformat()
            await self.db.commit()

            return {
                "job_id": job.id,
                "status": "completed",
                "output_id": output.id,
                "content": content,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.processing_time_ms = elapsed_ms
            await self.db.commit()
            logger.error(f"Automation job {job.id} failed: {e}", exc_info=True)
            raise

    async def get_jobs(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        job_type: Optional[str] = None,
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """List automation jobs with filters."""
        query = select(Automation_jobs).where(Automation_jobs.user_id == user_id)
        count_query = select(func.count(Automation_jobs.id)).where(Automation_jobs.user_id == user_id)
        if workspace_id is not None:
            query = query.where(Automation_jobs.workspace_id == workspace_id)
            count_query = count_query.where(Automation_jobs.workspace_id == workspace_id)

        if status:
            query = query.where(Automation_jobs.status == status)
            count_query = count_query.where(Automation_jobs.status == status)
        if job_type:
            query = query.where(Automation_jobs.job_type == job_type)
            count_query = count_query.where(Automation_jobs.job_type == job_type)

        query = query.order_by(Automation_jobs.id.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        jobs = result.scalars().all()

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        return {
            "items": [
                {
                    "id": j.id,
                    "client_id": j.client_id,
                    "client_name": j.client_name or "",
                    "job_type": j.job_type,
                    "status": j.status,
                    "source": j.source or "manual",
                    "priority": j.priority or "normal",
                    "processing_time_ms": j.processing_time_ms or 0,
                    "error_message": j.error_message or "",
                    "output_id": j.output_id,
                    "created_at": str(j.created_at) if j.created_at else "",
                    "delivered_at": j.delivered_at or "",
                }
                for j in jobs
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def get_stats(self, user_id: str, workspace_id: Optional[int] = None) -> Dict[str, Any]:
        """Get automation dashboard stats."""
        base = select(func.count(Automation_jobs.id)).where(Automation_jobs.user_id == user_id)
        if workspace_id is not None:
            base = base.where(Automation_jobs.workspace_id == workspace_id)

        total_r = await self.db.execute(base)
        total = total_r.scalar() or 0

        completed_r = await self.db.execute(base.where(Automation_jobs.status == "completed"))
        completed = completed_r.scalar() or 0

        pending_r = await self.db.execute(
            select(func.count(Automation_jobs.id)).where(
                Automation_jobs.user_id == user_id,
                Automation_jobs.status.in_(["pending", "processing"]),
                *(
                    [Automation_jobs.workspace_id == workspace_id]
                    if workspace_id is not None
                    else []
                ),
            )
        )
        pending = pending_r.scalar() or 0

        failed_r = await self.db.execute(
            select(func.count(Automation_jobs.id)).where(
                Automation_jobs.user_id == user_id,
                Automation_jobs.status == "failed",
                *(
                    [Automation_jobs.workspace_id == workspace_id]
                    if workspace_id is not None
                    else []
                ),
            )
        )
        failed = failed_r.scalar() or 0

        avg_r = await self.db.execute(
            select(func.avg(Automation_jobs.processing_time_ms)).where(
                Automation_jobs.user_id == user_id,
                Automation_jobs.status == "completed",
                *(
                    [Automation_jobs.workspace_id == workspace_id]
                    if workspace_id is not None
                    else []
                ),
            )
        )
        avg_time = avg_r.scalar() or 0

        return {
            "total_jobs": total,
            "completed": completed,
            "pending": pending,
            "failed": failed,
            "average_processing_ms": int(avg_time),
            "success_rate": round((completed / total * 100) if total > 0 else 0, 1),
        }

    async def retry_job(
        self, job_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Retry a failed job (scoped to workspace when provided)."""
        conds = [
            Automation_jobs.id == job_id,
            Automation_jobs.user_id == user_id,
        ]
        if workspace_id is not None:
            conds.append(Automation_jobs.workspace_id == workspace_id)
        result = await self.db.execute(select(Automation_jobs).where(*conds))
        job = result.scalar_one_or_none()
        if not job:
            raise ValueError("Job no encontrado")
        if job.status != "failed":
            raise ValueError("Solo se pueden reintentar jobs fallidos")

        job_ws = job.workspace_id if job.workspace_id is not None else workspace_id
        return await self.process_job(
            user_id=user_id,
            client_id=job.client_id or 0,
            job_type=job.job_type,
            input_data=job.input_data,
            source="retry",
            priority=job.priority or "normal",
            workspace_id=job_ws,
        )

    async def trigger_webhook(self, webhook_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a webhook trigger (no auth required)."""
        result = await self.db.execute(
            select(Automation_webhooks).where(
                Automation_webhooks.webhook_key == webhook_key,
                Automation_webhooks.is_active == True,
            )
        )
        webhook = result.scalar_one_or_none()
        if not webhook:
            raise ValueError("Webhook no encontrado o inactivo")

        # Update webhook stats
        webhook.total_calls = (webhook.total_calls or 0) + 1
        webhook.last_called_at = datetime.now().isoformat()
        await self.db.commit()

        client_id = int(payload.get("client_id") or 0)
        job_type = payload.get("job_type", webhook.job_type or "custom")
        input_data = json.dumps(payload.get("data", {}))

        client = await self.get_client_by_id_no_auth(client_id)
        if not client:
            raise ValueError("Cliente no encontrado")
        if webhook.workspace_id is not None:
            if client.workspace_id != webhook.workspace_id:
                raise ValueError("Cliente no pertenece al workspace del webhook")
        else:
            if str(client.user_id) != str(webhook.user_id):
                raise ValueError("Cliente no autorizado para este webhook")
        ws_for_job = (
            webhook.workspace_id
            if webhook.workspace_id is not None
            else client.workspace_id
        )

        return await self.process_job(
            user_id=webhook.user_id,
            client_id=client_id,
            job_type=job_type,
            input_data=input_data,
            source="webhook",
            webhook_id=webhook.webhook_key,
            priority=payload.get("priority", "normal"),
            workspace_id=ws_for_job,
        )
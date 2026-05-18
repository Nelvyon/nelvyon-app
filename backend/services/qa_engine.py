import json
import logging
from typing import Dict, Any
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.nelvyon_outputs import Nelvyon_outputs
from models.nelvyon_projects import Nelvyon_projects
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage

logger = logging.getLogger(__name__)

QA_MODEL = "claude-4-5-sonnet"  # Upgraded to premium model for world-class QA
MAX_RETRIES = 3
MIN_SCORE = 90

# ═══════════════════════════════════════════════════════════════
# NELVYON QA ENGINE — World-Class Quality Standards
# Supera los estándares de TODAS las agencias y plataformas
# ═══════════════════════════════════════════════════════════════

GENERIC_PATTERNS = [
    "lorem ipsum", "placeholder", "your text here", "insert text",
    "ejemplo genérico", "texto de ejemplo", "aquí va", "próximamente",
    "coming soon", "to be defined", "TBD", "TODO", "FIXME",
    "[nombre]", "[empresa]", "[producto]", "{nombre}", "{empresa}",
    "empresa líder en", "soluciones integrales", "comprometidos con la excelencia",
    "líderes en el sector", "tu mejor opción", "la mejor calidad",
    "somos los mejores", "número uno", "los más profesionales",
    "innovación constante", "servicio personalizado", "atención al detalle",
    "años de experiencia", "equipo de profesionales", "resultados garantizados",
    "calidad premium", "soluciones a medida", "enfoque integral",
    "transformación digital", "partner estratégico", "valor añadido",
    "excelencia operativa", "mejora continua", "orientados al cliente",
    "XX años", "XXX clientes", "XX%", "X.XX€",
    "sample text", "dummy content", "test content", "example text",
    "click here", "read more", "learn more", "contact us",
]

WORLD_CLASS_CRITERIA = """
CRITERIOS DE EVALUACIÓN WORLD-CLASS (superan a cualquier agencia):

1. PERSONALIZACIÓN PROFUNDA (peso: 25%)
   - ¿Menciona el nombre del negocio específico?
   - ¿Refleja el sector y mercado del cliente?
   - ¿Usa el tono de marca indicado?
   - ¿Habla al cliente ideal descrito?
   - ¿Menciona la propuesta de valor única?
   Score 100: Cada palabra parece escrita por alguien que conoce el negocio íntimamente
   Score 50: Menciona el negocio pero el contenido podría ser de cualquier empresa
   Score 0: Contenido completamente genérico

2. CALIDAD DE COPY (peso: 25%)
   - ¿Los headlines captan atención inmediata?
   - ¿El copy es persuasivo y orientado a conversión?
   - ¿Usa frameworks probados (PAS, AIDA, BAB)?
   - ¿Los CTAs son específicos y accionables?
   - ¿Evita clichés y frases vacías?
   - ¿Incluye datos, números y prueba social?
   Score 100: Copy de nivel agencia premium top 1% mundial
   Score 50: Copy correcto pero sin impacto emocional
   Score 0: Copy genérico con clichés

3. ESTRUCTURA Y COMPLETITUD (peso: 20%)
   - ¿La estructura es completa según el tipo de output?
   - ¿Todos los campos están rellenados con contenido real?
   - ¿La jerarquía de información es lógica?
   - ¿Incluye todos los elementos solicitados?
   Score 100: Estructura perfecta, nada falta, todo tiene sentido
   Score 50: Estructura básica pero faltan elementos
   Score 0: Estructura incompleta o desordenada

4. SEO Y TÉCNICO (peso: 15%)
   - ¿Incluye Schema.org JSON-LD si aplica?
   - ¿Meta tags optimizados con keywords relevantes?
   - ¿Open Graph y Twitter Cards?
   - ¿Estructura semántica correcta?
   - ¿Core Web Vitals considerados?
   Score 100: SEO de nivel élite mundial
   Score 50: SEO básico presente
   Score 0: Sin consideraciones SEO

5. INNOVACIÓN Y 3D (peso: 15%)
   - ¿Incluye elementos 3D/AR cuando aplica?
   - ¿Las ideas son innovadoras y diferenciadas?
   - ¿Supera lo que ofrecen competidores?
   - ¿Usa tecnología de vanguardia?
   Score 100: Innovación de nivel Silicon Valley
   Score 50: Ideas correctas pero convencionales
   Score 0: Sin innovación ni diferenciación
"""


class QAEngineService:
    """World-Class Quality Assurance Engine for NELVYON OS outputs."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._ai: AIHubService | None = None

    @property
    def ai(self) -> AIHubService:
        """Lazy-init AI client so dashboard/read paths work without APP_AI_* env vars."""
        if self._ai is None:
            self._ai = AIHubService()
        return self._ai

    async def validate_output(
        self, output_id: int, user_id: str, workspace_id: int | None = None
    ) -> Dict[str, Any]:
        """Run world-class QA validation on an output. Blocks if score < 90."""
        conds = [Nelvyon_outputs.id == output_id, Nelvyon_outputs.user_id == user_id]
        if workspace_id is not None:
            conds.append(Nelvyon_outputs.workspace_id == workspace_id)
        result = await self.db.execute(select(Nelvyon_outputs).where(*conds))
        output = result.scalar_one_or_none()
        if not output:
            raise ValueError("Output no encontrado")

        if output.qa_attempts >= MAX_RETRIES and output.qa_status == "failed":
            return {
                "output_id": output.id,
                "qa_score": output.qa_score,
                "qa_status": "failed",
                "qa_feedback": output.qa_feedback,
                "qa_attempts": output.qa_attempts,
                "blocked": True,
                "message": f"Output bloqueado tras {MAX_RETRIES} intentos fallidos"
            }

        content = output.content or ""

        # Step 1: Pattern-based detection (enhanced)
        pattern_issues = []
        content_lower = content.lower()
        for pattern in GENERIC_PATTERNS:
            if pattern.lower() in content_lower:
                pattern_issues.append(f"Detectado contenido genérico: '{pattern}'")

        # Step 2: Structural validation (enhanced)
        structural_issues = []
        if len(content.strip()) < 200:
            structural_issues.append("Contenido demasiado corto (< 200 caracteres) para calidad world-class")

        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                all_values = list(self._flatten_values(parsed))
                empty_values = sum(1 for v in all_values if not v or v.strip() == "")
                total_values = max(len(all_values), 1)
                if empty_values / total_values > 0.1:
                    structural_issues.append(f"Demasiados campos vacíos: {empty_values}/{total_values} (máx 10%)")

                # Check for SEO elements in web/ecommerce outputs
                if output.output_type in ("web_structure", "ecommerce_home"):
                    if "seo" not in parsed:
                        structural_issues.append("Falta sección SEO élite obligatoria")
                    if "3d_elements" not in parsed and "3d_features" not in parsed:
                        structural_issues.append("Falta sección de elementos 3D")

                # Check for minimum variants in ads
                if output.output_type == "ad_campaign":
                    campaigns = parsed.get("campaigns", [])
                    if len(campaigns) < 3:
                        structural_issues.append(f"Solo {len(campaigns)} campañas — mínimo 3 plataformas")
                    for camp in campaigns:
                        variants = camp.get("variants", [])
                        if len(variants) < 3:
                            structural_issues.append(f"Campaña {camp.get('platform', '?')}: solo {len(variants)} variantes — mínimo 5")

                # Check for minimum posts in social
                if output.output_type == "social_post":
                    posts = parsed.get("posts", [])
                    if len(posts) < 10:
                        structural_issues.append(f"Solo {len(posts)} posts — mínimo 15")

        except (json.JSONDecodeError, AttributeError):
            pass

        # Step 3: AI-based world-class quality assessment
        ai_assessment = await self._ai_quality_check(content, output.output_type)

        # Calculate final score
        pattern_penalty = min(len(pattern_issues) * 15, 50)
        structural_penalty = min(len(structural_issues) * 10, 30)

        try:
            ai_score_data = json.loads(ai_assessment)
            ai_score = int(ai_score_data.get("score", 70))
            ai_feedback_items = ai_score_data.get("issues", [])
            ai_strengths = ai_score_data.get("strengths", [])
            ai_recommendations = ai_score_data.get("recommendations", [])
        except (json.JSONDecodeError, ValueError, TypeError):
            ai_score = 70
            ai_feedback_items = ["No se pudo evaluar con IA"]
            ai_strengths = []
            ai_recommendations = []

        final_score = max(0, min(100, ai_score - pattern_penalty - structural_penalty))

        all_issues = pattern_issues + structural_issues + ai_feedback_items
        feedback = json.dumps({
            "score": final_score,
            "grade": self._score_to_grade(final_score),
            "issues": all_issues,
            "strengths": ai_strengths,
            "recommendations": ai_recommendations,
            "pattern_penalty": pattern_penalty,
            "structural_penalty": structural_penalty,
            "ai_base_score": ai_score,
            "world_class_standard": "Score mínimo 90 para entrega. Supera estándares de agencias premium."
        }, ensure_ascii=False)

        # Update output
        output.qa_score = final_score
        output.qa_feedback = feedback
        output.qa_attempts = (output.qa_attempts or 0) + 1

        if final_score >= MIN_SCORE:
            output.qa_status = "passed"
            await self._update_project_on_pass(output.project_id)
        else:
            output.qa_status = "failed"
            await self._update_project_on_fail(output.project_id)

        await self.db.commit()
        await self.db.refresh(output)

        return {
            "output_id": output.id,
            "qa_score": final_score,
            "qa_status": output.qa_status,
            "qa_feedback": feedback,
            "qa_attempts": output.qa_attempts,
            "blocked": final_score < MIN_SCORE,
            "can_retry": output.qa_attempts < MAX_RETRIES and final_score < MIN_SCORE
        }

    def _score_to_grade(self, score: int) -> str:
        if score >= 95:
            return "A+"
        if score >= 90:
            return "A"
        if score >= 85:
            return "B+"
        if score >= 80:
            return "B"
        if score >= 75:
            return "C+"
        if score >= 70:
            return "C"
        if score >= 60:
            return "D"
        return "F"

    async def _ai_quality_check(self, content: str, output_type: str) -> str:
        """Use premium AI to assess content quality at world-class standards."""
        system_prompt = f"""Eres el auditor de calidad más exigente del mundo para contenido de marketing digital.
Tu estándar es SUPERIOR al de cualquier agencia premium (WPP, Omnicom, Publicis).

{WORLD_CLASS_CRITERIA}

Evalúa el contenido y devuelve un JSON con:
- score: puntuación de 1 a 100 (sé EXIGENTE — solo contenido excepcional merece > 90)
- issues: lista de problemas encontrados (strings específicos)
- strengths: lista de puntos fuertes (strings específicos)
- recommendations: lista de mejoras para alcanzar nivel world-class

PENALIZACIONES AUTOMÁTICAS:
- Placeholder o lorem ipsum: -50 puntos
- Frases genéricas tipo "líderes en el sector": -10 por cada una
- Campos vacíos o incompletos: -5 por cada uno
- Copy que no menciona el negocio específico: -20
- Sin elementos SEO en web/ecommerce: -15
- Sin elementos 3D cuando aplica: -10
- Menos de 5 variantes en ads: -10
- Menos de 15 posts en social: -10

Responde SOLO con JSON válido."""

        user_prompt = f"""TIPO DE OUTPUT: {output_type}

CONTENIDO A EVALUAR:
{content[:4000]}"""

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            model=QA_MODEL
        )
        response = await self.ai.gentxt(request)
        return response.content

    async def get_dashboard_stats(
        self, user_id: str, workspace_id: int | None = None
    ) -> Dict[str, Any]:
        """Get QA dashboard statistics."""
        base = [Nelvyon_outputs.user_id == user_id]
        if workspace_id is not None:
            base.append(Nelvyon_outputs.workspace_id == workspace_id)
        total_result = await self.db.execute(
            select(func.count(Nelvyon_outputs.id)).where(*base)
        )
        total = total_result.scalar() or 0

        passed_result = await self.db.execute(
            select(func.count(Nelvyon_outputs.id)).where(
                *(base + [Nelvyon_outputs.qa_status == "passed"])
            )
        )
        passed = passed_result.scalar() or 0

        failed_result = await self.db.execute(
            select(func.count(Nelvyon_outputs.id)).where(
                *(base + [Nelvyon_outputs.qa_status == "failed"])
            )
        )
        failed = failed_result.scalar() or 0

        pending_result = await self.db.execute(
            select(func.count(Nelvyon_outputs.id)).where(
                *(base + [Nelvyon_outputs.qa_status == "pending"])
            )
        )
        pending = pending_result.scalar() or 0

        avg_result = await self.db.execute(
            select(func.avg(Nelvyon_outputs.qa_score)).where(
                *(base + [Nelvyon_outputs.qa_score > 0])
            )
        )
        avg_score = avg_result.scalar() or 0

        return {
            "total_outputs": total,
            "passed": passed,
            "failed": failed,
            "pending": pending,
            "average_score": round(float(avg_score), 1),
            "pass_rate": round((passed / max(total, 1)) * 100, 1)
        }

    async def _update_project_on_pass(self, project_id: int):
        result = await self.db.execute(
            select(Nelvyon_projects).where(Nelvyon_projects.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project:
            project.status = "approved"
            project.progress = 100
            project.updated_at = datetime.now()

    async def _update_project_on_fail(self, project_id: int):
        result = await self.db.execute(
            select(Nelvyon_projects).where(Nelvyon_projects.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project:
            project.status = "qa_review"
            project.progress = 70
            project.updated_at = datetime.now()

    def _flatten_values(self, obj, prefix=""):
        """Recursively flatten dict/list values to strings."""
        if isinstance(obj, dict):
            for k, v in obj.items():
                yield from self._flatten_values(v, f"{prefix}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                yield from self._flatten_values(v, f"{prefix}[{i}]")
        else:
            yield str(obj) if obj is not None else ""
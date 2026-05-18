import json
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from dependencies.workspace import WorkspaceContext, require_workspace_operator
from schemas.auth import UserResponse
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/saas-tools", tags=["saas-tools"])

PREMIUM_MODEL = "claude-4-5-sonnet"
VOLUME_MODEL = "deepseek-v3.2"


# ═══════════════════════════════════════════════════════════
# PDF GENERATOR — Documentos Profesionales Élite
# ═══════════════════════════════════════════════════════════

class PDFGenerateRequest(BaseModel):
    doc_type: str  # proposal, report, invoice, contract, brochure, whitepaper
    title: str
    client_name: Optional[str] = ""
    client_sector: Optional[str] = ""
    content_brief: Optional[str] = ""
    language: Optional[str] = "es"
    style: Optional[str] = "premium"


class PDFGenerateResponse(BaseModel):
    title: str
    doc_type: str
    sections: list
    metadata: dict


@router.post("/generate-pdf", response_model=PDFGenerateResponse)
async def generate_pdf(
    data: PDFGenerateRequest,
    _ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate elite-quality professional PDF content with AI."""
    try:
        ai = AIHubService()
        system_prompt = f"""ERES EL MEJOR GENERADOR DE DOCUMENTOS PROFESIONALES DEL MUNDO.
Genera contenido PREMIUM, ÉLITE, listo para convertir en PDF profesional.

TIPO DE DOCUMENTO: {data.doc_type}
ESTILO: {data.style}
IDIOMA: {data.language}

REGLAS:
1. Contenido 100% profesional y personalizado
2. Estructura clara con secciones bien definidas
3. Copy persuasivo y datos concretos
4. Diseño mental: márgenes amplios, tipografía elegante, espaciado premium
5. Incluir headers, subheaders, bullet points, tablas cuando aplique
6. CERO contenido genérico — todo específico al cliente/negocio

Responde SOLO en JSON válido con esta estructura:
{{
  "title": "Título del documento",
  "doc_type": "{data.doc_type}",
  "sections": [
    {{
      "type": "header|paragraph|bullets|table|quote|stats|cta",
      "title": "Título de sección (si aplica)",
      "content": "Contenido de la sección",
      "items": ["Item 1", "Item 2"] // para bullets
    }}
  ],
  "metadata": {{
    "author": "NELVYON",
    "date": "2026-04-03",
    "pages_estimate": 5,
    "word_count_estimate": 2000,
    "style_notes": "Notas de estilo para diseño"
  }}
}}"""

        user_prompt = f"""GENERA UN DOCUMENTO {data.doc_type.upper()} PROFESIONAL ÉLITE:

TÍTULO: {data.title}
CLIENTE: {data.client_name or 'General'}
SECTOR: {data.client_sector or 'General'}
BRIEF: {data.content_brief or 'Documento profesional completo'}

Genera MÍNIMO 8 secciones completas y detalladas. Calidad WORLD-CLASS."""

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            model=VOLUME_MODEL,
        )
        response = await ai.gentxt(request)

        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(content)
        except (json.JSONDecodeError, IndexError):
            parsed = {
                "title": data.title,
                "doc_type": data.doc_type,
                "sections": [{"type": "paragraph", "title": "Contenido", "content": response.content}],
                "metadata": {"author": "NELVYON", "date": "2026-04-03", "pages_estimate": 1, "word_count_estimate": 500, "style_notes": ""},
            }

        return PDFGenerateResponse(
            title=parsed.get("title", data.title),
            doc_type=parsed.get("doc_type", data.doc_type),
            sections=parsed.get("sections", []),
            metadata=parsed.get("metadata", {}),
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")


# ═══════════════════════════════════════════════════════════
# PRESENTATIONS — Presentaciones de Negocios World-Class
# ═══════════════════════════════════════════════════════════

class PresentationRequest(BaseModel):
    pres_type: str  # pitch_deck, proposal, quarterly, case_study, onboarding, sales
    title: str
    client_name: Optional[str] = ""
    client_sector: Optional[str] = ""
    content_brief: Optional[str] = ""
    slides_count: Optional[int] = 12
    language: Optional[str] = "es"


class SlideData(BaseModel):
    slide_number: int
    layout: str
    title: str
    subtitle: Optional[str] = ""
    content: Optional[str] = ""
    bullets: Optional[list] = []
    stats: Optional[list] = []
    visual_notes: Optional[str] = ""
    speaker_notes: Optional[str] = ""


class PresentationResponse(BaseModel):
    title: str
    pres_type: str
    slides: list
    metadata: dict


@router.post("/generate-presentation", response_model=PresentationResponse)
async def generate_presentation(
    data: PresentationRequest,
    _ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate world-class business presentation slides with AI."""
    try:
        ai = AIHubService()
        system_prompt = f"""ERES EL MEJOR CREADOR DE PRESENTACIONES DE NEGOCIOS DEL MUNDO.
Superas a McKinsey, BCG, Bain en calidad de presentaciones.

TIPO: {data.pres_type}
IDIOMA: {data.language}
SLIDES OBJETIVO: {data.slides_count}

REGLAS DE CALIDAD ÉLITE:
1. Cada slide debe tener UN mensaje claro y poderoso
2. Datos concretos con números, porcentajes, métricas
3. Storytelling que conecte emocionalmente
4. Diseño mental: minimalista, impactante, premium
5. Speaker notes detalladas para cada slide
6. Transiciones lógicas entre slides
7. Apertura impactante y cierre memorable
8. Visual concepts para cada slide

Responde SOLO en JSON válido:
{{
  "title": "Título de la presentación",
  "pres_type": "{data.pres_type}",
  "slides": [
    {{
      "slide_number": 1,
      "layout": "title|content|stats|comparison|quote|image|bullets|chart|cta|closing",
      "title": "Título del slide",
      "subtitle": "Subtítulo opcional",
      "content": "Contenido principal",
      "bullets": ["Punto 1", "Punto 2"],
      "stats": [{{"value": "95%", "label": "Satisfacción"}}],
      "visual_notes": "Descripción del visual/imagen sugerida",
      "speaker_notes": "Notas para el presentador"
    }}
  ],
  "metadata": {{
    "total_slides": {data.slides_count},
    "estimated_duration": "20 min",
    "target_audience": "Descripción de audiencia",
    "key_message": "Mensaje principal",
    "design_theme": "Tema de diseño sugerido"
  }}
}}"""

        user_prompt = f"""GENERA UNA PRESENTACIÓN {data.pres_type.upper()} WORLD-CLASS:

TÍTULO: {data.title}
CLIENTE: {data.client_name or 'General'}
SECTOR: {data.client_sector or 'General'}
BRIEF: {data.content_brief or 'Presentación profesional completa'}
SLIDES: {data.slides_count}

Genera EXACTAMENTE {data.slides_count} slides de calidad ÉLITE #1 del mundo."""

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            model=PREMIUM_MODEL,
        )
        response = await ai.gentxt(request)

        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(content)
        except (json.JSONDecodeError, IndexError):
            parsed = {
                "title": data.title,
                "pres_type": data.pres_type,
                "slides": [{"slide_number": 1, "layout": "content", "title": data.title, "content": response.content}],
                "metadata": {},
            }

        return PresentationResponse(
            title=parsed.get("title", data.title),
            pres_type=parsed.get("pres_type", data.pres_type),
            slides=parsed.get("slides", []),
            metadata=parsed.get("metadata", {}),
        )
    except Exception as e:
        logger.error(f"Error generating presentation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generando presentación: {str(e)}")


# ═══════════════════════════════════════════════════════════
# DATABASE SEGMENTATION — Segmentación Automática por Nichos
# ═══════════════════════════════════════════════════════════

class SegmentRequest(BaseModel):
    contacts: list  # List of contact dicts with name, email, company, sector, etc.


class SegmentResponse(BaseModel):
    total_contacts: int
    segments: list
    summary: dict


@router.post("/segment-database", response_model=SegmentResponse)
async def segment_database(
    data: SegmentRequest,
    _ctx: WorkspaceContext = Depends(require_workspace_operator),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Auto-segment a database of contacts by niches using AI."""
    try:
        if not data.contacts:
            raise ValueError("No hay contactos para segmentar")

        ai = AIHubService()
        contacts_summary = json.dumps(data.contacts[:100], ensure_ascii=False, default=str)

        system_prompt = """ERES EL MEJOR ANALISTA DE DATOS Y SEGMENTACIÓN DEL MUNDO.
Analiza la base de datos de contactos y segmenta automáticamente por nichos.

REGLAS:
1. Identifica TODOS los nichos/sectores presentes
2. Agrupa contactos por sector, tamaño de empresa, ubicación, potencial
3. Asigna un score de potencial (1-100) a cada segmento
4. Sugiere acciones específicas por segmento
5. Identifica los segmentos más valiosos
6. Detecta patrones y oportunidades

Responde SOLO en JSON válido:
{
  "total_contacts": N,
  "segments": [
    {
      "name": "Nombre del segmento/nicho",
      "description": "Descripción del segmento",
      "count": N,
      "percentage": "XX%",
      "potential_score": 85,
      "characteristics": ["Característica 1", "Característica 2"],
      "recommended_actions": ["Acción 1", "Acción 2"],
      "suggested_campaign": "Tipo de campaña sugerida",
      "contact_ids": [0, 1, 2]
    }
  ],
  "summary": {
    "total_segments": N,
    "top_segment": "Nombre del segmento más valioso",
    "opportunities": ["Oportunidad 1", "Oportunidad 2"],
    "data_quality_score": 85,
    "recommendations": ["Recomendación 1"]
  }
}"""

        user_prompt = f"""SEGMENTA ESTA BASE DE DATOS DE {len(data.contacts)} CONTACTOS:

{contacts_summary}

Analiza TODOS los contactos y genera segmentos DETALLADOS por nicho/sector.
Calidad de análisis ÉLITE #1 del mundo."""

        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            model=VOLUME_MODEL,
        )
        response = await ai.gentxt(request)

        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = json.loads(content)
        except (json.JSONDecodeError, IndexError):
            parsed = {
                "total_contacts": len(data.contacts),
                "segments": [],
                "summary": {"total_segments": 0, "recommendations": ["Error al parsear respuesta IA"]},
            }

        return SegmentResponse(
            total_contacts=parsed.get("total_contacts", len(data.contacts)),
            segments=parsed.get("segments", []),
            summary=parsed.get("summary", {}),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error segmenting database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error en segmentación: {str(e)}")
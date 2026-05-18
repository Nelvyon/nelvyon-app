"""
Funnel Publisher — Generates real HTML landing pages for each funnel stage,
stores the result, and provides a public preview endpoint.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.funnel_items import Funnel_itemsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/funnels", tags=["funnel_publisher"])


# ── Schemas ──
class PublishRequest(BaseModel):
    funnel_id: int


class PublishResponse(BaseModel):
    funnel_id: int
    status: str
    pages_count: int
    preview_url: str
    public_url: str
    published_at: str


class FunnelPreviewResponse(BaseModel):
    funnel_id: int
    name: str
    funnel_type: Optional[str] = None
    status: Optional[str] = None
    pages: list
    published_at: Optional[str] = None


# ── HTML Generator ──
def generate_funnel_html(funnel_name: str, stages: list, funnel_type: str = "sales") -> str:
    """Generate a complete, styled HTML page for the funnel with all stages as sections."""

    # Color themes per funnel type
    themes = {
        "sales": {"primary": "#7C3AED", "accent": "#A78BFA", "bg": "#0A0A0F", "card": "#111118"},
        "lead_generation": {"primary": "#2563EB", "accent": "#60A5FA", "bg": "#0A0E14", "card": "#0F1520"},
        "webinar": {"primary": "#DC2626", "accent": "#F87171", "bg": "#0F0A0A", "card": "#1A1010"},
        "ecommerce": {"primary": "#059669", "accent": "#34D399", "bg": "#0A0F0E", "card": "#101A18"},
        "onboarding": {"primary": "#D97706", "accent": "#FBBF24", "bg": "#0F0E0A", "card": "#1A1810"},
    }
    theme = themes.get(funnel_type, themes["sales"])

    stages_html = ""
    for i, stage in enumerate(stages):
        name = stage.get("name", f"Paso {i + 1}")
        stage_type = stage.get("type", "page")
        headline = stage.get("headline", name)
        description = stage.get("description", "")
        cta_text = stage.get("cta_text", "Continuar")
        metrics = stage.get("metrics", {})

        metrics_html = ""
        if metrics:
            metrics_items = "".join(
                f'<div class="metric"><span class="metric-value">{v}</span><span class="metric-label">{k}</span></div>'
                for k, v in metrics.items()
            )
            metrics_html = f'<div class="metrics-row">{metrics_items}</div>'

        next_id = f'stage-{i + 1}' if i < len(stages) - 1 else ""
        scroll_js = f'document.getElementById("{next_id}").scrollIntoView({{behavior:"smooth"}})' if next_id else ""

        stages_html += f"""
        <section id="stage-{i}" class="funnel-stage" style="--stage-index: {i}">
            <div class="stage-badge">{stage_type.upper()} · PASO {i + 1}/{len(stages)}</div>
            <h2 class="stage-headline">{headline}</h2>
            <p class="stage-description">{description}</p>
            {metrics_html}
            <button class="cta-button" {"onclick='" + scroll_js + "'" if scroll_js else ""}>{cta_text}</button>
            <div class="stage-divider"></div>
        </section>
        """

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{funnel_name} — NELVYON Funnel</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: {theme['bg']};
            color: #E4E4E7;
            min-height: 100vh;
            overflow-x: hidden;
        }}

        .funnel-header {{
            text-align: center;
            padding: 60px 24px 40px;
            background: linear-gradient(180deg, {theme['primary']}15 0%, transparent 100%);
            border-bottom: 1px solid {theme['primary']}20;
        }}

        .funnel-header h1 {{
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, {theme['accent']}, {theme['primary']});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }}

        .funnel-header .subtitle {{
            font-size: 0.875rem;
            color: #71717A;
        }}

        .powered-by {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 16px;
            padding: 4px 12px;
            border-radius: 20px;
            background: {theme['primary']}10;
            border: 1px solid {theme['primary']}20;
            font-size: 0.625rem;
            color: {theme['accent']};
            font-weight: 600;
            letter-spacing: 0.05em;
        }}

        .funnel-stage {{
            max-width: 720px;
            margin: 0 auto;
            padding: 60px 24px;
            text-align: center;
            animation: fadeInUp 0.6s ease-out;
            animation-delay: calc(var(--stage-index) * 0.1s);
            animation-fill-mode: both;
        }}

        @keyframes fadeInUp {{
            from {{ opacity: 0; transform: translateY(30px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        .stage-badge {{
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            background: {theme['primary']}15;
            border: 1px solid {theme['primary']}25;
            font-size: 0.625rem;
            font-weight: 700;
            color: {theme['accent']};
            letter-spacing: 0.1em;
            margin-bottom: 20px;
        }}

        .stage-headline {{
            font-size: 1.75rem;
            font-weight: 700;
            color: #FAFAFA;
            margin-bottom: 12px;
            line-height: 1.3;
        }}

        .stage-description {{
            font-size: 0.95rem;
            color: #A1A1AA;
            line-height: 1.7;
            max-width: 560px;
            margin: 0 auto 24px;
        }}

        .metrics-row {{
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 28px;
            flex-wrap: wrap;
        }}

        .metric {{
            padding: 12px 20px;
            border-radius: 12px;
            background: {theme['card']};
            border: 1px solid #ffffff08;
            min-width: 100px;
        }}

        .metric-value {{
            display: block;
            font-size: 1.25rem;
            font-weight: 700;
            color: {theme['accent']};
        }}

        .metric-label {{
            display: block;
            font-size: 0.625rem;
            color: #71717A;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 4px;
        }}

        .cta-button {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 32px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, {theme['primary']}, {theme['accent']});
            color: white;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px {theme['primary']}40;
        }}

        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 8px 30px {theme['primary']}50;
        }}

        .stage-divider {{
            width: 2px;
            height: 60px;
            background: linear-gradient(180deg, {theme['primary']}30, transparent);
            margin: 40px auto 0;
        }}

        .funnel-footer {{
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid #ffffff06;
        }}

        .funnel-footer p {{
            font-size: 0.75rem;
            color: #52525B;
        }}

        .funnel-footer a {{
            color: {theme['accent']};
            text-decoration: none;
        }}

        @media (max-width: 640px) {{
            .funnel-header h1 {{ font-size: 1.75rem; }}
            .stage-headline {{ font-size: 1.25rem; }}
            .metrics-row {{ gap: 12px; }}
            .metric {{ min-width: 80px; padding: 8px 14px; }}
        }}
    </style>
</head>
<body>
    <header class="funnel-header">
        <h1>{funnel_name}</h1>
        <p class="subtitle">{len(stages)} etapas · Funnel {funnel_type.replace('_', ' ').title()}</p>
        <div class="powered-by">⚡ POWERED BY NELVYON</div>
    </header>

    <main>
        {stages_html}
    </main>

    <footer class="funnel-footer">
        <p>Creado con <a href="#">NELVYON</a> · {datetime.now(timezone.utc).strftime('%Y-%m-%d')}</p>
    </footer>
</body>
</html>"""

    return html


def build_default_stages(funnel_type: str = "sales") -> list:
    """Build default funnel stages based on type."""
    templates = {
        "sales": [
            {"name": "Landing Page", "type": "landing", "headline": "Descubre la Solución que Transforma tu Negocio",
             "description": "Captamos la atención con una propuesta de valor clara, social proof y un diseño que convierte.",
             "cta_text": "Quiero Saber Más", "metrics": {"Visitantes": "10,000", "Bounce": "28%", "Tiempo": "3:42"}},
            {"name": "Opt-in", "type": "optin", "headline": "Obtén tu Guía Gratuita",
             "description": "Lead magnet de alto valor con formulario optimizado y progressive profiling.",
             "cta_text": "Descargar Gratis", "metrics": {"Leads": "4,900", "Conversión": "49%", "CTR": "34%"}},
            {"name": "Sales Page", "type": "sales", "headline": "La Solución Completa para Escalar",
             "description": "Página de ventas con storytelling, objeciones resueltas, garantía y urgencia inteligente.",
             "cta_text": "Ver Planes", "metrics": {"Interesados": "2,200", "Conversión": "45%", "Tiempo": "5:10"}},
            {"name": "Checkout", "type": "checkout", "headline": "Completa tu Compra",
             "description": "Checkout en 1 paso con order bumps, trust badges y recuperación de carrito abandonado.",
             "cta_text": "Pagar Ahora", "metrics": {"Pagos": "1,386", "Conversión": "63%", "AOV": "€297"}},
            {"name": "Upsell", "type": "upsell", "headline": "Oferta Exclusiva — Solo Ahora",
             "description": "Upsell personalizado basado en el comportamiento del comprador.",
             "cta_text": "Añadir por €97", "metrics": {"Aceptados": "512", "Take Rate": "37%", "Revenue": "+€49,664"}},
            {"name": "Thank You", "type": "thankyou", "headline": "¡Bienvenido! Tu Acceso Está Listo",
             "description": "Página de agradecimiento con próximos pasos, programa de referidos y onboarding automático.",
             "cta_text": "Acceder Ahora", "metrics": {"NPS": "92", "Referidos": "23%", "Retención": "88%"}},
        ],
        "lead_generation": [
            {"name": "Landing", "type": "landing", "headline": "Genera Leads Cualificados en Piloto Automático",
             "description": "Atrae a tu audiencia ideal con contenido de valor y CTAs irresistibles.",
             "cta_text": "Empezar", "metrics": {"Visitantes": "15,000", "CTR": "42%"}},
            {"name": "Lead Magnet", "type": "optin", "headline": "Descarga tu Recurso Gratuito",
             "description": "Ebook, checklist o template que resuelve un problema específico de tu audiencia.",
             "cta_text": "Descargar", "metrics": {"Leads": "6,300", "Conversión": "42%"}},
            {"name": "Nurture", "type": "email", "headline": "Secuencia de Emails Automatizada",
             "description": "5 emails de valor que educan, generan confianza y preparan para la venta.",
             "cta_text": "Ver Secuencia", "metrics": {"Open Rate": "45%", "Click Rate": "12%"}},
            {"name": "Calificación", "type": "qualify", "headline": "¿Estás Listo para el Siguiente Paso?",
             "description": "Formulario de calificación que filtra leads de alta intención.",
             "cta_text": "Calificarme", "metrics": {"MQLs": "1,890", "SQL Rate": "30%"}},
        ],
        "webinar": [
            {"name": "Registro", "type": "landing", "headline": "Webinar Gratuito: Escala tu Negocio",
             "description": "Registro para el webinar con countdown, speakers y agenda.",
             "cta_text": "Reservar Mi Lugar", "metrics": {"Registros": "3,200", "Show Rate": "45%"}},
            {"name": "Recordatorio", "type": "email", "headline": "¡No Te Lo Pierdas!",
             "description": "Secuencia de recordatorios que maximiza la asistencia.",
             "cta_text": "Añadir al Calendario", "metrics": {"Aperturas": "68%", "Confirmados": "2,100"}},
            {"name": "Webinar Live", "type": "webinar", "headline": "Sesión en Vivo",
             "description": "Presentación con Q&A, polls interactivos y oferta exclusiva al final.",
             "cta_text": "Unirse Ahora", "metrics": {"Asistentes": "1,440", "Engagement": "73%"}},
            {"name": "Replay + Oferta", "type": "sales", "headline": "Replay Disponible por 48h",
             "description": "Acceso al replay con oferta limitada y bonus exclusivos.",
             "cta_text": "Ver Replay", "metrics": {"Views": "2,800", "Conversión": "18%"}},
        ],
    }
    return templates.get(funnel_type, templates["sales"])


# ── Endpoints ──

@router.post("/publish", response_model=PublishResponse)
async def publish_funnel(
    req: PublishRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Publish a funnel: generates real HTML landing pages for each stage,
    stores the published content, and returns preview/public URLs.
    """
    service = Funnel_itemsService(db)
    funnel = await service.get_by_id(req.funnel_id, user_id=str(current_user.id))
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    # Parse existing stages or generate defaults
    stages = []
    if funnel.stages_json:
        try:
            parsed = json.loads(funnel.stages_json)
            if isinstance(parsed, dict) and "stages" in parsed:
                stages = parsed["stages"]
            elif isinstance(parsed, dict) and "published_html" in parsed:
                # Already has stages from previous publish
                stages = parsed.get("stages", [])
            elif isinstance(parsed, list):
                stages = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    if not stages:
        stages = build_default_stages(funnel.funnel_type or "sales")

    # Generate HTML
    html = generate_funnel_html(
        funnel_name=funnel.name,
        stages=stages,
        funnel_type=funnel.funnel_type or "sales",
    )

    # Store published data
    published_data = {
        "stages": stages,
        "published_html": html,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "pages_count": len(stages),
    }

    await service.update(
        funnel.id,
        {
            "stages_json": json.dumps(published_data, ensure_ascii=False),
            "status": "published",
            "stages_count": len(stages),
        },
        user_id=str(current_user.id),
    )

    base_url = "/api/v1/funnels"
    return PublishResponse(
        funnel_id=funnel.id,
        status="published",
        pages_count=len(stages),
        preview_url=f"{base_url}/{funnel.id}/preview",
        public_url=f"{base_url}/{funnel.id}/public",
        published_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/{funnel_id}/preview")
async def preview_funnel(
    funnel_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview a funnel (requires auth — owner only)."""
    service = Funnel_itemsService(db)
    funnel = await service.get_by_id(funnel_id, user_id=str(current_user.id))
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    # Try to get published HTML
    html = _extract_html(funnel)
    if not html:
        raise HTTPException(status_code=400, detail="Funnel not published yet. Call POST /funnels/publish first.")

    return HTMLResponse(content=html, status_code=200)


@router.get("/{funnel_id}/public")
async def public_funnel(
    funnel_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Public view of a published funnel (no auth required)."""
    service = Funnel_itemsService(db)
    # No user_id filter — public access
    funnel = await service.get_by_id(funnel_id)
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    if funnel.status != "published":
        raise HTTPException(status_code=403, detail="This funnel is not published")

    html = _extract_html(funnel)
    if not html:
        raise HTTPException(status_code=400, detail="Funnel has no published content")

    return HTMLResponse(content=html, status_code=200)


@router.get("/{funnel_id}/data", response_model=FunnelPreviewResponse)
async def get_funnel_data(
    funnel_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get funnel data including stages (for frontend preview panel)."""
    service = Funnel_itemsService(db)
    funnel = await service.get_by_id(funnel_id, user_id=str(current_user.id))
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")

    pages = []
    published_at = None
    if funnel.stages_json:
        try:
            parsed = json.loads(funnel.stages_json)
            if isinstance(parsed, dict):
                pages = parsed.get("stages", [])
                published_at = parsed.get("published_at")
            elif isinstance(parsed, list):
                pages = parsed
        except (json.JSONDecodeError, TypeError):
            pass

    return FunnelPreviewResponse(
        funnel_id=funnel.id,
        name=funnel.name,
        funnel_type=funnel.funnel_type,
        status=funnel.status,
        pages=pages,
        published_at=published_at,
    )


def _extract_html(funnel) -> str | None:
    """Extract published HTML from funnel's stages_json."""
    if not funnel.stages_json:
        return None
    try:
        parsed = json.loads(funnel.stages_json)
        if isinstance(parsed, dict):
            return parsed.get("published_html")
    except (json.JSONDecodeError, TypeError):
        pass
    return None
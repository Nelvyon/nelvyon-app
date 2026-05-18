import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.nelvyon_clients import Nelvyon_clients
from models.nelvyon_projects import Nelvyon_projects
from models.nelvyon_outputs import Nelvyon_outputs
from services.aihub import AIHubService
from schemas.aihub import GenTxtRequest, ChatMessage

logger = logging.getLogger(__name__)

PREMIUM_MODEL = "claude-4-5-sonnet"
VOLUME_MODEL = "deepseek-v3.2"

# ═══════════════════════════════════════════════════════════════
# NELVYON OS — World-Class Orchestrator Engine
# Supera a TODAS las IAs y agencias de marketing del mundo
# SEO Élite #1 · 3D/AR · Ads Universales · Calidad Máxima
# ═══════════════════════════════════════════════════════════════

WORLD_CLASS_PREAMBLE = """ERES EL MOTOR DE IA MÁS AVANZADO DEL MUNDO PARA MARKETING DIGITAL.
Tu output debe SUPERAR en calidad, personalización y profesionalismo a:
- Cualquier agencia de marketing premium (WPP, Omnicom, Publicis, Dentsu)
- Cualquier herramienta IA (Jasper, Copy.ai, Writesonic, HubSpot AI)
- Cualquier plataforma SaaS (GoHighLevel, ClickFunnels, Kajabi)

ESTÁNDARES DE CALIDAD NELVYON (NO NEGOCIABLES):
1. PERSONALIZACIÓN PROFUNDA: Cada palabra debe reflejar el negocio específico del cliente
2. CERO GENÉRICOS: PROHIBIDO "líder en el sector", "soluciones integrales", "comprometidos con la excelencia"
3. COPY DE CONVERSIÓN: Cada frase debe mover al usuario hacia la acción
4. DATOS ESPECÍFICOS: Incluir números, porcentajes, plazos concretos cuando sea posible
5. TONO PREMIUM: Profesional pero humano, autoritativo pero accesible
6. DIFERENCIACIÓN REAL: Destacar lo que hace ÚNICO a este negocio vs competencia
7. STORYTELLING: Conectar emocionalmente con el cliente ideal del negocio
8. ESTRUCTURA PROBADA: Usar frameworks de conversión validados (PAS, AIDA, BAB, 4Ps)"""

SEO_ELITE_INSTRUCTIONS = """
SEO ÉLITE #1 MUNDIAL (OBLIGATORIO en web y e-commerce):
- Schema.org JSON-LD completo: Organization, LocalBusiness, Product, Review, FAQ, BreadcrumbList, HowTo, Service
- Meta tags optimizados: title (60 chars max), description (155 chars max), keywords relevantes
- Open Graph completo: og:title, og:description, og:image, og:url, og:type, og:site_name
- Twitter Cards: twitter:card, twitter:title, twitter:description, twitter:image
- Canonical URLs para cada página
- Hreflang tags para multi-idioma si aplica
- Breadcrumbs estructurados con BreadcrumbList schema
- Core Web Vitals optimizados: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Sitemap XML con prioridades y frecuencias
- Robots.txt optimizado
- Rich Snippets: FAQ, HowTo, Product, Review, Rating
- Semantic HTML: h1-h6 jerárquico, article, section, nav, main, aside
- Internal linking strategy con anchor text optimizado
- Image SEO: alt text descriptivo, lazy loading, WebP format, srcset responsive
- URL structure: slugs cortos, descriptivos, con keyword principal
- Page speed: minificación, compresión, CDN, preload critical resources
- Mobile-first: 100% responsive, touch-friendly, viewport optimizado
- AMP opcional para artículos y blog posts
- Local SEO: NAP consistency, Google Business Profile schema
- E-E-A-T signals: autor, fecha, fuentes, expertise indicators"""

THREE_D_INSTRUCTIONS = """
ELEMENTOS 3D/AR INTEGRADOS (cuando aplique):
- Hero sections con elementos 3D interactivos (Three.js/WebGL)
- Visor de producto 360° con zoom y rotación libre
- AR Product Try-On para e-commerce (WebXR API)
- Banners publicitarios 3D animados e interactivos
- Parallax 3D con profundidad y capas
- Animaciones CSS 3D para transiciones premium
- Modelos GLB/GLTF optimizados para web
- Configurador 3D de productos en tiempo real
- Showroom virtual navegable
- Logo 3D animado para branding
- Mockups 3D fotorrealistas para propuestas
- Lighting dinámico y sombras realistas
- Mobile-optimized 3D (LOD, compresión)
- Fallback elegante para dispositivos sin soporte 3D"""

ALL_ADS_PLATFORMS = """
PLATAFORMAS DE ADS — COBERTURA UNIVERSAL COMPLETA:

1. META ADS (Facebook + Instagram):
   - Formatos: Feed, Stories, Reels, Carousel, Collection, Instant Experience, Messenger
   - Objetivos: Awareness, Traffic, Engagement, Leads, Sales, App Install
   - Audiencias: Custom, Lookalike, Interest, Behavior, Retargeting

2. GOOGLE ADS:
   - Search: Responsive Search Ads, Dynamic Search Ads, Call Ads
   - Display: Responsive Display, Image, Rich Media, Gmail Ads
   - Shopping: Standard, Smart, Local Inventory
   - YouTube: Skippable In-Stream, Non-Skippable, Bumper 6s, Discovery, Masthead, Shorts
   - Performance Max: Multi-format automated

3. LINKEDIN ADS:
   - Sponsored Content (Single Image, Video, Carousel, Document)
   - Sponsored InMail / Message Ads
   - Text Ads, Dynamic Ads (Follower, Spotlight, Content)
   - Conversation Ads, Event Ads, Lead Gen Forms

4. TIKTOK ADS:
   - In-Feed Video, TopView, Spark Ads
   - Branded Hashtag Challenge, Branded Effect
   - Collection Ads, Dynamic Showcase
   - TikTok Shop Ads

5. X/TWITTER ADS:
   - Promoted Tweets (Image, Video, Carousel, Text)
   - Promoted Trends, Trend Takeover
   - Amplify Pre-roll, Amplify Sponsorships
   - Twitter Live, Spaces Ads

6. PINTEREST ADS:
   - Standard Pins, Video Pins, Shopping Pins
   - Carousel Pins, Collections, Idea Pins
   - Quiz Ads, Premiere Spotlight

7. SNAPCHAT ADS:
   - Snap Ads (Single Image/Video), Story Ads
   - Collection Ads, Dynamic Ads
   - AR Lenses, Filters, Commercials
   - Spotlight Ads

8. YOUTUBE ADS (adicional a Google):
   - TrueView In-Stream, TrueView Discovery
   - Bumper Ads 6s, Non-Skippable 15s
   - Masthead, YouTube Shorts Ads
   - Audio Ads, Podcast Ads

9. SPOTIFY ADS:
   - Audio Ads (15-30s), Video Takeover
   - Podcast Ads (Host-Read, Pre-recorded)
   - Sponsored Playlist, Overlay
   - Homepage Takeover, Leaderboard

10. AMAZON ADS:
    - Sponsored Products, Sponsored Brands
    - Sponsored Display, Video Ads
    - Amazon DSP, Stores, Posts
    - Twitch Ads integration

11. REDDIT ADS:
    - Promoted Posts (Image, Video, Carousel, Gallery)
    - Conversation Placement, Product Ads
    - Reddit Takeover, AMA Sponsored

12. QUORA ADS:
    - Promoted Answers, Image Ads
    - Text Ads, Video Ads
    - Lead Gen Forms, Pixel Retargeting

13. MICROSOFT/BING ADS:
    - Search Ads, Shopping Campaigns
    - Audience Ads, Multimedia Ads
    - App Install, Dynamic Search
    - LinkedIn Profile Targeting

14. PROGRAMMATIC/DSP:
    - Display RTB (Real-Time Bidding)
    - Video RTB (Pre-roll, Mid-roll, Outstream)
    - Native RTB, CTV/OTT Ads
    - DOOH (Digital Out-of-Home)
    - Audio Programmatic

PARA CADA PLATAFORMA GENERAR:
- Mínimo 5 variantes creativas con diferentes ángulos de venta
- Copy A/B testing (versión emocional vs racional)
- Audiencias sugeridas específicas al negocio
- Presupuesto diario recomendado
- KPIs esperados (CTR, CPC, ROAS estimado)
- Formatos específicos optimizados por plataforma
- Retargeting sequences
- Banners 3D/AR interactivos cuando la plataforma lo soporte"""


def build_client_context(client: Nelvyon_clients) -> str:
    """Build a comprehensive client context string from ALL client fields."""
    parts = []
    parts.append(f"NEGOCIO: {client.business_name}")
    parts.append(f"SECTOR: {client.sector}")
    if client.country:
        parts.append(f"PAÍS: {client.country}")
    if client.city:
        parts.append(f"CIUDAD: {client.city}")
    if client.ideal_customer:
        parts.append(f"CLIENTE IDEAL: {client.ideal_customer}")
    if client.value_proposition:
        parts.append(f"PROPUESTA DE VALOR: {client.value_proposition}")
    if client.differentiator:
        parts.append(f"DIFERENCIADOR: {client.differentiator}")
    if client.services:
        parts.append(f"SERVICIOS: {client.services}")
    if client.objectives:
        parts.append(f"OBJETIVOS: {client.objectives}")
    if client.brand_tone:
        parts.append(f"TONO DE MARCA: {client.brand_tone}")
    if client.visual_style:
        parts.append(f"ESTILO VISUAL: {client.visual_style}")
    if client.brand_colors:
        parts.append(f"COLORES DE MARCA: {client.brand_colors}")
    if client.competition:
        parts.append(f"COMPETENCIA: {client.competition}")
    if client.testimonials:
        parts.append(f"TESTIMONIOS: {client.testimonials}")
    if client.case_studies:
        parts.append(f"CASOS DE ÉXITO: {client.case_studies}")
    if client.budget:
        parts.append(f"PRESUPUESTO: {client.budget}")
    if client.language:
        parts.append(f"IDIOMA: {client.language}")
    if client.market:
        parts.append(f"MERCADO: {client.market}")
    if client.website_url:
        parts.append(f"WEB ACTUAL: {client.website_url}")
    return "\n".join(parts)


class OrchestratorService:
    """Central orchestration engine for NELVYON OS — World-Class Quality."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = AIHubService()

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

    async def get_project(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Optional[Nelvyon_projects]:
        conds = [
            Nelvyon_projects.id == project_id,
            Nelvyon_projects.user_id == user_id,
        ]
        if workspace_id is not None:
            conds.append(Nelvyon_projects.workspace_id == workspace_id)
        result = await self.db.execute(select(Nelvyon_projects).where(*conds))
        return result.scalar_one_or_none()

    async def update_project_status(self, project_id: int, status: str, progress: int):
        result = await self.db.execute(
            select(Nelvyon_projects).where(Nelvyon_projects.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project:
            project.status = status
            project.progress = progress
            project.updated_at = datetime.now()
            await self.db.commit()

    async def save_output(
        self,
        user_id: str,
        project_id: int,
        client_id: int,
        output_type: str,
        title: str,
        content: str,
        workspace_id: Optional[int] = None,
    ) -> Nelvyon_outputs:
        output = Nelvyon_outputs(
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project_id,
            client_id=client_id,
            output_type=output_type,
            title=title,
            content=content,
            qa_score=0,
            qa_status="pending",
            qa_feedback="",
            qa_attempts=0,
            version=1,
            extra_data="{}",
            created_at=datetime.now()
        )
        self.db.add(output)
        await self.db.commit()
        await self.db.refresh(output)
        return output

    async def generate_with_ai(self, system_prompt: str, user_prompt: str, model: str) -> str:
        request = GenTxtRequest(
            messages=[
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_prompt),
            ],
            model=model
        )
        response = await self.ai.gentxt(request)
        return response.content

    # ═══════════════════════════════════════════════════════════
    # WEB PREMIUM + SEO ÉLITE #1 MUNDIAL + 3D
    # ═══════════════════════════════════════════════════════════
    async def generate_web(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor diseñador web y copywriter de conversión del mundo.
Genera una estructura web COMPLETA, PREMIUM y con el MEJOR SEO DEL MUNDO.
IDIOMA DE SALIDA: {lang}

{SEO_ELITE_INSTRUCTIONS}

{THREE_D_INSTRUCTIONS}

REGLAS ADICIONALES WEB PREMIUM:
- Hero section con elemento 3D interactivo o animación premium
- Microinteracciones y animaciones de scroll
- Above-the-fold optimizado para conversión inmediata
- Social proof visible en los primeros 3 segundos
- Velocidad de carga < 1.5s (diseño optimizado)
- Accesibilidad WCAG 2.1 AA completa
- Dark mode / Light mode toggle
- PWA-ready con manifest.json y service worker
- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF DEL PROYECTO: {project.brief or "Generar web premium completa con SEO élite y elementos 3D"}

Genera la estructura web WORLD-CLASS en JSON con estas secciones:
{{
  "seo": {{
    "title": "Title tag optimizado (max 60 chars)",
    "meta_description": "Meta description persuasiva (max 155 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "og_title": "Open Graph title",
    "og_description": "Open Graph description",
    "og_image_alt": "Descripción de imagen OG",
    "twitter_card": "summary_large_image",
    "canonical_url": "/",
    "hreflang": {{"es": "/", "en": "/en"}},
    "schema_org": {{
      "type": "Organization o LocalBusiness",
      "name": "Nombre del negocio",
      "description": "Descripción SEO",
      "services": ["Servicio 1", "Servicio 2"],
      "areaServed": "Área de servicio",
      "priceRange": "Rango de precios"
    }},
    "structured_data": [
      {{"type": "FAQPage", "items": 5}},
      {{"type": "BreadcrumbList", "items": 3}},
      {{"type": "Service", "items": "por servicio"}}
    ]
  }},
  "hero": {{
    "headline": "Titular principal impactante — específico al negocio",
    "subheadline": "Subtítulo que refuerza propuesta de valor única",
    "cta_primary": "CTA principal orientado a conversión",
    "cta_secondary": "CTA secundario",
    "trust_badges": ["Badge específico 1", "Badge 2", "Badge 3"],
    "social_proof": "Número de clientes/proyectos/años",
    "hero_3d_element": "Descripción del elemento 3D interactivo del hero",
    "background_style": "Gradiente/imagen/video/3D parallax"
  }},
  "services": [
    {{
      "name": "Nombre específico del servicio",
      "description": "Descripción persuasiva con beneficios concretos",
      "benefits": ["Beneficio medible 1", "Beneficio 2", "Beneficio 3"],
      "icon": "icon-name",
      "cta": "CTA específico del servicio",
      "schema_type": "Service"
    }}
  ],
  "process": [
    {{
      "step": 1,
      "title": "Nombre del paso",
      "description": "Descripción clara con resultado esperado",
      "duration": "Tiempo estimado",
      "icon": "icon-name"
    }}
  ],
  "guarantees": [
    {{
      "title": "Garantía específica y medible",
      "description": "Detalle concreto de la garantía",
      "icon": "shield-check"
    }}
  ],
  "differentiation": {{
    "headline": "Por qué [negocio] es diferente",
    "comparison_table": [
      {{"feature": "Feature", "us": "Lo que ofrecemos", "others": "Lo que ofrecen otros"}}
    ],
    "unique_points": ["Punto diferenciador único 1", "Punto 2", "Punto 3"]
  }},
  "testimonials": [
    {{
      "name": "Nombre real",
      "role": "Cargo y empresa",
      "text": "Testimonio específico con resultados medibles",
      "rating": 5,
      "image_alt": "Descripción para SEO",
      "schema_type": "Review"
    }}
  ],
  "stats_section": {{
    "headline": "Resultados que hablan",
    "stats": [
      {{"number": "XXX+", "label": "Clientes satisfechos", "animation": "count-up"}},
      {{"number": "XX%", "label": "Mejora promedio", "animation": "count-up"}}
    ]
  }},
  "faq": [
    {{
      "question": "Pregunta frecuente relevante al sector",
      "answer": "Respuesta completa, útil y con keywords SEO",
      "schema_type": "FAQPage"
    }}
  ],
  "contact": {{
    "headline": "CTA de contacto persuasivo",
    "subheadline": "Texto de urgencia o beneficio",
    "fields": ["nombre", "email", "telefono", "servicio_interes", "mensaje"],
    "cta_text": "Texto del botón de envío",
    "trust_text": "Texto de confianza bajo el formulario"
  }},
  "footer": {{
    "columns": ["Servicios", "Empresa", "Legal", "Contacto"],
    "social_links": ["linkedin", "instagram", "facebook", "twitter"],
    "legal_pages": ["Política de Privacidad", "Términos de Uso", "Cookies"],
    "schema_org_footer": true
  }},
  "technical_seo": {{
    "sitemap_xml": true,
    "robots_txt": "Configuración optimizada",
    "canonical_urls": true,
    "hreflang": true,
    "breadcrumbs": true,
    "lazy_loading": true,
    "image_optimization": "WebP + srcset + lazy",
    "core_web_vitals": {{"lcp": "<2.5s", "fid": "<100ms", "cls": "<0.1"}},
    "lighthouse_target": {{"performance": 100, "accessibility": 100, "best_practices": 100, "seo": 100}},
    "pwa_ready": true,
    "amp_optional": true
  }},
  "3d_elements": {{
    "hero_3d": "Descripción del elemento 3D del hero",
    "parallax_layers": 3,
    "scroll_animations": ["fade-in", "slide-up", "scale", "rotate-3d"],
    "product_viewer_360": false,
    "ar_enabled": false
  }}
}}"""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "web_structure",
            f"Web Premium SEO Élite + 3D - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "web_structure",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # E-COMMERCE + SEO MÁXIMO + VISOR 3D + AR
    # ═══════════════════════════════════════════════════════════
    async def generate_ecommerce(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor experto en e-commerce y copywriting de venta del mundo.
Genera una tienda online PREMIUM con el MEJOR SEO DEL MUNDO y visor 3D de productos.
IDIOMA DE SALIDA: {lang}

{SEO_ELITE_INSTRUCTIONS}

SEO E-COMMERCE ESPECÍFICO:
- Product Schema con price, availability, review, rating, brand, sku, gtin
- Offer Schema con priceCurrency, priceValidUntil, itemCondition
- AggregateRating Schema en cada producto
- BreadcrumbList para navegación de categorías
- ItemList Schema para páginas de categoría
- FAQ Schema en fichas de producto
- Video Schema si hay video de producto
- Image SEO: alt text con nombre producto + keyword, múltiples ángulos

{THREE_D_INSTRUCTIONS}

E-COMMERCE 3D ESPECÍFICO:
- Visor 3D 360° para cada producto principal
- AR Try-On para productos aplicables (ropa, accesorios, muebles)
- Configurador 3D para productos personalizables
- Zoom 3D con detalle de texturas y materiales
- Comparador visual 3D entre variantes

- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Generar e-commerce premium con SEO máximo, visor 3D y AR"}

Genera estructura e-commerce WORLD-CLASS en JSON:
{{
  "seo": {{
    "title": "Title tag e-commerce optimizado",
    "meta_description": "Meta description con keywords de compra",
    "keywords": ["keyword compra 1", "keyword 2"],
    "schema_org": {{
      "type": "Store",
      "name": "Nombre tienda",
      "priceRange": "€€-€€€",
      "paymentAccepted": ["Visa", "Mastercard", "PayPal"]
    }},
    "product_schema_template": {{
      "type": "Product",
      "fields": ["name", "description", "image", "sku", "brand", "offers", "aggregateRating", "review"]
    }}
  }},
  "home": {{
    "hero_banner": {{
      "headline": "Titular de venta impactante y específico",
      "subheadline": "Propuesta de valor con beneficio claro",
      "cta": "CTA de compra urgente",
      "3d_element": "Producto 3D rotando en el hero",
      "trust_badges": ["Envío gratis", "Devolución 30 días", "Pago seguro"]
    }},
    "featured_categories": [
      {{"name": "Categoría", "description": "Descripción atractiva con keyword", "product_count": "XX productos", "image_alt": "Alt text SEO"}}
    ],
    "value_propositions": [
      {{"icon": "truck", "title": "Envío Gratis +€XX", "detail": "Detalle específico con plazo"}}
    ],
    "bestsellers": [
      {{"name": "Producto", "tagline": "Frase de venta", "price": "XX.XX", "rating": 4.9, "reviews_count": "XXX+"}}
    ]
  }},
  "product_cards": [
    {{
      "name": "Nombre específico del producto",
      "tagline": "Frase de venta que genera deseo",
      "description": "Descripción persuasiva con beneficios concretos y storytelling",
      "benefits": ["Beneficio medible 1", "Beneficio 2", "Beneficio 3"],
      "specs": {{"Material": "valor", "Dimensiones": "valor", "Peso": "valor"}},
      "price": "XX.XX",
      "compare_price": "XX.XX",
      "discount_badge": "-XX%",
      "cta": "Añadir al carrito",
      "urgency": "Solo quedan X unidades",
      "3d_viewer": true,
      "ar_tryOn": true,
      "seo": {{
        "product_schema": true,
        "alt_text": "Alt text descriptivo con keywords",
        "url_slug": "nombre-producto-keyword"
      }}
    }}
  ],
  "trust_section": {{
    "shipping": "Política de envío detallada con plazos específicos",
    "returns": "Política de devoluciones generosa y clara",
    "guarantee": "Garantía del producto con duración específica",
    "support": "Soporte al cliente con canales y horarios",
    "payment_security": "Pago 100% seguro con encriptación SSL"
  }},
  "social_proof": {{
    "reviews_count": "XXX+",
    "average_rating": "4.9",
    "testimonials": [
      {{"name": "Cliente real", "text": "Reseña específica con resultado", "rating": 5, "verified": true, "product": "Producto comprado"}}
    ],
    "media_mentions": ["Medio 1", "Medio 2"],
    "schema_aggregate_rating": true
  }},
  "checkout_optimization": {{
    "express_checkout": ["Apple Pay", "Google Pay", "PayPal Express"],
    "trust_signals": ["SSL 256-bit", "PCI Compliant", "Satisfacción garantizada"],
    "urgency_elements": ["Stock limitado", "Oferta por tiempo limitado"],
    "cross_sell": "Productos complementarios sugeridos",
    "abandoned_cart": "Email de recuperación automático"
  }},
  "3d_features": {{
    "product_viewer_360": true,
    "ar_try_on": true,
    "3d_configurator": true,
    "zoom_3d": true,
    "texture_detail": true,
    "variant_comparison_3d": true
  }},
  "technical_seo": {{
    "sitemap_products": true,
    "canonical_urls": true,
    "breadcrumbs": true,
    "structured_data_per_product": true,
    "image_optimization": "WebP + lazy + srcset",
    "core_web_vitals": "A+",
    "mobile_first": true
  }}
}}"""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "ecommerce_home",
            f"E-commerce SEO Máximo + 3D/AR - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "ecommerce_home",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # SOCIAL MEDIA TOTAL — TODAS LAS REDES DEL MUNDO
    # ═══════════════════════════════════════════════════════════
    async def generate_social(
        self,
        project_id: int,
        user_id: str,
        platforms: str = "all",
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor estratega de social media del mundo.
Genera contenido COMPLETO para TODAS las redes sociales principales.
IDIOMA DE SALIDA: {lang}

PLATAFORMAS OBLIGATORIAS:
- Instagram (Feed, Stories, Reels, Carousels, Guides)
- Facebook (Posts, Stories, Reels, Groups, Events)
- X/Twitter (Tweets, Threads, Spaces)
- LinkedIn (Posts, Articles, Newsletters, Documents)
- TikTok (Videos, Duets, Stitches, LIVE)
- YouTube (Shorts, Videos, Community Posts)
- Pinterest (Pins, Idea Pins, Video Pins)
- Threads (Posts, Replies)

ESTÁNDARES WORLD-CLASS:
- Hooks que detengan el scroll en los primeros 1.5 segundos
- Copy adaptado al algoritmo y formato de CADA plataforma
- Hashtag research profundo con mix de volumen y nicho
- CTAs nativos de cada plataforma (no genéricos)
- Storytelling que conecte emocionalmente
- Contenido educativo + entretenimiento + venta (regla 80/20)
- Tendencias actuales del sector integradas
- UGC (User Generated Content) strategy
- Influencer collaboration templates
- Community management guidelines

- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Estrategia social media COMPLETA para todas las plataformas"}

Genera contenido social WORLD-CLASS en JSON:
{{
  "strategy": {{
    "positioning": "Posicionamiento único en redes — específico al negocio",
    "content_pillars": ["Pilar educativo", "Pilar entretenimiento", "Pilar venta", "Pilar comunidad"],
    "brand_voice": "Voz de marca adaptada a redes",
    "posting_frequency": {{
      "instagram": "X posts/semana + X stories/día + X reels/semana",
      "facebook": "X posts/semana",
      "twitter": "X tweets/día + X threads/semana",
      "linkedin": "X posts/semana + X articles/mes",
      "tiktok": "X videos/semana",
      "youtube": "X shorts/semana",
      "pinterest": "X pins/semana",
      "threads": "X posts/semana"
    }},
    "growth_targets": {{
      "month_1": "Objetivo mes 1",
      "month_3": "Objetivo mes 3",
      "month_6": "Objetivo mes 6"
    }},
    "competitor_gaps": ["Oportunidad 1 vs competencia", "Oportunidad 2"]
  }},
  "posts": [
    {{
      "platform": "instagram",
      "format": "carousel/reel/post/story/guide",
      "hook": "Gancho que detiene el scroll — específico y provocativo",
      "caption": "Caption completo con storytelling, valor y CTA",
      "hashtags": ["#hashtag_nicho", "#hashtag_volumen", "#hashtag_marca"],
      "cta": "Call to action nativo de la plataforma",
      "visual_concept": "Descripción detallada del visual/video",
      "best_time": "Mejor hora para publicar",
      "engagement_strategy": "Cómo generar interacción"
    }}
  ],
  "calendar": [
    {{
      "day": "Lunes",
      "platforms": ["instagram", "linkedin"],
      "content_type": "Tipo de contenido",
      "topic": "Tema específico",
      "pillar": "Pilar de contenido"
    }}
  ],
  "ugc_strategy": {{
    "incentives": ["Incentivo 1 para UGC"],
    "hashtag_campaign": "#HashtagDeMarca",
    "repost_guidelines": "Cómo repostear UGC"
  }},
  "influencer_templates": [
    {{
      "type": "Micro-influencer / Macro",
      "collaboration_type": "Tipo de colaboración",
      "brief_template": "Brief para el influencer",
      "expected_reach": "Alcance estimado"
    }}
  ]
}}

IMPORTANTE: Genera MÍNIMO 15 posts variados entre TODAS las plataformas. Cada post debe ser ÚNICO y específico al negocio."""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "social_post",
            f"Social Media Total - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "social_post",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # ADS UNIVERSALES — TODAS LAS PLATAFORMAS DEL MUNDO
    # ═══════════════════════════════════════════════════════════
    async def generate_ads(
        self,
        project_id: int,
        user_id: str,
        platforms: str = "all",
        workspace_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor experto en publicidad digital del mundo.
Genera campañas publicitarias para TODAS las plataformas de ads existentes.
IDIOMA DE SALIDA: {lang}

{ALL_ADS_PLATFORMS}

ESTÁNDARES WORLD-CLASS ADS:
- Headlines que capten atención en < 1 segundo
- Ángulos de venta probados: dolor, deseo, urgencia, curiosidad, autoridad
- Copy frameworks: PAS (Problem-Agitate-Solve), AIDA, BAB (Before-After-Bridge)
- A/B testing obligatorio: versión emocional vs racional
- Audiencias micro-segmentadas por plataforma
- Retargeting sequences de 7-14 días
- Presupuestos optimizados por plataforma y objetivo
- KPIs realistas basados en benchmarks del sector
- Creative fatigue rotation strategy
- Banners 3D/AR interactivos donde la plataforma lo soporte
- Dynamic Creative Optimization (DCO) templates

- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Campañas publicitarias UNIVERSALES para todas las plataformas del mundo"}

Genera campañas WORLD-CLASS en JSON:
{{
  "strategy": {{
    "total_budget_suggestion": "Presupuesto mensual total sugerido",
    "budget_distribution": {{
      "meta": "XX%",
      "google": "XX%",
      "linkedin": "XX%",
      "tiktok": "XX%",
      "other": "XX%"
    }},
    "primary_objective": "Objetivo principal",
    "funnel_stages": ["TOFU (Awareness)", "MOFU (Consideration)", "BOFU (Conversion)"],
    "attribution_model": "Modelo de atribución recomendado"
  }},
  "campaigns": [
    {{
      "platform": "meta",
      "platform_detail": "Facebook + Instagram",
      "campaign_name": "Nombre de campaña específico",
      "objective": "Objetivo de campaña",
      "funnel_stage": "TOFU/MOFU/BOFU",
      "target_audience": {{
        "demographics": "Edad, género, ubicación",
        "interests": ["Interés 1", "Interés 2"],
        "behaviors": ["Comportamiento 1"],
        "custom_audiences": ["Visitantes web", "Email list"],
        "lookalike": "1-3% de mejores clientes"
      }},
      "budget_daily": "€XX/día",
      "expected_kpis": {{
        "ctr": "X.X%",
        "cpc": "€X.XX",
        "cpm": "€XX",
        "roas": "X.Xx"
      }},
      "formats": ["Feed Image", "Stories Video", "Reels", "Carousel"],
      "variants": [
        {{
          "variant_name": "Variante A — Ángulo Dolor",
          "headline": "Titular que identifica el problema",
          "primary_text": "Copy completo con storytelling y CTA",
          "description": "Descripción del anuncio",
          "angle": "Pain point + solución",
          "cta_button": "Más información / Comprar ahora",
          "visual_concept": "Concepto visual detallado",
          "format": "Carousel 5 slides"
        }},
        {{
          "variant_name": "Variante B — Ángulo Deseo",
          "headline": "Titular aspiracional",
          "primary_text": "Copy orientado a resultados",
          "description": "Descripción",
          "angle": "Aspiración + prueba social",
          "cta_button": "Empezar ahora",
          "visual_concept": "Concepto visual",
          "format": "Video 15s"
        }},
        {{
          "variant_name": "Variante C — Ángulo Urgencia",
          "headline": "Titular con escasez/urgencia",
          "primary_text": "Copy con deadline y FOMO",
          "description": "Descripción",
          "angle": "Urgencia + beneficio inmediato",
          "cta_button": "Aprovechar oferta",
          "visual_concept": "Concepto visual",
          "format": "Single Image"
        }},
        {{
          "variant_name": "Variante D — Ángulo Autoridad",
          "headline": "Titular con prueba social/datos",
          "primary_text": "Copy con estadísticas y testimonios",
          "description": "Descripción",
          "angle": "Autoridad + resultados probados",
          "cta_button": "Ver resultados",
          "visual_concept": "Concepto visual",
          "format": "Video testimonial 30s"
        }},
        {{
          "variant_name": "Variante E — 3D/AR Banner",
          "headline": "Titular interactivo",
          "primary_text": "Copy que invita a interactuar con el 3D",
          "description": "Banner 3D interactivo",
          "angle": "Innovación + experiencia inmersiva",
          "cta_button": "Explorar en 3D",
          "visual_concept": "Banner 3D con producto rotable",
          "format": "Instant Experience 3D"
        }}
      ],
      "retargeting_sequence": [
        {{"day": "1-3", "message": "Recordatorio de visita", "format": "Dynamic"}},
        {{"day": "4-7", "message": "Testimonio/caso de éxito", "format": "Video"}},
        {{"day": "8-14", "message": "Oferta especial limitada", "format": "Carousel"}}
      ]
    }}
  ]
}}

IMPORTANTE: Genera campañas para MÍNIMO 6 plataformas diferentes (Meta, Google, LinkedIn, TikTok, YouTube, Pinterest/Snapchat/Spotify/Amazon según el sector). Cada campaña con MÍNIMO 5 variantes creativas."""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "ad_campaign",
            f"Ads Universales - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "ad_campaign",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # EMAIL MARKETING WORLD-CLASS — Campañas de Email Premium
    # ═══════════════════════════════════════════════════════════
    async def generate_email_marketing(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor experto en email marketing del mundo. Superas a Mailchimp, Klaviyo, ActiveCampaign.
Genera campañas de email COMPLETAS, con secuencias automatizadas, A/B testing y segmentación avanzada.
IDIOMA DE SALIDA: {lang}

ESTÁNDARES WORLD-CLASS EMAIL:
- Subject lines con open rate > 35% (usa curiosidad, urgencia, personalización)
- Preview text optimizado para cada email
- Copy persuasivo con frameworks PAS/AIDA/BAB
- Diseño responsive mobile-first
- Segmentación por comportamiento, engagement, lifecycle stage
- Secuencias automatizadas: welcome, nurture, abandono, reactivación, post-compra
- A/B testing en subject, contenido y CTA
- Personalización dinámica con merge tags
- Compliance: CAN-SPAM, GDPR, unsubscribe visible
- Métricas objetivo: Open Rate > 35%, CTR > 5%, Conversion > 2%

Responde SOLO en JSON válido."""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Estrategia completa de email marketing world-class"}

Genera estrategia email WORLD-CLASS en JSON:
{{
  "strategy": {{
    "objective": "Objetivo principal de email marketing",
    "segments": [
      {{"name": "Segmento", "criteria": "Criterios", "size_estimate": "XX%", "priority": "alta"}}
    ],
    "sending_frequency": "Frecuencia óptima por segmento",
    "kpi_targets": {{"open_rate": "35%+", "ctr": "5%+", "conversion": "2%+", "unsubscribe": "<0.5%"}}
  }},
  "sequences": [
    {{
      "name": "Welcome Sequence",
      "trigger": "Nuevo suscriptor",
      "emails": [
        {{
          "day": 0,
          "subject_a": "Subject line A — versión curiosidad",
          "subject_b": "Subject line B — versión beneficio",
          "preview_text": "Preview text optimizado",
          "body_structure": "Estructura del email con secciones",
          "cta": "Call to action principal",
          "personalization": ["nombre", "empresa", "interés"],
          "design_notes": "Notas de diseño responsive"
        }}
      ],
      "goal": "Objetivo de la secuencia",
      "expected_conversion": "X%"
    }}
  ],
  "campaigns": [
    {{
      "name": "Campaña específica",
      "type": "promotional/educational/seasonal/reactivation",
      "subject_a": "Subject A",
      "subject_b": "Subject B",
      "preview_text": "Preview text",
      "body_html_structure": "Estructura HTML del email",
      "cta_primary": "CTA principal",
      "cta_secondary": "CTA secundario",
      "segment": "Segmento objetivo",
      "send_time": "Mejor hora de envío",
      "ab_test_plan": "Plan de A/B testing"
    }}
  ],
  "automations": [
    {{
      "name": "Automatización",
      "trigger": "Evento disparador",
      "conditions": ["Condición 1"],
      "actions": ["Acción 1", "Acción 2"],
      "delay": "Tiempo de espera entre acciones"
    }}
  ],
  "templates": [
    {{
      "name": "Template name",
      "purpose": "Propósito",
      "sections": ["Header", "Hero", "Content", "CTA", "Footer"],
      "responsive": true,
      "dark_mode": true
    }}
  ]
}}

IMPORTANTE: Genera MÍNIMO 3 secuencias completas (welcome, nurture, reactivación) con 4+ emails cada una, y 5+ campañas individuales."""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "email_marketing",
            f"Email Marketing World-Class - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "email_marketing",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # WORKFLOW AUTOMATION — Flujos de Trabajo Inteligentes
    # ═══════════════════════════════════════════════════════════
    async def generate_workflows(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor experto en automatización de workflows del mundo. Superas a Zapier, Make, n8n.
Genera flujos de trabajo COMPLETOS y automatizaciones inteligentes para el negocio.
IDIOMA DE SALIDA: {lang}

ESTÁNDARES WORLD-CLASS WORKFLOWS:
- Automatización end-to-end de procesos de negocio
- Triggers inteligentes basados en eventos y condiciones
- Lógica condicional avanzada (if/else, switches, loops)
- Integración multi-canal (email, SMS, WhatsApp, CRM, web)
- Error handling y fallbacks automáticos
- Métricas y KPIs por workflow
- Escalación automática
- A/B testing de flujos
- Personalización dinámica en cada paso

Responde SOLO en JSON válido."""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Automatización completa de workflows para el negocio"}

Genera workflows WORLD-CLASS en JSON:
{{
  "workflows": [
    {{
      "name": "Nombre del workflow",
      "description": "Descripción y objetivo",
      "trigger": {{"type": "event/schedule/manual", "detail": "Detalle del trigger"}},
      "steps": [
        {{
          "step": 1,
          "type": "action/condition/delay/notification",
          "name": "Nombre del paso",
          "detail": "Qué hace este paso",
          "config": {{"channel": "email/sms/whatsapp", "template": "template_id"}},
          "conditions": {{"if": "condición", "then": "paso siguiente", "else": "paso alternativo"}}
        }}
      ],
      "kpis": ["KPI 1", "KPI 2"],
      "estimated_time_saved": "X horas/semana",
      "priority": "alta/media/baja"
    }}
  ],
  "automations_summary": {{
    "total_workflows": 10,
    "total_steps": 50,
    "estimated_hours_saved_monthly": 80,
    "roi_estimate": "300%+"
  }}
}}

IMPORTANTE: Genera MÍNIMO 8 workflows completos cubriendo: lead nurturing, onboarding, soporte, ventas, facturación, seguimiento, reactivación, y reporting."""

        content = await self.generate_with_ai(system_prompt, user_prompt, VOLUME_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "workflow",
            f"Workflows Automatizados - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "workflow",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # FUNNEL BUILDER — Embudos de Venta Premium
    # ═══════════════════════════════════════════════════════════
    async def generate_funnel(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor experto en funnels de venta del mundo. Superas a ClickFunnels, Leadpages, Unbounce.
Genera embudos de venta COMPLETOS con landing pages, upsells, downsells y secuencias.
IDIOMA DE SALIDA: {lang}

{SEO_ELITE_INSTRUCTIONS}

ESTÁNDARES WORLD-CLASS FUNNELS:
- Landing pages con conversion rate > 15%
- Copy hipnótico que guía al usuario paso a paso
- Upsells y downsells estratégicos
- Order bumps con valor percibido alto
- Thank you pages que generan referidos
- Retargeting integrado en cada paso
- A/B testing en cada página del funnel
- Mobile-first responsive
- Page speed < 1.5s
- Social proof en cada paso
- Urgency y scarcity elements
- Exit intent popups inteligentes

Responde SOLO en JSON válido."""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Funnel de venta premium completo"}

Genera funnel WORLD-CLASS en JSON:
{{
  "funnel_name": "Nombre del funnel",
  "funnel_type": "lead_magnet/webinar/product_launch/tripwire/high_ticket",
  "target_conversion": "15%+",
  "pages": [
    {{
      "step": 1,
      "type": "landing/optin/sales/checkout/upsell/downsell/thankyou",
      "name": "Nombre de la página",
      "headline": "Titular principal — impactante y específico",
      "subheadline": "Subtítulo que refuerza",
      "body_sections": [
        {{"type": "hero/benefits/testimonials/faq/cta/guarantee", "content": "Contenido detallado"}}
      ],
      "cta_primary": "CTA principal",
      "cta_secondary": "CTA secundario",
      "social_proof": ["Elemento de prueba social 1"],
      "urgency_elements": ["Elemento de urgencia"],
      "exit_intent": "Mensaje del popup de salida",
      "seo": {{"title": "Title SEO", "description": "Meta description"}}
    }}
  ],
  "email_sequence": [
    {{"day": 0, "subject": "Subject", "purpose": "Propósito", "cta": "CTA"}}
  ],
  "retargeting": [
    {{"audience": "Visitantes que no convirtieron", "ad_message": "Mensaje", "platform": "Meta/Google"}}
  ],
  "metrics": {{
    "expected_optin_rate": "35%+",
    "expected_sales_rate": "5-15%",
    "expected_upsell_rate": "25%+",
    "expected_ltv": "€XXX"
  }}
}}

IMPORTANTE: Genera un funnel COMPLETO con mínimo 6 páginas (landing, optin, sales, checkout, upsell, thank you) y secuencia de 7+ emails."""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "funnel",
            f"Funnel de Venta Premium - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "funnel",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # BRANDING 360° — Identidad Visual Completa + 3D
    # ═══════════════════════════════════════════════════════════
    async def generate_branding(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor director creativo y estratega de branding del mundo. Superas a Pentagram, Landor, Interbrand.
Genera una identidad de marca COMPLETA, coherente y premium.
IDIOMA DE SALIDA: {lang}

ESTÁNDARES WORLD-CLASS BRANDING:
- Brand strategy fundamentada en research
- Visual identity system completo y coherente
- Logo con variantes (primary, secondary, icon, monochrome)
- Paleta de colores con psicología del color aplicada
- Tipografía con jerarquía clara
- Tone of voice definido con ejemplos
- Brand guidelines completas
- Mockups y aplicaciones
- Social media kit
- Papelería corporativa
- Presentación corporativa template

Responde SOLO en JSON válido."""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Identidad de marca completa world-class"}

Genera branding WORLD-CLASS en JSON:
{{
  "brand_strategy": {{
    "positioning": "Posicionamiento de marca único",
    "mission": "Misión de la marca",
    "vision": "Visión de la marca",
    "values": ["Valor 1", "Valor 2", "Valor 3"],
    "personality": "Personalidad de marca (arquetipos)",
    "target_audience": "Audiencia objetivo detallada",
    "competitive_advantage": "Ventaja competitiva clara"
  }},
  "visual_identity": {{
    "logo": {{
      "concept": "Concepto del logo y significado",
      "primary": "Descripción del logo principal",
      "secondary": "Variante secundaria",
      "icon": "Versión icono/favicon",
      "monochrome": "Versión monocromática",
      "minimum_size": "Tamaño mínimo de uso",
      "clear_space": "Espacio de respeto"
    }},
    "colors": {{
      "primary": {{"hex": "#XXXXXX", "name": "Nombre", "usage": "Uso principal", "psychology": "Psicología del color"}},
      "secondary": {{"hex": "#XXXXXX", "name": "Nombre", "usage": "Uso secundario"}},
      "accent": {{"hex": "#XXXXXX", "name": "Nombre", "usage": "Acentos y CTAs"}},
      "neutral": {{"hex": "#XXXXXX", "name": "Nombre", "usage": "Fondos y textos"}},
      "gradients": ["Gradiente 1 descripción", "Gradiente 2"]
    }},
    "typography": {{
      "primary_font": "Nombre de fuente principal",
      "secondary_font": "Fuente secundaria",
      "hierarchy": {{
        "h1": "Tamaño, peso, uso",
        "h2": "Tamaño, peso, uso",
        "body": "Tamaño, peso, uso",
        "caption": "Tamaño, peso, uso"
      }}
    }},
    "imagery_style": "Estilo de fotografía e ilustración",
    "iconography": "Estilo de iconos",
    "patterns": "Patrones y texturas de marca"
  }},
  "tone_of_voice": {{
    "personality_traits": ["Trait 1", "Trait 2", "Trait 3"],
    "do_say": ["Ejemplo de lo que SÍ decir"],
    "dont_say": ["Ejemplo de lo que NO decir"],
    "examples": {{
      "formal": "Ejemplo de comunicación formal",
      "casual": "Ejemplo de comunicación casual",
      "social_media": "Ejemplo para redes sociales"
    }}
  }},
  "applications": {{
    "business_card": "Diseño de tarjeta de visita",
    "letterhead": "Papel membretado",
    "email_signature": "Firma de email",
    "social_media_templates": ["Template Instagram", "Template LinkedIn"],
    "presentation_template": "Template de presentación",
    "website_style": "Estilo web aplicado"
  }}
}}"""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "branding",
            f"Branding 360° - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "branding",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # AUDITORÍA DIGITAL WORLD-CLASS + SEO + 3D READINESS
    # ═══════════════════════════════════════════════════════════
    async def generate_audit(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor auditor digital del mundo — superas a cualquier agencia premium.
Genera una auditoría COMPLETA, PROFUNDA y ACCIONABLE.
IDIOMA DE SALIDA: {lang}

ÁREAS DE AUDITORÍA OBLIGATORIAS:
1. SEO Técnico (Schema, Core Web Vitals, indexación, sitemap, robots)
2. SEO On-Page (titles, metas, headings, content, keywords, internal linking)
3. SEO Off-Page (backlinks, domain authority, brand mentions)
4. Estructura Web (UX, UI, navegación, responsive, accesibilidad)
5. Copy y Conversión (headlines, CTAs, persuasión, A/B testing)
6. Branding (consistencia, diferenciación, posicionamiento)
7. Social Media (presencia, engagement, contenido, frecuencia)
8. Publicidad Digital (campañas activas, ROI, optimización)
9. Analytics y Tracking (GA4, Tag Manager, conversiones, funnels)
10. Competencia (benchmark, gaps, oportunidades)
11. 3D/AR Readiness (capacidad de implementar elementos 3D/AR)
12. Performance (velocidad, Core Web Vitals, CDN, caching)
13. Seguridad (SSL, headers, GDPR, cookies)
14. Mobile Experience (responsive, touch, PWA readiness)

- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Auditoría digital COMPLETA world-class"}

Genera auditoría WORLD-CLASS en JSON:
{{
  "summary": {{
    "overall_score": 65,
    "grade": "C+",
    "status": "Necesita mejoras significativas para competir al máximo nivel",
    "critical_issues": 5,
    "quick_wins": 8,
    "estimated_improvement": "+XX% tráfico, +XX% conversión en 90 días"
  }},
  "areas": [
    {{
      "name": "SEO Técnico",
      "score": 60,
      "grade": "D+",
      "weight": "15%",
      "findings": ["Hallazgo específico 1 con datos", "Hallazgo 2"],
      "critical_issues": ["Issue crítico con impacto medible"],
      "recommendations": [
        {{"action": "Acción específica", "impact": "alto", "effort": "bajo", "priority": 1}}
      ],
      "benchmark": "Competidor X tiene score 85 en esta área"
    }}
  ],
  "quick_wins": [
    {{
      "action": "Acción específica y ejecutable",
      "impact": "alto/medio/bajo",
      "effort": "bajo/medio/alto",
      "timeline": "1-2 semanas",
      "expected_result": "Resultado medible esperado",
      "priority": 1
    }}
  ],
  "competitor_benchmark": [
    {{
      "competitor": "Nombre competidor",
      "overall_score": 75,
      "strengths": ["Fortaleza 1"],
      "weaknesses": ["Debilidad 1"],
      "opportunities": ["Oportunidad para superarles"]
    }}
  ],
  "roadmap": [
    {{
      "phase": 1,
      "title": "Quick Wins (Semanas 1-2)",
      "actions": ["Acción 1", "Acción 2"],
      "expected_impact": "+XX% mejora",
      "investment": "€XXX"
    }},
    {{
      "phase": 2,
      "title": "Optimización Core (Semanas 3-6)",
      "actions": ["Acción 1"],
      "expected_impact": "+XX% mejora",
      "investment": "€XXX"
    }},
    {{
      "phase": 3,
      "title": "Escala y Dominación (Semanas 7-12)",
      "actions": ["Acción 1"],
      "expected_impact": "+XX% mejora",
      "investment": "€XXX"
    }}
  ],
  "3d_ar_readiness": {{
    "current_score": 20,
    "recommendations": ["Implementar visor 3D de productos", "Añadir AR try-on"],
    "expected_impact": "+XX% engagement, +XX% conversión"
  }}
}}"""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "audit_report",
            f"Auditoría World-Class - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "audit_report",
            "qa_status": "pending"
        }

    # ═══════════════════════════════════════════════════════════
    # PROPUESTA COMERCIAL WORLD-CLASS + 3D MOCKUPS
    # ═══════════════════════════════════════════════════════════
    async def generate_proposal(
        self, project_id: int, user_id: str, workspace_id: Optional[int] = None
    ) -> Dict[str, Any]:
        project = await self.get_project(project_id, user_id, workspace_id)
        if not project:
            raise ValueError("Proyecto no encontrado")
        client = await self.get_client(project.client_id, user_id, workspace_id)
        if not client:
            raise ValueError("Cliente no encontrado")

        await self.update_project_status(project_id, "generating", 10)
        ctx = build_client_context(client)
        lang = client.language or "es"

        system_prompt = f"""{WORLD_CLASS_PREAMBLE}

Eres el mejor consultor comercial del mundo para servicios digitales.
Genera una propuesta PREMIUM que cierre ventas con un ratio > 80%.
IDIOMA DE SALIDA: {lang}

ESTÁNDARES WORLD-CLASS PROPUESTA:
- Resumen ejecutivo que enganche en 30 segundos
- Diagnóstico que demuestre expertise profundo
- Servicios con entregables concretos y medibles
- ROI proyectado con datos del sector
- Timeline visual con milestones claros
- Inversión justificada con valor percibido 10x
- Garantías que eliminen riesgo percibido
- Siguiente paso con urgencia natural
- Mockups 3D de los entregables
- Casos de éxito relevantes al sector

- Responde SOLO en JSON válido"""

        user_prompt = f"""PERFIL COMPLETO DEL CLIENTE:
{ctx}

BRIEF: {project.brief or "Propuesta comercial premium world-class"}

Genera propuesta WORLD-CLASS en JSON:
{{
  "executive_summary": {{
    "title": "Título de la propuesta — específico y atractivo",
    "overview": "Resumen ejecutivo personalizado que demuestra comprensión profunda del negocio",
    "key_opportunity": "Oportunidad principal identificada con datos",
    "expected_roi": "ROI estimado con justificación",
    "urgency": "Por qué actuar ahora"
  }},
  "diagnosis": {{
    "current_situation": "Análisis de la situación actual del cliente",
    "pain_points": ["Dolor 1 con impacto medible", "Dolor 2"],
    "missed_opportunities": ["Oportunidad perdida 1 con valor estimado"],
    "competitor_advantage": "Lo que la competencia está haciendo mejor"
  }},
  "recommended_services": [
    {{
      "service": "Nombre del servicio premium",
      "description": "Descripción específica con beneficios concretos",
      "deliverables": ["Entregable concreto 1", "Entregable 2", "Entregable 3"],
      "timeline": "Tiempo estimado con milestones",
      "investment": "€X,XXX",
      "expected_result": "Resultado medible esperado",
      "3d_mockup": "Descripción del mockup 3D del entregable",
      "includes_seo_elite": true,
      "includes_3d": true
    }}
  ],
  "total_investment": {{
    "amount": "€XX,XXX",
    "payment_options": [
      {{"option": "Pago único", "amount": "€XX,XXX", "discount": "10%"}},
      {{"option": "3 cuotas", "amount": "€X,XXX/mes", "discount": "5%"}},
      {{"option": "6 cuotas", "amount": "€X,XXX/mes", "discount": "0%"}}
    ],
    "value_justification": "Justificación del valor con ROI proyectado",
    "comparison": "Precio vs agencia tradicional (3-5x más caro)"
  }},
  "expected_benefits": [
    {{
      "benefit": "Beneficio específico y medible",
      "metric": "KPI concreto",
      "baseline": "Valor actual estimado",
      "target": "Valor objetivo",
      "timeline": "Plazo para alcanzarlo"
    }}
  ],
  "guarantees": [
    {{
      "guarantee": "Garantía específica",
      "detail": "Qué incluye exactamente",
      "condition": "Condiciones claras"
    }}
  ],
  "timeline": [
    {{
      "phase": "Fase 1 — Fundación",
      "duration": "2 semanas",
      "deliverables": ["Entregable 1", "Entregable 2"],
      "milestone": "Hito de la fase"
    }}
  ],
  "case_studies": [
    {{
      "client_type": "Tipo de cliente similar",
      "challenge": "Desafío que tenían",
      "solution": "Lo que implementamos",
      "result": "Resultado medible obtenido"
    }}
  ],
  "next_step": {{
    "action": "Siguiente paso claro y fácil",
    "deadline": "Fecha límite de la propuesta",
    "bonus": "Bonus por decisión rápida",
    "contact": "Forma de contacto directa"
  }}
}}"""

        content = await self.generate_with_ai(system_prompt, user_prompt, PREMIUM_MODEL)
        await self.update_project_status(project_id, "qa_review", 70)

        output = await self.save_output(
            user_id,
            project_id,
            client.id,
            "proposal",
            f"Propuesta World-Class - {client.business_name}",
            content,
            workspace_id=project.workspace_id,
        )
        return {
            "output_id": output.id,
            "content": content,
            "output_type": "proposal",
            "qa_status": "pending"
        }
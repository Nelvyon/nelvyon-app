"""Frente 59 — Export OS websites to static HTML on Supabase CDN."""

from __future__ import annotations

import html
import json
import logging
import re
from typing import Any

from services.image_optimizer import build_picture_html
from services.supabase_service import get_supabase_service
from services.web_cache_service import CACHE_HEADERS_ASSET, set_asset_meta

logger = logging.getLogger(__name__)

WEBSITES_BUCKET = "websites"

CRITICAL_CSS = """
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;line-height:1.6;color:#0f172a;background:#fff}
.hero{position:relative;min-height:min(70vh,720px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem;overflow:hidden}
.hero__bg{position:absolute;inset:0;object-fit:cover;width:100%;height:100%;z-index:0}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.35),rgba(15,23,42,.75));z-index:1}
.hero h1,.hero p,.hero a{position:relative;z-index:2}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin:0;color:#fff}
.hero p{max-width:42rem;margin:1rem auto 0;color:rgba(255,255,255,.92)}
.btn{display:inline-flex;align-items:center;min-height:48px;padding:.75rem 2rem;border-radius:9999px;background:#fff;color:#0f172a;font-weight:600;text-decoration:none;margin-top:2rem}
section{padding:3rem 1.5rem;max-width:72rem;margin:0 auto}
nav{display:flex;flex-wrap:wrap;gap:1rem;padding:1rem 1.5rem;max-width:72rem;margin:0 auto}
nav a{color:#334155;text-decoration:none;font-size:.875rem}
.grid-3{display:grid;gap:1.5rem}
@media(min-width:768px){.grid-3{grid-template-columns:repeat(3,1fr)}}
img{max-width:100%;height:auto}
""".strip()


def _esc(val: Any) -> str:
    return html.escape(str(val or ""), quote=True)


def _str_prop(props: dict[str, Any], key: str, default: str = "") -> str:
    v = props.get(key)
    return str(v) if v is not None else default


def _img_tag(
    url: str,
    *,
    alt: str = "",
    width: int | None = None,
    height: int | None = None,
    lazy: bool = True,
    variants: dict[str, str] | None = None,
) -> str:
    if variants:
        return build_picture_html(
            variants, alt=alt, lazy=lazy, width=width, height=height
        )
    loading = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    w = f' width="{width}"' if width else ""
    h = f' height="{height}"' if height else ""
    return f'<img src="{_esc(url)}" alt="{_esc(alt)}"{w}{h}{loading} decoding="async">'


def _render_block(block: dict[str, Any], *, is_home: bool, block_index: int) -> str:
    btype = block.get("type") or ""
    props = block.get("props") or {}
    lazy_default = block_index > 0 or btype not in ("hero", "hero_3d")

    if btype in ("hero", "hero_3d"):
        headline = _str_prop(props, "headline", "Welcome")
        sub = _str_prop(props, "subheadline")
        cta = _str_prop(props, "ctaText")
        cta_url = _str_prop(props, "ctaUrl", "#")
        img = _str_prop(props, "imageUrl") or _str_prop(props, "hero_image_url")
        variants = props.get("imageVariants") if isinstance(props.get("imageVariants"), dict) else None
        hero_img = ""
        if img or variants:
            hero_img = (
                '<div class="hero__media" style="position:absolute;inset:0">'
        + _img_tag(
                    img,
                    alt=headline,
                    width=1920,
                    height=1080,
                    lazy=False,
                    variants=variants,
                )
                + "</div>"
            )
        preload = ""
        if is_home and (img or (variants and variants.get("desktop"))):
            href = (variants or {}).get("desktop") or img
            preload = f'<link rel="preload" as="image" href="{_esc(href)}">'
        sub_html = f"<p>{_esc(sub)}</p>" if sub else ""
        cta_html = f'<a class="btn" href="{_esc(cta_url)}">{_esc(cta)}</a>' if cta else ""
        return (
            f"{preload}<section class=\"hero\">{hero_img}<div class=\"hero__overlay\"></div>"
            f"<h1>{_esc(headline)}</h1>"
            f"{sub_html}"
            f"{cta_html}"
            "</section>"
        )

    if btype == "text":
        return f'<section><p>{_esc(_str_prop(props, "content"))}</p></section>'

    if btype == "image":
        url = _str_prop(props, "imageUrl")
        if not url:
            return ""
        variants = props.get("imageVariants") if isinstance(props.get("imageVariants"), dict) else None
        return f'<section>{_img_tag(url, alt=_str_prop(props, "alt"), width=1200, height=675, lazy=lazy_default, variants=variants)}</section>'

    if btype == "cta":
        return (
            f'<section style="text-align:center;background:{_esc(_str_prop(props, "backgroundColor", "#2563eb"))};'
            f'color:{_esc(_str_prop(props, "textColor", "#fff"))};border-radius:1.5rem;padding:3rem">'
            f'<h2>{_esc(_str_prop(props, "headline"))}</h2>'
            f'<p>{_esc(_str_prop(props, "subheadline"))}</p>'
            f'<a class="btn" href="{_esc(_str_prop(props, "buttonUrl", "#"))}">{_esc(_str_prop(props, "buttonText", "Continue"))}</a>'
            "</section>"
        )

    if btype == "testimonials":
        items = props.get("items") or []
        cards = []
        for t in items:
            if not isinstance(t, dict):
                continue
            cards.append(
                f'<blockquote style="border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem">'
                f'<p>{_esc(t.get("quote"))}</p>'
                f'<footer><strong>{_esc(t.get("author"))}</strong></footer></blockquote>'
            )
        return f'<section><div class="grid-3">{"".join(cards)}</div></section>'

    if btype == "pricing":
        plans = props.get("plans") or []
        cards = []
        for plan in plans:
            if not isinstance(plan, dict):
                continue
            feats = "".join(f"<li>{_esc(f)}</li>" for f in (plan.get("features") or []))
            cards.append(
                f'<div style="border:1px solid #e2e8f0;border-radius:1rem;padding:1.5rem">'
                f'<h3>{_esc(plan.get("name"))}</h3><p style="font-size:2rem;font-weight:700">{_esc(plan.get("price"))}</p>'
                f"<ul>{feats}</ul></div>"
            )
        return f'<section><div class="grid-3">{"".join(cards)}</div></section>'

    if btype == "faq":
        items = props.get("items") or []
        parts = []
        for item in items:
            if not isinstance(item, dict):
                continue
            parts.append(
                f'<details style="margin-bottom:.5rem;border:1px solid #e2e8f0;border-radius:.75rem;padding:1rem">'
                f'<summary>{_esc(item.get("question"))}</summary>'
                f'<p>{_esc(item.get("answer"))}</p></details>'
            )
        return f"<section>{''.join(parts)}</section>"

    if btype == "form":
        return (
            f'<section><h2>{_esc(_str_prop(props, "headline", "Contact"))}</h2>'
            '<form method="post" action="#"><input name="email" type="email" required placeholder="Email">'
            f'<button type="submit">{_esc(_str_prop(props, "submitText", "Send"))}</button></form></section>'
        )

    if btype in ("stats_3d", "product_3d"):
        return (
            f'<section data-block="{_esc(btype)}" data-lazy-3d="true" style="min-height:320px">'
            f'<p>{_esc(_str_prop(props, "headline", ""))}</p>'
            '<div class="lazy-3d-placeholder" style="background:#f1f5f9;border-radius:1rem;min-height:280px"></div>'
            "</section>"
        )

    return ""


def build_page_html(
    *,
    title: str,
    blocks: list[dict[str, Any]],
    navigation: list[dict[str, Any]],
    meta: dict[str, Any],
    is_home: bool,
    site_base: str,
    subdomain: str,
) -> str:
    nav_parts: list[str] = []
    for n in navigation:
        if not isinstance(n, dict):
            continue
        href = n.get("href") or f"/site/{subdomain}/{n.get('slug', '')}"
        nav_parts.append(f'<a href="{_esc(href)}">{_esc(n.get("label"))}</a>')
    nav_links = "".join(nav_parts)
    body_blocks = []
    for i, block in enumerate(blocks):
        if isinstance(block, dict):
            body_blocks.append(_render_block(block, is_home=is_home, block_index=i))

    desc = _esc(meta.get("description") or "")
    schema = meta.get("schema_org")
    schema_tag = ""
    if schema:
        schema_tag = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'

    worker_loader = """
<script defer>
(function(){
  var q=[];function run(){while(q.length){try{q.shift()();}catch(e){}}}
  window.__nelvyonDefer=function(fn){if('requestIdleCallback' in window){requestIdleCallback(fn);}else{setTimeout(fn,1);}};
  window.__nelvyonQueue=q;
})();
</script>
<script defer async src="https://www.googletagmanager.com/gtag/js?id=G-PLACEHOLDER"></script>
<script defer>
window.__nelvyonDefer(function(){
  window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());gtag('config','G-PLACEHOLDER');
});
</script>
<script defer>
(function(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target;
      if(el.dataset.lazy3dInit)return;
      el.dataset.lazy3dInit='1';
      el.querySelector('.lazy-3d-placeholder').textContent='3D experience loads on interaction';
      obs.unobserve(el);
    });
  },{rootMargin:'200px'});
  document.querySelectorAll('[data-lazy-3d]').forEach(function(n){obs.observe(n);});
  document.querySelectorAll('img[loading="lazy"]').forEach(function(img){
    if(!img.width||!img.height){img.width=img.naturalWidth||1200;img.height=img.naturalHeight||675;}
  });
})();
</script>
"""

    return f"""<!DOCTYPE html>
<html lang="{_esc(meta.get("lang") or "es")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_esc(title)}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" media="print" onload="this.media='all'">
<style>{CRITICAL_CSS}</style>
{schema_tag}
</head>
<body>
<nav>{nav_links}</nav>
<main>
{"".join(body_blocks)}
</main>
{worker_loader}
</body>
</html>"""


async def export_website_static(
    *,
    workspace_id: int,
    website_id: str,
    website_json: dict[str, Any],
    subdomain: str,
    site_base: str,
) -> dict[str, Any]:
    """Upload all pages to Supabase; return CDN URLs per slug."""
    supabase = get_supabase_service()
    prefix = f"{workspace_id}/{website_id}"
    pages = website_json.get("pages") or []
    nav = []
    for p in pages:
        slug = p.get("page_slug") or "home"
        nav.append({"label": p.get("meta", {}).get("title") or slug, "slug": slug, "href": f"{site_base}/site/{subdomain}/{slug}" if slug != "home" else f"{site_base}/site/{subdomain}"})

    urls: dict[str, str] = {}
    for p in pages:
        slug = p.get("page_slug") or "home"
        blocks = p.get("blocks") or []
        meta = p.get("meta") or {}
        title = meta.get("title") or p.get("name") or slug
        is_home = slug in ("home", "", "/")
        html_doc = build_page_html(
            title=title,
            blocks=blocks,
            navigation=nav,
            meta=meta,
            is_home=is_home,
            site_base=site_base,
            subdomain=subdomain,
        )
        file_name = "index.html" if is_home else f"{re.sub(r'[^a-z0-9_-]+', '-', slug.lower())}.html"
        path = f"{prefix}/{file_name}"
        up = await supabase.upload_bytes(
            WEBSITES_BUCKET,
            path,
            html_doc.encode("utf-8"),
            content_type="text/html; charset=utf-8",
        )
        public = up.get("public_url") or supabase.public_url(WEBSITES_BUCKET, path)
        urls[slug] = public
        await set_asset_meta(path, {"url": public, "cache_control": CACHE_HEADERS_ASSET})

    cdn_base = supabase.public_url(WEBSITES_BUCKET, prefix)
    return {"pages": urls, "cdn_base": cdn_base, "index_url": urls.get("home") or next(iter(urls.values()), cdn_base)}

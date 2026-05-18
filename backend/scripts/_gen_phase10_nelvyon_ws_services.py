"""One-off generator: clone nelvyon_projects workspace service for other nelvyon_* models."""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEMPLATE = (ROOT / "services" / "nelvyon_projects.py").read_text(encoding="utf-8")

PAIRS = [
    ("Nelvyon_agents", "nelvyon_agents", "Nelvyon_agents"),
    ("Nelvyon_assets", "nelvyon_assets", "Nelvyon_assets"),
    ("Nelvyon_clients", "nelvyon_clients", "Nelvyon_clients"),
    ("Nelvyon_products", "nelvyon_products", "Nelvyon_products"),
    ("Nelvyon_user_settings", "nelvyon_user_settings", "Nelvyon_user_settings"),
]

for cls, slug, model in PAIRS:
    text = TEMPLATE
    text = text.replace("Nelvyon_projects", model)
    text = text.replace("nelvyon_projects", slug)
    text = text.replace("Nelvyon_projectsService", f"{cls}Service")
    text = text.replace("Legacy nelvyon_projects — workspace-scoped (Fase 6).", f"Legacy {slug} — workspace-scoped (Fase 10).")
    (ROOT / "services" / f"{slug}.py").write_text(text, encoding="utf-8")
    print("wrote", slug)

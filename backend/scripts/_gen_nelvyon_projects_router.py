from pathlib import Path

root = Path(__file__).resolve().parent.parent
s = (root / "routers" / "nelvyon_campaigns.py").read_text(encoding="utf-8")
s = s.replace("Nelvyon_campaigns", "Nelvyon_projects")
s = s.replace("nelvyon_campaigns", "nelvyon_projects")
s = s.replace("_mark_legacy_campaign_domain", "_mark_legacy_nelvyon_projects")
s = s.replace(
    "Official operational campaigns domain is /entities/campaigns.",
    "Legacy OS projects; prefer workspace-scoped CRM where applicable.",
)
s = s.replace("X-Campaign-Domain", "X-Nelvyon-Projects-Domain")
s = s.replace("X-Campaign-Official-Domain", "X-Projects-Official-Domain")
s = s.replace('"campaigns"', '"deals"')
s = s.replace(
    '</api/v1/entities/campaigns>; rel="successor-version"',
    '</api/v1/entities/deals>; rel="successor-version"',
)
old = "    id: int\n    user_id: str\n    project_id: int"
new = "    id: int\n    user_id: str\n    workspace_id: Optional[int] = None\n    project_id: int"
if old not in s:
    raise SystemExit("schema anchor missing")
s = s.replace(old, new, 1)
old2 = 'class Nelvyon_projectsData(BaseModel):\n    """Entity data schema (for create/update)"""\n    project_id: int'
new2 = 'class Nelvyon_projectsData(BaseModel):\n    """Entity data schema (for create/update)"""\n    workspace_id: int = None\n    project_id: int'
s = s.replace(old2, new2, 1)
old3 = 'class Nelvyon_projectsUpdateData(BaseModel):\n    """Update entity data (partial updates allowed)"""\n    client_id: Optional[int] = None'
new3 = 'class Nelvyon_projectsUpdateData(BaseModel):\n    """Update entity data (partial updates allowed)"""\n    workspace_id: Optional[int] = None\n    client_id: Optional[int] = None'
s = s.replace(old3, new3, 1)
(root / "routers" / "nelvyon_projects.py").write_text(s, encoding="utf-8")
print("ok", len(s))

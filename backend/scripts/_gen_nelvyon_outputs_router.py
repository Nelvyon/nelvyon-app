from pathlib import Path

root = Path(__file__).resolve().parent.parent
s = (root / "routers" / "nelvyon_campaigns.py").read_text(encoding="utf-8")
s = s.replace("Nelvyon_campaigns", "Nelvyon_outputs")
s = s.replace("nelvyon_campaigns", "nelvyon_outputs")
s = s.replace("_mark_legacy_campaign_domain", "_mark_legacy_nelvyon_outputs")
s = s.replace(
    "Official operational campaigns domain is /entities/campaigns.",
    "Legacy OS deliverables; workspace-scoped.",
)
s = s.replace("X-Campaign-Domain", "X-Nelvyon-Outputs-Domain")
s = s.replace("X-Campaign-Official-Domain", "X-Outputs-Official-Domain")
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
(root / "routers" / "nelvyon_outputs.py").write_text(s, encoding="utf-8")
print("ok", len(s))

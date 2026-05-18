from core.advisor_entitlements import resolve_advisor_entitlements


def test_resolve_starter_maps_to_basic_caps():
    got = resolve_advisor_entitlements("starter")
    assert got["tier"] == "basic"
    assert got["sessions_per_month"] == 6
    assert got["output_profile"] == "focus"


def test_resolve_pro_maps_to_growth_more_modules():
    got = resolve_advisor_entitlements("pro")
    assert got["tier"] == "growth"
    assert "traction_signals" in got["modules"]
    assert got["sessions_per_month"] == 24


def test_resolve_enterprise_maps_to_executive_review():
    got = resolve_advisor_entitlements("enterprise")
    assert got["tier"] == "executive"
    assert "risk_register" in got["modules"]
    assert got["sessions_per_month"] == 80


def test_resolve_partner_is_narrow_basic():
    got = resolve_advisor_entitlements("partner")
    assert got["tier"] == "basic"


def test_resolve_unknown_plan_falls_back_to_basic():
    got = resolve_advisor_entitlements("custom-enterprise-x")
    assert got["tier"] == "basic"

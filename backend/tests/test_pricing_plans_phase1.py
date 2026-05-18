from core.pricing_plans import get_limit, get_plan_definition, get_plan_label


def test_pricing_phase1_core_plans_defined():
    starter = get_plan_definition("starter")
    pro = get_plan_definition("pro")
    enterprise = get_plan_definition("enterprise")

    assert starter["label"] == "Starter"
    assert pro["label"] == "Pro"
    assert enterprise["label"] == "Enterprise"


def test_pricing_phase1_limits_are_coherent():
    assert get_limit("starter", "contacts") == 2500
    assert get_limit("starter", "active_campaigns") == 10
    assert get_limit("starter", "active_workflows") == 10
    assert get_limit("starter", "workspace_users") == 3

    assert get_limit("pro", "contacts") == 25000
    assert get_limit("pro", "active_campaigns") == 200
    assert get_limit("pro", "active_workflows") == 100
    assert get_limit("pro", "workspace_users") == 20

    assert get_limit("enterprise", "contacts") is None
    assert get_limit("enterprise", "active_campaigns") is None
    assert get_limit("enterprise", "active_workflows") is None
    assert get_limit("enterprise", "workspace_users") is None


def test_pricing_phase1_unknown_plan_falls_back_to_starter():
    assert get_plan_label("unknown-plan") == "Starter"
    assert get_limit("unknown-plan", "contacts") == 2500

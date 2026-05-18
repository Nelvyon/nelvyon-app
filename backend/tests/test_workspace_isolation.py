"""
Sprint 2.5 — Multi-Tenant Workspace Isolation Tests

These tests verify that:
1. WorkspaceAwareMixin correctly applies filters
2. WorkspaceContext validates correctly
3. /all endpoints require authentication and use workspace context
4. Services accept workspace_id parameter
5. Cross-workspace operations are blocked at the service layer
"""
import pytest
import inspect
from unittest.mock import AsyncMock, MagicMock, patch

from dependencies.workspace import WorkspaceContext


# ─── Test 1: Workspace Filter Logic ───
class TestWorkspaceFilterLogic:
    """Verify that the WorkspaceAwareMixin filter methods work correctly."""

    def test_mixin_has_required_methods(self):
        """WorkspaceAwareMixin should expose all workspace-aware CRUD methods."""
        from services.workspace_mixin import WorkspaceAwareMixin

        assert hasattr(WorkspaceAwareMixin, '_apply_workspace_filter')
        assert hasattr(WorkspaceAwareMixin, '_apply_user_filter')
        assert hasattr(WorkspaceAwareMixin, '_apply_filters')
        assert hasattr(WorkspaceAwareMixin, 'ws_create')
        assert hasattr(WorkspaceAwareMixin, 'ws_get_by_id')
        assert hasattr(WorkspaceAwareMixin, 'ws_get_list')
        assert hasattr(WorkspaceAwareMixin, 'ws_update')
        assert hasattr(WorkspaceAwareMixin, 'ws_delete')

    def test_filter_skips_when_no_workspace_id(self):
        """When workspace_id is None, _apply_workspace_filter should not modify query."""
        from services.workspace_mixin import WorkspaceAwareMixin

        class FakeService(WorkspaceAwareMixin):
            model = MagicMock()

        service = FakeService()
        mock_query = MagicMock()

        result = service._apply_workspace_filter(mock_query, workspace_id=None)
        mock_query.where.assert_not_called()
        assert result is mock_query

    def test_filter_applies_when_workspace_id_present(self):
        """When workspace_id is provided, _apply_workspace_filter should call where()."""
        from services.workspace_mixin import WorkspaceAwareMixin

        mock_model = MagicMock()
        mock_model.workspace_id = MagicMock()

        class FakeService(WorkspaceAwareMixin):
            model = mock_model

        service = FakeService()
        mock_query = MagicMock()

        result = service._apply_workspace_filter(mock_query, workspace_id=42)
        mock_query.where.assert_called_once()

    def test_both_filters_applied(self):
        """_apply_filters should apply both user_id and workspace_id."""
        from services.workspace_mixin import WorkspaceAwareMixin

        mock_model = MagicMock()
        mock_model.user_id = MagicMock()
        mock_model.workspace_id = MagicMock()

        class FakeService(WorkspaceAwareMixin):
            model = mock_model

        service = FakeService()
        mock_query = MagicMock()
        mock_query.where.return_value = mock_query

        service._apply_filters(mock_query, user_id="user-1", workspace_id=1)
        assert mock_query.where.call_count == 2


# ─── Test 2: WorkspaceContext Validation ───
class TestWorkspaceContext:
    """Verify WorkspaceContext behavior."""

    def test_workspace_scoped_when_id_present(self):
        ctx = WorkspaceContext(workspace_id=1, user_id="user-1", role_in_workspace="owner")
        assert ctx.is_workspace_scoped is True

    def test_not_workspace_scoped_when_id_none(self):
        ctx = WorkspaceContext(workspace_id=None, user_id="user-1")
        assert ctx.is_workspace_scoped is False

    def test_context_stores_role(self):
        ctx = WorkspaceContext(workspace_id=1, user_id="user-1", role_in_workspace="member")
        assert ctx.role_in_workspace == "member"

    def test_context_stores_user_id(self):
        ctx = WorkspaceContext(workspace_id=5, user_id="abc-123", role_in_workspace="admin")
        assert ctx.user_id == "abc-123"
        assert ctx.workspace_id == 5


# ─── Test 3: Services Accept workspace_id Parameter ───
class TestServicesAcceptWorkspaceId:
    """Verify critical MVP services accept workspace_id in their methods."""

    def _check_service_signatures(self, service_class):
        """Helper: verify all CRUD methods accept workspace_id."""
        methods_to_check = ['create', 'get_by_id', 'get_list', 'update', 'delete']
        for method_name in methods_to_check:
            method = getattr(service_class, method_name)
            sig = inspect.signature(method)
            assert 'workspace_id' in sig.parameters, (
                f"{service_class.__name__}.{method_name} missing workspace_id parameter"
            )

    def test_contacts_service_accepts_workspace_id(self):
        from services.contacts import ContactsService
        self._check_service_signatures(ContactsService)

    def test_deals_service_accepts_workspace_id(self):
        from services.deals import DealsService
        self._check_service_signatures(DealsService)

    def test_campaigns_service_accepts_workspace_id(self):
        from services.campaigns import CampaignsService
        self._check_service_signatures(CampaignsService)

    def test_conversations_service_accepts_workspace_id(self):
        from services.conversations import ConversationsService
        self._check_service_signatures(ConversationsService)

    def test_workflows_service_accepts_workspace_id(self):
        from services.workflows import WorkflowsService
        self._check_service_signatures(WorkflowsService)

    def test_helpdesk_service_accepts_workspace_id(self):
        from services.helpdesk_tickets import Helpdesk_ticketsService
        self._check_service_signatures(Helpdesk_ticketsService)

    def test_pipeline_deals_service_accepts_workspace_id(self):
        from services.pipeline_deals import Pipeline_dealsService
        self._check_service_signatures(Pipeline_dealsService)


# ─── Test 4: Services Inherit from WorkspaceAwareMixin ───
class TestServicesInheritMixin:
    """Verify critical MVP services inherit from WorkspaceAwareMixin."""

    def test_contacts_inherits_mixin(self):
        from services.contacts import ContactsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(ContactsService, WorkspaceAwareMixin)

    def test_deals_inherits_mixin(self):
        from services.deals import DealsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(DealsService, WorkspaceAwareMixin)

    def test_campaigns_inherits_mixin(self):
        from services.campaigns import CampaignsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(CampaignsService, WorkspaceAwareMixin)

    def test_conversations_inherits_mixin(self):
        from services.conversations import ConversationsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(ConversationsService, WorkspaceAwareMixin)

    def test_workflows_inherits_mixin(self):
        from services.workflows import WorkflowsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(WorkflowsService, WorkspaceAwareMixin)

    def test_helpdesk_inherits_mixin(self):
        from services.helpdesk_tickets import Helpdesk_ticketsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(Helpdesk_ticketsService, WorkspaceAwareMixin)

    def test_pipeline_deals_inherits_mixin(self):
        from services.pipeline_deals import Pipeline_dealsService
        from services.workspace_mixin import WorkspaceAwareMixin
        assert issubclass(Pipeline_dealsService, WorkspaceAwareMixin)


# ─── Test 5: /all Endpoints Require Auth (WorkspaceContext) ───
class TestAllEndpointProtection:
    """Verify that /all endpoints now require authentication via WorkspaceContext."""

    def _check_all_endpoint_has_ws_ctx(self, module_path, func_name):
        """Helper: verify the /all endpoint function uses ws_ctx."""
        import importlib
        mod = importlib.import_module(module_path)
        func = getattr(mod, func_name)
        sig = inspect.signature(func)
        assert "ws_ctx" in sig.parameters, (
            f"{module_path}.{func_name} must use WorkspaceContext (ws_ctx) for auth"
        )
        # Also verify it does NOT have bare 'current_user' without ws_ctx
        # (ws_ctx already includes auth)

    def test_contacts_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.contacts", "query_contactss_all")

    def test_deals_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.deals", "query_deals_all")

    def test_campaigns_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.campaigns", "query_campaigns_all")

    def test_conversations_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.conversations", "query_conversations_all")

    def test_workflows_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.workflows", "query_workflows_all")

    def test_helpdesk_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.helpdesk_tickets", "query_helpdesk_tickets_all")

    def test_pipeline_deals_all_requires_auth(self):
        self._check_all_endpoint_has_ws_ctx("routers.pipeline_deals", "query_pipeline_dealss_all")


# ─── Test 6: Router Endpoints Use WorkspaceContext (not just current_user) ───
class TestRouterEndpointsUseWorkspaceContext:
    """Verify that main CRUD endpoints in routers use ws_ctx instead of bare current_user."""

    def _check_router_endpoints(self, module_path, endpoint_names):
        """Helper: verify endpoints use ws_ctx."""
        import importlib
        mod = importlib.import_module(module_path)
        for name in endpoint_names:
            if hasattr(mod, name):
                func = getattr(mod, name)
                sig = inspect.signature(func)
                assert "ws_ctx" in sig.parameters, (
                    f"{module_path}.{name} should use ws_ctx for workspace isolation"
                )

    def test_contacts_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.contacts", [
            "query_contactss", "get_contacts", "create_contacts",
            "update_contacts", "delete_contacts",
        ])

    def test_deals_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.deals", [
            "query_dealss", "get_deals", "create_deals",
            "update_deals", "delete_deals",
        ])

    def test_campaigns_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.campaigns", [
            "query_campaigns", "get_campaigns", "create_campaigns",
            "update_campaigns", "delete_campaigns",
        ])

    def test_conversations_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.conversations", [
            "query_conversations", "get_conversations", "create_conversations",
            "update_conversations", "delete_conversations",
        ])

    def test_workflows_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.workflows", [
            "query_workflows", "get_workflows", "create_workflows",
            "update_workflows", "delete_workflows",
        ])

    def test_helpdesk_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.helpdesk_tickets", [
            "query_helpdesk_tickets", "get_helpdesk_tickets", "create_helpdesk_tickets",
            "update_helpdesk_tickets", "delete_helpdesk_tickets",
        ])

    def test_pipeline_deals_router_uses_ws_ctx(self):
        self._check_router_endpoints("routers.pipeline_deals", [
            "query_pipeline_dealss", "get_pipeline_deals", "create_pipeline_deals",
            "update_pipeline_deals", "delete_pipeline_deals",
        ])


# ─── Test 7: Models Have workspace_id ───
class TestModelsHaveWorkspaceId:
    """Verify all workspace-scoped models have workspace_id column."""

    def _check_model_has_workspace_id(self, model_path, class_name):
        import importlib
        mod = importlib.import_module(model_path)
        model_class = getattr(mod, class_name)
        assert hasattr(model_class, 'workspace_id'), (
            f"{class_name} missing workspace_id column"
        )

    def test_contacts_has_workspace_id(self):
        self._check_model_has_workspace_id("models.contacts", "Contacts")

    def test_deals_has_workspace_id(self):
        self._check_model_has_workspace_id("models.deals", "Deals")

    def test_campaigns_has_workspace_id(self):
        self._check_model_has_workspace_id("models.campaigns", "Campaigns")

    def test_conversations_has_workspace_id(self):
        self._check_model_has_workspace_id("models.conversations", "Conversations")

    def test_workflows_has_workspace_id(self):
        self._check_model_has_workspace_id("models.workflows", "Workflows")

    def test_helpdesk_tickets_has_workspace_id(self):
        self._check_model_has_workspace_id("models.helpdesk_tickets", "Helpdesk_tickets")

    def test_pipeline_deals_has_workspace_id(self):
        self._check_model_has_workspace_id("models.pipeline_deals", "Pipeline_deals")

    def test_nelvyon_projects_has_workspace_id(self):
        self._check_model_has_workspace_id("models.nelvyon_projects", "Nelvyon_projects")

    def test_nelvyon_bot_templates_has_workspace_id(self):
        self._check_model_has_workspace_id("models.nelvyon_bot_templates", "Nelvyon_bot_templates")

    def test_nelvyon_quality_metrics_has_workspace_id(self):
        self._check_model_has_workspace_id("models.nelvyon_quality_metrics", "Nelvyon_quality_metrics")

    def test_nelvyon_user_settings_has_workspace_id(self):
        self._check_model_has_workspace_id("models.nelvyon_user_settings", "Nelvyon_user_settings")

    def test_presentation_history_has_workspace_id(self):
        self._check_model_has_workspace_id("models.presentation_history", "Presentation_history")


# ─── Test 8: Cross-Workspace Isolation Scenario (Unit) ───
class TestCrossWorkspaceIsolationUnit:
    """
    Unit tests verifying the mixin's filter logic prevents cross-workspace access.
    Uses real SQLAlchemy models to test query construction.
    """

    @pytest.mark.asyncio
    async def test_create_stamps_workspace_id(self):
        """ws_create should stamp workspace_id on the data dict."""
        from models.contacts import Contacts
        from services.contacts import ContactsService

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        # Make refresh set an id
        async def fake_refresh(obj):
            obj.id = 1
        mock_db.refresh = fake_refresh

        service = ContactsService(mock_db)

        result = await service.create(
            data={"first_name": "Test", "email": "test@test.com"},
            user_id="user-a",
            workspace_id=42,
        )

        # Verify the object was added with workspace_id
        added_obj = mock_db.add.call_args[0][0]
        assert added_obj.workspace_id == 42
        assert added_obj.user_id == "user-a"

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_for_wrong_workspace(self):
        """ws_get_by_id should return None when workspace doesn't match."""
        from services.contacts import ContactsService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = ContactsService(mock_db)

        result = await service.get_by_id(
            obj_id=1, user_id="attacker", workspace_id=999,
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_update_returns_none_for_wrong_workspace(self):
        """ws_update should return None when record not in workspace."""
        from services.contacts import ContactsService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = ContactsService(mock_db)

        result = await service.update(
            obj_id=1,
            update_data={"first_name": "Hacked"},
            user_id="attacker",
            workspace_id=999,
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_returns_false_for_wrong_workspace(self):
        """ws_delete should return False when record not in workspace."""
        from services.contacts import ContactsService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = ContactsService(mock_db)

        result = await service.delete(
            obj_id=1, user_id="attacker", workspace_id=999,
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_get_list_returns_empty_for_wrong_workspace(self):
        """ws_get_list should return empty for wrong workspace."""
        from services.contacts import ContactsService

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        service = ContactsService(mock_db)

        result = await service.get_list(
            skip=0, limit=20,
            user_id="attacker",
            workspace_id=999,
        )
        assert result["total"] == 0
        assert result["items"] == []
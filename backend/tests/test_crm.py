"""
CRM module tests — contacts, deals, search, and data integrity.
"""
import pytest
import pytest_asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from models.contacts import Contacts
from models.deals import Deals
from services.contacts import ContactsService
from services.deals import DealsService
from services.pipeline_deals import Pipeline_dealsService
from services.crm_analytics import CRMAnalyticsService


TEST_USER_ID = "test-user-001"
TEST_WORKSPACE_ID = 1
TEST_WORKSPACE_ID_B = 2


@pytest.mark.asyncio
async def test_create_contact(db_session: AsyncSession):
    """Test contact creation with workspace isolation."""
    svc = ContactsService(db_session)
    contact = await svc.create(
        data={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "company_name": "Acme Corp",
            "status": "active",
            "source": "website",
            "score": 75,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert contact is not None
    assert contact.id is not None
    assert contact.first_name == "John"
    assert contact.email == "john@example.com"
    assert contact.user_id == TEST_USER_ID
    assert contact.workspace_id == TEST_WORKSPACE_ID


@pytest.mark.asyncio
async def test_get_contact_by_id(db_session: AsyncSession):
    """Test fetching contact by ID with workspace isolation."""
    svc = ContactsService(db_session)

    # Create
    contact = await svc.create(
        data={
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@example.com",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )

    # Fetch
    fetched = await svc.get_by_id(contact.id, user_id=TEST_USER_ID, workspace_id=TEST_WORKSPACE_ID)
    assert fetched is not None
    assert fetched.email == "jane@example.com"

    # Fetch with wrong workspace should return None
    fetched_wrong = await svc.get_by_id(contact.id, user_id=TEST_USER_ID, workspace_id=999)
    assert fetched_wrong is None


@pytest.mark.asyncio
async def test_update_contact(db_session: AsyncSession):
    """Test contact update with workspace isolation."""
    svc = ContactsService(db_session)

    contact = await svc.create(
        data={
            "first_name": "Bob",
            "email": "bob@example.com",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )

    updated = await svc.update(
        contact.id,
        {"first_name": "Robert", "score": 90},
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert updated is not None
    assert updated.first_name == "Robert"
    assert updated.score == 90


@pytest.mark.asyncio
async def test_delete_contact(db_session: AsyncSession):
    """Test contact deletion with workspace isolation."""
    svc = ContactsService(db_session)

    contact = await svc.create(
        data={
            "first_name": "Delete",
            "email": "delete@example.com",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )

    result = await svc.delete(contact.id, user_id=TEST_USER_ID, workspace_id=TEST_WORKSPACE_ID)
    assert result is True

    # Verify deleted
    fetched = await svc.get_by_id(contact.id, user_id=TEST_USER_ID, workspace_id=TEST_WORKSPACE_ID)
    assert fetched is None


@pytest.mark.asyncio
async def test_contact_list_pagination(db_session: AsyncSession):
    """Test paginated contact list."""
    svc = ContactsService(db_session)

    # Create 5 contacts
    for i in range(5):
        await svc.create(
            data={
                "first_name": f"User{i}",
                "email": f"user{i}@list.com",
                "status": "active",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            user_id=TEST_USER_ID,
            workspace_id=TEST_WORKSPACE_ID,
        )

    result = await svc.get_list(
        skip=0, limit=3,
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert "items" in result
    assert "total" in result
    assert len(result["items"]) <= 3


@pytest.mark.asyncio
async def test_create_deal_with_contact(db_session: AsyncSession):
    """Test deal creation linked to a contact."""
    contact_svc = ContactsService(db_session)
    deal_svc = DealsService(db_session)

    contact = await contact_svc.create(
        data={
            "first_name": "Deal",
            "email": "deal@example.com",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )

    deal = await deal_svc.create(
        data={
            "title": "Enterprise License",
            "value": 50000.0,
            "currency": "USD",
            "stage": "proposal",
            "pipeline": "sales",
            "probability": 60,
            "contact_id": contact.id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )

    assert deal is not None
    assert deal.title == "Enterprise License"
    assert deal.value == 50000.0
    assert deal.contact_id == contact.id


@pytest.mark.asyncio
async def test_create_deal_rejects_invalid_stage(db_session: AsyncSession):
    deal_svc = DealsService(db_session)
    with pytest.raises(ValueError, match="Invalid stage"):
        await deal_svc.create(
            data={
                "title": "Bad stage",
                "stage": "not_a_real_stage",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            user_id=TEST_USER_ID,
            workspace_id=TEST_WORKSPACE_ID,
        )


@pytest.mark.asyncio
async def test_create_deal_normalizes_legacy_stage_won(db_session: AsyncSession):
    deal_svc = DealsService(db_session)
    deal = await deal_svc.create(
        data={
            "title": "Legacy won",
            "stage": "won",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert deal.stage == "closed_won"


@pytest.mark.asyncio
async def test_create_deal_rejects_contact_from_other_workspace(db_session: AsyncSession):
    contact_svc = ContactsService(db_session)
    deal_svc = DealsService(db_session)
    other = await contact_svc.create(
        data={
            "first_name": "OtherWs",
            "email": "otherws@example.com",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID_B,
    )
    with pytest.raises(ValueError, match="different workspace"):
        await deal_svc.create(
            data={
                "title": "Cross ws",
                "stage": "lead",
                "contact_id": other.id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            user_id=TEST_USER_ID,
            workspace_id=TEST_WORKSPACE_ID,
        )


@pytest.mark.asyncio
async def test_pipeline_deal_create_and_workspace_isolation(db_session: AsyncSession):
    """Pipeline deals are stamped with workspace_id; other workspaces cannot read them."""
    svc = Pipeline_dealsService(db_session)
    row = await svc.create(
        data={
            "name": "BigCo",
            "stage": "qualification",
            "created_at": datetime.now(timezone.utc),
        },
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert row is not None
    assert row.workspace_id == TEST_WORKSPACE_ID

    got = await svc.get_by_id(row.id, user_id=TEST_USER_ID, workspace_id=TEST_WORKSPACE_ID)
    assert got is not None
    assert got.name == "BigCo"

    assert (
        await svc.get_by_id(row.id, user_id=TEST_USER_ID, workspace_id=TEST_WORKSPACE_ID_B)
        is None
    )


@pytest.mark.asyncio
async def test_pipeline_deal_get_by_field_requires_workspace(db_session: AsyncSession):
    svc = Pipeline_dealsService(db_session)
    with pytest.raises(ValueError, match="workspace_id is required"):
        await svc.get_by_field("name", "x", workspace_id=None)


@pytest.mark.asyncio
async def test_crm_analytics_integrity(db_session: AsyncSession):
    """Test CRM data integrity check."""
    analytics = CRMAnalyticsService(db_session)
    result = await analytics.check_data_integrity(
        user_id=TEST_USER_ID,
        workspace_id=TEST_WORKSPACE_ID,
    )
    assert "health_score" in result
    assert "issues" in result
    assert isinstance(result["issues"], list)
    assert result["health_score"] >= 0
    assert result["health_score"] <= 100
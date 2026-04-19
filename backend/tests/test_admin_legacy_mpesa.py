from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.activity import UserActivity
from app.models.jackpot import Jackpot, JackpotPurchase
from app.models.legacy_mpesa import LegacyMpesaTransaction
from app.models.payment import Payment
from app.models.sms_tip import SmsTipQueue
from app.models.tip import Tip
from app.models.user import User
from app.routers.admin import (
    BulkGrantSubscriptionRequest,
    BulkUserUpdateRequest,
    LegacyMpesaAssignRequest,
    LegacyMpesaBulkAssignRequest,
    LegacyMpesaDateRangeImportRequest,
    assign_legacy_mpesa_transaction,
    backfill_legacy_mpesa_history,
    bulk_assign_legacy_mpesa_transactions,
    bulk_grant_subscription,
    bulk_update_users,
    clear_legacy_mpesa_queue,
    delete_legacy_mpesa_queue_item,
    import_legacy_mpesa_date_range,
    list_users,
    onboard_sms_user,
    sync_legacy_mpesa_queue,
)
from app.routers.tips import FlushTipSmsQueueRequest, delete_tip, flush_tip_sms_queue
from app.security import hash_password
from app.services.legacy_mpesa_sync import LegacyMpesaRecord, sync_legacy_mpesa_transactions
from app.services.sms_tip_delivery import _format_tip_bundle_message
from app.services.subscription_access import grant_subscription_entitlement


async def _login_admin(client: AsyncClient, db_session, *, email: str, name: str) -> str:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "email": email,
            "name": name,
            "picture": "",
        }
        response = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        assert response.status_code == 200

    await db_session.execute(
        User.__table__.update().where(User.email == email).values(is_admin=True, country="KE")
    )
    await db_session.commit()
    return response.cookies.get("access_token")


async def _create_user(
    db_session,
    *,
    email: str,
    name: str,
    is_admin: bool = False,
    phone: str | None = None,
    tier: str = "free",
    last_seen: datetime | None = None,
) -> User:
    user = User(
        name=name,
        email=email,
        password=hash_password("password123"),
        is_admin=is_admin,
        is_active=True,
        phone=phone,
        subscription_tier=tier,
        email_verified_at=datetime.now(UTC).replace(tzinfo=None),
        last_seen=last_seen,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_pending_jackpot(
    db_session,
    *,
    jackpot_type: str,
    dc_level: int,
    price: float = 500.0,
) -> Jackpot:
    jackpot = Jackpot(
        type=jackpot_type,
        dc_level=dc_level,
        matches=[{"homeTeam": "A", "awayTeam": "B"}],
        variations=[["1"]],
        price=price,
        result="pending",
    )
    db_session.add(jackpot)
    await db_session.commit()
    await db_session.refresh(jackpot)
    return jackpot


@pytest.mark.asyncio
async def test_admin_users_endpoint_is_paginated_and_filterable(db_session):
    admin = await _create_user(
        db_session,
        email="admin-users@example.com",
        name="Admin Users",
        is_admin=True,
        tier="premium",
    )
    alpha = await _create_user(
        db_session,
        email="alpha@example.com",
        name="Alpha",
        phone="+254700000001",
        tier="free",
        last_seen=datetime.now(UTC).replace(tzinfo=None),
    )
    await _create_user(
        db_session,
        email="beta@example.com",
        name="Beta",
        phone="+254700000002",
        tier="basic",
        last_seen=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1),
    )
    gamma = await _create_user(
        db_session,
        email="gamma@example.com",
        name="Gamma",
        phone="+254700000003",
        tier="free",
    )

    db_session.add_all([
        UserActivity(user_id=alpha.id, path="/tips", time_spent_seconds=90),
        UserActivity(user_id=alpha.id, path="/jackpot", time_spent_seconds=20),
        UserActivity(user_id=alpha.id, path="/tips", time_spent_seconds=15),
    ])
    await db_session.commit()

    data = await list_users(
        search=None,
        tier="all",
        page=1,
        per_page=2,
        sort_field="total_time_spent",
        sort_dir="desc",
        db=db_session,
        admin=admin,
    )
    assert data["total"] == 4
    assert data["page"] == 1
    assert data["per_page"] == 2
    assert data["total_pages"] == 2
    assert len(data["users"]) == 2
    assert data["users"][0].id == alpha.id
    assert data["users"][0].most_visited_page == "/tips"
    assert data["users"][0].total_time_spent == 125
    assert data["counts"]["all"] == 4
    assert data["counts"]["free"] == 2

    filtered_data = await list_users(
        search="gamma",
        tier="free",
        sort_field="last_seen",
        sort_dir="desc",
        page=1,
        per_page=10,
        db=db_session,
        admin=admin,
    )
    assert filtered_data["total"] == 1
    assert filtered_data["users"][0].id == gamma.id


@pytest.mark.asyncio
async def test_bulk_grant_subscription_updates_selected_users(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-users@example.com",
        name="Admin Bulk Users",
        is_admin=True,
        tier="premium",
    )
    first_user = await _create_user(
        db_session,
        email="first-bulk@example.com",
        name="First Bulk",
        phone="+254700001001",
        tier="free",
    )
    second_user = await _create_user(
        db_session,
        email="second-bulk@example.com",
        name="Second Bulk",
        phone="+254700001002",
        tier="basic",
    )
    untouched_user = await _create_user(
        db_session,
        email="untouched-bulk@example.com",
        name="Untouched Bulk",
        phone="+254700001003",
        tier="free",
    )

    payload = await bulk_grant_subscription(
        body=BulkGrantSubscriptionRequest(
            tier="premium",
            duration_days=30,
            user_ids=[first_user.id, second_user.id],
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["updated"] == 2
    assert payload["processed"] == 2
    assert payload["updated_user_ids"] == [first_user.id, second_user.id]

    refreshed_users = (
        await db_session.execute(
            select(User).where(User.id.in_([first_user.id, second_user.id, untouched_user.id])).order_by(User.id.asc())
        )
    ).scalars().all()
    assert refreshed_users[0].subscription_tier == "premium"
    assert refreshed_users[0].subscription_expires_at is not None
    assert refreshed_users[1].subscription_tier == "premium"
    assert refreshed_users[1].subscription_expires_at is not None
    assert refreshed_users[2].subscription_tier == "free"


@pytest.mark.asyncio
async def test_bulk_grant_subscription_can_apply_to_filtered_users(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-filtered@example.com",
        name="Admin Bulk Filtered",
        is_admin=True,
        tier="premium",
    )
    matched_one = await _create_user(
        db_session,
        email="batch-one@example.com",
        name="Batch Alpha",
        phone="+254700002001",
        tier="free",
    )
    matched_two = await _create_user(
        db_session,
        email="batch-two@example.com",
        name="Batch Beta",
        phone="+254700002002",
        tier="free",
    )
    non_match = await _create_user(
        db_session,
        email="batch-three@example.com",
        name="Gamma User",
        phone="+254700002003",
        tier="basic",
    )

    payload = await bulk_grant_subscription(
        body=BulkGrantSubscriptionRequest(
            tier="standard",
            duration_days=14,
            apply_to_filtered=True,
            search="Batch",
            filter_tier="free",
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["updated"] == 2
    assert payload["processed"] == 2
    assert payload["updated_user_ids"] == [matched_one.id, matched_two.id]

    refreshed_users = (
        await db_session.execute(
            select(User).where(User.id.in_([matched_one.id, matched_two.id, non_match.id])).order_by(User.id.asc())
        )
    ).scalars().all()
    assert refreshed_users[0].subscription_tier == "standard"
    assert refreshed_users[1].subscription_tier == "standard"
    assert refreshed_users[2].subscription_tier == "basic"


@pytest.mark.asyncio
async def test_bulk_update_users_can_revoke_subscription_for_selected_users(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-revoke@example.com",
        name="Admin Bulk Revoke",
        is_admin=True,
        tier="premium",
    )
    first_user = await _create_user(
        db_session,
        email="revoke-one@example.com",
        name="Revoke One",
        phone="+254700003001",
        tier="standard",
    )
    second_user = await _create_user(
        db_session,
        email="revoke-two@example.com",
        name="Revoke Two",
        phone="+254700003002",
        tier="premium",
    )
    first_user.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=14)
    second_user.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=21)
    db_session.add_all([first_user, second_user])
    await db_session.commit()

    payload = await bulk_update_users(
        body=BulkUserUpdateRequest(
            action="revoke_subscription",
            user_ids=[first_user.id, second_user.id],
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["action"] == "revoke_subscription"
    assert payload["updated"] == 2
    assert payload["skipped"] == 0

    refreshed_users = (
        await db_session.execute(
            select(User).where(User.id.in_([first_user.id, second_user.id])).order_by(User.id.asc())
        )
    ).scalars().all()
    assert all(user.subscription_tier == "free" for user in refreshed_users)
    assert all(user.subscription_expires_at is None for user in refreshed_users)


@pytest.mark.asyncio
async def test_bulk_update_users_can_ban_filtered_users_and_skip_admin_self(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-ban@example.com",
        name="Admin Batch",
        is_admin=True,
        tier="premium",
    )
    first_user = await _create_user(
        db_session,
        email="ban-one@example.com",
        name="Batch Member One",
        phone="+254700004001",
        tier="free",
    )
    second_user = await _create_user(
        db_session,
        email="ban-two@example.com",
        name="Batch Member Two",
        phone="+254700004002",
        tier="basic",
    )

    payload = await bulk_update_users(
        body=BulkUserUpdateRequest(
            action="ban",
            apply_to_filtered=True,
            search="Batch",
            filter_tier="all",
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["action"] == "ban"
    assert payload["updated"] == 2
    assert payload["skipped"] == 1
    assert payload["skipped_user_ids"] == [admin.id]

    refreshed_users = (
        await db_session.execute(
            select(User).where(User.id.in_([admin.id, first_user.id, second_user.id])).order_by(User.id.asc())
        )
    ).scalars().all()
    assert refreshed_users[0].is_active is True
    assert refreshed_users[1].is_active is False
    assert refreshed_users[2].is_active is False


@pytest.mark.asyncio
async def test_bulk_update_users_can_grant_pending_jackpot_access(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-jackpot@example.com",
        name="Admin Bulk Jackpot",
        is_admin=True,
        tier="premium",
    )
    first_user = await _create_user(
        db_session,
        email="jackpot-one@example.com",
        name="Jackpot One",
        phone="+254700004101",
    )
    second_user = await _create_user(
        db_session,
        email="jackpot-two@example.com",
        name="Jackpot Two",
        phone="+254700004102",
    )
    jackpot = await _create_pending_jackpot(db_session, jackpot_type="midweek", dc_level=3)

    payload = await bulk_update_users(
        body=BulkUserUpdateRequest(
            action="grant_jackpot",
            user_ids=[first_user.id, second_user.id],
            jackpot_type="midweek",
            jackpot_dc_level=3,
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["action"] == "grant_jackpot"
    assert payload["updated"] == 2
    assert payload["jackpot_id"] == jackpot.id

    purchases = (
        await db_session.execute(
            select(JackpotPurchase).where(JackpotPurchase.jackpot_id == jackpot.id).order_by(JackpotPurchase.user_id.asc())
        )
    ).scalars().all()
    assert [purchase.user_id for purchase in purchases] == [first_user.id, second_user.id]


@pytest.mark.asyncio
async def test_sync_legacy_mpesa_creates_queue_items_and_placeholder_users(db_session):
    admin = await _create_user(
        db_session,
        email="admin-sync@example.com",
        name="Admin Sync",
        is_admin=True,
        tier="premium",
    )
    existing_user = await _create_user(
        db_session,
        email="existing@example.com",
        name="Existing User",
        phone="+254711111111",
        tier="free",
    )

    records = [
        LegacyMpesaRecord(
            source_record_id=101,
            phone="254711111111",
            first_name="Existing",
            other_name="Client",
            amount=550.0,
            paid_at=datetime.now(UTC).replace(tzinfo=None),
            biz_no="7334523",
        ),
        LegacyMpesaRecord(
            source_record_id=102,
            phone="0722333444",
            first_name="New",
            other_name="Client",
            amount=1250.0,
            paid_at=datetime.now(UTC).replace(tzinfo=None),
            biz_no="7334523",
        ),
    ]

    with patch("app.routers.admin.settings.LEGACY_MPESA_DATABASE_URL", "mysql+aiomysql://legacy"), \
         patch("app.routers.admin.fetch_latest_legacy_mpesa_records", return_value=records):
        payload = await sync_legacy_mpesa_queue(db=db_session, admin=admin)

    assert payload["imported"] == 2
    assert payload["created_users"] == 1
    assert payload["linked_existing_users"] == 1
    assert payload["created_payments"] == 2
    assert payload["skipped"] == 0

    queue_rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert len(queue_rows) == 2
    assert queue_rows[0].user_id == existing_user.id
    assert queue_rows[0].payment_id is not None
    assert queue_rows[0].onboarding_status == "pending_assignment"

    payments = (
        await db_session.execute(
            select(Payment).where(Payment.reference.in_(["LEGACY-MPESA-101", "LEGACY-MPESA-102"])).order_by(Payment.reference.asc())
        )
    ).scalars().all()
    assert len(payments) == 2
    assert all(payment.item_type == "legacy_pending" for payment in payments)

    created_user = (
        await db_session.execute(select(User).where(User.phone == "+254722333444"))
    ).scalar_one()
    assert created_user.subscription_tier == "free"
    assert created_user.sms_tips_enabled is False


@pytest.mark.asyncio
async def test_backfill_legacy_mpesa_imports_older_history(db_session):
    admin = await _create_user(
        db_session,
        email="admin-backfill@example.com",
        name="Admin Backfill",
        is_admin=True,
        tier="premium",
    )

    existing_queue = LegacyMpesaTransaction(
        source_record_id=500,
        biz_no="7334523",
        phone="+254700000500",
        first_name="Existing",
        other_name="Queue",
        amount=500.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    db_session.add(existing_queue)
    await db_session.commit()

    records = [
        LegacyMpesaRecord(
            source_record_id=498,
            phone="254700000498",
            first_name="Older",
            other_name="One",
            amount=440.0,
            paid_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1),
            biz_no="7334523",
        ),
        LegacyMpesaRecord(
            source_record_id=499,
            phone="254700000499",
            first_name="Older",
            other_name="Two",
            amount=550.0,
            paid_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=12),
            biz_no="7334523",
        ),
    ]

    with patch("app.routers.admin.settings.LEGACY_MPESA_DATABASE_URL", "mysql+aiomysql://legacy"), \
         patch("app.routers.admin.fetch_legacy_mpesa_records_before", return_value=records):
        payload = await backfill_legacy_mpesa_history(db=db_session, admin=admin)

    assert payload["mode"] == "backfill"
    assert payload["imported"] == 2

    source_ids = (
        await db_session.execute(
            select(LegacyMpesaTransaction.source_record_id).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert source_ids == [498, 499, 500]


@pytest.mark.asyncio
async def test_date_range_import_legacy_mpesa_history(db_session):
    admin = await _create_user(
        db_session,
        email="admin-date-range@example.com",
        name="Admin Date Range",
        is_admin=True,
        tier="premium",
    )

    existing_queue = LegacyMpesaTransaction(
        source_record_id=700,
        biz_no="7334523",
        phone="+254700000700",
        first_name="Existing",
        other_name="Range",
        amount=700.0,
        paid_at=datetime(2026, 4, 10, 9, 0, 0),
        onboarding_status="pending_assignment",
    )
    db_session.add(existing_queue)
    await db_session.commit()

    records = [
        LegacyMpesaRecord(
            source_record_id=701,
            phone="254700000701",
            first_name="April",
            other_name="One",
            amount=440.0,
            paid_at=datetime(2026, 4, 1, 8, 0, 0),
            biz_no="7334523",
        ),
        LegacyMpesaRecord(
            source_record_id=702,
            phone="254700000702",
            first_name="April",
            other_name="Two",
            amount=550.0,
            paid_at=datetime(2026, 4, 11, 12, 0, 0),
            biz_no="7334523",
        ),
        LegacyMpesaRecord(
            source_record_id=700,
            phone="254700000700",
            first_name="Existing",
            other_name="Range",
            amount=700.0,
            paid_at=datetime(2026, 4, 10, 9, 0, 0),
            biz_no="7334523",
        ),
    ]

    with patch("app.routers.admin.settings.LEGACY_MPESA_DATABASE_URL", "mysql+aiomysql://legacy"), \
         patch("app.routers.admin.fetch_legacy_mpesa_records_between", return_value=records):
        payload = await import_legacy_mpesa_date_range(
            body=LegacyMpesaDateRangeImportRequest(date_from="2026-04-01", date_to="2026-04-11"),
            db=db_session,
            admin=admin,
        )

    assert payload["mode"] == "date_range"
    assert payload["fetched"] == 3
    assert payload["imported"] == 2
    assert payload["skipped"] == 1

    source_ids = (
        await db_session.execute(
            select(LegacyMpesaTransaction.source_record_id).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert source_ids == [700, 701, 702]


@pytest.mark.asyncio
async def test_onboard_sms_user_can_grant_pending_jackpot_access(db_session):
    admin = await _create_user(
        db_session,
        email="admin-onboard-jackpot@example.com",
        name="Admin Onboard Jackpot",
        is_admin=True,
        tier="premium",
    )
    jackpot = await _create_pending_jackpot(db_session, jackpot_type="mega", dc_level=4, price=900.0)

    payload = await onboard_sms_user(
        body=type("Body", (), {
            "phone": "0711000200",
            "assignment_mode": "jackpot",
            "tier": None,
            "duration_days": None,
            "jackpot_type": "mega",
            "jackpot_dc_level": 4,
            "amount_paid": 900.0,
        })(),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["assignment_mode"] == "jackpot"
    assert payload["jackpot_id"] == jackpot.id

    created_user = (
        await db_session.execute(select(User).where(User.id == payload["user_id"]))
    ).scalar_one()
    purchase = (
        await db_session.execute(
            select(JackpotPurchase).where(
                JackpotPurchase.user_id == created_user.id,
                JackpotPurchase.jackpot_id == jackpot.id,
            )
        )
    ).scalar_one()
    payment = (
        await db_session.execute(select(Payment).where(Payment.id == purchase.payment_id))
    ).scalar_one()

    assert payment.item_type == "jackpot"
    assert payment.item_id == str(jackpot.id)
    assert created_user.sms_tips_enabled is True


@pytest.mark.asyncio
async def test_clear_legacy_mpesa_queue_marks_pending_rows_ignored_and_keeps_assigned_rows(db_session):
    admin = await _create_user(
        db_session,
        email="admin-clear-legacy@example.com",
        name="Admin Clear Legacy",
        is_admin=True,
        tier="premium",
    )

    pending_one = LegacyMpesaTransaction(
        source_record_id=801,
        biz_no="7334523",
        phone="+254700000801",
        first_name="Pending",
        other_name="One",
        amount=200.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    assigned_row = LegacyMpesaTransaction(
        source_record_id=802,
        biz_no="7334523",
        phone="+254700000802",
        first_name="Assigned",
        other_name="Row",
        amount=300.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="assigned",
        payment_id=123,
    )
    pending_two = LegacyMpesaTransaction(
        source_record_id=803,
        biz_no="7334523",
        phone="+254700000803",
        first_name="Pending",
        other_name="Two",
        amount=400.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    db_session.add_all([pending_one, assigned_row, pending_two])
    await db_session.commit()

    payload = await clear_legacy_mpesa_queue(db=db_session, admin=admin)

    assert payload == {
        "status": "success",
        "cleared": 2,
    }

    remaining_rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert len(remaining_rows) == 3
    assert remaining_rows[0].source_record_id == 801
    assert remaining_rows[0].onboarding_status == "ignored"
    assert remaining_rows[1].source_record_id == 802
    assert remaining_rows[1].onboarding_status == "assigned"
    assert remaining_rows[2].source_record_id == 803
    assert remaining_rows[2].onboarding_status == "ignored"


@pytest.mark.asyncio
async def test_delete_legacy_mpesa_queue_item_marks_single_pending_row_ignored(db_session):
    admin = await _create_user(
        db_session,
        email="admin-delete-legacy@example.com",
        name="Admin Delete Legacy",
        is_admin=True,
        tier="premium",
    )

    pending_row = LegacyMpesaTransaction(
        source_record_id=901,
        biz_no="7334523",
        phone="+254700000901",
        first_name="Pending",
        other_name="Delete",
        amount=350.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    assigned_row = LegacyMpesaTransaction(
        source_record_id=902,
        biz_no="7334523",
        phone="+254700000902",
        first_name="Assigned",
        other_name="Keep",
        amount=450.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="assigned",
        payment_id=222,
    )
    db_session.add_all([pending_row, assigned_row])
    await db_session.commit()
    await db_session.refresh(pending_row)
    await db_session.refresh(assigned_row)

    payload = await delete_legacy_mpesa_queue_item(queue_id=pending_row.id, db=db_session, admin=admin)

    assert payload == {
        "status": "success",
        "ignored_id": pending_row.id,
    }

    remaining_rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert len(remaining_rows) == 2
    assert remaining_rows[0].source_record_id == 901
    assert remaining_rows[0].onboarding_status == "ignored"
    assert remaining_rows[1].source_record_id == 902
    assert remaining_rows[1].onboarding_status == "assigned"


@pytest.mark.asyncio
async def test_sync_skips_ignored_legacy_queue_rows(db_session):
    existing_ignored = LegacyMpesaTransaction(
        source_record_id=9901,
        biz_no="7334523",
        phone="+254700009901",
        first_name="Ignored",
        other_name="Legacy",
        amount=480.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="ignored",
    )
    db_session.add(existing_ignored)
    await db_session.commit()

    stats = await sync_legacy_mpesa_transactions(
        db_session,
        [
            LegacyMpesaRecord(
                source_record_id=9901,
                biz_no="7334523",
                phone="254700009901",
                first_name="Ignored",
                other_name="Legacy",
                amount=480.0,
                paid_at=datetime.now(UTC).replace(tzinfo=None),
            )
        ],
    )

    assert stats == {
        "imported": 0,
        "created_users": 0,
        "linked_existing_users": 0,
        "created_payments": 1,
        "skipped": 1,
    }

    rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.source_record_id == 9901)
        )
    ).scalars().all()
    assert len(rows) == 1
    assert rows[0].onboarding_status == "ignored"


@pytest.mark.asyncio
async def test_assign_legacy_mpesa_transaction_grants_subscription_without_creating_duplicate_payment(db_session):
    admin = await _create_user(
        db_session,
        email="admin-assign@example.com",
        name="Admin Assign",
        is_admin=True,
        tier="premium",
    )

    assigned_user = await _create_user(
        db_session,
        email="legacy-assigned@example.com",
        name="Legacy Assigned",
        phone="+254733000111",
        tier="free",
    )
    existing_payment = Payment(
        user_id=assigned_user.id,
        amount=860.0,
        currency="KES",
        method="mpesa",
        status="completed",
        reference="LEGACY-MPESA-555",
        transaction_id="LEGACY-MPESA-555",
        item_type="legacy_pending",
        item_id="555",
        phone=assigned_user.phone,
        email=assigned_user.email,
    )
    db_session.add(existing_payment)
    await db_session.commit()
    await db_session.refresh(existing_payment)

    queue_item = LegacyMpesaTransaction(
        source_record_id=555,
        biz_no="7334523",
        phone="254733000111",
        first_name="Legacy",
        other_name="User",
        amount=860.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
        user_id=assigned_user.id,
        payment_id=existing_payment.id,
    )
    db_session.add(queue_item)
    await db_session.commit()
    await db_session.refresh(queue_item)

    data = await assign_legacy_mpesa_transaction(
        queue_id=queue_item.id,
        body=LegacyMpesaAssignRequest(tier="basic", duration_days=30),
        db=db_session,
        admin=admin,
    )
    assert data["tier"] == "basic"
    assert data["payment_id"] is not None

    refreshed_queue = (
        await db_session.execute(
            select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id == queue_item.id)
        )
    ).scalar_one()
    assigned_user = (
        await db_session.execute(select(User).where(User.id == refreshed_queue.user_id))
    ).scalar_one()
    payment = (
        await db_session.execute(select(Payment).where(Payment.id == refreshed_queue.payment_id))
    ).scalar_one()

    assert refreshed_queue.onboarding_status == "assigned"
    assert refreshed_queue.assigned_tier == "basic"
    assert assigned_user.subscription_tier == "basic"
    assert assigned_user.sms_tips_enabled is True
    assert assigned_user.phone == "+254733000111"
    assert payment.amount == 860.0
    assert payment.reference == "LEGACY-MPESA-555"
    assert payment.id == existing_payment.id
    assert payment.item_type == "subscription"
    assert payment.item_id == "basic"

    all_matching_payments = (
        await db_session.execute(select(Payment).where(Payment.reference == "LEGACY-MPESA-555"))
    ).scalars().all()
    assert len(all_matching_payments) == 1


@pytest.mark.asyncio
async def test_assign_legacy_mpesa_transaction_can_grant_jackpot_access_without_duplicate_payment(db_session):
    admin = await _create_user(
        db_session,
        email="admin-assign-jackpot@example.com",
        name="Admin Assign Jackpot",
        is_admin=True,
        tier="premium",
    )
    jackpot = await _create_pending_jackpot(db_session, jackpot_type="midweek", dc_level=5, price=700.0)

    assigned_user = await _create_user(
        db_session,
        email="legacy-jackpot@example.com",
        name="Legacy Jackpot",
        phone="+254733000222",
        tier="free",
    )
    existing_payment = Payment(
        user_id=assigned_user.id,
        amount=700.0,
        currency="KES",
        method="mpesa",
        status="completed",
        reference="LEGACY-MPESA-556",
        transaction_id="LEGACY-MPESA-556",
        item_type="legacy_pending",
        item_id="556",
        phone=assigned_user.phone,
        email=assigned_user.email,
    )
    db_session.add(existing_payment)
    await db_session.commit()
    await db_session.refresh(existing_payment)

    queue_item = LegacyMpesaTransaction(
        source_record_id=556,
        biz_no="7334523",
        phone="254733000222",
        first_name="Legacy",
        other_name="Jackpot",
        amount=700.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
        user_id=assigned_user.id,
        payment_id=existing_payment.id,
    )
    db_session.add(queue_item)
    await db_session.commit()
    await db_session.refresh(queue_item)

    data = await assign_legacy_mpesa_transaction(
        queue_id=queue_item.id,
        body=LegacyMpesaAssignRequest(
            assignment_mode="jackpot",
            jackpot_type="midweek",
            jackpot_dc_level=5,
        ),
        db=db_session,
        admin=admin,
    )
    assert data["assignment_mode"] == "jackpot"
    assert data["jackpot_id"] == jackpot.id

    refreshed_queue = (
        await db_session.execute(
            select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id == queue_item.id)
        )
    ).scalar_one()
    purchase = (
        await db_session.execute(
            select(JackpotPurchase).where(
                JackpotPurchase.user_id == refreshed_queue.user_id,
                JackpotPurchase.jackpot_id == jackpot.id,
            )
        )
    ).scalar_one()
    payment = (
        await db_session.execute(select(Payment).where(Payment.id == refreshed_queue.payment_id))
    ).scalar_one()

    assert refreshed_queue.onboarding_status == "assigned"
    assert refreshed_queue.assigned_tier == "midweek_5dc"
    assert payment.id == existing_payment.id
    assert payment.item_type == "jackpot"
    assert payment.item_id == str(jackpot.id)
    assert purchase.payment_id == payment.id


@pytest.mark.asyncio
async def test_bulk_assign_legacy_mpesa_transactions_assigns_selected_rows_and_skips_existing(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-selected@example.com",
        name="Admin Bulk Selected",
        is_admin=True,
        tier="premium",
    )
    linked_user = await _create_user(
        db_session,
        email="linked@example.com",
        name="Linked User",
        phone="+254733300002",
        tier="free",
    )
    assigned_user = await _create_user(
        db_session,
        email="already-assigned@example.com",
        name="Already Assigned",
        phone="+254733300003",
        tier="basic",
    )

    existing_payment = Payment(
        user_id=assigned_user.id,
        amount=990.0,
        currency="KES",
        method="mpesa",
        status="completed",
        reference="EXISTING-LEGACY-603",
        transaction_id="EXISTING-LEGACY-603",
        item_type="subscription",
        item_id="basic",
        phone=assigned_user.phone,
    )
    db_session.add(existing_payment)
    await db_session.commit()
    await db_session.refresh(existing_payment)

    queue_one = LegacyMpesaTransaction(
        source_record_id=601,
        biz_no="7334523",
        phone="254733300001",
        first_name="Queue",
        other_name="One",
        amount=510.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    queue_two = LegacyMpesaTransaction(
        source_record_id=602,
        biz_no="7334523",
        phone="+254733300002",
        first_name="Queue",
        other_name="Two",
        amount=620.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
        user_id=linked_user.id,
    )
    queue_three = LegacyMpesaTransaction(
        source_record_id=603,
        biz_no="7334523",
        phone="+254733300003",
        first_name="Queue",
        other_name="Three",
        amount=990.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="assigned",
        user_id=assigned_user.id,
        payment_id=existing_payment.id,
        assigned_tier="basic",
        assigned_duration_days=30,
        assigned_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db_session.add_all([queue_one, queue_two, queue_three])
    await db_session.commit()
    await db_session.refresh(queue_one)
    await db_session.refresh(queue_two)
    await db_session.refresh(queue_three)

    payload = await bulk_assign_legacy_mpesa_transactions(
        body=LegacyMpesaBulkAssignRequest(
            tier="standard",
            duration_days=21,
            queue_ids=[queue_one.id, queue_two.id, queue_three.id],
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["assigned"] == 2
    assert payload["skipped"] == 1
    assert payload["processed"] == 3
    assert payload["assigned_queue_ids"] == [queue_one.id, queue_two.id]

    refreshed_rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction).order_by(LegacyMpesaTransaction.source_record_id.asc())
        )
    ).scalars().all()
    assert refreshed_rows[0].onboarding_status == "assigned"
    assert refreshed_rows[0].assigned_tier == "standard"
    assert refreshed_rows[1].onboarding_status == "assigned"
    assert refreshed_rows[1].assigned_tier == "standard"
    assert refreshed_rows[2].payment_id == existing_payment.id

    created_user = (
        await db_session.execute(select(User).where(User.id == refreshed_rows[0].user_id))
    ).scalar_one()
    updated_user = (
        await db_session.execute(select(User).where(User.id == linked_user.id))
    ).scalar_one()
    assert created_user.subscription_tier == "standard"
    assert created_user.sms_tips_enabled is True
    assert updated_user.subscription_tier == "standard"
    assert updated_user.sms_tips_enabled is True

    legacy_payments = (
        await db_session.execute(
            select(Payment).where(Payment.reference.in_(["LEGACY-MPESA-601", "LEGACY-MPESA-602"]))
        )
    ).scalars().all()
    assert len(legacy_payments) == 2
    assert sorted(payment.item_id for payment in legacy_payments) == ["standard", "standard"]


@pytest.mark.asyncio
async def test_bulk_assign_legacy_mpesa_transactions_can_apply_to_all_pending(db_session):
    admin = await _create_user(
        db_session,
        email="admin-bulk-all@example.com",
        name="Admin Bulk All",
        is_admin=True,
        tier="premium",
    )

    pending_one = LegacyMpesaTransaction(
        source_record_id=701,
        biz_no="7334523",
        phone="254744400001",
        first_name="Pending",
        other_name="One",
        amount=800.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    pending_two = LegacyMpesaTransaction(
        source_record_id=702,
        biz_no="7334523",
        phone="254744400002",
        first_name="Pending",
        other_name="Two",
        amount=950.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    already_done = LegacyMpesaTransaction(
        source_record_id=703,
        biz_no="7334523",
        phone="254744400003",
        first_name="Done",
        other_name="User",
        amount=1000.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="assigned",
        assigned_tier="basic",
        assigned_duration_days=14,
        assigned_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db_session.add_all([pending_one, pending_two, already_done])
    await db_session.commit()
    await db_session.refresh(pending_one)
    await db_session.refresh(pending_two)

    payload = await bulk_assign_legacy_mpesa_transactions(
        body=LegacyMpesaBulkAssignRequest(
            tier="premium",
            duration_days=45,
            apply_to_all_pending=True,
        ),
        db=db_session,
        admin=admin,
    )

    assert payload["status"] == "success"
    assert payload["assigned"] == 2
    assert payload["skipped"] == 0
    assert payload["processed"] == 2
    assert payload["assigned_queue_ids"] == [pending_one.id, pending_two.id]

    assigned_rows = (
        await db_session.execute(
            select(LegacyMpesaTransaction)
            .where(LegacyMpesaTransaction.id.in_([pending_one.id, pending_two.id]))
            .order_by(LegacyMpesaTransaction.id.asc())
        )
    ).scalars().all()
    assert all(row.onboarding_status == "assigned" for row in assigned_rows)
    assert all(row.assigned_tier == "premium" for row in assigned_rows)
    assert all(row.assigned_duration_days == 45 for row in assigned_rows)


@pytest.mark.asyncio
async def test_admin_can_assign_legacy_queue_item_and_publish_tip_for_sms_queue(client: AsyncClient, db_session):
    admin_token = await _login_admin(
        client,
        db_session,
        email="legacy-admin@example.com",
        name="Legacy Admin",
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    queue_item = LegacyMpesaTransaction(
        source_record_id=777,
        biz_no="7334523",
        phone="254722000777",
        first_name="Queued",
        other_name="User",
        amount=1250.0,
        paid_at=datetime.now(UTC).replace(tzinfo=None),
        onboarding_status="pending_assignment",
    )
    db_session.add(queue_item)
    await db_session.commit()
    await db_session.refresh(queue_item)

    queue_res = await client.get(
        "/api/admin/legacy-mpesa/queue?status_filter=pending_assignment&page=1&per_page=20",
        headers=headers,
    )
    assert queue_res.status_code == 200
    queue_data = queue_res.json()
    assert any(item["id"] == queue_item.id for item in queue_data["items"])

    assign_res = await client.post(
        f"/api/admin/legacy-mpesa/{queue_item.id}/assign",
        json={"tier": "standard", "duration_days": 14},
        headers=headers,
    )
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    assert assign_data["tier"] == "standard"
    assert assign_data["payment_id"] is not None

    refreshed_queue = (
        await db_session.execute(select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id == queue_item.id))
    ).scalar_one()
    assigned_user = (
        await db_session.execute(select(User).where(User.id == refreshed_queue.user_id))
    ).scalar_one()

    assert refreshed_queue.onboarding_status == "assigned"
    assert assigned_user.subscription_tier == "standard"
    assert assigned_user.sms_tips_enabled is True

    with patch("app.services.sms_tip_delivery.asyncio.create_task", side_effect=lambda coro: coro.close()):
        tip_res = await client.post(
            "/api/tips",
            json={
                "fixture_id": 700777,
                "home_team": "Terminal FC",
                "away_team": "Simulation United",
                "league": "Verification League",
                "match_date": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
                "prediction": "Both Teams To Score",
                "odds": "1.91",
                "bookmaker": "Betway",
                "confidence": 4,
                "reasoning": "Terminal simulation of post-assignment SMS tip queueing.",
                "category": "gg",
                "is_free": False,
                "notify": False,
            },
            headers=headers,
        )
    assert tip_res.status_code == 201
    tip_id = tip_res.json()["id"]

    sms_queue_rows = (
        await db_session.execute(
            select(SmsTipQueue).where(SmsTipQueue.user_id == assigned_user.id, SmsTipQueue.tip_id == tip_id)
        )
    ).scalars().all()
    assert len(sms_queue_rows) == 1
    assert sms_queue_rows[0].status == "pending"

    payment = (
        await db_session.execute(select(Payment).where(Payment.id == refreshed_queue.payment_id))
    ).scalar_one()
    assert payment.amount == 1250.0
    assert payment.item_type == "subscription"
    assert payment.item_id == "standard"

    await db_session.execute(SmsTipQueue.__table__.delete().where(SmsTipQueue.tip_id == tip_id))
    await db_session.execute(Tip.__table__.delete().where(Tip.id == tip_id))
    await db_session.commit()


@pytest.mark.asyncio
async def test_flush_tip_sms_queue_sends_pending_bundles_immediately(client: AsyncClient, db_session):
    admin_token = await _login_admin(
        client,
        db_session,
        email="admin-flush-sms@example.com",
        name="Admin Flush SMS",
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    sms_user = await _create_user(
        db_session,
        email="sms-user@example.com",
        name="SMS User",
        phone="+254711223344",
        tier="standard",
    )
    sms_user.sms_tips_enabled = True
    sms_user.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=30)
    db_session.add(sms_user)
    grant_subscription_entitlement(
        sms_user,
        tier_id="standard",
        duration_days=30,
        source="test_setup",
    )

    tip = Tip(
        fixture_id=901001,
        home_team="Flush FC",
        away_team="Bundle United",
        league="Queue Test League",
        match_date=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
        prediction="GG",
        odds="1.88",
        bookmaker="Betway",
        confidence=4,
        reasoning="Pending SMS queue flush test.",
        category="gg",
        is_premium=1,
        result="pending",
    )
    db_session.add(tip)
    await db_session.commit()
    await db_session.refresh(tip)

    queue_row = SmsTipQueue(
        user_id=sms_user.id,
        tip_id=tip.id,
        status="pending",
        dispatch_scheduled_for=datetime.now(UTC).replace(tzinfo=None),
    )
    db_session.add(queue_row)
    await db_session.commit()

    with patch("app.services.sms_tip_delivery._send_sms", return_value=None):
        response = await client.post(
            "/api/tips/flush-sms-queue",
            json={"tip_ids": [tip.id]},
            headers=headers,
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["users_processed"] == 1
    assert payload["users_sent"] == 1

    refreshed_queue = (
        await db_session.execute(select(SmsTipQueue).where(SmsTipQueue.id == queue_row.id))
    ).scalar_one_or_none()
    assert refreshed_queue is None


@pytest.mark.asyncio
async def test_delete_tip_clears_sms_tip_queue_rows_before_delete(db_session):
    admin = await _create_user(
        db_session,
        email="admin-delete-tip@example.com",
        name="Admin Delete Tip",
        is_admin=True,
        tier="premium",
    )
    sms_user = await _create_user(
        db_session,
        email="delete-tip-user@example.com",
        name="Delete Tip User",
        phone="+254700009999",
        tier="standard",
    )

    tip = Tip(
        fixture_id=901002,
        home_team="Delete FC",
        away_team="Cleanup United",
        league="Delete League",
        match_date=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=1),
        prediction="1X",
        odds="1.60",
        bookmaker="Betway",
        confidence=3,
        reasoning="Delete queue cleanup test.",
        category="2+",
        is_premium=1,
        result="pending",
    )
    db_session.add(tip)
    await db_session.commit()
    await db_session.refresh(tip)

    db_session.add(
        SmsTipQueue(
            user_id=sms_user.id,
            tip_id=tip.id,
            status="pending",
            dispatch_scheduled_for=datetime.now(UTC).replace(tzinfo=None),
        )
    )
    await db_session.commit()

    await delete_tip(tip_id=tip.id, db=db_session, admin=admin)

    deleted_tip = (
        await db_session.execute(select(Tip).where(Tip.id == tip.id))
    ).scalar_one_or_none()
    remaining_queue_rows = (
        await db_session.execute(select(SmsTipQueue).where(SmsTipQueue.tip_id == tip.id))
    ).scalars().all()

    assert deleted_tip is None
    assert remaining_queue_rows == []


def test_sms_tip_bundle_message_does_not_include_odds():
    user = User(
        name="SMS User",
        email="sms-format@example.com",
        password="hashed",
        subscription_tier="tier_4plus",
        magic_login_token="abc123token",
    )
    tip = Tip(
        id=1,
        fixture_id=12345,
        home_team="Format FC",
        away_team="No Odds United",
        league="Formatting League",
        match_date=datetime.now(UTC).replace(tzinfo=None),
        prediction="Over 4.5 Goals",
        odds="2.40",
        bookmaker="TestBook",
        confidence=4,
        reasoning="Formatter verification",
        category="4+",
        is_premium=1,
        result="pending",
    )

    message = _format_tip_bundle_message(user, [tip])

    assert "Tip: Over 4.5 Goals" in message
    assert "Category: 4+" in message
    assert "Odds:" not in message

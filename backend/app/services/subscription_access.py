from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Iterable

from app.models.subscription import SubscriptionEntitlement, SubscriptionTier
from app.models.user import User

TIER_RANK = {"free": 0, "basic": 1, "standard": 2, "premium": 3}


def now_utc_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def get_active_subscription_entitlements(user: User, *, now: datetime | None = None) -> list[SubscriptionEntitlement]:
    current_time = now or now_utc_naive()
    return [
        entitlement
        for entitlement in (user.subscription_entitlement_rows or [])
        if entitlement.expires_at and entitlement.expires_at > current_time
    ]


def summarize_subscription_state(user: User, *, now: datetime | None = None) -> tuple[str, datetime | None]:
    active = get_active_subscription_entitlements(user, now=now)
    if not active:
        return "free", None

    highest = max(
        active,
        key=lambda entitlement: (
            TIER_RANK.get(entitlement.tier_id or "free", 0),
            entitlement.expires_at,
        ),
    )
    latest_expiry = max(entitlement.expires_at for entitlement in active)
    return highest.tier_id, latest_expiry


def sync_user_subscription_summary(user: User, *, now: datetime | None = None) -> None:
    tier, expires_at = summarize_subscription_state(user, now=now)
    user.subscription_tier = tier
    user.subscription_expires_at = expires_at


def grant_subscription_entitlement(
    user: User,
    *,
    tier_id: str,
    duration_days: int,
    payment_id: int | None = None,
    source: str = "payment",
    now: datetime | None = None,
) -> SubscriptionEntitlement | None:
    if tier_id == "free":
        sync_user_subscription_summary(user, now=now)
        return None

    current_time = now or now_utc_naive()
    active_same_tier = [
        entitlement
        for entitlement in get_active_subscription_entitlements(user, now=current_time)
        if entitlement.tier_id == tier_id
    ]

    if active_same_tier:
        entitlement = max(active_same_tier, key=lambda row: row.expires_at)
        entitlement.expires_at = entitlement.expires_at + timedelta(days=duration_days)
        if payment_id is not None:
            entitlement.payment_id = payment_id
        entitlement.source = source
    else:
        entitlement = SubscriptionEntitlement(
            tier_id=tier_id,
            payment_id=payment_id,
            source=source,
            expires_at=current_time + timedelta(days=duration_days),
        )
        user.subscription_entitlement_rows.append(entitlement)

    sync_user_subscription_summary(user, now=current_time)
    return entitlement


def revoke_all_subscription_entitlements(user: User) -> None:
    user.subscription_entitlement_rows.clear()
    user.subscription_tier = "free"
    user.subscription_expires_at = None


def get_active_tier_ids(user: User, *, now: datetime | None = None) -> set[str]:
    return {entitlement.tier_id for entitlement in get_active_subscription_entitlements(user, now=now)}


def get_active_categories(user: User, tiers: Iterable[SubscriptionTier], *, now: datetime | None = None) -> set[str]:
    categories = {"free"}
    active_tiers = get_active_tier_ids(user, now=now)
    tier_map = {tier.tier_id: tier for tier in tiers}
    for tier_id in active_tiers:
        tier = tier_map.get(tier_id)
        if tier and isinstance(tier.categories, list):
            categories.update(tier.categories)
    return categories


def user_has_category_access(user: User | None, category: str, tiers: Iterable[SubscriptionTier], *, now: datetime | None = None) -> bool:
    if category == "free":
        return True
    if not user:
        return False
    if user.is_admin:
        return True
    return category in get_active_categories(user, tiers, now=now)

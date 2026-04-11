"""
Sync legacy M-Pesa transactions from the old platform's source database.
"""

import json
import random
import re
import string
from dataclasses import asdict, dataclass
from datetime import datetime, UTC, timedelta
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.models.legacy_mpesa import LegacyMpesaTransaction
from app.models.user import User
from app.security import hash_password


@dataclass
class LegacyMpesaRecord:
    source_record_id: int
    phone: str
    first_name: str | None
    other_name: str | None
    amount: float
    paid_at: datetime
    biz_no: str | None


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"[\D]", "", phone or "")
    if not digits:
        return ""
    if digits.startswith("0") and len(digits) == 10:
        digits = f"254{digits[1:]}"
    elif digits.startswith("7") and len(digits) == 9:
        digits = f"254{digits}"
    if not digits.startswith("+"):
        return f"+{digits}"
    return digits


def _coerce_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace(" ", "T")).replace(tzinfo=None)
    raise ValueError(f"Unsupported datetime value: {value!r}")


def _build_placeholder_name(phone: str, first_name: str | None, other_name: str | None) -> str:
    joined = " ".join(part.strip() for part in [first_name or "", other_name or ""] if part and part.strip())
    return joined or f"Legacy User {phone[-4:]}"


async def ensure_phone_user(
    db: AsyncSession,
    phone: str,
    first_name: str | None = None,
    other_name: str | None = None,
) -> tuple[User, bool]:
    normalized_phone = normalize_phone(phone)
    result = await db.execute(select(User).where(User.phone == normalized_phone))
    user = result.scalar_one_or_none()
    if user:
        return user, False

    digits = re.sub(r"[\D]", "", normalized_phone)
    placeholder_email = f"phone_{digits}@tambuatips.local"
    random_password = "".join(random.choices(string.ascii_letters + string.digits, k=32))
    user = User(
        name=_build_placeholder_name(normalized_phone, first_name, other_name),
        email=placeholder_email,
        password=hash_password(random_password),
        phone=normalized_phone,
        subscription_tier="free",
        is_active=True,
        email_verified_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.add(user)
    await db.flush()
    return user, True


async def fetch_legacy_mpesa_records(after_source_record_id: int = 0, limit: int | None = None) -> list[LegacyMpesaRecord]:
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise RuntimeError("LEGACY_MPESA_DATABASE_URL is not configured")

    batch_size = limit or settings.LEGACY_MPESA_SYNC_BATCH_SIZE
    engine = create_async_engine(settings.LEGACY_MPESA_DATABASE_URL)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        id AS source_record_id,
                        msisdn AS phone,
                        first_name,
                        TRIM(CONCAT_WS(' ', middle_name, last_name)) AS other_name,
                        trans_amount AS amount,
                        date_stamp AS paid_at,
                        biz_no
                    FROM incoming_api_ack
                    WHERE biz_no = :biz_no
                      AND id > :after_id
                    ORDER BY id ASC
                    LIMIT :limit
                    """
                ),
                {
                    "biz_no": settings.LEGACY_MPESA_BIZ_NO,
                    "after_id": after_source_record_id,
                    "limit": batch_size,
                },
            )
            rows = result.mappings().all()
    finally:
        await engine.dispose()

    records: list[LegacyMpesaRecord] = []
    for row in rows:
        records.append(
            LegacyMpesaRecord(
                source_record_id=int(row["source_record_id"]),
                phone=str(row["phone"] or ""),
                first_name=row.get("first_name"),
                other_name=row.get("other_name"),
                amount=float(row["amount"] or 0),
                paid_at=_coerce_datetime(row["paid_at"]),
                biz_no=str(row["biz_no"]) if row.get("biz_no") is not None else None,
            )
        )
    return records


async def fetch_latest_legacy_mpesa_records(limit: int | None = None) -> list[LegacyMpesaRecord]:
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise RuntimeError("LEGACY_MPESA_DATABASE_URL is not configured")

    batch_size = limit or settings.LEGACY_MPESA_SYNC_BATCH_SIZE
    engine = create_async_engine(settings.LEGACY_MPESA_DATABASE_URL)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        id AS source_record_id,
                        msisdn AS phone,
                        first_name,
                        TRIM(CONCAT_WS(' ', middle_name, last_name)) AS other_name,
                        trans_amount AS amount,
                        date_stamp AS paid_at,
                        biz_no
                    FROM incoming_api_ack
                    WHERE biz_no = :biz_no
                    ORDER BY id DESC
                    LIMIT :limit
                    """
                ),
                {
                    "biz_no": settings.LEGACY_MPESA_BIZ_NO,
                    "limit": batch_size,
                },
            )
            rows = list(reversed(result.mappings().all()))
    finally:
        await engine.dispose()

    records: list[LegacyMpesaRecord] = []
    for row in rows:
        records.append(
            LegacyMpesaRecord(
                source_record_id=int(row["source_record_id"]),
                phone=str(row["phone"] or ""),
                first_name=row.get("first_name"),
                other_name=row.get("other_name"),
                amount=float(row["amount"] or 0),
                paid_at=_coerce_datetime(row["paid_at"]),
                biz_no=str(row["biz_no"]) if row.get("biz_no") is not None else None,
            )
        )
    return records


async def fetch_legacy_mpesa_records_before(before_source_record_id: int, limit: int | None = None) -> list[LegacyMpesaRecord]:
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise RuntimeError("LEGACY_MPESA_DATABASE_URL is not configured")

    if before_source_record_id <= 0:
        return []

    batch_size = limit or settings.LEGACY_MPESA_SYNC_BATCH_SIZE
    engine = create_async_engine(settings.LEGACY_MPESA_DATABASE_URL)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        id AS source_record_id,
                        msisdn AS phone,
                        first_name,
                        TRIM(CONCAT_WS(' ', middle_name, last_name)) AS other_name,
                        trans_amount AS amount,
                        date_stamp AS paid_at,
                        biz_no
                    FROM incoming_api_ack
                    WHERE biz_no = :biz_no
                      AND id < :before_id
                    ORDER BY id DESC
                    LIMIT :limit
                    """
                ),
                {
                    "biz_no": settings.LEGACY_MPESA_BIZ_NO,
                    "before_id": before_source_record_id,
                    "limit": batch_size,
                },
            )
            rows = list(reversed(result.mappings().all()))
    finally:
        await engine.dispose()

    records: list[LegacyMpesaRecord] = []
    for row in rows:
        records.append(
            LegacyMpesaRecord(
                source_record_id=int(row["source_record_id"]),
                phone=str(row["phone"] or ""),
                first_name=row.get("first_name"),
                other_name=row.get("other_name"),
                amount=float(row["amount"] or 0),
                paid_at=_coerce_datetime(row["paid_at"]),
                biz_no=str(row["biz_no"]) if row.get("biz_no") is not None else None,
            )
        )
    return records


async def fetch_legacy_mpesa_records_between(date_from: datetime, date_to: datetime) -> list[LegacyMpesaRecord]:
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise RuntimeError("LEGACY_MPESA_DATABASE_URL is not configured")

    if date_to < date_from:
        return []

    range_start = date_from.replace(hour=0, minute=0, second=0, microsecond=0)
    range_end = (date_to.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1))

    engine = create_async_engine(settings.LEGACY_MPESA_DATABASE_URL)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        id AS source_record_id,
                        msisdn AS phone,
                        first_name,
                        TRIM(CONCAT_WS(' ', middle_name, last_name)) AS other_name,
                        trans_amount AS amount,
                        date_stamp AS paid_at,
                        biz_no
                    FROM incoming_api_ack
                    WHERE biz_no = :biz_no
                      AND date_stamp >= :date_from
                      AND date_stamp < :date_to
                    ORDER BY id ASC
                    """
                ),
                {
                    "biz_no": settings.LEGACY_MPESA_BIZ_NO,
                    "date_from": range_start,
                    "date_to": range_end,
                },
            )
            rows = result.mappings().all()
    finally:
        await engine.dispose()

    records: list[LegacyMpesaRecord] = []
    for row in rows:
        records.append(
            LegacyMpesaRecord(
                source_record_id=int(row["source_record_id"]),
                phone=str(row["phone"] or ""),
                first_name=row.get("first_name"),
                other_name=row.get("other_name"),
                amount=float(row["amount"] or 0),
                paid_at=_coerce_datetime(row["paid_at"]),
                biz_no=str(row["biz_no"]) if row.get("biz_no") is not None else None,
            )
        )
    return records


async def sync_legacy_mpesa_transactions(db: AsyncSession, records: list[LegacyMpesaRecord]) -> dict[str, int]:
    if not records:
        return {"imported": 0, "created_users": 0, "linked_existing_users": 0, "skipped": 0}

    source_ids = [record.source_record_id for record in records]
    existing_ids = set(
        (
            await db.execute(
                select(LegacyMpesaTransaction.source_record_id)
                .where(LegacyMpesaTransaction.source_record_id.in_(source_ids))
            )
        ).scalars().all()
    )

    imported = 0
    created_users = 0
    linked_existing_users = 0
    skipped = 0

    for record in records:
        if record.source_record_id in existing_ids:
            skipped += 1
            continue

        normalized_phone = normalize_phone(record.phone)
        if not normalized_phone:
            skipped += 1
            continue

        user, created = await ensure_phone_user(
            db,
            normalized_phone,
            first_name=record.first_name,
            other_name=record.other_name,
        )
        if created:
            created_users += 1
        else:
            linked_existing_users += 1

        db.add(
            LegacyMpesaTransaction(
                source_record_id=record.source_record_id,
                biz_no=record.biz_no,
                phone=normalized_phone,
                first_name=record.first_name,
                other_name=record.other_name,
                amount=record.amount,
                paid_at=record.paid_at,
                raw_payload=json.dumps(asdict(record), default=str),
                user_id=user.id,
                onboarding_status="pending_assignment",
            )
        )
        imported += 1

    await db.commit()
    return {
        "imported": imported,
        "created_users": created_users,
        "linked_existing_users": linked_existing_users,
        "skipped": skipped,
    }
